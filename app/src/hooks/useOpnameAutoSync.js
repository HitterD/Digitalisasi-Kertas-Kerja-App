import { useState, useEffect, useRef, useCallback } from 'react';
import { apiUrl, fetchWithAuth } from '../utils/apiConfig';
import {
  buildSyncParams,
  SYNC_STATUS,
  AUTO_SYNC_MAX_FAILURES,
  AUTO_SYNC_PAUSE_MS,
  AUTO_SYNC_INTERVAL_MS,
} from '../utils/opnameSyncSession';
import { mergeOpnameResult } from '../utils/opnameSyncMerge';
import { ensureSyncTarget } from '../utils/opnameSyncPullTarget';

const LOCAL_SYNC_DEBOUNCE_MS = 500;

/**
 * Auto-sync hook for APP1 Opname.
 * Polls server every 30s, pushes local changes, pulls remote changes, merges.
 * Anti-spam: pauses after 3 failures for 60 minutes.
 *
 * @param {object} options
 * @param {object} options.state — opname state (must have .sync, .rooms, .fileName)
 * @param {Function} options.dispatch — opname reducer dispatch
 * @param {boolean} options.isEnabled — master on/off
 * @returns {{ syncStatus: string, manualSync: () => Promise<void>, remoteSync: () => Promise<void>, lastError: string }}
 */
