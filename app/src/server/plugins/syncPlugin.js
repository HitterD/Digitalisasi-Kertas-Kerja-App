import fs from 'fs';
import path from 'path';
import process from 'process';
import crypto from 'crypto';
import { createRequire } from 'module';
import { getAllowedOrigin, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { logAudit } from '../../utils/logger.js';

const _require = createRequire(import.meta.url);
const app1Db = _require('../../../data/app1Db.cjs');

const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50MB limit

function syncMiddleware(req, res, next) {
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
        if (req.url === '/api/sync/result') {
          const authUser = req.headers['x-sync-user'] || 'Unknown';
          const rawData = fs.readFileSync(tempPath, 'utf8');
          const jsonData = JSON.parse(rawData);
          
          if (jsonData.periode && jsonData.roomName && Array.isArray(jsonData.assets)) {
             const usernameToUse = jsonData.user || authUser || 'defaultUser';
             await app1Db.syncOpnameData(usernameToUse, jsonData.periode, jsonData.roomName, jsonData.assets);
             console.log(`[SQLite Sync] Successfully saved ${jsonData.assets.length} assets to DB for user ${usernameToUse}`);
          }
        }
        
        // Atomic update of the 'latest' file for GET requests
        fs.renameSync(tempPath, finalPath);
        
        logAudit({ 
            actor: req.user?.username || req.headers['x-sync-user'] || 'UNKNOWN', 
            action: 'SYNC_UPLOAD', 
            target: req.url === '/api/sync/result' ? 'Opname Result' : 'PC Session', 
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            status: 'SUCCESS' 
        });

        setCorsHeaders(req, res);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Data saved to backend via stream' }));
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
        
        logAudit({ 
            actor: req.user?.username || req.headers['x-sync-user'] || 'UNKNOWN', 
            action: 'SYNC_DOWNLOAD', 
            target: req.url === '/api/sync/result' ? 'Opname Result' : 'PC Session', 
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

  if (req.url === '/api/sync/session' && req.method === 'POST') return handleUpload(req, res, sessionFilePath);
  if (req.url === '/api/sync/session' && req.method === 'GET') return handleDownload(req, res, sessionFilePath);
  if (req.url === '/api/sync/result' && req.method === 'POST') return handleUpload(req, res, resultFilePath);
  if (req.url === '/api/sync/result' && req.method === 'GET') return handleDownload(req, res, resultFilePath);

  if (req.url?.startsWith('/api/app1/opname-data/') && req.method === 'GET') {
    return (async () => {
      setCorsHeaders(req, res);
      try {
        const urlParts = req.url.split('/');
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
