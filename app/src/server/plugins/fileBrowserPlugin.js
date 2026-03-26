import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getAllowedOrigin, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';

function normalizeSharePath(rawPath) {
  if (!rawPath) return rawPath;
  if (/^[A-Za-z]:/.test(rawPath)) return rawPath; // drive letter
  let normalized = rawPath.replace(/\\{2,}/g, '\\');
  if (normalized.startsWith('\\') && !normalized.startsWith('\\\\')) {
    normalized = '\\' + normalized;
  }
  return normalized;
}

const rawSharePath = process.env.SHARE_BASE_PATH;
if (!rawSharePath) {
  console.warn('[FileBrowser] ⚠️ SHARE_BASE_PATH belum diatur di .env. File browser akan nonaktif.');
}
const shareConfig = {
  basePath: normalizeSharePath(rawSharePath),
  user: process.env.SHARE_USER || '',
  password: process.env.SHARE_PASSWORD || '',
};

let shareConnected = false;

function ensureShareConnection() {
  if (shareConnected) return;

  const basePath = shareConfig.basePath;

  if (/^[A-Za-z]:/.test(basePath)) {
    if (!fs.existsSync(basePath)) {
      throw new Error(`Folder tidak ditemukan di drive "${basePath.charAt(0)}:": ${basePath}`);
    }
    shareConnected = true;
    return;
  }

  const cleanPath = basePath.replace(/^\\+/, '');
  const segments = cleanPath.split('\\').filter(Boolean);
  if (segments.length < 2) {
    throw new Error(`Path share tidak valid: "${basePath}"`);
  }

  const shareRoot = '\\\\' + segments[0] + '\\' + segments[1];

  if (shareConfig.user && shareConfig.password) {
    try {
      try { execSync(`net use "${shareRoot}" /delete /y`, { stdio: 'pipe' }); } catch { /* ok */ }
      execSync(
        `net use "${shareRoot}" /user:${shareConfig.user} ${shareConfig.password}`,
        { stdio: 'pipe', timeout: 15000 }
      );
    } catch (err) {
      const errMsg = err.stderr ? err.stderr.toString() : err.message;
      if (!errMsg.includes('1219')) {
        throw new Error('Tidak dapat terhubung ke folder server: ' + errMsg.trim());
      }
    }
  }

  if (!fs.existsSync(basePath)) {
    throw new Error(`Folder tidak ditemukan: ${basePath}`);
  }
  shareConnected = true;
}

function isValidPathSegment(segment) {
  return /^[a-zA-Z0-9\-_. ()]+$/.test(segment) && !segment.includes('..');
}

