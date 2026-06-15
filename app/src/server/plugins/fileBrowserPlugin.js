import fs from 'fs';
import path from 'path';
import SMB2 from '@marsaud/smb2';
import { getAllowedOrigin, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { registry, UpstreamOpenError, UpstreamTimeoutError } from '../utils/upstreamHealth.js';

const SHARE_ACCESS_MODE = (process.env.SHARE_ACCESS_MODE || 'native').toLowerCase();
const rawSharePath = process.env.SHARE_BASE_PATH;
const SMB_REQUEST_TIMEOUT_MS = parseInt(process.env.UPSTREAM_SMB_TIMEOUT_MS || '20000');

if (!rawSharePath) {
  console.warn('[FileBrowser] ⚠️ SHARE_BASE_PATH belum diatur di .env. File browser akan nonaktif.');
}

let smb2Client = null;
let smbSubPath = '';
let shareConnected = false; // declared before resetSmbClient to avoid TDZ

function parseSmbPath(uncPath) {
  const clean = uncPath.replace(/^[/\\]+/, '');
  const segments = clean.split(/[/\\]+/).filter(Boolean);
  if (segments.length < 2) {
    throw new Error(`[FileBrowser] UNC path tidak valid: "${uncPath}". Minimal butuh \\\\host\\share`);
  }
  const host = segments[0];
  const shareName = segments[1];
  const subPath = segments.slice(2).join('/');
  return { share: `\\\\${host}\\${shareName}`, subPath };
}

function getSmbClient() {
  if (smb2Client) return smb2Client;
  const parsed = parseSmbPath(rawSharePath);
  smbSubPath = parsed.subPath;
  smb2Client = new SMB2({
    share: parsed.share,
    domain: process.env.SHARE_DOMAIN || '',
    username: process.env.SHARE_USER || 'Guest',
    password: process.env.SHARE_PASSWORD || '',
    autoCloseTimeout: 0,
  });
  console.log(`[FileBrowser] 🔌 SMB2 client created for: ${parsed.share} (subPath: ${smbSubPath})`);
  return smb2Client;
}

function smbPath(...segments) {
  const joined = [smbSubPath, ...segments].filter(Boolean).join('\\');
  return joined.replace(/\//g, '\\');
}

function resetSmbClient() {
  if (smb2Client) {
    console.log('[FileBrowser] 🔄 Resetting SMB2 client');
  }
  smb2Client = null;
  shareConnected = false;
}

function normalizeSharePath(rawPath) {
  if (!rawPath) return rawPath;
  if (/^[A-Za-z]:/.test(rawPath)) return rawPath;
  if (rawPath.startsWith('/')) return rawPath;
  let normalized = rawPath.replace(/\\{2,}/g, '\\');
  if (normalized.startsWith('\\') && !normalized.startsWith('\\\\')) {
    normalized = '\\' + normalized;
  }
  return normalized;
}

const nativeBasePath = normalizeSharePath(rawSharePath);

function withTimeout(promise, timeoutMs, name = 'smb') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new UpstreamTimeoutError(name, timeoutMs)), timeoutMs);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