export function useOpnameAutoSync({ state, dispatch, isEnabled }) {
  const [syncStatus, setSyncStatus] = useState(SYNC_STATUS.IDLE);
  const [lastError, setLastError] = useState('');
  const failureCountRef = useRef(0);
  const pausedUntilRef = useRef(null);
  const isSyncingRef = useRef(false);
  const intervalRef = useRef(null);

  const syncMeta = state.sync;

  const activeSessionIdRef = useRef(state.sync?.sessionId);

  useEffect(() => {
    activeSessionIdRef.current = state.sync?.sessionId;
  }, [state.sync?.sessionId]);

  /**
   * Core sync: push local → pull remote → merge.
   * @param {boolean} isManual — true if triggered by button click
   */
  const doSync = useCallback(async (isManual = false, shouldPush = true, targetOverride = null) => {
    if (isSyncingRef.current || !state.rooms?.length) return;
    const { sync, target } = ensureSyncTarget(state);
    const syncTarget = targetOverride?.period && targetOverride?.sessionId
      ? { period: targetOverride.period, sessionId: targetOverride.sessionId }
      : target;
    if (!state.sync) {
      dispatch({ type: 'INIT_SYNC', payload: sync });
    }

    // Check pause (only for auto, manual always allowed)
    if (!isManual && pausedUntilRef.current && Date.now() < pausedUntilRef.current) {
      return;
    }

    isSyncingRef.current = true;
    setSyncStatus(SYNC_STATUS.SYNCING);
    dispatch({ type: 'UPDATE_SYNC_STATUS', payload: { status: SYNC_STATUS.SYNCING } });

    try {
      const params = buildSyncParams(syncTarget);

      let roomsForPush = state.rooms;

      // 1. Pull remote result first so stale local state cannot overwrite another device.
      const pullRes = await fetchWithAuth(apiUrl(`/api/sync/result${params}`));
      
      // Prevent race condition: if session changed (e.g. user clicked Mulai Baru) during fetch
      if (!targetOverride && activeSessionIdRef.current !== syncTarget.sessionId) {
        console.warn('[AutoSync] Active session changed during fetch. Aborting merge to prevent cross-session contamination.');
        return;
      }

      if (!pullRes.ok && pullRes.status !== 404) {
        const errorData = await pullRes.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Gagal menarik data sync');
      }
      const remoteData = pullRes.ok ? await pullRes.json() : null;

      // 2. Merge if remote has data
      if (remoteData && remoteData.rooms) {
        const local = { rooms: state.rooms };
        const remote = { rooms: remoteData.rooms };
        const { merged, conflicts } = mergeOpnameResult(local, remote);
        roomsForPush = merged.rooms;

        if (conflicts.length > 0) {
          console.info('[AutoSync] Conflicts resolved:', conflicts.length);
        }

        if (JSON.stringify(merged.rooms) !== JSON.stringify(state.rooms)) {
          dispatch({
            type: 'APPLY_SYNC_MERGE',
            payload: {
              rooms: merged.rooms,
              conflicts,
              lastSyncedAt: new Date().toISOString(),
            },
          });
        }
      }

      // 3. Push merged result, except when reacting to another client's update.
      if (shouldPush) {
        // Double check session hasn't changed before pushing
        if (!targetOverride && activeSessionIdRef.current !== syncTarget.sessionId) {
            console.warn('[AutoSync] Active session changed before push. Aborting push.');
            return;
        }

        const pushPayload = {
          fileName: state.fileName,
          rooms: roomsForPush,
          sync,
        };
        await fetchWithAuth(apiUrl(`/api/sync/result${params}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pushPayload),
        });
      }

      // Success
      failureCountRef.current = 0;
      pausedUntilRef.current = null;
      setSyncStatus(SYNC_STATUS.IDLE);
      setLastError('');
      dispatch({
        type: 'UPDATE_SYNC_STATUS',
        payload: {
          status: SYNC_STATUS.IDLE,
          failureCount: 0,
          pausedUntil: null,
          lastSyncedAt: new Date().toISOString(),
          lastError: '',
        },
      });
    } catch (err) {
      const errMsg = err.message || 'Sync failed';
      failureCountRef.current++;

      if (failureCountRef.current >= AUTO_SYNC_MAX_FAILURES) {
        const until = Date.now() + AUTO_SYNC_PAUSE_MS;
        pausedUntilRef.current = until;
        setSyncStatus(SYNC_STATUS.PAUSED);
        dispatch({
          type: 'UPDATE_SYNC_STATUS',
          payload: {
            status: SYNC_STATUS.PAUSED,
            failureCount: failureCountRef.current,
            pausedUntil: new Date(until).toISOString(),
            lastError: errMsg,
          },
        });
      } else {
        setSyncStatus(SYNC_STATUS.ERROR);
        dispatch({
          type: 'UPDATE_SYNC_STATUS',
          payload: {
            status: SYNC_STATUS.ERROR,
            failureCount: failureCountRef.current,
            lastError: errMsg,
          },
        });
      }
      setLastError(errMsg);
    } finally {
      isSyncingRef.current = false;
    }
  }, [state, dispatch]);

  // Manual sync entrypoint
  const manualSync = useCallback(async () => {
    await doSync(true);
  }, [doSync]);

  const remoteSync = useCallback(async (targetOverride) => {
    await doSync(true, false, targetOverride);
  }, [doSync]);

  // Auto-sync polling
  useEffect(() => {
    if (!isEnabled || !syncMeta?.sessionId) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      // Check if paused and if pause has expired
      if (pausedUntilRef.current) {
        if (Date.now() >= pausedUntilRef.current) {
          pausedUntilRef.current = null;
          failureCountRef.current = 0;
          doSync(false);
        }
        return; // Still paused
      }
      doSync(false);
    }, AUTO_SYNC_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [isEnabled, syncMeta?.sessionId, doSync]);

  const localUpdateCount = state.localUpdateCount || 0;
  
  // Instant trigger on local modification (with debounce)
  useEffect(() => {
    if (!isEnabled || !syncMeta?.sessionId || localUpdateCount === 0) return;
    
    // Short debounce keeps text fields live without pushing every keystroke.
    const timeout = setTimeout(() => {
      doSync(true); // Bypass pauses for direct user actions
    }, LOCAL_SYNC_DEBOUNCE_MS);
    
    return () => clearTimeout(timeout);
  }, [isEnabled, syncMeta?.sessionId, localUpdateCount, doSync]);

  return { syncStatus, manualSync, remoteSync, lastError };
}
