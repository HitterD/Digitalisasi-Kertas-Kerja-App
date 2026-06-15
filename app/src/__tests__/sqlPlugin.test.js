import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('mssql', () => ({
  default: {
    connect: vi.fn(() => Promise.resolve({ request: () => ({ query: () => Promise.resolve({ recordset: [] }) }) })),
    Int: 0,
    NVarChar: 1,
  },
}));

const mockGuard = vi.fn();
vi.mock('../server/utils/upstreamHealth', () => ({
  registry: { guard: (...args) => mockGuard(...args) },
  UpstreamOpenError: class extends Error {
    constructor(n, ra) { super(`Upstream ${n} tidak tersedia`); this.code = 'UPSTREAM_OPEN'; this.retryAfter = ra; }
  },
  UpstreamTimeoutError: class extends Error {
    constructor(n, t) { super(`Upstream ${n} timeout`); this.code = 'UPSTREAM_TIMEOUT'; }
  },
}));

import sqlPlugin from '../server/plugins/sqlPlugin.js';
import { UpstreamOpenError, UpstreamTimeoutError } from '../server/utils/upstreamHealth.js';

function makeReqRes(url, method = 'GET') {
  const headersOut = {};
  let body = null;
  const res = {
    setHeader: (k, v) => { headersOut[k.toLowerCase()] = v; },
    statusCode: 0,
    end: (data) => {
      if (data) {
        try { body = JSON.parse(data); } catch { body = data; }
      }
    },
  };
  return {
    req: { url, method, headers: { host: 'localhost' } },
    res,
    sendJson: (s, b) => { res.statusCode = s; body = b; },
    headersOut,
    getStatus: () => res.statusCode,
    getBody: () => body,
  };
}

function extractMiddleware(plugin) {
  let mw;
  plugin.configureServer({ middlewares: { use: (fn) => { mw = fn; } } });
  return mw;
}

describe('sqlPlugin — /api/db/status', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with connected=true when guard returns ok', async () => {
    mockGuard.mockResolvedValue({ connected: true, server: '192.168.2.111' });
    const mw = extractMiddleware(sqlPlugin());
    const { req, res, getStatus, getBody } = makeReqRes('/api/db/status');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(getStatus()).toBe(200);
    expect(getBody()).toMatchObject({ connected: true, server: '192.168.2.111' });
  });

  it('returns 503 with Retry-After when guard throws UpstreamOpenError', async () => {
    mockGuard.mockRejectedValue(new UpstreamOpenError('sql', 28));
    const mw = extractMiddleware(sqlPlugin());
    const { req, res, getStatus, getBody, headersOut } = makeReqRes('/api/db/status');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(getStatus()).toBe(503);
    expect(headersOut['retry-after']).toBe('28');
    expect(getBody()).toMatchObject({ success: false, code: 'UPSTREAM_OPEN', retryAfter: 28 });
  });

  it('returns 504 when guard throws UpstreamTimeoutError', async () => {
    mockGuard.mockRejectedValue(new UpstreamTimeoutError('sql', 15000));
    const mw = extractMiddleware(sqlPlugin());
    const { req, res, getStatus, getBody } = makeReqRes('/api/db/status');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(getStatus()).toBe(504);
    expect(getBody()).toMatchObject({ success: false, code: 'UPSTREAM_TIMEOUT' });
  });
});
