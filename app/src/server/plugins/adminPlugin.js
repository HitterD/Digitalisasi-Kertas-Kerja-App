import fs from 'fs';
import path from 'path';
import process from 'process';
import os from 'os';
import crypto from 'crypto';
import { createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { logAudit } from '../../utils/logger.js';

function adminMiddleware(req, res, next) {
    const sendJson = createJsonSender(req, res);
    
    // Only intercept /api/admin/* and /api/audit-logs
    if (!req.url?.startsWith('/api/admin') && !req.url?.startsWith('/api/audit-logs')) {
        return next();
    }

    if (handleCorsIfPreflight(req, res, req.url, 'GET, POST, PUT, DELETE, OPTIONS')) return;

    // Must be admin for these endpoints
    // jwtAuthPlugin attaches req.user
    if (!req.user || req.user.role !== 'admin') {
        return sendJson(403, { success: false, error: 'Akses ditolak: Hanya untuk Administrator' });
    }

    const dataDir = path.resolve(process.cwd(), 'data');
    const backupsDir = path.join(dataDir, 'backups');
    const auditFilePath = path.join(dataDir, 'audit.json');
    const usersFilePath = path.join(dataDir, 'users.json');

    // Helper: Ensure backups dir exists
    const ensureBackupsDir = () => {
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }
    };

    // ==========================================
    // 1. AUDIT LOGS ENDPOINTS
    // ==========================================
    if (req.url?.startsWith('/api/audit-logs')) {
        let dbLogs = [];
        if (fs.existsSync(auditFilePath)) {
            try {
                dbLogs = JSON.parse(fs.readFileSync(auditFilePath, 'utf8'));
            } catch (err) {
                console.error('[Admin API] Error parsing audit.json:', err);
                dbLogs = [];
            }
        }

        if (req.url === '/api/audit-logs/stats' && req.method === 'GET') {
            const stats = {
                total: dbLogs.length,
                byAction: {},
                recentFailures: 0
            };
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;

            dbLogs.forEach(log => {
                stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
                if (log.status === 'FAILED' && now - new Date(log.timestamp).getTime() <= oneDayMs) {
                    stats.recentFailures++;
                }
            });

            return sendJson(200, { success: true, stats });
        }

        if (req.method === 'GET') {
            // Parse query string manually
            const urlParts = req.url.split('?');
            const queryParams = new URLSearchParams(urlParts[1] || '');
            
            const page = parseInt(queryParams.get('page') || '1', 10);
            const limit = parseInt(queryParams.get('limit') || '50', 10);
            const action = queryParams.get('action');
            const actor = queryParams.get('actor');
            const search = queryParams.get('search')?.toLowerCase();
            const dateFrom = queryParams.get('dateFrom');
            const dateTo = queryParams.get('dateTo');

            let filtered = dbLogs;

            // Apply filters
            if (action) filtered = filtered.filter(l => l.action === action);
            if (actor) filtered = filtered.filter(l => l.actor === actor);
            if (dateFrom) filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(dateFrom));
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                filtered = filtered.filter(l => new Date(l.timestamp) <= toDate);
            }
            if (search) {
                filtered = filtered.filter(l => 
                    (l.target && l.target.toLowerCase().includes(search)) ||
                    (l.actor && l.actor.toLowerCase().includes(search)) ||
                    (l.action && l.action.toLowerCase().includes(search)) ||
                    JSON.stringify(l.details || {}).toLowerCase().includes(search)
                );
            }

            // Pagination
            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
            const total = filtered.length;
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedLogs = filtered.slice(startIndex, endIndex);

            return sendJson(200, { 
                success: true, 
                logs: paginatedLogs, 
                pagination: { total, page, limit, pages: Math.ceil(total / limit) }
            });
        }
    }

    // ==========================================
    // 2. SYSTEM INFO
    // ==========================================
    if (req.url === '/api/admin/system-info' && req.method === 'GET') {
        try {
            ensureBackupsDir();
            // Get user count
            let userCount = 0;
            if (fs.existsSync(usersFilePath)) {
                userCount = JSON.parse(fs.readFileSync(usersFilePath, 'utf8')).length;
            }

            // Calculate data dir sizes
            let dataSize = 0;
            let dbCount = 0;
            let backupCount = 0;
            let lastBackup = null;

            if (fs.existsSync(dataDir)) {
                const files = fs.readdirSync(dataDir);
                files.forEach(file => {
                    const filePath = path.join(dataDir, file);
                    const stats = fs.statSync(filePath);
                    if (stats.isFile()) {
                        dataSize += stats.size;
                        if (file.endsWith('.db')) dbCount++;
                    }
                });
            }

            if (fs.existsSync(backupsDir)) {
                const backups = fs.readdirSync(backupsDir).filter(f => f.endsWith('.zip') || f.endsWith('.bak'));
                backupCount = backups.length;
                if (backupCount > 0) {
                    const sorted = backups.map(f => ({
                        name: f,
                        time: fs.statSync(path.join(backupsDir, f)).mtime.getTime()
                    })).sort((a, b) => b.time - a.time);
                    lastBackup = sorted[0].time;
                }
            }

            const info = {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                os: {
                    platform: os.platform(),
                    release: os.release(),
                    totalmem: os.totalmem(),
                    freemem: os.freemem(),
                },
                appStats: {
                    userCount,
                    dbCount,
                    dataSize,
                    backupCount,
                    lastBackup
                }
            };

            return sendJson(200, { success: true, info });
        } catch (err) {
            console.error('[Admin API] System info error:', err);
            return sendJson(500, { success: false, error: err.message });
        }
    }

    // ==========================================
    // 3. BACKUP AND RECOVERY
    // ==========================================
    if (req.url === '/api/admin/backup' && req.method === 'POST') {
        try {
            ensureBackupsDir();
            import('archiver').then(archiver => {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFilename = `backup_${timestamp}.zip`;
                const backupPath = path.join(backupsDir, backupFilename);
                
                const output = fs.createWriteStream(backupPath);
                const archive = archiver.default('zip', { zlib: { level: 9 } });

                output.on('close', () => {
                    const sizeBytes = archive.pointer();
                    logAudit({ 
                        actor: req.user.username, 
                        action: 'SYSTEM_BACKUP', 
                        target: backupFilename, 
                        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                        status: 'SUCCESS',
                        details: { sizeBytes }
                    });
                    sendJson(200, { success: true, message: 'Backup berhasil dibuat', filename: backupFilename, size: sizeBytes });
                });

                archive.on('error', (err) => {
                    throw err;
                });

                archive.pipe(output);

                // Add all files in data directory (except backups folder itself)
                fs.readdirSync(dataDir).forEach(file => {
                    const fullPath = path.join(dataDir, file);
                    if (fs.statSync(fullPath).isFile()) {
                        archive.file(fullPath, { name: file });
                    }
                });

                archive.finalize();
            }).catch(err => {
                // If archiver not installed, fallback to simple copy
                console.warn('[Admin API] archiver not found. Falling back to folder copy.');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFolderName = `backup_${timestamp}`;
                const currBackupDir = path.join(backupsDir, backupFolderName);
                fs.mkdirSync(currBackupDir, { recursive: true });

                fs.readdirSync(dataDir).forEach(file => {
                    const source = path.join(dataDir, file);
                    if (fs.statSync(source).isFile() && !file.endsWith('-shm') && !file.endsWith('-wal')) { // avoid copying open wal/shm
                         fs.copyFileSync(source, path.join(currBackupDir, file));
                    }
                });
                
                logAudit({ 
                    actor: req.user.username, 
                    action: 'SYSTEM_BACKUP', 
                    target: backupFolderName, 
                    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                    status: 'SUCCESS',
                    details: { type: 'folder_copy' }
                });

                sendJson(200, { success: true, message: 'Backup (Copy) berhasil dibuat', filename: backupFolderName });
            });
            return;
        } catch (err) {
            console.error('[Admin API] Backup error:', err);
            logAudit({ 
                actor: req.user.username, 
                action: 'SYSTEM_BACKUP', 
                target: 'Database', 
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                status: 'FAILED',
                details: { error: err.message }
            });
            return sendJson(500, { success: false, error: err.message });
        }
    }

    if (req.url === '/api/admin/backups' && req.method === 'GET') {
        try {
            ensureBackupsDir();
            const backups = fs.readdirSync(backupsDir).map(name => {
                const fullPath = path.join(backupsDir, name);
                const stats = fs.statSync(fullPath);
                return {
                    name,
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime
                };
            }).sort((a, b) => b.modifiedAt - a.modifiedAt);

            return sendJson(200, { success: true, backups });
        } catch (err) {
            console.error('[Admin API] List backups error:', err);
            return sendJson(500, { success: false, error: err.message });
        }
    }

    if (req.url?.startsWith('/api/admin/backups/') && req.method === 'DELETE') {
        const filename = decodeURIComponent(req.url.split('/').pop());
        try {
            const targetPath = path.join(backupsDir, filename);
            if (!fs.existsSync(targetPath)) {
                return sendJson(404, { success: false, error: 'Backup tidak ditemukan' });
            }

            if (fs.statSync(targetPath).isDirectory()) {
                fs.rmSync(targetPath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(targetPath);
            }

            logAudit({ 
                actor: req.user.username, 
                action: 'SYSTEM_BACKUP_DELETE', 
                target: filename, 
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                status: 'SUCCESS'
            });

            return sendJson(200, { success: true, message: 'Backup berhasil dihapus' });
        } catch (err) {
            console.error('[Admin API] Delete backup error:', err);
            return sendJson(500, { success: false, error: err.message });
        }
    }

    if (req.url?.startsWith('/api/admin/restore/') && req.method === 'POST') {
        const filename = decodeURIComponent(req.url.split('/').pop());
        try {
            const extractPath = path.join(backupsDir, filename);
            
            // Check if directory copy backup
            if (fs.existsSync(extractPath) && fs.statSync(extractPath).isDirectory()) {
                // Copy back to dataDir
                fs.readdirSync(extractPath).forEach(file => {
                    if (fs.statSync(path.join(extractPath, file)).isFile()) {
                        fs.copyFileSync(path.join(extractPath, file), path.join(dataDir, file));
                    }
                });

                logAudit({ 
                    actor: req.user.username, 
                    action: 'SYSTEM_RESTORE', 
                    target: filename, 
                    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                    status: 'SUCCESS'
                });
                return sendJson(200, { success: true, message: 'Restore berhasil dilakukan.' });

            } else {
                // Ignore zip for now as it's harder to do without external unzip deps seamlessly
                // Archiver only zips, unzipping in pure JS is hard without AdmZip.
                // We'll tell user to manually extract if it's zip.
                if (filename.endsWith('.zip')) {
                     return sendJson(400, { success: false, error: 'Silakan un-zip file secara manual ke folder data/ untuk me-restore karena format zip membutuhkan library ekstra.' });
                }
            }

            return sendJson(404, { success: false, error: 'Backup tidak kompatibel atau tidak ditemukan' });

        } catch (err) {
            console.error('[Admin API] Restore error:', err);
            logAudit({ 
                actor: req.user.username, 
                action: 'SYSTEM_RESTORE', 
                target: filename, 
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                status: 'FAILED',
                details: { error: err.message }
            });
            return sendJson(500, { success: false, error: err.message });
        }
    }

    next();
}

export default function viteAdminPlugin() {
    return {
        name: 'vite-plugin-admin',
        configureServer(server) {
            server.middlewares.use(adminMiddleware);
        },
        configurePreviewServer(server) {
            server.middlewares.use(adminMiddleware);
        },
    };
}
