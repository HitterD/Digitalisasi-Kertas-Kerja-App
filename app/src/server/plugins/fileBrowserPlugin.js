import fs from 'fs';
import path from 'path';
import SMB2 from '@marsaud/smb2';
import { getAllowedOrigin, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';

// ============================================================
// Konfigurasi Share — Dual Mode (Native FS / SMB2)
// ============================================================
// Mode ditentukan oleh env SHARE_ACCESS_MODE:
//   'native' (default) = fs langsung (Windows dev, drive letter / UNC)
//   'smb'              = SMB2 client (Docker production)
// ============================================================

const SHARE_ACCESS_MODE = (process.env.SHARE_ACCESS_MODE || 'native').toLowerCase();
const rawSharePath = process.env.SHARE_BASE_PATH;

if (!rawSharePath) {
  console.warn('[FileBrowser] ⚠️ SHARE_BASE_PATH belum diatur di .env. File browser akan nonaktif.');
}

// --- SMB2 Client ---
let smb2Client = null;
let smbSubPath = ''; // subpath setelah share name, e.g. "AssetManagement_Files"

function parseSmbPath(uncPath) {
  // Input:  \\192.168.2.111\pt. santos jaya abadi\AssetManagement_Files
  // Output: { share: '\\\\192.168.2.111\\pt. santos jaya abadi', subPath: 'AssetManagement_Files' }
  const clean = uncPath.replace(/^[/\\]+/, '');
  const segments = clean.split(/[/\\]+/).filter(Boolean);
  if (segments.length < 2) {
    throw new Error(`[FileBrowser] UNC path tidak valid: "${uncPath}". Minimal butuh \\\\host\\share`);
  }
  const host = segments[0];
  const shareName = segments[1];
  const subPath = segments.slice(2).join('/');
  return {
    share: `\\\\${host}\\${shareName}`,
    subPath,
  };
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
    autoCloseTimeout: 0, // Keep connection alive
  });

  console.log(`[FileBrowser] 🔌 SMB2 client created for: ${parsed.share} (subPath: ${smbSubPath})`);
  return smb2Client;
}

function smbPath(...segments) {
  // Join smbSubPath + segments with backslash for SMB
  const joined = [smbSubPath, ...segments].filter(Boolean).join('\\');
  return joined.replace(/\//g, '\\');
}

// --- Native FS helpers ---
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
let shareConnected = false;

// --- Unified File Access API ---
// Semua method return Promise

const fileAccess = {
  async connect() {
    if (shareConnected) return;

    if (!rawSharePath) {
      throw new Error('[FileBrowser] SHARE_BASE_PATH belum dikonfigurasi di .env');
    }

    if (SHARE_ACCESS_MODE === 'smb') {
      // SMB2: test koneksi dengan readdir root
      const client = getSmbClient();
      try {
        await client.readdir(smbSubPath || '.');
        console.log(`[FileBrowser] ✅ SMB2 connected to share`);
      } catch (err) {
        throw new Error(
          `[FileBrowser] Gagal koneksi SMB2 ke "${rawSharePath}": ${err.message}. ` +
          'Pastikan SHARE_USER, SHARE_PASSWORD, dan SHARE_BASE_PATH sudah benar.'
        );
      }
    } else {
      // Native FS
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
        // Gunakan parameter { stats: true } dari library smb2 jika didukung
        const entries = await client.readdir(fullPath, { stats: true });
        
        const mapped = entries.map((e) => {
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
            // Fallback jika library smb2 lama hanya mereturn string (array of strings)
            // Asumsikan ada titik ekstensi = file, tidak ada = direktori. (Aman untuk kasus Kertas Kerja)
            const hasExt = /\.[a-zA-Z0-9]+$/.test(name);
            isDir = !hasExt;
            isF = hasExt;
          }
          return {
            name,
            isDirectory: () => isDir,
            isFile: () => isF,
            mtime,
            size
          };
        });
        
        console.log(`[FileBrowser Debug] Mapped directories count for ${relativePath}:`, mapped.filter(x => x.isDirectory()).length);
        return mapped;
      } catch (err) {
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
        await client.exists(smbPath(relativePath));
        return true;
      } catch {
        return false;
      }
    } else {
      return fs.existsSync(path.join(nativeBasePath, relativePath || ''));
    }
  },

  async stat(relativePath) {
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      const stats = await client.stat(smbPath(relativePath));
      return {
        size: stats.size || 0,
        mtime: stats.mtime ? new Date(stats.mtime) : new Date(),
        isDirectory: () => !!stats.isDirectory,
        isFile: () => !stats.isDirectory,
      };
    } else {
      return fs.statSync(path.join(nativeBasePath, relativePath || ''));
    }
  },

  async createReadStream(relativePath) {
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      // @marsaud/smb2 createReadStream is async and returns stream via callback/promise
      return await client.createReadStream(smbPath(relativePath));
    } else {
      return fs.createReadStream(path.join(nativeBasePath, relativePath || ''));
    }
  },
};