function fileBrowserMiddleware(req, res, next) {
  const sendJson = createJsonSender(req, res);
  if (handleCorsIfPreflight(req, res, '/api/files/', 'GET, OPTIONS')) return;

  if (req.url === '/api/files/folders' && req.method === 'GET') {
    (async () => {
      try {
        ensureShareConnection();
        const basePath = shareConfig.basePath;
        if (!fs.existsSync(basePath)) {
          return sendJson(500, { success: false, error: `Folder tidak ditemukan: ${basePath}` });
        }
        const entries = fs.readdirSync(basePath, { withFileTypes: true });
        const folders = entries
          .filter(e => e.isDirectory())
          .map(e => e.name)
          .sort();
        sendJson(200, { success: true, folders });
      } catch (err) {
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  const periodsMatch = req.url?.match(/^\/api\/files\/periods\/([^/?]+)/);
  if (periodsMatch && req.method === 'GET') {
    const folder = decodeURIComponent(periodsMatch[1]);
    (async () => {
      try {
        if (!isValidPathSegment(folder)) return sendJson(400, { success: false, error: 'Nama folder tidak valid' });
        ensureShareConnection();
        const folderPath = path.join(shareConfig.basePath, folder);
        if (!fs.existsSync(folderPath)) return sendJson(404, { success: false, error: `Folder tidak ditemukan: ${folderPath}` });

        const entries = fs.readdirSync(folderPath, { withFileTypes: true });
        const allFiles = [];

        entries.filter(e => e.isDirectory()).forEach(e => {
            const periodName = e.name;
            const lkoPath = path.join(folderPath, periodName, 'Lembar Kerja Opname');
            
            if (fs.existsSync(lkoPath)) {
                const subEntries = fs.readdirSync(lkoPath, { withFileTypes: true });
                const excelFiles = subEntries.filter(se => se.isFile() && /\.(xlsx|xls)$/i.test(se.name));
                
                excelFiles.forEach(fe => {
                    const filePath = path.join(lkoPath, fe.name);
                    let modifiedDate = null;
                    try { modifiedDate = fs.statSync(filePath).mtime.toISOString(); } catch { }

                    const match = periodName.match(/(\d{2})(\d{4})/);
                    const sortKey = (match ? match[2] + match[1] : '000000') + fe.name;

                    allFiles.push({
                        filename: fe.name,
                        periodName: periodName,
                        modifiedDate,
                        sortKey
                    });
                });
            }
        });

        allFiles.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

        sendJson(200, {
          success: true,
          files: allFiles,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  const workbooksMatch = req.url?.match(/^\/api\/files\/workbooks\/([^/]+)\/([^/?]+)/);
  if (workbooksMatch && req.method === 'GET') {
    const folder = decodeURIComponent(workbooksMatch[1]);
    const period = decodeURIComponent(workbooksMatch[2]);
    (async () => {
      try {
        if (!isValidPathSegment(folder) || !isValidPathSegment(period)) {
          return sendJson(400, { success: false, error: 'Parameter tidak valid' });
        }
        ensureShareConnection();
        const lkoPath = path.join(shareConfig.basePath, folder, period, 'Lembar Kerja Opname');
        if (!fs.existsSync(lkoPath)) return sendJson(404, { success: false, error: 'Folder Lembar Kerja Opname tidak ditemukan' });

        const entries = fs.readdirSync(lkoPath, { withFileTypes: true });
        const files = entries
          .filter(e => e.isFile() && /\.(xlsx|xls)$/i.test(e.name))
          .map(e => {
            const fullPath = path.join(lkoPath, e.name);
            let size = 0, modifiedDate = null;
            try {
              const stat = fs.statSync(fullPath);
              size = stat.size;
              modifiedDate = stat.mtime.toISOString();
            } catch { }
            return { name: e.name, size, modifiedDate };
          })
          .sort((a, b) => (b.modifiedDate || '').localeCompare(a.modifiedDate || ''));

        sendJson(200, { success: true, files });
      } catch (err) {
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  const downloadMatch = req.url?.match(/^\/api\/files\/download\/([^/]+)\/([^/]+)\/([^/?]+)/);
  if (downloadMatch && req.method === 'GET') {
    const folder = decodeURIComponent(downloadMatch[1]);
    const period = decodeURIComponent(downloadMatch[2]);
    const filename = decodeURIComponent(downloadMatch[3]);
    (async () => {
      try {
        if (!isValidPathSegment(folder) || !isValidPathSegment(period) || !isValidPathSegment(filename)) {
          return sendJson(400, { success: false, error: 'Parameter tidak valid' });
        }
        ensureShareConnection();
        const filePath = path.join(shareConfig.basePath, folder, period, 'Lembar Kerja Opname', filename);
        if (!fs.existsSync(filePath)) return sendJson(404, { success: false, error: 'File tidak ditemukan' });

        const readStream = fs.createReadStream(filePath);
        res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        // Note: Content-Length can be set using fs.statSync if needed, but streaming is safer for RAM.
        try {
          const stats = fs.statSync(filePath);
          res.setHeader('Content-Length', stats.size);
        } catch(e) {}
        
        res.statusCode = 200;
        readStream.pipe(res);

        readStream.on('error', (err) => {
          console.error('[File Browser] Download stream error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: 'Download failed' }));
          }
        });
      } catch (err) {
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  next();
}

export default function viteFileBrowserPlugin() {
  return {
    name: 'vite-plugin-file-browser',
    configureServer(server) {
      server.middlewares.use(fileBrowserMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(fileBrowserMiddleware);
    },
  };
}
