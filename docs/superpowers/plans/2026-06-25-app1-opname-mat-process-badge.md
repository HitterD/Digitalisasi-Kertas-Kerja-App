# APP1 Opname MAT Process Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a small `proses MAT` badge under each APP1 opname asset name when its barcode has an active MAT transaction in `ASSET_MANAGEMENT.dbo.V_TRX_MAT`.

**Architecture:** Add one batch backend endpoint for active MAT lookup, one frontend API helper, and one local fetch/render path inside `AssetTable`. Keep MAT data live-only in component state; do not persist it into opname session data.

**Tech Stack:** React 19, Vite/Vitest, Testing Library, Node/Vite middleware, `mssql`, existing `apiUrl`/`fetchWithAuth`, existing `registry.guard('sql', ...)` circuit breaker.

---

## Scope Check

Spec is one cohesive feature: active MAT indicator for APP1 opname asset rows. Backend route, API helper, and UI badge are coupled and can be shipped together. No sub-project split needed.

---

## File Structure

- Modify: `app/server/routes/sqlRoute.js`
  - Responsibility: SQL Server HTTP routes. Add `GET /api/db/mat-active?barcodes=...` before the existing `/api/db/mat-history/:barcode` route.
- Modify: `app/src/utils/matApi.js`
  - Responsibility: MAT HTTP client helpers. Add `fetchActiveMatByBarcodes(barcodes)` next to `fetchMatHistory`.
- Modify: `app/src/components/AssetTable.jsx`
  - Responsibility: APP1 asset table/card rendering. Fetch active MAT status for `paginatedAssets` and render badge in desktop/mobile views.
- Create: `app/src/__tests__/sqlRoute.matActive.test.js`
  - Responsibility: Route-level tests for validation, parameterized SQL, active-status filtering, and response shape.
- Modify: `app/src/__tests__/matApi.test.js`
  - Responsibility: Add tests for the new frontend helper.
- Create: `app/src/__tests__/AssetTable.matBadge.test.jsx`
  - Responsibility: Component tests for badge rendering and page-only batch fetch.

---

## Task 1: Backend route tests for active MAT batch lookup

**Files:**
- Create: `app/src/__tests__/sqlRoute.matActive.test.js`
- Test command from `app/`: `rtk npm run test -- src/__tests__/sqlRoute.matActive.test.js`

- [ ] **Step 1: Write the failing test file**

