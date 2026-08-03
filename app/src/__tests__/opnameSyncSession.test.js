// app/src/__tests__/opnameSyncSession.test.js
import { describe, it, expect } from 'vitest';
import {
  createSyncSessionId,
  sanitizePathSegment,
  buildSyncParams,
  createSyncMetadata,
  SYNC_STATUS,
  AUTO_SYNC_MAX_FAILURES,
  AUTO_SYNC_PAUSE_MS,
  AUTO_SYNC_INTERVAL_MS,
} from '../utils/opnameSyncSession';

describe('createSyncSessionId', () => {
  it('should produce <periodKey>-<compactDate>-<shortHash> format', () => {
    const id = createSyncSessionId('2026-06', '2026-06-26T09:05:00.000Z');
    expect(id).toMatch(/^2026-06-\d{8}T\d{6}Z-[a-f0-9]{6}$/);
  });

  it('should be deterministic for same inputs', () => {
    const a = createSyncSessionId('2026-06', '2026-06-26T09:05:00.000Z');
    const b = createSyncSessionId('2026-06', '2026-06-26T09:05:00.000Z');
    expect(a).toBe(b);
  });

  it('should differ when createdAt differs (same period)', () => {
    const a = createSyncSessionId('2026-06', '2026-06-26T09:05:00.000Z');
    const b = createSyncSessionId('2026-06', '2026-06-26T10:00:00.000Z');
    expect(a).not.toBe(b);
  });
});

describe('sanitizePathSegment', () => {
  it('should replace unsafe path chars', () => {
    expect(sanitizePathSegment('user@name/test')).toBe('user_name_test');
  });
  it('should keep alphanumeric, dash, underscore, dot', () => {
    expect(sanitizePathSegment('valid-name_01.txt')).toBe('valid-name_01.txt');
  });
  it('should trim whitespace', () => {
    expect(sanitizePathSegment('  spaced  ')).toBe('spaced');
  });
  it('should return _empty_ for empty string', () => {
    expect(sanitizePathSegment('')).toBe('_empty_');
  });
});

describe('buildSyncParams', () => {
  it('should build query string with period and sessionId', () => {
    const qs = buildSyncParams({ period: '2026-06', sessionId: 'abc-123' });
    expect(qs).toBe('?period=2026-06&sessionId=abc-123');
  });
});

describe('createSyncMetadata', () => {
  it('should create complete metadata with all fields', () => {
    const meta = createSyncMetadata({ period: '2026-06', username: 'admin' });
    expect(meta.sessionId).toMatch(/^2026-06-/);
    expect(meta.createdBy).toBe('admin');
    expect(meta.period).toBe('2026-06');
    expect(meta.status).toBe('idle');
    expect(meta.failureCount).toBe(0);
    expect(meta.pausedUntil).toBeNull();
    expect(meta.lastLocalChangeAt).toBeDefined();
    expect(meta.lastSyncedAt).toBeNull();
    expect(meta.lastError).toBe('');
    expect(meta.createdAt).toBeDefined();
  });
});

describe('constants', () => {
  it('SYNC_STATUS should have all required statuses', () => {
    expect(SYNC_STATUS).toEqual({
      IDLE: 'idle',
      SYNCING: 'syncing',
      OFFLINE: 'offline',
      ERROR: 'error',
      PAUSED: 'paused',
    });
  });
  it('AUTO_SYNC_MAX_FAILURES = 3', () => expect(AUTO_SYNC_MAX_FAILURES).toBe(3));
  it('AUTO_SYNC_PAUSE_MS = 3600000', () => expect(AUTO_SYNC_PAUSE_MS).toBe(3_600_000));
  it('AUTO_SYNC_INTERVAL_MS = 30000', () => expect(AUTO_SYNC_INTERVAL_MS).toBe(30_000));
});