const fileAccess = {
  async connect() {
    if (shareConnected) return;
    if (!rawSharePath) {
      throw new Error('[FileBrowser] SHARE_BASE_PATH belum dikonfigurasi di .env');
    }
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      try {
        await withTimeout(client.readdir(smbSubPath || '.'), SMB_REQUEST_TIMEOUT_MS, 'smb');
        console.log(`[FileBrowser] ✅ SMB2 connected to share`);
      } catch (err) {
        resetSmbClient();
        if (err instanceof UpstreamTimeoutError) throw err;
        throw new Error(
          `[FileBrowser] Gagal koneksi SMB2 ke "${rawSharePath}": ${err.message}. ` +
          'Pastikan SHARE_USER, SHARE_PASSWORD, dan SHARE_BASE_PATH sudah benar.'
        );
      }
    } else {
      if (!fs.existsSync(nativeBasePath)) {
        const hint = nativeBasePath.startsWith('/')
          ? 'Pastikan path sudah di-mount.'
          : 'Pastikan network share sudah terkoneksi atau drive sudah di-map.';
        throw new Error(
          `[FileBrowser] Folder share tidak dapat diakses: "${nativeBasePath}". ${hint}`
        );
      }
      console.log(`[FileBrowser] ✅ Native FS connected: ${nativeBasePath}`);
    }
    shareConnected = true;
  },

  async readdir(relativePath) {
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      const fullPath = smbPath(relativePath);
      try {
        const entries = await withTimeout(
          client.readdir(fullPath, { stats: true }),
          SMB_REQUEST_TIMEOUT_MS,
          'smb'
        );
        return entries.map((e) => {
          let name, isDir, isF, mtime = null, size = 0;
          if (typeof e === 'object' && e.name !== undefined) {
            name = e.name;
            isDir = !!e.isDirectory;
            isF = !e.isDirectory;
            mtime = e.mtime ? new Date(e.mtime) : null;
            size = e.size || 0;
          } else if (typeof e === 'object' && e.Filename) {
            name = e.Filename;
            isDir = !!e.isDirectory;
            isF = !e.isDirectory;
            mtime = e.LastWriteTime ? new Date(e.LastWriteTime) : null;
            size = e.EndofFile || 0;
          } else {
            name = e;
            const hasExt = /\.[a-zA-Z0-9]+$/.test(name);
            isDir = !hasExt;
            isF = hasExt;
          }
          return { name, isDirectory: () => isDir, isFile: () => isF, mtime, size };
        });
      } catch (err) {
        if (err instanceof UpstreamTimeoutError) {
          resetSmbClient();
          throw err;
        }
        throw new Error(`Gagal membaca direktori: ${err.message}`);
      }
    } else {
      const fullPath = path.join(nativeBasePath, relativePath || '');
      return fs.readdirSync(fullPath, { withFileTypes: true }).map(e => ({
        name: e.name,
        isDirectory: () => e.isDirectory(),
        isFile: () => e.isFile(),
      }));
    }
  },

  async exists(relativePath) {
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      try {
        await withTimeout(client.exists(smbPath(relativePath)), SMB_REQUEST_TIMEOUT_MS, 'smb');
        return true;
      } catch (err) {
        if (err instanceof UpstreamTimeoutError) {
          resetSmbClient();
          throw err;
        }
        return false;
      }
    } else {
      return fs.existsSync(path.join(nativeBasePath, relativePath || ''));
    }
  },

  async stat(relativePath) {
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      try {
        const stats = await withTimeout(client.stat(smbPath(relativePath)), SMB_REQUEST_TIMEOUT_MS, 'smb');
        return {
          size: stats.size || 0,
          mtime: stats.mtime ? new Date(stats.mtime) : new Date(),
          isDirectory: () => !!stats.isDirectory,
          isFile: () => !stats.isDirectory,
        };
      } catch (err) {
        if (err instanceof UpstreamTimeoutError) {
          resetSmbClient();
          throw err;
        }
        throw err;
      }
    } else {
      return fs.statSync(path.join(nativeBasePath, relativePath || ''));
    }
  },

  async createReadStream(relativePath) {
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      return await withTimeout(client.createReadStream(smbPath(relativePath)), SMB_REQUEST_TIMEOUT_MS, 'smb');
    } else {
      return fs.createReadStream(path.join(nativeBasePath, relativePath || ''));
    }
  },
};

function isValidPathSegment(segment) {
  return /^[a-zA-Z0-9\-_. ()]+$/.test(segment) && !segment.includes('..');
}

function handleGuardError(err, sendJson, res) {
  if (err instanceof UpstreamOpenError) {
    res.setHeader('Retry-After', String(err.retryAfter));
    sendJson(503, {
      success: false,
      error: err.message,
      code: err.code,
      retryAfter: err.retryAfter,
    });
    return true;
  }
  if (err instanceof UpstreamTimeoutError) {
    sendJson(504, {
      success: false,
      error: err.message,
      code: err.code,
    });
    return true;
  }
  return false;
}

