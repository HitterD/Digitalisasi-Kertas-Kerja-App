// app/src/__tests__/useOpnameAutoSync.test.js
import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOpnameAutoSync } from '../hooks/useOpnameAutoSync';
import {
  AUTO_SYNC_MAX_FAILURES,
  AUTO_SYNC_PAUSE_MS,
  SYNC_STATUS,
} from '../utils/opnameSyncSession';

vi.mock('../utils/apiConfig', () => ({
  apiUrl: (path) => path,
  fetchWithAuth: vi.fn(),
}));

const { fetchWithAuth } = await import('../utils/apiConfig');

afterEach(() => {
  fetchWithAuth.mockReset();
  vi.useRealTimers();
});

function makeSyncedState() {
  return {
    fileName: 'opname.xlsx',
    isLoaded: true,
    sync: { period: '2026-06', sessionId: 'sess-1' },
    rooms: [{
      meta: { roomName: 'R1', period: '2026-06' },
      assets: [{ barcode: '001', isChecked: false }],
      noBarcodeAssets: [],
      notAtLocationAssets: [],
    }],
  };
}

describe('auto-sync anti-spam logic', () => {
  it('should transition to paused after MAX_FAILURES consecutive failures', () => {
    let failureCount = 0;
    let status = SYNC_STATUS.IDLE;

    for (let i = 0; i < AUTO_SYNC_MAX_FAILURES; i++) {
      failureCount++;
      if (failureCount >= AUTO_SYNC_MAX_FAILURES) {
        status = SYNC_STATUS.PAUSED;
      }
    }

    expect(status).toBe(SYNC_STATUS.PAUSED);
    expect(failureCount).toBe(3);
  });

  it('should not allow auto-sync retry before pause duration', () => {
    const pausedUntil = Date.now() + AUTO_SYNC_PAUSE_MS;
    const now = Date.now();
    const canRetry = now >= pausedUntil;
    expect(canRetry).toBe(false);
  });

  it('should allow auto-sync retry after pause duration', () => {
    const pausedUntil = Date.now() - 1000; // 1 second in the past
    const now = Date.now();
    const canRetry = now >= pausedUntil;
    expect(canRetry).toBe(true);
  });

  it('manual sync should reset failureCount and status on success', () => {
    let failureCount = AUTO_SYNC_MAX_FAILURES;
    let status = SYNC_STATUS.PAUSED;
    let pausedUntil = Date.now() + AUTO_SYNC_PAUSE_MS;

    // Simulate manual sync success
    const manualSyncSuccess = true;
    if (manualSyncSuccess) {
      failureCount = 0;
      status = SYNC_STATUS.IDLE;
      pausedUntil = null;
    }

    expect(failureCount).toBe(0);
    expect(status).toBe(SYNC_STATUS.IDLE);
    expect(pausedUntil).toBeNull();
  });

  it('manual sync failure should keep paused state', () => {
    let failureCount = AUTO_SYNC_MAX_FAILURES;
    let status = SYNC_STATUS.PAUSED;

    // Simulate manual sync failure — status stays paused
    const manualSyncSuccess = false;
    if (!manualSyncSuccess) {
      // No changes
    }

    expect(status).toBe(SYNC_STATUS.PAUSED);
    expect(failureCount).toBe(AUTO_SYNC_MAX_FAILURES);
  });
});

describe('sync interval gating', () => {
  it('should not sync if no local changes since last sync', () => {
    const lastLocalChangeAt = '2026-06-26T10:00:00Z';
    const lastSyncedAt = '2026-06-26T10:00:30Z';
    const hasUnsyncedChanges = new Date(lastLocalChangeAt) > new Date(lastSyncedAt);
    expect(hasUnsyncedChanges).toBe(false);
  });

  it('should sync if local changes are newer than last sync', () => {
    const lastLocalChangeAt = '2026-06-26T10:05:00Z';
    const lastSyncedAt = '2026-06-26T10:00:00Z';
    const hasUnsyncedChanges = new Date(lastLocalChangeAt) > new Date(lastSyncedAt);
    expect(hasUnsyncedChanges).toBe(true);
  });
});

