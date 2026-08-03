import { describe, expect, it } from 'vitest';
import {
  ensureSyncTarget,
  getCurrentSyncTarget,
  getLatestSessionTarget,
  hasRoomsToImport,
} from '../utils/opnameSyncPullTarget';

describe('opname sync pull target', () => {
  it('uses current state sync metadata when sessionId and period exist', () => {
    expect(getCurrentSyncTarget({
      sync: { period: '2026-06', sessionId: 'sess-web' },
    })).toEqual({ period: '2026-06', sessionId: 'sess-web' });
  });

  it('returns null when current sync metadata is missing', () => {
    expect(getCurrentSyncTarget({ rooms: [] })).toBeNull();
    expect(getCurrentSyncTarget({ sync: { period: '2026-06' } })).toBeNull();
    expect(getCurrentSyncTarget({ sync: { sessionId: 'sess-only' } })).toBeNull();
  });

  it('uses newest listed session as fallback target', () => {
    const sessions = [
      { period: '2026-06', sessionId: 'old', updatedAt: '2026-06-26T08:00:00.000Z' },
      { period: '2026-06', sessionId: 'new', updatedAt: '2026-06-26T09:00:00.000Z' },
    ];

    expect(getLatestSessionTarget(sessions)).toEqual({ period: '2026-06', sessionId: 'new' });
  });

  it('ignores sessions without period or sessionId', () => {
    const sessions = [
      { period: '2026-06', updatedAt: '2026-06-26T10:00:00.000Z' },
      { sessionId: 'missing-period', updatedAt: '2026-06-26T11:00:00.000Z' },
      { period: '2026-06', sessionId: 'valid', updatedAt: '2026-06-26T09:00:00.000Z' },
    ];

    expect(getLatestSessionTarget(sessions)).toEqual({ period: '2026-06', sessionId: 'valid' });
  });

  it('creates sync metadata from room period when state has no sync', () => {
    const result = ensureSyncTarget({
      fileName: 'Opname Juni.xlsx',
      rooms: [{ meta: { period: '2026-06' } }],
    }, 'admin');

    expect(result.target.period).toBe('2026-06');
    expect(result.target.sessionId).toMatch(/^2026-06-/);
    expect(result.sync.period).toBe('2026-06');
    expect(result.sync.createdBy).toBe('admin');
  });

  it('keeps existing sync metadata when present', () => {
    const sync = { period: '2026-06', sessionId: 'sess-existing', createdBy: 'admin' };
    const result = ensureSyncTarget({ sync }, 'admin');

    expect(result).toEqual({
      sync,
      target: { period: '2026-06', sessionId: 'sess-existing' },
    });
  });

  it('rejects empty rooms payload so pull result cannot wipe local opname data', () => {
    expect(hasRoomsToImport({ rooms: [] })).toBe(false);
    expect(hasRoomsToImport({ rooms: [{ assets: [] }] })).toBe(true);
  });
});
