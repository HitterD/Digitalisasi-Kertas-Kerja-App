import path from 'path';
import process from 'process';

const SYNC_BASE = 'data/sync/app1';

/**
 * Sanitize a string for safe filesystem path usage.
 */
export function sanitize(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return '_empty_';
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Build scoped file path for sync data.
 * @param {string} userKey
 * @param {string} periodKey
 * @param {string} sessionId
 * @param {string} file — 'session.json' | 'result.json' | 'meta.json'
 * @returns {string} absolute path
 */
export function buildScopedFilePath(userKey, periodKey, sessionId, file) {
  return path.resolve(
    process.cwd(),
    SYNC_BASE,
    sanitize(userKey),
    sanitize(periodKey),
    sanitize(sessionId),
    file
  );
}

/**
 * Build base directory for a user+period to list sessions.
 */
export function buildPeriodDir(userKey, periodKey) {
  return path.resolve(process.cwd(), SYNC_BASE, sanitize(userKey), sanitize(periodKey));
}

/**
 * Extract sync params from request URL and headers.
 * @param {object} req
 * @returns {{ userKey: string, period: string|null, sessionId: string|null }}
 */
export function extractSyncParams(req) {
  const urlString = req.originalUrl || req.url;
  const url = new URL(urlString, 'http://localhost');
  const period = url.searchParams.get('period') || null;
  const sessionId = url.searchParams.get('sessionId') || null;
  const userKey = req.user?.username || req.headers['x-sync-user'] || 'defaultUser';
  return { userKey, period, sessionId };
}
