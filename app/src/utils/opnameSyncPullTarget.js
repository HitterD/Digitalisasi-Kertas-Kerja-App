import { createSyncMetadata } from './opnameSyncSession';

export function getCurrentSyncTarget(state) {
  const period = state?.sync?.period;
  const sessionId = state?.sync?.sessionId;
  if (!period || !sessionId) return null;
  return { period, sessionId };
}

export function getLatestSessionTarget(sessions) {
  const validSessions = (Array.isArray(sessions) ? sessions : [])
    .filter((session) => session?.period && session?.sessionId)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  const latest = validSessions[0];
  if (!latest) return null;
  return { period: latest.period, sessionId: latest.sessionId };
}

export function hasRoomsToImport(data) {
  return Array.isArray(data?.rooms) && data.rooms.length > 0;
}

export function ensureSyncTarget(state, username = 'defaultUser') {
  const currentTarget = getCurrentSyncTarget(state);
  if (currentTarget) {
    return { sync: state.sync, target: currentTarget };
  }

  const period = state?.rooms?.[0]?.meta?.period || 'unknown-period';
  const sync = createSyncMetadata({ period, username });
  return {
    sync,
    target: { period: sync.period, sessionId: sync.sessionId },
  };
}