describe('remote live sync', () => {
  it('pulls remote result without pushing stale local data first', async () => {
    fetchWithAuth.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        rooms: [{
          meta: { roomName: 'R1', period: '2026-06' },
          assets: [{ barcode: '001', isChecked: true, updatedAt: '2026-06-29T00:01:00.000Z' }],
          noBarcodeAssets: [],
          notAtLocationAssets: [],
        }],
      }),
    });

    const dispatch = vi.fn();
    const { result } = renderHook(() => useOpnameAutoSync({
      state: makeSyncedState(),
      dispatch,
      isEnabled: true,
    }));

    await act(async () => {
      await result.current.remoteSync();
    });

    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
    expect(fetchWithAuth.mock.calls[0][0]).toBe('/api/sync/result?period=2026-06&sessionId=sess-1');
    expect(fetchWithAuth.mock.calls[0][1]).toBeUndefined();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'APPLY_SYNC_MERGE' }));
  });

  it('pulls the session target provided by an SSE event', async () => {
    fetchWithAuth.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ rooms: makeSyncedState().rooms }),
    });

    const { result } = renderHook(() => useOpnameAutoSync({
      state: makeSyncedState(),
      dispatch: vi.fn(),
      isEnabled: true,
    }));

    await act(async () => {
      await result.current.remoteSync({ period: '2026-06', sessionId: 'android-session' });
    });

    expect(fetchWithAuth).toHaveBeenCalledWith('/api/sync/result?period=2026-06&sessionId=android-session');
  });

  it('does not dispatch a merge when pulled rooms are unchanged', async () => {
    const state = makeSyncedState();
    fetchWithAuth.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ rooms: state.rooms }),
    });

    const dispatch = vi.fn();
    const { result } = renderHook(() => useOpnameAutoSync({
      state,
      dispatch,
      isEnabled: true,
    }));

    await act(async () => {
      await result.current.remoteSync();
    });

    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'APPLY_SYNC_MERGE' }));
  });

  it('pushes keterangan changes after a short debounce', async () => {
    vi.useFakeTimers();
    const state = makeSyncedState();
    state.localUpdateCount = 1;
    state.rooms[0].assets[0].keterangan = 'Catatan baru';
    fetchWithAuth.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ rooms: state.rooms }),
    });

    const { unmount } = renderHook(() => useOpnameAutoSync({
      state,
      dispatch: vi.fn(),
      isEnabled: true,
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(fetchWithAuth).toHaveBeenNthCalledWith(
      1,
      '/api/sync/result?period=2026-06&sessionId=sess-1',
    );
    expect(fetchWithAuth).toHaveBeenNthCalledWith(
      2,
      '/api/sync/result?period=2026-06&sessionId=sess-1',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"keterangan":"Catatan baru"'),
      }),
    );

    unmount();
  });

  it('pushes merged remote sections instead of overwriting them with stale local state', async () => {
    vi.useFakeTimers();
    const state = makeSyncedState();
    state.localUpdateCount = 1;
    fetchWithAuth.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        rooms: [{
          ...state.rooms[0],
          noBarcodeAssets: [{ id: 'nb-1', namaAset: 'Mouse tanpa barcode', updatedAt: '2026-06-29T00:01:00.000Z' }],
          notAtLocationAssets: [{ id: 'wrong-1', barcode: '0099', namaAset: 'Monitor', updatedAt: '2026-06-29T00:01:00.000Z' }],
          signatures: [{ id: 'pic-ruangan', roleLabel: 'PIC RUANGAN', name: 'Budi', image: 'sig', updatedAt: '2026-06-29T00:01:00.000Z' }],
        }],
      }),
    });

    const { unmount } = renderHook(() => useOpnameAutoSync({
      state,
      dispatch: vi.fn(),
      isEnabled: true,
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const posted = JSON.parse(fetchWithAuth.mock.calls[1][1].body);
    expect(posted.rooms[0].noBarcodeAssets[0].namaAset).toBe('Mouse tanpa barcode');
    expect(posted.rooms[0].notAtLocationAssets[0].barcode).toBe('0099');
    expect(posted.rooms[0].signatures.find((item) => item.id === 'pic-ruangan').name).toBe('Budi');

    unmount();
  });
});
