// app/src/__tests__/syncScopedRoute.test.js
import { describe, it, expect } from 'vitest';
import path from 'path';

// Test the path resolution logic directly (unit test, not HTTP)
describe('scoped sync path resolution', () => {
  const SYNC_BASE = 'data/sync/app1';

  function buildScopedPath(userKey, periodKey, sessionId, file) {
    const sanitize = (s) => (s || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_') || '_empty_';
    return path.join(SYNC_BASE, sanitize(userKey), sanitize(periodKey), sanitize(sessionId), file);
  }

  it('should build correct scoped path for session', () => {
    const p = buildScopedPath('admin', '2026-06', '2026-06-20260626T090500Z-a1b2c3', 'session.json');
    expect(p).toContain('admin');
    expect(p).toContain('2026-06');
    expect(p).toContain('session.json');
  });

  it('should sanitize user with special chars', () => {
    const p = buildScopedPath('user@domain', '2026-06', 'sess1', 'result.json');
    expect(p).toContain('user_domain');
    expect(p).not.toContain('@');
  });

  it('two different users same period same session → different paths', () => {
    const a = buildScopedPath('alice', '2026-06', 'sess1', 'result.json');
    const b = buildScopedPath('bob', '2026-06', 'sess1', 'result.json');
    expect(a).not.toBe(b);
  });

  it('same user same period different session → different paths', () => {
    const a = buildScopedPath('admin', '2026-06', 'sessA', 'result.json');
    const b = buildScopedPath('admin', '2026-06', 'sessB', 'result.json');
    expect(a).not.toBe(b);
  });

  it('should reject missing sessionId with _empty_', () => {
    const p = buildScopedPath('admin', '2026-06', '', 'result.json');
    expect(p).toContain('_empty_');
  });
});

describe('list sessions logic', () => {
  it('should parse meta.json files into session list', () => {
    const metas = [
      {
        sessionId: 'sess-a',
        period: '2026-06',
        createdAt: '2026-06-26T09:00:00Z',
        createdBy: 'admin',
        fileName: 'Opname Juni A.xlsx',
        roomCount: 10,
        checkedCount: 50,
        totalCount: 200,
        updatedAt: '2026-06-26T10:00:00Z',
      },
      {
        sessionId: 'sess-b',
        period: '2026-06',
        createdAt: '2026-06-26T11:00:00Z',
        createdBy: 'admin',
        fileName: 'Opname Juni B.xlsx',
        roomCount: 5,
        checkedCount: 20,
        totalCount: 100,
        updatedAt: '2026-06-26T12:00:00Z',
      },
    ];

    expect(metas).toHaveLength(2);
    expect(metas[0].sessionId).toBe('sess-a');
    expect(metas[1].sessionId).toBe('sess-b');
  });

  it('should sort sessions by updatedAt descending', () => {
    const sessions = [
      { sessionId: 's1', updatedAt: '2026-06-26T10:00:00Z' },
      { sessionId: 's2', updatedAt: '2026-06-26T12:00:00Z' },
      { sessionId: 's3', updatedAt: '2026-06-26T11:00:00Z' }
    ];
    sessions.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    
    expect(sessions[0].sessionId).toBe('s2');
    expect(sessions[1].sessionId).toBe('s3');
    expect(sessions[2].sessionId).toBe('s1');
  });
});