// ============================================================
// Validation
// ============================================================
function isValidPathSegment(segment) {
  return /^[a-zA-Z0-9\-_. ()]+$/.test(segment) && !segment.includes('..');
}

// ============================================================
// Middleware
// ============================================================
function fileBrowserMiddleware(req, res, next) {
  const sendJson = createJsonSender(req, res);
  if (handleCorsIfPreflight(req, res, '/api/files/', 'GET, OPTIONS')) return;

  // GET /api/files/folders — list root folders
  if (req.url === '/api/files/folders' && req.method === 'GET') {
    (async () => {
      try {
        await fileAccess.connect();
        const entries = await fileAccess.readdir('');
        const folders = entries
          .filter(e => e.isDirectory())
          .map(e => e.name)
          .sort();
        sendJson(200, { success: true, folders });
      } catch (err) {
        console.error('[FileBrowser] Error listing folders:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/files/periods/:folder — list periods with Excel files
  const periodsMatch = req.url?.match(/^\/api\/files\/periods\/([^/?]+)/);
  if (periodsMatch && req.method === 'GET') {
    const folder = decodeURIComponent(periodsMatch[1]);
    (async () => {
      try {
        if (!isValidPathSegment(folder)) return sendJson(400, { success: false, error: 'Nama folder tidak valid' });
        await fileAccess.connect();

        const folderPath = folder;
        
        let entries;
        try {
          entries = await fileAccess.readdir(folderPath);
        } catch(e) {
          return sendJson(404, { success: false, error: `Folder tidak ditemukan atau tidak dapat diakses: ${folderPath}` });
        }

        const subDirs = entries.filter(e => e.isDirectory());
        if (subDirs.length === 0) {
          return sendJson(404, { success: false, error: `Belum ada subfolder periode di dalam ${folderPath}` });
        }

        const allFiles = [];

        // Kumpulkan dari SEMUA subfolder agar tidak gagal jika ada folder yang kosong
        for (const dir of subDirs) {
          const periodName = dir.name;
          const lkoRelPath = `${folder}/${periodName}/Lembar Kerja Opname`;

          let subEntries = null;
          try {
            subEntries = await fileAccess.readdir(lkoRelPath);
          } catch(e) {
            continue; // Skip jika folder Lembar Kerja Opname tidak ada di periode ini
          }

          if (subEntries) {
            // Kita tidak perlu mengecek se.isFile() terlalu ketat jika fallback SMB kadang gagal,
            // Cukup andalkan ekstensi .xlsx / .xls.
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

              // Menentukan sort key dari file murni
              const sortKey = fe.name;

              allFiles.push({
                filename: fe.name,
                periodName,
                modifiedDate,
                sortKey,
              });
            }
          }
        }

        allFiles.sort((a, b) => {
          const dateA = a.modifiedDate || a.sortKey;
          const dateB = b.modifiedDate || b.sortKey;
          return dateB.localeCompare(dateA);
        });

        sendJson(200, {
          success: true,
          files: allFiles,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[FileBrowser] Error listing periods:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/files/workbooks/:folder/:period — list Excel workbooks
  const workbooksMatch = req.url?.match(/^\/api\/files\/workbooks\/([^/]+)\/([^/?]+)/);
  if (workbooksMatch && req.method === 'GET') {
    const folder = decodeURIComponent(workbooksMatch[1]);
    const period = decodeURIComponent(workbooksMatch[2]);
    (async () => {
      try {
        if (!isValidPathSegment(folder) || !isValidPathSegment(period)) {
          return sendJson(400, { success: false, error: 'Parameter tidak valid' });
        }
        await fileAccess.connect();
        const lkoRelPath = `${folder}/${period}/Lembar Kerja Opname`;
        if (!(await fileAccess.exists(lkoRelPath))) {
          return sendJson(404, { success: false, error: 'Folder Lembar Kerja Opname tidak ditemukan' });
        }

        const entries = await fileAccess.readdir(lkoRelPath);
        const files = [];

        for (const e of entries.filter(e => /\.(xlsx|xls)$/i.test(e.name))) {
          let size = e.size || 0;
          let modifiedDate = e.mtime ? e.mtime.toISOString() : null;
          
          files.push({ name: e.name, size, modifiedDate });
        }

        files.sort((a, b) => (b.modifiedDate || '').localeCompare(a.modifiedDate || ''));
        sendJson(200, { success: true, files });
      } catch (err) {
        console.error('[FileBrowser] Error listing workbooks:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/files/download/:folder/:period/:filename — download file
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
        await fileAccess.connect();
        const fileRelPath = `${folder}/${period}/Lembar Kerja Opname/${filename}`;
        if (!(await fileAccess.exists(fileRelPath))) {
          return sendJson(404, { success: false, error: 'File tidak ditemukan' });
        }

        const readStream = await fileAccess.createReadStream(fileRelPath);
        res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        try {
          const stats = await fileAccess.stat(fileRelPath);
          res.setHeader('Content-Length', stats.size);
        } catch (e) { /* size header optional */ }

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
