import fs from 'fs';
import path from 'path';

const LOG_FILE_PATH = path.resolve(process.cwd(), 'data/audit.json');

/**
 * Appends an audit log entry to data/audit.json
 * @param {object} params
 * @param {string} params.actor - Username performing the action
 * @param {string} params.action - The action taken (e.g., 'ADD_USER', 'SYNC_PUSH')
 * @param {string} params.target - What/who is affected
 * @param {string} params.ip - IP address of the request
 * @param {string} params.status - 'SUCCESS' | 'FAILED'
 * @param {object} [params.details] - Detailed diff or extra info
 */
let logQueue = Promise.resolve();

export function logAudit({ actor, action, target, ip, status, details = {} }) {
    logQueue = logQueue.then(async () => {
        try {
            let logs = [];

            // Ensure directory exists
            const dir = path.dirname(LOG_FILE_PATH);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }

            // Read existing logs if file exists
            if (fs.existsSync(LOG_FILE_PATH)) {
                try {
                    const content = await fs.promises.readFile(LOG_FILE_PATH, 'utf8');
                    logs = JSON.parse(content || '[]');
                } catch (err) {
                    console.error('[Audit Logger] Failed to parse existing audit.json', err);
                    logs = []; // fallback to empty array if corrupted
                }
            }

            // Create new log entry
            const entry = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
                timestamp: new Date().toISOString(),
                actor: actor || 'SYSTEM',
                action,
                target,
                ip: ip || 'UNKNOWN',
                status,
                details
            };

            // Prepend new log (newest first) or append. Appending is usually faster, we'll order on UI.
            logs.push(entry);

            // Limit log file size in memory for simplicity (e.g., keep last 5000 records)
            if (logs.length > 5000) {
                logs = logs.slice(-5000);
            }

            // Write back
            await fs.promises.writeFile(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf8');

        } catch (err) {
            console.error('[Audit Logger] FATAL ERROR writing to audit log:', err);
        }
    }).catch(err => {
        console.error('[Audit Logger] Queue error:', err);
    });
}
