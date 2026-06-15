import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetStatus = vi.fn(() => ({ sql: { state: 'CLOSED' }, smb: { state: 'OPEN' } }));
vi.mock('../server/utils/upstreamHealth', () => ({
  registry: { getStatus: () => mockGetStatus() },
}));

import upstreamStatusPlugin from '../server/plugins/upstreamStatusPlugin.js';

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
    getStatus: () => res.statusCode,
    getBody: () => body,
  };
}

function extractMiddleware(plugin) {
  let mw;
  plugin.configureServer({ middlewares: { use: (fn) => { mw = fn; } } });
  return mw;
}

describe('upstreamStatusPlugin — /api/upstream/status', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with status from registry', () => {
    const mw = extractMiddleware(upstreamStatusPlugin());
    const { req, res, getStatus, getBody } = makeReqRes('/api/upstream/status');
    mw(req, res, () => {});
    expect(getStatus()).toBe(200);
    expect(getBody()).toEqual({ sql: { state: 'CLOSED' }, smb: { state: 'OPEN' } });
  });

  it('handles OPTIONS preflight', () => {
    const mw = extractMiddleware(upstreamStatusPlugin());
    const req = { url: '/api/upstream/status', method: 'OPTIONS', headers: {} };
    let nextCalled = false;
    const res = { setHeader: vi.fn(), statusCode: 0, end: vi.fn() };
    mw(req, res, () => { nextCalled = true; });
    expect(res.end).toHaveBeenCalled();
    expect(nextCalled).toBe(false);
  });

  it('passes through to next middleware for other URLs', () => {
    const mw = extractMiddleware(upstreamStatusPlugin());
    const req = { url: '/api/other', method: 'GET', headers: {} };
    let nextCalled = false;
    const res = { setHeader: vi.fn(), statusCode: 0, end: vi.fn() };
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});
