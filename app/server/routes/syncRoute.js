import fs from 'fs';
import path from 'path';
import process from 'process';
import crypto from 'crypto';
import { createRequire } from 'module';
import { getAllowedOrigin, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { logAudit } from '../utils/logger.js';
import { buildScopedFilePath, buildPeriodDir, extractSyncParams } from '../utils/syncPaths.js';

const _require = createRequire(import.meta.url);
const app1Db = _require('../../data/app1Db.cjs');

const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50MB limit

const sseClients = new Set();
function broadcastSyncEvent(userKey, period, sessionId) {
  const data = JSON.stringify({ userKey, period, sessionId, ts: Date.now() });
  for (const client of sseClients) {
    client.write(`data: ${data}\n\n`);
  }
}

function syncMiddleware(req, res, next) {
  // Legacy global paths (backward compat)
  const resultFilePath = path.resolve(process.cwd(), 'data/tablet_result.json');
  const sessionFilePath = path.resolve(process.cwd(), 'data/pc_session.json');

  const setCorsHeaders = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
    res.setHeader('Content-Type', 'application/json');
  };

  const handleUpload = (req, res, finalPath) => {
    let bodySize = 0;
    const tempId = crypto.randomUUID();
    const tempPath = finalPath + '.' + tempId + '.tmp';

    if (!fs.existsSync(path.dirname(finalPath))) {
      fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    }

    const writeStream = fs.createWriteStream(tempPath, { encoding: 'utf8' });

    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY_SIZE) {
        setCorsHeaders(req, res);
        res.statusCode = 413;
        res.end(JSON.stringify({ success: false, error: `Payload terlalu besar (maks ${MAX_BODY_SIZE / 1024 / 1024}MB)` }));
        req.destroy();
        writeStream.destroy();
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch(e) {}
        return;
      }
    });

    req.pipe(writeStream);

    writeStream.on('finish', async () => {
      try {
        // SQLite sync for result uploads (legacy path only)
        const parsedUrl = new URL(req.url, 'http://localhost');
        if (parsedUrl.pathname === '/api/sync/result') {
          const authUser = req.headers['x-sync-user'] || 'Unknown';
          const rawData = fs.readFileSync(tempPath, 'utf8');
          const jsonData = JSON.parse(rawData);
          
          if (jsonData.periode && jsonData.roomName && Array.isArray(jsonData.assets)) {
             const usernameToUse = jsonData.user || authUser || 'defaultUser';
             await app1Db.syncOpnameData(usernameToUse, jsonData.periode, jsonData.roomName, jsonData.assets);
             console.log(`[SQLite Sync] Successfully saved ${jsonData.assets.length} assets to DB for user ${usernameToUse}`);
          }
        }
        
        // Atomic update of the file
        fs.renameSync(tempPath, finalPath);

        // Write/update meta.json for scoped uploads
        const { userKey, period, sessionId } = extractSyncParams(req);
        if (period && sessionId) {
          try {
            const rawData = fs.readFileSync(finalPath, 'utf8');
            const jsonData = JSON.parse(rawData);
            const metaPath = buildScopedFilePath(userKey, period, sessionId, 'meta.json');
            const meta = {
              sessionId,
              period,
              createdAt: jsonData.sync?.createdAt || new Date().toISOString(),
              createdBy: userKey,
              fileName: jsonData.fileName || jsonData.sync?.fileName || '',
              roomCount: Array.isArray(jsonData.rooms) ? jsonData.rooms.length : 0,
              checkedCount: Array.isArray(jsonData.rooms)
                ? jsonData.rooms.reduce((sum, r) => sum + (r.assets || []).filter(a => a.isChecked).length, 0)
                : 0,
              totalCount: Array.isArray(jsonData.rooms)
                ? jsonData.rooms.reduce((sum, r) => sum + (r.assets || []).length, 0)
                : 0,
              updatedAt: new Date().toISOString(),
            };
            fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
          } catch (metaErr) {
            console.warn('[Sync] Failed to write meta.json:', metaErr.message);
          }
        }
        
        logAudit({ 
            actor: req.user?.username || req.headers['x-sync-user'] || 'UNKNOWN', 
            action: 'SYNC_UPLOAD', 
            target: parsedUrl.pathname === '/api/sync/result' ? 'Opname Result' : 'PC Session', 
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            status: 'SUCCESS' 
        });

        setCorsHeaders(req, res);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Data saved to backend via stream' }));

        if (period && sessionId) {
          broadcastSyncEvent(userKey, period, sessionId);
        }
      } catch (err) {
        console.error('[Network Sync] Processing error:', err);
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch(e) {}
        setCorsHeaders(req, res);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: 'Internal Processing Error: ' + err.message }));
      }
    });

    writeStream.on('error', (err) => {
      console.error('[Network Sync] Error saving data stream:', err);
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch(e) {}
      setCorsHeaders(req, res);
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: err.message }));
    });
  };

  const handleDownload = (req, res, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        setCorsHeaders(req, res);
        res.statusCode = 200;
        
        const parsedUrl = new URL(req.url, 'http://localhost');
        logAudit({ 
            actor: req.user?.username || req.headers['x-sync-user'] || 'UNKNOWN', 
            action: 'SYNC_DOWNLOAD', 
            target: parsedUrl.pathname === '/api/sync/result' ? 'Opname Result' : 'PC Session', 
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            status: 'SUCCESS' 
        });

        const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
        readStream.pipe(res);
        readStream.on('error', (streamErr) => {
          console.error('[Network Sync] Stream error:', streamErr);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: streamErr.message }));
          }
        });
      } else {
        setCorsHeaders(req, res);
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, message: 'No synced data found on server' }));
      }
    } catch (err) {
      console.error('[Network Sync] Error reading data:', err);
      setCorsHeaders(req, res);
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  };

  // --- Routing with URL parsing for query params ---
  const parsedUrl = new URL(req.url, 'http://localhost');
  const pathname = parsedUrl.pathname;

  // SSE endpoint for live sync notifications
  if (pathname === '/api/sync/events' && req.method === 'GET') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
    res.flushHeaders();

    sseClients.add(res);

    // Keep-alive heartbeat every 30s
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
    return;
  }

  // List sessions endpoint
  if (pathname === '/api/sync/sessions' && req.method === 'GET') {
    const { userKey, period } = extractSyncParams(req);
    const sessions = [];
    
    if (!period || period === 'all') {
      // Cross-period scanning
      const sanitize = (s) => (s || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_') || '_empty_';
      const userDir = path.resolve(process.cwd(), 'data/sync/app1', sanitize(userKey));
      
      if (fs.existsSync(userDir)) {
        for (const pEntry of fs.readdirSync(userDir, { withFileTypes: true })) {
          if (pEntry.isDirectory()) {
            const pDir = path.join(userDir, pEntry.name);
            for (const sEntry of fs.readdirSync(pDir, { withFileTypes: true })) {
              if (sEntry.isDirectory()) {
                const metaPath = path.join(pDir, sEntry.name, 'meta.json');
                if (fs.existsSync(metaPath)) {
                  try { sessions.push(JSON.parse(fs.readFileSync(metaPath, 'utf8'))); } catch { }
                }
              }
            }
          }
        }
      }
    } else {
      // Single period scanning
      const periodDir = buildPeriodDir(userKey, period);
      if (fs.existsSync(periodDir)) {
        for (const entry of fs.readdirSync(periodDir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            const metaPath = path.join(periodDir, entry.name, 'meta.json');
            if (fs.existsSync(metaPath)) {
              try { sessions.push(JSON.parse(fs.readFileSync(metaPath, 'utf8'))); } catch { }
            }
          }
        }
      }
    }

    // Sort descending by updatedAt and limit to 10
    sessions.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    const limitedSessions = sessions.slice(0, 10);

    setCorsHeaders(req, res);
    res.statusCode = 200;
    return res.end(JSON.stringify({ success: true, sessions: limitedSessions }));
  }

  // Session push/pull — scoped or legacy
  if (pathname === '/api/sync/session') {
    const { userKey, period, sessionId } = extractSyncParams(req);
    const filePath = (period && sessionId)
      ? buildScopedFilePath(userKey, period, sessionId, 'session.json')
      : sessionFilePath;
    if (req.method === 'POST') return handleUpload(req, res, filePath);
    if (req.method === 'GET') return handleDownload(req, res, filePath);
  }

  // Result push/pull — scoped or legacy
  if (pathname === '/api/sync/result') {
    const { userKey, period, sessionId } = extractSyncParams(req);
    const filePath = (period && sessionId)
      ? buildScopedFilePath(userKey, period, sessionId, 'result.json')
      : resultFilePath;
    if (req.method === 'POST') return handleUpload(req, res, filePath);
    if (req.method === 'GET') return handleDownload(req, res, filePath);
  }

  // SQLite opname-data endpoint (unchanged)
  if (pathname?.startsWith('/api/app1/opname-data/') && req.method === 'GET') {
    return (async () => {
      setCorsHeaders(req, res);
      try {
        const urlParts = pathname.split('/');
        const periode = decodeURIComponent(urlParts[urlParts.length - 1]);
        const authUser = req.headers['x-sync-user'] || 'defaultUser';

        const data = await app1Db.getOpnameDataByPeriode(authUser, periode);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, data }));
      } catch (err) {
        console.error('[SQLite API] Error fetching opname data:', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    })();
  }
  if (handleCorsIfPreflight(req, res, '/api/sync/', 'GET, POST, OPTIONS')) return;

  next();
}

export default function viteSyncPlugin() {
  return {
    name: 'vite-plugin-network-sync',
    configureServer(server) {
      server.middlewares.use(syncMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(syncMiddleware);
    },
  };
}
