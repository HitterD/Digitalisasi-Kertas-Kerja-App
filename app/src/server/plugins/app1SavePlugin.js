import crypto from 'crypto';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const app1SaveDb = _require('../../../data/app1SaveDb.cjs');
const { 
    getUserSaves, 
    getSaveById, 
    createSave, 
    updateSave, 
    deleteSave 
} = app1SaveDb;

import { createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { logAudit } from '../../utils/logger.js';

function randomUUID() {
    return crypto.randomUUID();
}

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch (e) { reject(e); }
        });
        req.on('error', reject);
    });
}

const app1SaveMiddleware = async (req, res, next) => {
    if (!req.url?.startsWith('/api/app1/saves')) {
        return next();
    }

    const reqPath = req.url.split('?')[0];

    if (handleCorsIfPreflight(req, res, '/api/app1/saves')) return;

    const sendJson = createJsonSender(req, res);

    // Determine logged-in user inside API namespace
    let username = req.user?.username || req.user?.id || req.user?.user || null;
    
    // Fallback for x-sync-user (standard for network hub)
    if (!username) {
        const authHeader = req.headers['x-sync-user'];
        if (authHeader) {
            try {
                const userObj = JSON.parse(authHeader);
                username = userObj.user || userObj.username;
            } catch (e) {
                username = authHeader; // fallback as plain string
            }
        }
    }

    // GET /api/app1/saves
    if (reqPath === '/api/app1/saves' && req.method === 'GET') {
        if (!username) return sendJson(401, { success: false, error: 'Unauthorized: Missing user header/token' });
        try {
            const saves = getUserSaves(username);
            return sendJson(200, { success: true, saves });
        } catch (err) {
            console.error("GET saves error:", err);
            return sendJson(500, { success: false, error: err.message });
        }
    }

    // POST /api/app1/saves (Create new save - Save As)
    if (reqPath === '/api/app1/saves' && req.method === 'POST') {
        if (!username) return sendJson(401, { success: false, error: 'Unauthorized: Missing user header' });
        try {
            const body = await parseJsonBody(req);
            const { name, periode, roomCount, assetCount, stateJson } = body;
            
            if (!name || !stateJson) {
                return sendJson(400, { success: false, error: 'Missing required fields' });
            }

            const id = randomUUID();
            createSave(id, username, name, periode || '', roomCount || 0, assetCount || 0, stateJson);
            
            logAudit({ 
                actor: username, 
                action: 'APP1_SAVE_CREATE', 
                target: `Save: ${name}`, 
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                status: 'SUCCESS' 
            });

            return sendJson(201, { success: true, id, message: 'Saved successfully' });
        } catch (err) {
            return sendJson(500, { success: false, error: err.message });
        }
    }

    // PUT /api/app1/saves/:id (Overwrite / Update Save)
    const putMatch = reqPath.match(/^\/api\/app1\/saves\/([^/?]+)$/);
    if (putMatch && req.method === 'PUT') {
        if (!username) return sendJson(401, { success: false, error: 'Unauthorized: Missing user header' });
        const id = putMatch[1];
        try {
            const body = await parseJsonBody(req);
            const { name, periode, roomCount, assetCount, stateJson } = body;
            
            if (!name || !stateJson) {
                return sendJson(400, { success: false, error: 'Missing required fields' });
            }

            const success = updateSave(id, username, name, periode || '', roomCount || 0, assetCount || 0, stateJson);
            if (!success) {
                return sendJson(404, { success: false, error: 'Save not found or not owned by user' });
            }
            
            logAudit({ 
                actor: username, 
                action: 'APP1_SAVE_UPDATE', 
                target: `Save: ${name}`, 
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                status: 'SUCCESS' 
            });

            return sendJson(200, { success: true, id, message: 'Updated successfully' });
        } catch (err) {
            return sendJson(500, { success: false, error: err.message });
        }
    }

    // GET /api/app1/saves/:id (Load full state)
    const getMatch = reqPath.match(/^\/api\/app1\/saves\/([^/?]+)$/);
    if (getMatch && req.method === 'GET' && reqPath !== '/api/app1/saves') {
        if (!username) return sendJson(401, { success: false, error: 'Unauthorized: Missing user header' });
        const id = getMatch[1];
        try {
            const save = getSaveById(id, username);
            if (!save) {
                return sendJson(404, { success: false, error: 'Save not found' });
            }
            return sendJson(200, { success: true, save });
        } catch (err) {
            return sendJson(500, { success: false, error: err.message });
        }
    }

    // DELETE /api/app1/saves/:id
    const delMatch = reqPath.match(/^\/api\/app1\/saves\/([^/?]+)$/);
    if (delMatch && req.method === 'DELETE') {
        if (!username) return sendJson(401, { success: false, error: 'Unauthorized: Missing user header' });
        const id = delMatch[1];
        try {
            const success = deleteSave(id, username);
            if (!success) {
                return sendJson(404, { success: false, error: 'Save not found or not owned by user' });
            }
            logAudit({ 
                actor: username, 
                action: 'APP1_SAVE_DELETE', 
                target: `Save ID: ${id}`, 
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                status: 'SUCCESS' 
            });
            return sendJson(200, { success: true, message: 'Deleted successfully' });
        } catch (err) {
            return sendJson(500, { success: false, error: err.message });
        }
    }

    // If no matching route but prefix matches
    return sendJson(404, { success: false, error: 'API route not found inside app1 saves' });
};

export default function viteApp1SavePlugin() {
    return {
        name: 'vite-plugin-app1-saves',
        configureServer(server) {
            server.middlewares.use(app1SaveMiddleware);
        },
        configurePreviewServer(server) {
            server.middlewares.use(app1SaveMiddleware);
        }
    };
}
