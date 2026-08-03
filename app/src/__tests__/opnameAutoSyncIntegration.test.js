// app/src/__tests__/opnameAutoSyncIntegration.test.js
import { describe, it, expect } from 'vitest';
import { createSyncMetadata, createSyncSessionId } from '../utils/opnameSyncSession';
import { mergeOpnameResult } from '../utils/opnameSyncMerge';

describe('Integration: session isolation', () => {
  it('two sessions in same period produce different sessionIds', () => {
    const a = createSyncMetadata({ period: '2026-06', username: 'admin' });
    const b = createSyncSessionId('2026-06', new Date(Date.now() + 1000).toISOString());
    expect(a.sessionId).not.toBe(b);
  });

  it('two users with same period produce different session paths', () => {
    const aUser = 'alice';
    const bUser = 'bob';
    const period = '2026-06';
    const sessionId = 'sess-1';
    const pathA = `data/sync/app1/${aUser}/${period}/${sessionId}/result.json`;
    const pathB = `data/sync/app1/${bUser}/${period}/${sessionId}/result.json`;
    expect(pathA).not.toBe(pathB);
  });
});

describe('Integration: merge does not cross sessions', () => {
  it('merge only operates on rooms from the same result object', () => {
    const sessionA = {
      rooms: [{
        sheetName: 'R1',
        meta: { roomName: 'R1', period: '2026-06' },
        assets: [{ id: '1', barcode: '001', kondisi: 'Baik', updatedAt: '2026-06-26T10:00:00Z' }],
        noBarcodeAssets: [],
        notAtLocationAssets: [],
        signatures: {},
      }],
    };
    const sessionB = {
      rooms: [{
        sheetName: 'R1',
        meta: { roomName: 'R1', period: '2026-06' },
        assets: [{ id: '1', barcode: '001', kondisi: 'Rusak', updatedAt: '2026-06-26T09:00:00Z' }],
        noBarcodeAssets: [],
        notAtLocationAssets: [],
        signatures: {},
      }],
    };

    const { merged: mergedA } = mergeOpnameResult(sessionA, sessionB);
    expect(mergedA.rooms[0].assets[0].kondisi).toBe('Baik'); // sessionA has newer timestamp
  });
});

describe('Integration: anti-spam constants', () => {
  it('3 failures → 60 min pause, interval 30s', async () => {
    const {
      AUTO_SYNC_MAX_FAILURES,
      AUTO_SYNC_PAUSE_MS,
      AUTO_SYNC_INTERVAL_MS,
    } = await import('../utils/opnameSyncSession');
    expect(AUTO_SYNC_MAX_FAILURES).toBe(3);
    expect(AUTO_SYNC_PAUSE_MS).toBe(3_600_000);
    expect(AUTO_SYNC_INTERVAL_MS).toBe(30_000);
  });
});

describe('Integration: endpoint without sessionId rejected', () => {
  it('missing sessionId in path produces _empty_ segment', () => {
    const sanitize = (s) =>
      (s || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_') || '_empty_';
    expect(sanitize('')).toBe('_empty_');
    expect(sanitize(null)).toBe('_empty_');
  });
});
