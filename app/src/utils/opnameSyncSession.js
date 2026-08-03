/**
 * Sync session helpers for APP1 Opname auto-sync & session isolation.
 * Pure utilities — no React, no side effects.
 */

// --- Constants ---

export const SYNC_STATUS = Object.freeze({
  IDLE: 'idle',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  ERROR: 'error',
  PAUSED: 'paused',
});

export const AUTO_SYNC_MAX_FAILURES = 3;
export const AUTO_SYNC_PAUSE_MS = 60 * 60 * 1000; // 60 minutes
export const AUTO_SYNC_INTERVAL_MS = 30 * 1000;    // 30 seconds

// --- Helpers ---

/**
 * Create a compact date string from ISO timestamp.
 * "2026-06-26T09:05:00.000Z" → "20260626T090500Z"
 */
function compactIso(isoString) {
  return isoString.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Simple deterministic short hash from a string.
 * Returns a 6-char hex string.
 */
function shortHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash).toString(16).padStart(6, '0').slice(0, 6);
}

/**
 * Create a syncSessionId.
 * Format: <periodKey>-<createdAtCompact>-<shortHash>
 * @param {string} periodKey — e.g. "2026-06"
 * @param {string} createdAt — ISO string e.g. "2026-06-26T09:05:00.000Z"
 * @returns {string}
 */
export function createSyncSessionId(periodKey, createdAt) {
  const compact = compactIso(createdAt);
  const hash = shortHash(periodKey + createdAt);
  return `${periodKey}-${compact}-${hash}`;
}

/**
 * Sanitize a string for safe use as a filesystem path segment.
 * Keeps alphanumeric, dash, underscore, dot. Replaces everything else with '_'.
 */
export function sanitizePathSegment(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return '_empty_';
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Build URL query string for sync API calls.
 * @param {{ period: string, sessionId: string }} params
 * @returns {string} e.g. "?period=2026-06&sessionId=abc"
 */
export function buildSyncParams({ period, sessionId }) {
  return `?period=${encodeURIComponent(period)}&sessionId=${encodeURIComponent(sessionId)}`;
}

/**
 * Create initial sync metadata for a new opname session.
 * @param {{ period: string, username: string }} opts
 * @returns {object} SyncMetadata
 */
export function createSyncMetadata({ period, username }) {
  const now = new Date().toISOString();
  const sessionId = createSyncSessionId(period, now);
  return {
    sessionId,
    createdAt: now,
    createdBy: username,
    period,
    lastLocalChangeAt: now,
    lastSyncedAt: null,
    status: SYNC_STATUS.IDLE,
    lastError: '',
    failureCount: 0,
    pausedUntil: null,
  };
}
