import { beforeEach, describe, expect, it, vi } from 'vitest';
import sqlRoute from '../../server/routes/sqlRoute.js';
import sql from 'mssql';

vi.mock('mssql', () => {
  const mockRequest = {
    input: vi.fn().mockReturnThis(),
    query: vi.fn(),
  };
  const mockPool = {
    request: vi.fn(() => mockRequest),
    on: vi.fn(),
    connect: vi.fn(function connect() { return Promise.resolve(this); }),
  };
  return {
    default: {
      ConnectionPool: vi.fn(function ConnectionPool() { return mockPool; }),
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
    set statusCode(code) { statusCode = code; },
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getBody: () => (bodyStr ? JSON.parse(bodyStr) : null),
  };
}

function flushMiddleware() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('sqlRoute MAT active batch endpoint', () => {
  const requestQuery = sql.ConnectionPool().request().query;
  const requestInput = sql.ConnectionPool().request().input;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty map without querying SQL when barcode list is empty', async () => {
    const middleware = extractMiddleware(sqlRoute);
    const { req, res, getStatus, getBody } = makeReqRes('/api/db/mat-active?barcodes=');

    middleware(req, res, () => {});
    await flushMiddleware();

    expect(getStatus()).toBe(200);
    expect(getBody()).toMatchObject({
      success: true,
      count: 0,
      data: {},
    });
    expect(requestQuery).not.toHaveBeenCalled();
  });

  it('rejects more than 100 barcodes', async () => {
    const barcodes = Array.from({ length: 101 }, (_, index) => `BC${index}`).join(',');
    const middleware = extractMiddleware(sqlRoute);
    const { req, res, getStatus, getBody } = makeReqRes(`/api/db/mat-active?barcodes=${barcodes}`);

    middleware(req, res, () => {});
    await flushMiddleware();

    expect(getStatus()).toBe(400);
    expect(getBody()).toMatchObject({
      success: false,
      error: 'Maksimal 100 barcode per request',
    });
    expect(requestQuery).not.toHaveBeenCalled();
  });

  it('queries active MAT records with parameterized barcodes and returns map by barcode', async () => {
    requestQuery.mockResolvedValueOnce({
      recordset: [
        {
          BARCODE_ASSET: '13000042',
          NO_MAT: 'MAT-0241',
          STATUS: 'WAITING_APPROVAL',
          NEXT_VERIFICATOR: 'BUDI',
          NEXT_ROLE_VERIFICATOR: 'GA Manager',
          CREATED_DATE: '2026-06-25T10:00:00.000Z',
        },
      ],
    });
    const middleware = extractMiddleware(sqlRoute);
    const { req, res, getStatus, getBody } = makeReqRes('/api/db/mat-active?barcodes=13000042,13000043,13000042');

    middleware(req, res, () => {});
    await flushMiddleware();

    expect(requestInput).toHaveBeenCalledWith('barcode0', 'NVarChar', '13000042');
    expect(requestInput).toHaveBeenCalledWith('barcode1', 'NVarChar', '13000043');
    expect(requestInput).not.toHaveBeenCalledWith('barcode2', expect.anything(), expect.anything());

    const query = requestQuery.mock.calls[0][0];
    expect(query).toContain('[dbo].[V_TRX_MAT]');
    expect(query).toContain('ROW_NUMBER() OVER');
    expect(query).toContain('ORDER BY CREATED_DATE DESC, ID DESC');
    expect(query).toContain("NOT IN ('COMPLETED', 'REJECTED')");
    expect(query).toContain('@barcode0, @barcode1');
    expect(query).not.toContain('13000042');

    expect(getStatus()).toBe(200);
    expect(getBody()).toMatchObject({
      success: true,
      count: 1,
      data: {
        '13000042': {
          noMat: 'MAT-0241',
          status: 'WAITING_APPROVAL',
          nextVerificator: 'BUDI',
          nextRoleVerificator: 'GA Manager',
          createdDate: '2026-06-25T10:00:00.000Z',
        },
      },
    });
  });
});
