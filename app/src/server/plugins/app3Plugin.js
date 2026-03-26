import fs from 'fs';
import path from 'path';
import process from 'process';
import crypto from 'crypto';
import util from 'util';
import { execFile } from 'child_process';
import multer from 'multer';
import { getAllowedOrigin, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { cleanupUploadedFiles, streamFileResponse } from '../utils/tempFileManager.js';
import { logAudit } from '../../utils/logger.js';

const execFileAsync = util.promisify(execFile);

// ============================================================
// APP3 Data Consolidation Middleware
// ============================================================
const storageApp3 = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'data/app3_temp/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.xlsx';
    cb(null, file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});
const uploadApp3 = multer({ storage: storageApp3 });

function app3Middleware(req, res, next) {
  const sendJson = createJsonSender(req, res);
  if (handleCorsIfPreflight(req, res, '/api/app3/', 'POST, GET, OPTIONS')) return;

  const runUpload = (req, res, callback) => {
    uploadApp3.fields([
      { name: 'master', maxCount: 1 },
      { name: 'exa', maxCount: 1 },
      { name: 'add', maxCount: 1 },
      { name: 'inv', maxCount: 1 }
    ])(req, res, (err) => {
      if (err) return sendJson(500, { success: false, error: err.message });
      callback();
    });
  };

  if (req.url === '/api/app3/get-bats' && req.method === 'POST') {
    runUpload(req, res, async () => {
      const cleanupFiles = () => cleanupUploadedFiles(req.files);

      try {
        const files = {};
        if (req.files.exa) files.exa = req.files.exa[0].path;
        if (req.files.add) files.add = req.files.add[0].path;
        if (req.files.inv) files.inv = req.files.inv[0].path;
        if (req.files.master) files.master = req.files.master[0].path; // Keep track of it

        const inputJson = JSON.stringify({ files });

        // Menggunakan UID untuk mencegah concurrency bug / race condition (P0 Fix)
        const tempId = crypto.randomUUID();
        const tempIn = path.resolve(process.cwd(), `data/app3_temp/temp_in_${tempId}.json`);
        fs.writeFileSync(tempIn, inputJson, 'utf8');

        try {
          const { stdout } = await execFileAsync('python', ['app3_processor.py', 'get_bat', tempIn]);
          try { fs.unlinkSync(tempIn); } catch(e){} // Cleanup JSON payload
          cleanupFiles(); // Cleanup original uploaded files
          const parsed = JSON.parse(stdout.trim().split('\n').pop() || "{}"); // last line
          sendJson(200, parsed);
        } catch (je) {
          cleanupFiles();
          console.error('[App3] Python execution error:', je.message);
          sendJson(500, { success: false, error: 'Proses gagal. Silakan periksa format file input.' });
        }
      } catch (e) {
        cleanupFiles();
        if (e.stderr) console.error('[App3] Python stderr:', e.stderr.toString());
        sendJson(500, { success: false, error: 'Proses gagal. Periksa format file input.' });
      }
    });
    return;
  }

  if (req.url === '/api/app3/process' && req.method === 'POST') {
    runUpload(req, res, async () => {
      const cleanupFiles = () => cleanupUploadedFiles(req.files);

      try {
        const files = {};
        if (req.files.exa) files.exa = req.files.exa[0].path;
        if (req.files.add) files.add = req.files.add[0].path;
        if (req.files.inv) files.inv = req.files.inv[0].path;
        if (req.files.master) files.master = req.files.master[0].path; // Important for archiving and concat

        let selectedBats = [];
        if (req.body.selected_bats) {
          selectedBats = JSON.parse(req.body.selected_bats);
        }

        // P0 Fix: Dynamic outName and tempIn
        const tempId = `${Date.now()}-${crypto.randomUUID()}`;
        const outName = `Kamus_Data_Master_new_2_${tempId}.xlsx`;
        const outPath = path.resolve(process.cwd(), 'data/app3_temp', outName);

        const inputJson = JSON.stringify({ files, selected_bats: selectedBats, output_path: outPath });

        const tempIn = path.resolve(process.cwd(), `data/app3_temp/temp_in_process_${tempId}.json`);
        if (!fs.existsSync(path.dirname(tempIn))) fs.mkdirSync(path.dirname(tempIn), { recursive: true });
        fs.writeFileSync(tempIn, inputJson, 'utf8');

        // Execute python script asynchronously
        try {
          const { stdout } = await execFileAsync('python', ['app3_processor.py', 'process', tempIn]);
          try { fs.unlinkSync(tempIn); } catch(e){} // Cleanup JSON payload

          const parsed = JSON.parse(stdout.trim().split('\n').pop() || "{}");

          if (parsed.status === 'success') {
            // Archive Master Lama if uploaded
            if (files.master) {
              const archiveDir = path.resolve(process.cwd(), 'data/app3_archive');
              if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
              const archiveName = 'Master_Lama_Archived_' + Date.now() + '.xlsx';
              fs.copyFileSync(files.master, path.join(archiveDir, archiveName));
            }
            
            logAudit({ 
                actor: req.user?.username || req.headers['x-user'] || 'UNKNOWN', 
                action: 'APP3_CONSOLIDATE', 
                target: `Master Data Consolidation`, 
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                status: 'SUCCESS' 
            });

            // Serve generated file
            // Serve generated file via stream for memory efficiency
            streamFileResponse(req, res, outPath, 'Kamus Data Master new 2.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', cleanupFiles);
          } else {
            cleanupFiles();
            console.error('[App3] Python process error:', parsed.message, parsed.traceback);
            sendJson(500, { success: false, error: parsed.message || 'Proses gagal.' });
          }
        } catch (je) {
          cleanupFiles();
          console.error('[App3] Python execution error:', je.message);
          sendJson(500, { success: false, error: 'Proses gagal. Silakan periksa format file input.' });
        }
      } catch (e) {
        cleanupFiles();
        if (e.stderr) console.error('[App3] Python stderr:', e.stderr.toString());
        sendJson(500, { success: false, error: 'Proses gagal. Periksa format file input.' });
      }
    });
    return;
  }

  next();
}

export default function viteApp3Plugin() {
  return {
    name: 'vite-plugin-app3',
    configureServer(server) {
      server.middlewares.use(app3Middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(app3Middleware);
    },
  };
}
