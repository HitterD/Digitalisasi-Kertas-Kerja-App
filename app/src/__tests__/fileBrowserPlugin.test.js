import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  process.env.SHARE_ACCESS_MODE = 'smb';
  process.env.SHARE_BASE_PATH = '\\\\test-host\\test-share';
  process.env.SHARE_USER = 'test-user';
  process.env.SHARE_PASSWORD = 'test-pass';
});

const { mockSmb2Client } = vi.hoisted(() => ({
  mockSmb2Client: {
    readdir: vi.fn(),
    exists: vi.fn(),
    stat: vi.fn(),
    createReadStream: vi.fn(),
  },
}));
vi.mock('@marsaud/smb2', () => ({
  default: function SMB2() { return mockSmb2Client; },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ isDirectory: () => true, size: 0 })),
    createReadStream: vi.fn(() => ({ on: vi.fn(), pipe: vi.fn() })),
  },
}));

const { mockGuard, mockRegisterProbe, mockInit, mockStop } = vi.hoisted(() => ({
  mockGuard: vi.fn(),
  mockRegisterProbe: vi.fn(),
  mockInit: vi.fn(),
  mockStop: vi.fn(),
}));
vi.mock('../server/utils/upstreamHealth', () => ({
  registry: {
    guard: (...args) => mockGuard(...args),
    registerProbe: (...args) => mockRegisterProbe(...args),
    init: () => mockInit(),
    stop: () => mockStop(),
  },
  UpstreamOpenError: class extends Error {
    constructor(n, ra) { super(`Upstream ${n} tidak tersedia`); this.code = 'UPSTREAM_OPEN'; this.retryAfter = ra; }
  },
  UpstreamTimeoutError: class extends Error {
    constructor(n, t) { super(`Upstream ${n} timeout`); this.code = 'UPSTREAM_TIMEOUT'; }
  },
}));

import fileBrowserPlugin from '../server/plugins/fileBrowserPlugin.js';
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

describe('fileBrowserPlugin — /api/files/folders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with folder list on success', async () => {
    mockGuard.mockImplementation(async (name, fn) => fn());
    mockSmb2Client.readdir.mockResolvedValue([
      { name: 'SJA1', isDirectory: true, mtime: new Date(), size: 0 },
      { name: 'SJA2', isDirectory: true, mtime: new Date(), size: 0 },
    ]);
    const mw = extractMiddleware(fileBrowserPlugin());
    const { req, res, getStatus, getBody } = makeReqRes('/api/files/folders');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(getStatus()).toBe(200);
    expect(getBody().folders).toEqual(['SJA1', 'SJA2']);
  });

  it('returns 503 with Retry-After when guard throws UpstreamOpenError', async () => {
    mockGuard.mockRejectedValue(new UpstreamOpenError('smb', 25));
    const mw = extractMiddleware(fileBrowserPlugin());
    const { req, res, getStatus, getBody, headersOut } = makeReqRes('/api/files/folders');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(getStatus()).toBe(503);
    expect(headersOut['retry-after']).toBe('25');
    expect(getBody()).toMatchObject({ success: false, code: 'UPSTREAM_OPEN' });
  });

  it('returns 504 when guard throws UpstreamTimeoutError', async () => {
    mockGuard.mockRejectedValue(new UpstreamTimeoutError('smb', 20000));
    const mw = extractMiddleware(fileBrowserPlugin());
    const { req, res, getStatus, getBody } = makeReqRes('/api/files/folders');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(getStatus()).toBe(504);
    expect(getBody()).toMatchObject({ success: false, code: 'UPSTREAM_TIMEOUT' });
  });
});