function fileBrowserMiddleware(req, res, next) {
  const sendJson = createJsonSender(req, res);
  if (handleCorsIfPreflight(req, res, '/api/files/', 'GET, OPTIONS')) return;

  // GET /api/files/folders
  if (req.url === '/api/files/folders' && req.method === 'GET') {
    (async () => {
      try {
        const folders = await registry.guard('smb', async () => {
          await fileAccess.connect();
          const entries = await fileAccess.readdir('');
          return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
        }, { timeoutMs: SMB_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, folders });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error('[FileBrowser] Error listing folders:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/files/periods/:folder
  const periodsMatch = req.url?.match(/^\/api\/files\/periods\/([^/?]+)/);
  if (periodsMatch && req.method === 'GET') {
    const folder = decodeURIComponent(periodsMatch[1]);
    (async () => {
      try {
        if (!isValidPathSegment(folder)) return sendJson(400, { success: false, error: 'Nama folder tidak valid' });
        const allFiles = await registry.guard('smb', async () => {
          await fileAccess.connect();
          const folderPath = folder;
          let entries;
          try {
            entries = await fileAccess.readdir(folderPath);
          } catch (e) {
            const err = new Error(`Folder tidak ditemukan atau tidak dapat diakses: ${folderPath}`);
            err.statusCode = 404;
            throw err;
          }
          const subDirs = entries.filter(e => e.isDirectory());
          if (subDirs.length === 0) {
            const err = new Error(`Belum ada subfolder periode di dalam ${folderPath}`);
            err.statusCode = 404;
            throw err;
          }
          const all = [];
          for (const dir of subDirs) {
            const periodName = dir.name;
            const lkoRelPath = `${folder}/${periodName}/Lembar Kerja Opname`;
            let subEntries = null;
            try { subEntries = await fileAccess.readdir(lkoRelPath); } catch (e) { continue; }
            if (subEntries) {
              const excelFiles = subEntries.filter(se => /\.(xlsx|xls)$/i.test(se.name));
              for (const fe of excelFiles) {
                const fileRelPath = `${lkoRelPath}/${fe.name}`;
                let modifiedDate = null;
                if (fe.mtime) {
                  modifiedDate = fe.mtime.toISOString();
                } else {
                  try {
                    const stat = await fileAccess.stat(fileRelPath);
                    modifiedDate = stat.mtime.toISOString();
                  } catch { }
                }
                all.push({ filename: fe.name, periodName, modifiedDate, sortKey: fe.name });
              }
            }
          }
          all.sort((a, b) => (b.modifiedDate || b.sortKey).localeCompare(a.modifiedDate || a.sortKey));
          return all;
        }, { timeoutMs: SMB_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, files: allFiles, timestamp: new Date().toISOString() });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        if (err.statusCode === 404) {
          return sendJson(404, { success: false, error: err.message });
        }
        console.error('[FileBrowser] Error listing periods:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/files/workbooks/:folder/:period
  const workbooksMatch = req.url?.match(/^\/api\/files\/workbooks\/([^/]+)\/([^/?]+)/);
  if (workbooksMatch && req.method === 'GET') {
    const folder = decodeURIComponent(workbooksMatch[1]);
    const period = decodeURIComponent(workbooksMatch[2]);
    (async () => {
      try {
        if (!isValidPathSegment(folder) || !isValidPathSegment(period)) {
          return sendJson(400, { success: false, error: 'Parameter tidak valid' });
        }
        const files = await registry.guard('smb', async () => {
          await fileAccess.connect();
          const lkoRelPath = `${folder}/${period}/Lembar Kerja Opname`;
          if (!(await fileAccess.exists(lkoRelPath))) {
            const err = new Error('Folder Lembar Kerja Opname tidak ditemukan');
            err.statusCode = 404;
            throw err;
          }
          const entries = await fileAccess.readdir(lkoRelPath);
          const out = [];
          for (const e of entries.filter(e => /\.(xlsx|xls)$/i.test(e.name))) {
            out.push({ name: e.name, size: e.size || 0, modifiedDate: e.mtime ? e.mtime.toISOString() : null });
          }
          out.sort((a, b) => (b.modifiedDate || '').localeCompare(a.modifiedDate || ''));
          return out;
        }, { timeoutMs: SMB_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, files });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        if (err.statusCode === 404) {
          return sendJson(404, { success: false, error: err.message });
        }
        console.error('[FileBrowser] Error listing workbooks:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/files/download/:folder/:period/:filename
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
        const { readStream, size } = await registry.guard('smb', async () => {
          await fileAccess.connect();
          const fileRelPath = `${folder}/${period}/Lembar Kerja Opname/${filename}`;
          if (!(await fileAccess.exists(fileRelPath))) {
            const err = new Error('File tidak ditemukan');
            err.statusCode = 404;
            throw err;
          }
          const stream = await fileAccess.createReadStream(fileRelPath);
          let streamSize = 0;
          try {
            const stats = await fileAccess.stat(fileRelPath);
            streamSize = stats.size || 0;
          } catch (e) { }
          return { readStream: stream, size: streamSize };
        }, { timeoutMs: SMB_REQUEST_TIMEOUT_MS });

        res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (size) res.setHeader('Content-Length', size);
        res.statusCode = 200;
        readStream.pipe(res);
        readStream.on('error', (err) => {
          console.error('[FileBrowser] Download stream error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: 'Download failed' }));
          }
        });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        if (err.statusCode === 404) {
          return sendJson(404, { success: false, error: err.message });
        }
        console.error('[FileBrowser] Error downloading file:', err.message);
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

if (process.env.SHARE_ACCESS_MODE === 'smb') {
  registry.registerProbe('smb', async () => {
    await fileAccess.connect();
    await fileAccess.readdir('');
  });
}