Create `app/src/__tests__/sqlRoute.matActive.test.js` with this content:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`:

```bash
rtk npm run test -- src/__tests__/sqlRoute.matActive.test.js
```

Expected: FAIL. The endpoint does not exist yet, so assertions for response body/status fail or middleware falls through.

- [ ] **Step 3: Commit failing test**

Run from repo root:

```bash
rtk git add app/src/__tests__/sqlRoute.matActive.test.js
rtk git commit -m "test: add active MAT route coverage"
```

---

## Task 2: Backend active MAT batch endpoint

**Files:**
- Modify: `app/server/routes/sqlRoute.js`
- Test: `app/src/__tests__/sqlRoute.matActive.test.js`
- Test command from `app/`: `rtk npm run test -- src/__tests__/sqlRoute.matActive.test.js`

- [ ] **Step 1: Add request limit constant**

In `app/server/routes/sqlRoute.js`, after:

```js
const ROOM_IMPORT_OWNERS = new Set(['ICT', 'HRGA', 'ENG']);
```

add:

```js
const MAT_ACTIVE_MAX_BARCODES = 100;
```

- [ ] **Step 2: Add the route before existing `/api/db/mat-history/:barcode`**

In `app/server/routes/sqlRoute.js`, insert this block immediately before the comment:

```js
// GET /api/db/mat-history/:barcode
```

Code to insert:

```js
  // GET /api/db/mat-active?barcodes=barcode1,barcode2
  if (req.url?.startsWith('/api/db/mat-active') && req.method === 'GET') {
    (async () => {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const rawBarcodes = String(url.searchParams.get('barcodes') || '');
      const barcodes = Array.from(new Set(
        rawBarcodes
          .split(',')
          .map((barcode) => barcode.trim())
          .filter(Boolean)
      ));

      if (barcodes.length === 0) {
        sendJson(200, {
          success: true,
          count: 0,
          data: {},
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (barcodes.length > MAT_ACTIVE_MAX_BARCODES) {
        sendJson(400, {
          success: false,
          error: `Maksimal ${MAT_ACTIVE_MAX_BARCODES} barcode per request`,
        });
        return;
      }

      try {
        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const request = pool.request();
          const paramNames = barcodes.map((barcode, index) => {
            const paramName = `barcode${index}`;
            request.input(paramName, sql.NVarChar, barcode);
            return `@${paramName}`;
          });

          const result = await request.query(`
            WITH ActiveMat AS (
              SELECT
                ID,
                LTRIM(RTRIM(BARCODE_ASSET)) AS BARCODE_ASSET,
                NO_MAT,
                STATUS,
                NEXT_VERIFICATOR,
                NEXT_ROLE_VERIFICATOR,
                CREATED_DATE,
                ROW_NUMBER() OVER (
                  PARTITION BY LTRIM(RTRIM(BARCODE_ASSET))
                  ORDER BY CREATED_DATE DESC, ID DESC
                ) AS rn
              FROM [dbo].[V_TRX_MAT]
              WHERE LTRIM(RTRIM(BARCODE_ASSET)) IN (${paramNames.join(', ')})
                AND UPPER(LTRIM(RTRIM(ISNULL(STATUS, '')))) NOT IN ('COMPLETED', 'REJECTED')
            )
            SELECT
              BARCODE_ASSET,
              NO_MAT,
              STATUS,
              NEXT_VERIFICATOR,
              NEXT_ROLE_VERIFICATOR,
              CREATED_DATE
            FROM ActiveMat
            WHERE rn = 1
            ORDER BY BARCODE_ASSET
          `);

          const matByBarcode = {};
          for (const row of result.recordset) {
            const barcode = String(row.BARCODE_ASSET || '').trim();
            if (!barcode) continue;
            matByBarcode[barcode] = {
              noMat: row.NO_MAT || '',
              status: row.STATUS || '',
              nextVerificator: row.NEXT_VERIFICATOR || '',
              nextRoleVerificator: row.NEXT_ROLE_VERIFICATOR || '',
              createdDate: row.CREATED_DATE || '',
            };
          }

          return {
            count: Object.keys(matByBarcode).length,
            data: matByBarcode,
            timestamp: new Date().toISOString(),
          };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });

        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        if (err.message && err.message.includes('Connection is closed')) {
          poolPromise = null;
        }
        console.error('[SQL Server] Active MAT query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }
```

- [ ] **Step 3: Run backend route test**

Run from `app/`:

```bash
rtk npm run test -- src/__tests__/sqlRoute.matActive.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit backend route implementation**

Run from repo root:

```bash
rtk git add app/server/routes/sqlRoute.js app/src/__tests__/sqlRoute.matActive.test.js
rtk git commit -m "feat: add active MAT batch endpoint"
```

---

## Task 3: Frontend MAT API helper

**Files:**
- Modify: `app/src/__tests__/matApi.test.js`
- Modify: `app/src/utils/matApi.js`
- Test command from `app/`: `rtk npm run test -- src/__tests__/matApi.test.js`

- [ ] **Step 1: Update import in test file**

In `app/src/__tests__/matApi.test.js`, replace:

```js
import { fetchMatHistory } from '../utils/matApi';
```

with:

```js
import { fetchActiveMatByBarcodes, fetchMatHistory } from '../utils/matApi';
```

- [ ] **Step 2: Add failing tests for `fetchActiveMatByBarcodes`**

Append this block to `app/src/__tests__/matApi.test.js` after the existing `describe('fetchMatHistory', ...)` block:

```js
describe('fetchActiveMatByBarcodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty response without fetch when barcode list is empty', async () => {
    const result = await fetchActiveMatByBarcodes(['', null, undefined]);

    expect(result).toEqual({ success: true, count: 0, data: {}, timestamp: '' });
    expect(apiConfig.fetchWithAuth).not.toHaveBeenCalled();
  });

  it('deduplicates barcodes and URL-encodes query', async () => {
    apiConfig.fetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        count: 1,
        data: {
          'A/1': {
            noMat: 'MAT-001',
            status: 'WAITING_APPROVAL',
          },
        },
        timestamp: '2026-06-25T00:00:00.000Z',
      }),
    });

    const result = await fetchActiveMatByBarcodes([' A/1 ', '10001', 'A/1']);

    expect(apiConfig.fetchWithAuth).toHaveBeenCalledWith(
      'http://localhost:5173/api/db/mat-active?barcodes=A%2F1%2C10001',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.data['A/1'].noMat).toBe('MAT-001');
  });

  it('throws server message when active MAT response is not ok', async () => {
    apiConfig.fetchWithAuth.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Query MAT aktif gagal' }),
    });

    await expect(fetchActiveMatByBarcodes(['10001'])).rejects.toThrow('Query MAT aktif gagal');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run from `app/`:

```bash
rtk npm run test -- src/__tests__/matApi.test.js
```

Expected: FAIL with export/function missing for `fetchActiveMatByBarcodes`.

- [ ] **Step 4: Add helper implementation**

In `app/src/utils/matApi.js`, append this exported function after `fetchMatHistory`:

```js
/**
 * Fetch active MAT transaction summaries for multiple barcodes.
 * @param {Array<string | number | null | undefined>} barcodes
 * @returns {Promise<{success: boolean, count: number, data: Record<string, object>, timestamp: string}>}
 */
export async function fetchActiveMatByBarcodes(barcodes) {
  const uniqueBarcodes = Array.from(new Set(
    (barcodes || [])
      .map((barcode) => String(barcode || '').trim())
      .filter(Boolean)
  ));

  if (uniqueBarcodes.length === 0) {
    return { success: true, count: 0, data: {}, timestamp: '' };
  }

  const query = encodeURIComponent(uniqueBarcodes.join(','));
  const res = await fetchWithAuth(
    `${getApiBase()}/mat-active?barcodes=${query}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }
  return res.json();
}
```

- [ ] **Step 5: Run frontend API tests**

Run from `app/`:

```bash
rtk npm run test -- src/__tests__/matApi.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit frontend API helper**

Run from repo root:

```bash
rtk git add app/src/utils/matApi.js app/src/__tests__/matApi.test.js
rtk git commit -m "feat: add active MAT API helper"
```

---

## Task 4: Asset table MAT badge UI

**Files:**
- Create: `app/src/__tests__/AssetTable.matBadge.test.jsx`
- Modify: `app/src/components/AssetTable.jsx`
- Test command from `app/`: `rtk npm run test -- src/__tests__/AssetTable.matBadge.test.jsx`

- [ ] **Step 1: Write failing UI tests**

Create `app/src/__tests__/AssetTable.matBadge.test.jsx` with this content:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssetTable from '../components/AssetTable';
import { fetchActiveMatByBarcodes } from '../utils/matApi';

vi.mock('../utils/matApi', () => ({
  fetchActiveMatByBarcodes: vi.fn(),
}));

function makeAsset(index, overrides = {}) {
  return {
    id: `asset-${index}`,
    no: String(index),
    barcode: `130000${String(index).padStart(2, '0')}`,
    namaAset: `Asset ${index}`,
    noPO: '',
    tipe: '',
    bulanPerolehan: '',
    tahunPerolehan: '',
    adaTidakAda: '',
    kondisi: '',
    keterangan: '',
    isChecked: false,
    ...overrides,
  };
}

function renderTable(assets) {
  render(
    <AssetTable
      assets={assets}
      roomIndex={0}
      onToggleCheck={vi.fn()}
      onUpdateField={vi.fn()}
      masterDb={null}
      onAutofill={vi.fn()}
      searchQuery=""
    />
  );
}

describe('AssetTable MAT badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchActiveMatByBarcodes.mockResolvedValue({ success: true, count: 0, data: {}, timestamp: '' });
  });

  it('renders process MAT badge and next role for active MAT asset', async () => {
    fetchActiveMatByBarcodes.mockResolvedValueOnce({
      success: true,
      count: 1,
      data: {
        '13000042': {
          noMat: 'MAT-0241',
          status: 'WAITING_APPROVAL',
          nextRoleVerificator: 'GA Manager',
          nextVerificator: 'BUDI',
        },
      },
      timestamp: '2026-06-25T00:00:00.000Z',
    });

    renderTable([
      makeAsset(42, { barcode: '13000042', namaAset: 'Laptop Lenovo ThinkPad' }),
      makeAsset(43, { barcode: '13000043', namaAset: 'Monitor Dell' }),
    ]);

    expect(await screen.findAllByText(/proses MAT · MAT-0241/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/next: GA Manager/i)).not.toHaveLength(0);
    expect(screen.queryByText(/MAT-9999/i)).not.toBeInTheDocument();
  });

  it('fetches only barcodes from the active pagination page', async () => {
    const assets = Array.from({ length: 21 }, (_, index) => makeAsset(index + 1));

    renderTable(assets);

    await waitFor(() => expect(fetchActiveMatByBarcodes).toHaveBeenCalled());
    const calledBarcodes = fetchActiveMatByBarcodes.mock.calls[0][0];

    expect(calledBarcodes).toHaveLength(20);
    expect(calledBarcodes).toContain('13000001');
    expect(calledBarcodes).toContain('13000020');
    expect(calledBarcodes).not.toContain('13000021');
  });

  it('does not render badge for asset without active MAT data', async () => {
    renderTable([
      makeAsset(1, { barcode: '13000001', namaAset: 'Asset Without MAT' }),
    ]);

    await waitFor(() => expect(fetchActiveMatByBarcodes).toHaveBeenCalled());

    expect(screen.queryByText(/proses MAT/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`:

```bash
rtk npm run test -- src/__tests__/AssetTable.matBadge.test.jsx
```

Expected: FAIL because `AssetTable` does not call `fetchActiveMatByBarcodes` and does not render badge.

- [ ] **Step 3: Import active MAT helper**

In `app/src/components/AssetTable.jsx`, after the existing imports, add:

```js
import { fetchActiveMatByBarcodes } from '../utils/matApi';
```

- [ ] **Step 4: Add badge component**

In `app/src/components/AssetTable.jsx`, insert this helper after `KondisiDropdown` and before `areAssetPropsEqual`:

```jsx
function MatProcessBadge({ matInfo }) {
    if (!matInfo) return null;

    const matLabel = matInfo.noMat ? `proses MAT · ${matInfo.noMat}` : 'proses MAT';
    const nextLabel = matInfo.nextRoleVerificator || matInfo.nextVerificator;

    return (
        <div style={{ marginTop: 4 }}>
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 7px',
                borderRadius: 999,
                border: '1px solid #bae6fd',
                background: '#e0f2fe',
                color: '#075985',
                fontSize: 9.5,
                fontWeight: 900,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                lineHeight: 1.2,
            }}>
                <span aria-hidden="true">●</span>
                {matLabel}
            </div>
            {nextLabel && (
                <div style={{
                    marginTop: 3,
                    color: 'var(--text-tertiary)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    lineHeight: 1.2,
                }}>
                    next: {nextLabel}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 5: Update memo comparison to include MAT info**

In `app/src/components/AssetTable.jsx`, replace the `areAssetPropsEqual` return body:

```js
    return (
        prevProps.asset.isChecked === nextProps.asset.isChecked &&
        prevProps.asset.adaTidakAda === nextProps.asset.adaTidakAda &&
        prevProps.asset.kondisi === nextProps.asset.kondisi &&
        prevProps.asset.keterangan === nextProps.asset.keterangan
    );
```

with:

```js
    return (
        prevProps.asset.isChecked === nextProps.asset.isChecked &&
        prevProps.asset.adaTidakAda === nextProps.asset.adaTidakAda &&
        prevProps.asset.kondisi === nextProps.asset.kondisi &&
        prevProps.asset.keterangan === nextProps.asset.keterangan &&
        prevProps.matInfo === nextProps.matInfo
    );
```

- [ ] **Step 6: Pass and render MAT info in desktop row**

In `app/src/components/AssetTable.jsx`, change the `AssetRow` signature from:

```js
const AssetRow = React.memo(({ asset, roomIndex, onToggleCheck, onUpdateField }) => {
```

to:

```js
const AssetRow = React.memo(({ asset, roomIndex, onToggleCheck, onUpdateField, matInfo }) => {
```

Then replace:

```jsx
            <td className="col-nama">{asset.namaAset}</td>
```

with:

```jsx
            <td className="col-nama">
                <div>{asset.namaAset}</div>
                <MatProcessBadge matInfo={matInfo} />
            </td>
```

- [ ] **Step 7: Pass and render MAT info in mobile card**

In `app/src/components/AssetTable.jsx`, change the `AssetCard` signature from:

```js
const AssetCard = React.memo(({ asset, roomIndex, onToggleCheck, onUpdateField }) => {
```

to:

```js
const AssetCard = React.memo(({ asset, roomIndex, onToggleCheck, onUpdateField, matInfo }) => {
```

Then replace:

```jsx
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--charcoal-900)', marginTop: 2, lineHeight: 1.3 }}>{asset.namaAset}</div>
```

with:

```jsx
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--charcoal-900)', marginTop: 2, lineHeight: 1.3 }}>{asset.namaAset}</div>
                    <MatProcessBadge matInfo={matInfo} />
```

- [ ] **Step 8: Add local active MAT fetch state**

In `app/src/components/AssetTable.jsx`, inside `AssetTable` after:

```js
    const [currentPage, setCurrentPage] = useState(1);
```

add:

```js
    const [activeMatByBarcode, setActiveMatByBarcode] = useState({});
```

After the `paginatedAssets` `useMemo` block, add:

```js
    const visibleBarcodes = useMemo(() => (
        Array.from(new Set(
            paginatedAssets
                .map((asset) => String(asset.barcode || '').trim())
                .filter(Boolean)
        ))
    ), [paginatedAssets]);

    useEffect(() => {
        let cancelled = false;

        if (visibleBarcodes.length === 0) {
            setActiveMatByBarcode({});
            return () => { cancelled = true; };
        }

        fetchActiveMatByBarcodes(visibleBarcodes)
            .then((result) => {
                if (!cancelled) {
                    setActiveMatByBarcode(result?.data || {});
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setActiveMatByBarcode({});
                }
            });

        return () => { cancelled = true; };
    }, [visibleBarcodes]);
```

- [ ] **Step 9: Pass MAT info to row and card renders**

In the desktop table `paginatedAssets.map`, add `matInfo` prop:

```jsx
                        <AssetRow
                            key={asset.id}
                            asset={asset}
                            roomIndex={roomIndex}
                            onToggleCheck={onToggleCheck}
                            onUpdateField={onUpdateField}
                            matInfo={activeMatByBarcode[String(asset.barcode || '').trim()]}
                        />
```

In the mobile card `paginatedAssets.map`, add `matInfo` prop:

```jsx
                    <AssetCard
                        key={asset.id}
                        asset={asset}
                        roomIndex={roomIndex}
                        onToggleCheck={onToggleCheck}
                        onUpdateField={onUpdateField}
                        matInfo={activeMatByBarcode[String(asset.barcode || '').trim()]}
                    />
```

- [ ] **Step 10: Run UI test**

Run from `app/`:

```bash
rtk npm run test -- src/__tests__/AssetTable.matBadge.test.jsx
```

Expected: PASS.

- [ ] **Step 11: Commit UI implementation**

Run from repo root:

```bash
rtk git add app/src/components/AssetTable.jsx app/src/__tests__/AssetTable.matBadge.test.jsx
rtk git commit -m "feat: show active MAT badge in opname assets"
```

---

## Task 5: Integrated verification

**Files:**
- Verify: `app/server/routes/sqlRoute.js`
- Verify: `app/src/utils/matApi.js`
- Verify: `app/src/components/AssetTable.jsx`
- Verify tests under `app/src/__tests__/`

- [ ] **Step 1: Run focused tests**

Run from `app/`:

```bash
rtk npm run test -- src/__tests__/sqlRoute.matActive.test.js src/__tests__/matApi.test.js src/__tests__/AssetTable.matBadge.test.jsx
```

Expected: PASS for all focused tests.

- [ ] **Step 2: Run nearby regression tests**

Run from `app/`:

```bash
rtk npm run test -- src/__tests__/sqlRoute.rooms.test.js src/__tests__/SqlRoomImportModal.test.jsx src/__tests__/RoomStatusSelect.test.jsx
```

Expected: PASS. These cover existing SQL route patterns, SQL room import UI, and APP1 room dropdown UI.

- [ ] **Step 3: Run build**

Run from `app/`:

```bash
rtk npm run build
```

Expected: PASS build.

- [ ] **Step 4: Manual smoke in browser**

Run app stack using existing scripts from `app/`:

```bash
rtk npm run dev
```

Open APP1 opname flow:

1. Navigate to `/app1/opname` with loaded opname data.
2. Confirm rows without active MAT look unchanged.
3. Use a barcode known to have active MAT in `V_TRX_MAT`.
4. Confirm desktop table shows `proses MAT · <NO_MAT>` below asset name.
5. Narrow viewport to mobile size.
6. Confirm mobile card shows the same badge below asset name.
7. Change pagination page.
8. Confirm Network tab shows one `/api/db/mat-active?barcodes=...` request for visible assets, not one request per row.

- [ ] **Step 5: Review changed diff**

Run from repo root:

```bash
rtk git diff -- app/server/routes/sqlRoute.js app/src/utils/matApi.js app/src/components/AssetTable.jsx app/src/__tests__/sqlRoute.matActive.test.js app/src/__tests__/matApi.test.js app/src/__tests__/AssetTable.matBadge.test.jsx
```

Check these points:

- No raw barcode string interpolation in SQL.
- `STATUS` filter excludes only `COMPLETED` and `REJECTED`.
- `AssetRow` and `AssetCard` memo comparison includes `matInfo`.
- Failed MAT fetch clears badge and does not throw into UI.
- No localStorage/session mutation for MAT data.

- [ ] **Step 6: Final commit if verification changed files**

If any verification fix was needed, commit it from repo root:

```bash
rtk git add app/server/routes/sqlRoute.js app/src/utils/matApi.js app/src/components/AssetTable.jsx app/src/__tests__/sqlRoute.matActive.test.js app/src/__tests__/matApi.test.js app/src/__tests__/AssetTable.matBadge.test.jsx
rtk git commit -m "fix: stabilize active MAT badge checks"
```

If no files changed after Step 4, skip this commit.

---

## Self-Review

### Spec Coverage

- Badge under asset name: Task 4 renders `MatProcessBadge` in desktop row and mobile card.
- UI option C: Task 4 displays `proses MAT · NO_MAT` plus `next:`.
- Active status definition: Task 2 SQL excludes `COMPLETED` and `REJECTED`; Task 1 asserts SQL contains that filter.
- Batch endpoint: Task 2 adds `/api/db/mat-active?barcodes=...`; Task 1 tests parameterized batch query.
- No persistence: Task 4 stores MAT data in `activeMatByBarcode` local state only.
- Error handling: Task 2 handles invalid input and SQL errors; Task 4 catches fetch failures and clears badge.
- Testing: Tasks 1, 3, 4, and 5 cover backend, helper, UI, focused regression, and build.

### Placeholder Scan

No placeholder markers or undefined future work remain in this plan. Every changed file has exact code blocks and commands.

### Type / Property Consistency

Backend response properties are `noMat`, `status`, `nextVerificator`, `nextRoleVerificator`, and `createdDate`. Frontend tests and `MatProcessBadge` use those same property names.
