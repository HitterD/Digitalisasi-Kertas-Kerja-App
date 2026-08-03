import { describe, expect, it, vi, beforeEach } from 'vitest';
import sqlRoute from '../../server/routes/sqlRoute.js';
import sql from 'mssql';

// Minimal mock for mssql and upstreamHealth to isolate route logic
vi.mock('mssql', () => {
  const mockRequest = {
    input: vi.fn().mockReturnThis(),
    query: vi.fn(),
  };
  const mockPool = {
    request: vi.fn(() => mockRequest),
    on: vi.fn(),
    connect: vi.fn(function() { return Promise.resolve(this); }),
  };
  return {
    default: {
      ConnectionPool: vi.fn(function() { return mockPool; }),
      Int: 'Int',
      NVarChar: 'NVarChar',
    },
  };
});

vi.mock('../../server/utils/upstreamHealth.js', () => ({
  registry: {
    guard: vi.fn(async (key, fn) => fn()),
  },
  UpstreamOpenError: class UpstreamOpenError extends Error {},
  UpstreamTimeoutError: class UpstreamTimeoutError extends Error {},
}));

function extractMiddleware(plugin) {
  const useMock = vi.fn();
  plugin().configureServer({ middlewares: { use: useMock } });
  return useMock.mock.calls[0][0];
}

function makeReqRes(url) {
  const req = { url, method: 'GET', headers: { host: 'localhost' } };
  let statusCode = 200;
  let bodyStr = '';

  const res = {
    setHeader: vi.fn(),
    writeHead: vi.fn((code) => { statusCode = code; }),
    end: vi.fn((str) => { bodyStr = str; }),
    get statusCode() { return statusCode; },
    set statusCode(code) { statusCode = code; }
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getBody: () => (bodyStr ? JSON.parse(bodyStr) : null),
  };
}

describe('sqlRoute rooms endpoints', () => {
  const requestQuery = sql.ConnectionPool().request().query;
  const requestInput = sql.ConnectionPool().request().input;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects /api/db/rooms/:roomName/assets if owner query is invalid', async () => {
    const middleware = extractMiddleware(sqlRoute);
    const { req, res, getStatus, getBody } = makeReqRes('/api/db/rooms/RUANG%20SERVER/assets?owner=UNKNOWN');

    middleware(req, res, () => {});

    // Need to flush microtasks because the route is async inside
    const flushMiddleware = () => new Promise((resolve) => setTimeout(resolve, 0));
    await flushMiddleware();

    expect(getStatus()).toBe(400);
    expect(getBody()).toMatchObject({
      success: false,
      error: 'Owner wajib salah satu: ICT, HRGA, ENG',
    });
    expect(requestQuery).not.toHaveBeenCalled();
  });

  it('queries room assets with parameterized room name and returns rows for valid owner', async () => {
    requestQuery.mockResolvedValueOnce({
      recordset: [{ BARCODE_ASSET: '1300000001', NAMA_RUANGAN: 'RUANG SERVER', CREATE_USER: 'ICT_ADMIN' }],
    });
    const middleware = extractMiddleware(sqlRoute);
    const { req, res, getStatus, getBody } = makeReqRes('/api/db/rooms/RUANG%20SERVER/assets?owner=ICT');

    const flushMiddleware = () => new Promise((resolve) => setTimeout(resolve, 0));
    middleware(req, res, () => {});
    await flushMiddleware();

    expect(requestInput).toHaveBeenCalledWith('roomName', 'NVarChar', 'RUANG SERVER');
    expect(requestQuery.mock.calls[0][0]).toContain('LTRIM(RTRIM(NAMA_RUANGAN)) = @roomName');
    expect(requestQuery.mock.calls[0][0]).not.toContain('RUANG SERVER');
    expect(getStatus()).toBe(200);
    expect(getBody()).toMatchObject({
      success: true,
      count: 1,
      data: [{ BARCODE_ASSET: '1300000001' }],
    });
  });

  it('keeps /api/db/rooms read-only and returns room dropdown data', async () => {
    requestQuery.mockResolvedValueOnce({
      recordset: [{ NAMA_RUANGAN: 'RUANG SERVER', PIC_RUANGAN: 'BUDI', RUANGAN_ID: 11, ASSET_COUNT: 2 }],
    });
    const middleware = extractMiddleware(sqlRoute);
    const { req, res, getStatus, getBody } = makeReqRes('/api/db/rooms');

    const flushMiddleware = () => new Promise((resolve) => setTimeout(resolve, 0));
    middleware(req, res, () => {});
    await flushMiddleware();

    expect(requestQuery.mock.calls[0][0]).toContain('WITH LatestMaster AS');
    expect(requestQuery.mock.calls[0][0]).not.toMatch(/\b(INSERT|UPDATE|DELETE|MERGE)\b/i);
    expect(getStatus()).toBe(200);
    expect(getBody()).toMatchObject({
      success: true,
      count: 1,
      data: [{ NAMA_RUANGAN: 'RUANG SERVER', ASSET_COUNT: 2 }],
    });
  });
});
