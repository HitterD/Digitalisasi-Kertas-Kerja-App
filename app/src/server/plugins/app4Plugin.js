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
// APP4 Recouncil Middleware
// ============================================================
const storageApp4 = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'data/app4_temp/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.xlsx';
    cb(null, file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});
const uploadApp4 = multer({ storage: storageApp4 });

function app4Middleware(req, res, next) {
  const sendJson = createJsonSender(req, res);
  if (handleCorsIfPreflight(req, res, '/api/app4/', 'POST, GET, OPTIONS')) return;

  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;

  if (pathname === '/api/app4/process' && req.method === 'POST') {
    uploadApp4.fields([
      { name: 'opname', maxCount: 100 },
      { name: 'master', maxCount: 1 },
      { name: 'aspx', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err) return sendJson(500, { success: false, error: err.message });
      const cleanupFiles = () => cleanupUploadedFiles(req.files);

      try {
        if (!req.files || !req.files.opname || req.files.opname.length === 0 || !req.files.master) {
          cleanupFiles();
          return sendJson(400, { success: false, error: 'Harus mengunggah file Opname (minimal 1) dan Master Data.' });
        }

        const timestamp = Date.now();
        const opnamePaths = req.files.opname.map(f => f.path);
        const masterPath = req.files.master[0].path;
        const isMultiple = opnamePaths.length > 1;
        const outExt = isMultiple ? '.zip' : '.xlsx';
        // P0 Fix: Make temp names truly unique to avoid concurrency overwrites
        const tempId = `${timestamp}-${crypto.randomUUID()}`;
        const outName = `Recouncil_Result_${tempId}${outExt}`;
        const outPath = path.resolve(process.cwd(), 'data/app4_temp', outName);

        const aspxPath = (req.files.aspx && req.files.aspx[0]) ? req.files.aspx[0].path : null;

        const inputJson = JSON.stringify({
          opnames: req.files.opname.map(f => ({ path: f.path, original: f.originalname })),
          master: masterPath,
          aspx: aspxPath,
          output_path: outPath
        });

        const tempIn = path.resolve(process.cwd(), `data/app4_temp/temp_in_process_${tempId}.json`);
        if (!fs.existsSync(path.dirname(tempIn))) fs.mkdirSync(path.dirname(tempIn), { recursive: true });
        fs.writeFileSync(tempIn, inputJson, 'utf8');

        // Execute node script asynchronously
        try {
          const processorPath = path.join(process.cwd(), 'app4_processor.js');
          const { stdout } = await execFileAsync('node', [processorPath, 'process', tempIn], { cwd: process.cwd() });
          try { fs.unlinkSync(tempIn); } catch(e){} // Cleanup JSON payload

          const parsed = JSON.parse(stdout.trim().split('\n').pop() || "{}");

          if (parsed.status === 'success') {
            logAudit({ 
                actor: req.user?.username || req.headers['x-user'] || 'UNKNOWN', 
                action: 'APP4_RECOUNCIL', 
                target: `Recouncil Process`, 
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                status: 'SUCCESS' 
            });

            // Serve generated file via stream for memory efficiency
            const mimeType = isMultiple ? 'application/zip' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            const finalOutName = parsed.suggested_filename || outName;
            streamFileResponse(req, res, outPath, finalOutName, mimeType, cleanupFiles);
          } else {
            cleanupFiles();
            sendJson(500, { success: false, error: parsed.message });
          }
        } catch (je) {
          cleanupFiles();
          console.error('[App4] Node execution error:', je.message);
          sendJson(500, { success: false, error: 'Proses gagal. Silakan periksa format file input.' });
        }
      } catch (e) {
        cleanupFiles();
        if (e.stderr) console.error('[App4] Node stderr:', e.stderr.toString());
        sendJson(500, { success: false, error: 'Proses gagal. Periksa format file input.' });
      }
    });
    return;
  }
  next();
}

export default function viteApp4Plugin() {
  return {
    name: 'vite-plugin-app4',
    configureServer(server) {
      server.middlewares.use(app4Middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(app4Middleware);
    },
  };
}
