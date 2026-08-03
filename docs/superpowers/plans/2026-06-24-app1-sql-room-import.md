# APP1 SQL Room Import & Local Room Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lengkapi fitur APP1 `/app1/opname` untuk delete ruangan lokal, pilih ruangan dari SQL, import aset per kategori owner (`ICT`, `HRGA`, `ENG`), review aset ambigu/unknown, dan masukkan aset import sebagai unchecked.

**Architecture:** Feature sudah sebagian ada: `sqlRoute.js` punya endpoint `/api/db/rooms` dan `/api/db/rooms/:roomName/assets`, `useOpnameState.jsx` punya `REMOVE_ROOM_LOCAL` dan `ADD_SQL_IMPORTED_ROOM`, dan komponen modal SQL import sudah dibuat. Plan ini tidak rewrite besar; fokus hardening: validasi owner query, API relatif via `apiUrl`, utility pure dengan manual decisions + dedupe, reducer testable via exported reducer, UI copy/error/empty state, dan tests.

**Tech Stack:** React 19, Vite 7, Vitest 4, Testing Library, Express middleware style, `mssql`, existing `apiUrl` helper, existing `useOpnameState` reducer.

---

## Current Evidence

- `app/server/routes/sqlRoute.js:431-524` sudah punya read-only `GET /api/db/rooms` dan `GET /api/db/rooms/:roomName/assets`, tapi assets endpoint belum validasi query `owner=ICT|HRGA|ENG`.
- `app/src/utils/sqlRoomImport.js:4-103` sudah punya utility dasar, tapi `buildImportPreview` belum menerima `manualDecisions`, belum dedupe barcode, dan mapping belum simpan warning.
- `app/src/store/useOpnameState.jsx:224-303` sudah punya `REMOVE_ROOM_LOCAL` dan `ADD_SQL_IMPORTED_ROOM`, tapi reducer belum export untuk direct unit test dan duplicate check period pakai fallback yang bisa mismatch.
- `app/src/components/SqlRoomPicker.jsx:18` dan `app/src/components/SqlRoomImportModal.jsx:30` masih pakai hardcoded `http://localhost:3000`, harus pakai `apiUrl()`.
- `app/src/components/DeleteRoomConfirmModal.jsx:7-15` sudah menyatakan SQL/server tidak berubah.
- `app/src/pages/OpnamePage.jsx:386-428` sudah wire custom modal, delete modal, dan SQL import modal.
- `app/src/__tests__/reducer.test.js:1-207` test reducer masih copy logic manual, bukan reducer aktual.

---

## File Structure

### Modify

- `app/server/routes/sqlRoute.js`
  - Tambah parsing `owner` pada `/api/db/rooms/:roomName/assets?owner=ICT|HRGA|ENG`.
  - Validasi enum owner dan tetap query parameterized untuk `roomName`.
  - Jangan filter SQL by owner dulu; return all latest assets room agar frontend bisa classify include/review/exclude dengan benar.

- `app/src/utils/sqlRoomImport.js`
  - Jadikan utility sumber kebenaran: category enum, create_user mapping, ambiguous warning, manual decision override, dedupe barcode, output opname asset unchecked.

- `app/src/store/useOpnameState.jsx`
  - Export `initialState`, `opnameReducer`, dan `createEmptySignatures` untuk unit test reducer aktual.
  - Perbaiki duplicate append period check agar cocok dengan `sheetName`/`meta.roomName` saja untuk SQL imported room.
  - Pastikan appended assets dedupe barcode immutable dan current index pindah ke room existing.

- `app/src/components/SqlRoomPicker.jsx`
  - Pakai `apiUrl('/api/db/rooms')`.
  - Ganti error mentah dengan copy user-friendly.
  - Pakai button semantics untuk option supaya test/accessibility lebih mudah.

- `app/src/components/SqlRoomImportModal.jsx`
  - Pakai `apiUrl('/api/db/rooms/.../assets?owner=...')`.
  - Show empty state ketika room tidak punya aset.
  - Kirim manual decisions ke preview helper.
  - Disable import saat semua excluded.
  - Simpan warning ke mapped asset.

- `app/src/components/AssetImportReviewTable.jsx`
  - Tampilkan warning text/copy jelas untuk ambiguous asset.
  - Tambah `data-testid` minimal untuk tests.

- `app/src/components/DeleteRoomConfirmModal.jsx`
  - Tambah detail count aset/source props tanpa ubah flow.

- `app/src/pages/OpnamePage.jsx`
  - Kirim detail aset/source ke delete modal.
  - Pastikan toast copy sesuai spec.

### Create

- `app/src/__tests__/sqlRoomImport.test.js`
  - Unit test owner mapping, review state, warning, manual decision, dedupe, mapping unchecked.

- `app/src/__tests__/useOpnameState.sqlRoomImport.test.js`
  - Unit test reducer aktual untuk remove local room, clamp index, create SQL room, append duplicate room dedupe.

- `app/src/__tests__/SqlRoomImportModal.test.jsx`
  - Component test fetch rooms/assets, review gating, include/exclude decision, submit payload.

- `app/src/__tests__/sqlRoute.rooms.test.js`
  - Middleware test owner validation and read-only route behavior.

---

## Task 1: Harden SQL room import utility

**Files:**
- Modify: `app/src/utils/sqlRoomImport.js`
- Create: `app/src/__tests__/sqlRoomImport.test.js`

- [ ] **Step 1: Write failing utility tests**

Create `app/src/__tests__/sqlRoomImport.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  buildImportPreview,
  classifyAssetForCategory,
  dedupeSqlAssetsByBarcode,
  getOwnerFromCreateUser,
  hasAmbiguousOwnerKeyword,
  mapSqlAssetToOpnameAsset,
} from '../utils/sqlRoomImport';

const baseAsset = {
  BARCODE_ASSET: ' 1300000001 ',
  NAMA_ASSET: 'MONITOR 24 INCH',
  CN_ASSET: 'CN-1',
  KODE_KATEGORI_ASSET: 'ELEKTRONIK',
  KODE_TYPE_ASSET: 'DISPLAY',
  LOCATION_CODE: 'RSV',
  NAMA_RUANGAN: 'RUANG SERVER',
  PIC_RUANGAN: 'BUDI',
  NAMA_KONDISI: 'Baik',
  KETERANGAN: 'Master note',
  KETERANGAN_OPNAME: '',
  TRANS_DATE: '2026-06-24',
  BULAN: '06',
  TAHUN: '2026',
  CREATE_USER: 'ICT_ADMIN',
  CREATE_DATE: '2026-06-01',
  NO_PO: 'PO-1',
  SITE_ID: 'SITE-1',
  RUANGAN_ID: 99,
  KONDISI_BARANG_ID: 1,
};

describe('sqlRoomImport owner mapping', () => {
  it('maps ICT, ENG, HRD, and HRGA create users', () => {
    expect(getOwnerFromCreateUser('ICT_ADMIN')).toBe('ICT');
    expect(getOwnerFromCreateUser('ENG_USER')).toBe('ENG');
    expect(getOwnerFromCreateUser('HRD01')).toBe('HRGA');
    expect(getOwnerFromCreateUser('HRGA_USER')).toBe('HRGA');
  });

  it('returns null for empty or unknown create user', () => {
    expect(getOwnerFromCreateUser(null)).toBeNull();
    expect(getOwnerFromCreateUser('')).toBeNull();
    expect(getOwnerFromCreateUser('FINANCE')).toBeNull();
  });

  it('detects ambiguous keyword from asset name, type, or category', () => {
    expect(hasAmbiguousOwnerKeyword(baseAsset)).toBe(true);
    expect(hasAmbiguousOwnerKeyword({ ...baseAsset, NAMA_ASSET: 'KURSI', KODE_TYPE_ASSET: 'FURNITURE' })).toBe(false);
    expect(hasAmbiguousOwnerKeyword({ ...baseAsset, NAMA_ASSET: 'KURSI', KODE_TYPE_ASSET: '', KODE_KATEGORI_ASSET: 'UPS' })).toBe(true);
  });
});

describe('sqlRoomImport classification', () => {
  it('includes selected category rows and keeps ambiguous warning as helper only', () => {
    const result = classifyAssetForCategory(baseAsset, 'ICT');

    expect(result._classification).toMatchObject({
      ownerCategory: 'ICT',
      ownerSource: 'create_user',
      ownerConfidence: 'review',
      importDecision: 'include',
      importCategory: 'ICT',
    });
    expect(result._classification.warning).toContain('aset bisa lintas kategori');
  });

  it('excludes rows owned by another known category', () => {
    const result = classifyAssetForCategory({ ...baseAsset, CREATE_USER: 'ENG_USER' }, 'ICT');

    expect(result._classification).toMatchObject({
      ownerCategory: 'ENG',
      ownerSource: 'create_user',
      importDecision: 'exclude',
      importCategory: 'ICT',
    });
  });

  it('puts unknown create user rows into review', () => {
    const result = classifyAssetForCategory({ ...baseAsset, CREATE_USER: '' }, 'ICT');

    expect(result._classification).toMatchObject({
      ownerCategory: null,
      ownerSource: 'unknown',
      ownerConfidence: 'review',
      importDecision: 'review',
      importCategory: 'ICT',
    });
  });

  it('applies manual decisions over classification defaults', () => {
    const preview = buildImportPreview(
      [{ ...baseAsset, BARCODE_ASSET: '1300000001', CREATE_USER: '' }],
      'ICT',
      { '1300000001': 'include' }
    );

    expect(preview.includeList).toHaveLength(1);
    expect(preview.reviewList).toHaveLength(0);
    expect(preview.includeList[0]._classification).toMatchObject({
      ownerSource: 'manual',
      importDecision: 'include',
    });
  });
});

describe('sqlRoomImport import mapping', () => {
  it('dedupes SQL assets by trimmed barcode and keeps first row', () => {
    const result = dedupeSqlAssetsByBarcode([
      { ...baseAsset, BARCODE_ASSET: ' 1300000001 ', NAMA_ASSET: 'First' },
      { ...baseAsset, BARCODE_ASSET: '1300000001', NAMA_ASSET: 'Second' },
      { ...baseAsset, BARCODE_ASSET: '1300000002', NAMA_ASSET: 'Third' },
      { ...baseAsset, BARCODE_ASSET: '' },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].NAMA_ASSET).toBe('First');
    expect(result[1].BARCODE_ASSET).toBe('1300000002');
  });

  it('builds include/review/exclude preview from deduped assets', () => {
    const preview = buildImportPreview([
      { ...baseAsset, BARCODE_ASSET: '1', CREATE_USER: 'ICT_ADMIN' },
      { ...baseAsset, BARCODE_ASSET: '2', CREATE_USER: 'ENG_USER' },
      { ...baseAsset, BARCODE_ASSET: '3', CREATE_USER: '' },
    ], 'ICT');

    expect(preview.includeList).toHaveLength(1);
    expect(preview.excludeList).toHaveLength(1);
    expect(preview.reviewList).toHaveLength(1);
    expect(preview.totalCount).toBe(3);
  });

  it('maps SQL asset to unchecked opname asset with source metadata', () => {
    const classified = classifyAssetForCategory(baseAsset, 'ICT');
    const result = mapSqlAssetToOpnameAsset(classified, { category: 'ICT' });

    expect(result).toMatchObject({
      barcode: '1300000001',
      namaAset: 'MONITOR 24 INCH',
      noPO: 'PO-1',
      tipe: 'DISPLAY',
      bulanPerolehan: '06',
      tahunPerolehan: '2026',
      adaTidakAda: 'Ada',
      kondisi: 'Baik',
      keterangan: 'Master note',
      isChecked: false,
      ownerCategory: 'ICT',
      ownerSource: 'create_user',
      source: 'sql-room-import',
      sourceCreateUser: 'ICT_ADMIN',
      sourceRoomName: 'RUANG SERVER',
      sourceRoomId: 99,
    });
    expect(result.ownerWarning).toContain('aset bisa lintas kategori');
  });
});
```

- [ ] **Step 2: Run tests and verify fail**

Run from `app/`:

```bash
rtk npm run test -- sqlRoomImport
```

Expected: FAIL because `dedupeSqlAssetsByBarcode` is not exported and manual decisions are ignored.

- [ ] **Step 3: Replace utility implementation**

Replace `app/src/utils/sqlRoomImport.js` with:

```js
/**
 * Pure utility functions for SQL Room Import.
 */

export const OWNER_CATEGORIES = ['ICT', 'HRGA', 'ENG'];
export const AMBIGUOUS_KEYWORDS = ['MONITOR', 'UPS', 'STABILIZER', 'DISPLAY', 'PANEL CONTROL'];

export function normalizeCreateUser(createUser) {
  return String(createUser || '').trim().toUpperCase();
}

export function getOwnerFromCreateUser(createUser) {
  const normalized = normalizeCreateUser(createUser);
  if (!normalized) return null;

  if (normalized.includes('ICT') || normalized.startsWith('IT')) return 'ICT';
  if (normalized.includes('ENG')) return 'ENG';
  if (normalized.includes('HRD') || normalized.includes('HRGA')) return 'HRGA';

  return null;
}

export function hasAmbiguousOwnerKeyword(asset) {
  const searchableText = [
    asset?.NAMA_ASSET,
    asset?.KODE_TYPE_ASSET,
    asset?.KODE_KATEGORI_ASSET,
  ]
    .map((value) => String(value || '').toUpperCase())
    .join(' ');

  return AMBIGUOUS_KEYWORDS.some((keyword) => searchableText.includes(keyword));
}

export function dedupeSqlAssetsByBarcode(assets) {
  const seen = new Set();

  return (Array.isArray(assets) ? assets : []).filter((asset) => {
    const barcode = String(asset?.BARCODE_ASSET || '').trim();
    if (!barcode || seen.has(barcode)) return false;
    seen.add(barcode);
    return true;
  });
}

export function classifyAssetForCategory(asset, selectedCategory, manualDecision = null) {
  const ownerCategory = getOwnerFromCreateUser(asset?.CREATE_USER);
  const isAmbiguous = hasAmbiguousOwnerKeyword(asset);
  const warning = isAmbiguous ? 'Cek ulang: aset bisa lintas kategori (ICT/ENG/HRGA).' : null;

  if (manualDecision === 'include' || manualDecision === 'exclude') {
    return {
      ...asset,
      _classification: {
        ownerCategory,
        ownerSource: 'manual',
        ownerConfidence: 'review',
        warning,
        importDecision: manualDecision,
        importCategory: selectedCategory,
      },
    };
  }

  if (ownerCategory === selectedCategory) {
    return {
      ...asset,
      _classification: {
        ownerCategory,
        ownerSource: 'create_user',
        ownerConfidence: warning ? 'review' : 'high',
        warning,
        importDecision: 'include',
        importCategory: selectedCategory,
      },
    };
  }

  if (ownerCategory) {
    return {
      ...asset,
      _classification: {
        ownerCategory,
        ownerSource: 'create_user',
        ownerConfidence: 'high',
        warning,
        importDecision: 'exclude',
        importCategory: selectedCategory,
      },
    };
  }

  return {
    ...asset,
    _classification: {
      ownerCategory: null,
      ownerSource: 'unknown',
      ownerConfidence: 'review',
      warning,
      importDecision: 'review',
      importCategory: selectedCategory,
    },
  };
}

export function buildImportPreview(assets, selectedCategory, manualDecisions = {}) {
  const classified = dedupeSqlAssetsByBarcode(assets).map((asset) => {
    const barcode = String(asset.BARCODE_ASSET || '').trim();
    return classifyAssetForCategory(asset, selectedCategory, manualDecisions[barcode]);
  });

  return {
    includeList: classified.filter((asset) => asset._classification.importDecision === 'include'),
    reviewList: classified.filter((asset) => asset._classification.importDecision === 'review'),
    excludeList: classified.filter((asset) => asset._classification.importDecision === 'exclude'),
    totalCount: classified.length,
  };
}

export function mapSqlAssetToOpnameAsset(asset, categoryMeta) {
  const classification = asset?._classification || {};

  return {
    barcode: String(asset?.BARCODE_ASSET || '').trim(),
    namaAset: String(asset?.NAMA_ASSET || '').trim(),
    noPO: String(asset?.NO_PO || '').trim(),
    tipe: String(asset?.KODE_TYPE_ASSET || '').trim(),
    bulanPerolehan: String(asset?.BULAN || '').trim(),
    tahunPerolehan: String(asset?.TAHUN || '').trim(),
    adaTidakAda: 'Ada',
    kondisi: String(asset?.NAMA_KONDISI || 'Baik').trim(),
    keterangan: String(asset?.KETERANGAN_OPNAME || asset?.KETERANGAN || '').trim(),
    isChecked: false,
    ownerCategory: categoryMeta.category,
    ownerSource: classification.ownerSource || 'unknown',
    ownerConfidence: classification.ownerConfidence || 'review',
    ownerWarning: classification.warning || null,
    source: 'sql-room-import',
    sourceCreateUser: String(asset?.CREATE_USER || '').trim(),
    sourceRoomName: String(asset?.NAMA_RUANGAN || '').trim(),
    sourceRoomId: asset?.RUANGAN_ID || null,
  };
}
```

- [ ] **Step 4: Run utility tests and verify pass**

Run from `app/`:

```bash
rtk npm run test -- sqlRoomImport
```

Expected: PASS.

- [ ] **Step 5: Commit utility hardening**

```bash
rtk git add src/utils/sqlRoomImport.js src/__tests__/sqlRoomImport.test.js
rtk git commit -m "test: cover sql room import utility"
```

---

## Task 2: Export and test actual opname reducer actions

**Files:**
- Modify: `app/src/store/useOpnameState.jsx`
- Create: `app/src/__tests__/useOpnameState.sqlRoomImport.test.js`

- [ ] **Step 1: Write failing reducer tests against actual reducer**

Create `app/src/__tests__/useOpnameState.sqlRoomImport.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { initialState, opnameReducer } from '../store/useOpnameState';

function makeRoom(name, assets = []) {
  return {
    sheetName: name,
    meta: { roomName: name, period: '2026', picName: '' },
    assets,
    noBarcodeAssets: [],
    notAtLocationAssets: [],
    signatures: {},
  };
}

const sqlPayload = {
  roomName: 'RUANG SERVER',
  category: 'ICT',
  sourceRoom: {
    namaRuangan: 'RUANG SERVER',
    picRuangan: 'BUDI',
    ruanganId: 11,
  },
  assets: [
    { barcode: '1300000001', namaAset: 'Laptop', isChecked: false },
    { barcode: '1300000002', namaAset: 'Scanner', isChecked: false },
  ],
};

describe('opnameReducer SQL room import actions', () => {
  it('removes room locally and clamps current room index to previous valid room', () => {
    const state = {
      ...initialState,
      rooms: [makeRoom('A'), makeRoom('B'), makeRoom('C')],
      currentRoomIndex: 2,
      isLoaded: true,
    };

    const result = opnameReducer(state, {
      type: 'REMOVE_ROOM_LOCAL',
      payload: { roomIndex: 2 },
    });

    expect(result.rooms.map((room) => room.meta.roomName)).toEqual(['A', 'B']);
    expect(result.currentRoomIndex).toBe(1);
    expect(state.rooms).toHaveLength(3);
  });

  it('removes earlier room and shifts current room index left', () => {
    const state = {
      ...initialState,
      rooms: [makeRoom('A'), makeRoom('B'), makeRoom('C')],
      currentRoomIndex: 2,
      isLoaded: true,
    };

    const result = opnameReducer(state, {
      type: 'REMOVE_ROOM_LOCAL',
      payload: { roomIndex: 0 },
    });

    expect(result.rooms.map((room) => room.meta.roomName)).toEqual(['B', 'C']);
    expect(result.currentRoomIndex).toBe(1);
  });

  it('creates SQL imported room with category suffix and unchecked assets', () => {
    const state = {
      ...initialState,
      rooms: [makeRoom('BASE')],
      currentRoomIndex: 0,
      isLoaded: true,
    };

    const result = opnameReducer(state, {
      type: 'ADD_SQL_IMPORTED_ROOM',
      payload: sqlPayload,
    });

    expect(result.rooms).toHaveLength(2);
    expect(result.currentRoomIndex).toBe(1);
    expect(result.rooms[1]).toMatchObject({
      sheetName: 'RUANG SERVER — ICT',
      isCustomRoom: false,
      isSqlImportedRoom: true,
      meta: {
        title: 'RUANGAN SQL IMPORT',
        roomName: 'RUANG SERVER — ICT',
        source: 'sql-room-import',
        sourceRoomName: 'RUANG SERVER',
        sourceRoomId: 11,
        ownerCategory: 'ICT',
        picName: 'BUDI',
      },
    });
    expect(result.rooms[1].assets.every((asset) => asset.isChecked === false)).toBe(true);
  });

  it('appends to existing SQL imported room and dedupes barcode without mutating old room', () => {
    const existingRoom = makeRoom('RUANG SERVER — ICT', [
      { barcode: '1300000001', namaAset: 'Old laptop', isChecked: true },
    ]);
    existingRoom.meta.source = 'sql-room-import';

    const state = {
      ...initialState,
      rooms: [existingRoom],
      currentRoomIndex: 0,
      isLoaded: true,
    };

    const result = opnameReducer(state, {
      type: 'ADD_SQL_IMPORTED_ROOM',
      payload: { ...sqlPayload, appendIfExist: true },
    });

    expect(result.rooms).toHaveLength(1);
    expect(result.currentRoomIndex).toBe(0);
    expect(result.rooms[0].assets).toEqual([
      { barcode: '1300000001', namaAset: 'Old laptop', isChecked: true },
      { barcode: '1300000002', namaAset: 'Scanner', isChecked: false },
    ]);
    expect(state.rooms[0].assets).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run reducer tests and verify fail**

Run from `app/`:

```bash
rtk npm run test -- useOpnameState.sqlRoomImport
```

Expected: FAIL because `initialState` and `opnameReducer` are not exported.

- [ ] **Step 3: Export reducer and harden duplicate append logic**

In `app/src/store/useOpnameState.jsx`, change:

```js
const initialState = {
```

to:

```js
export const initialState = {
```

Add below `updateRoomAssetList`:

```js
export function createEmptySignatures() {
    return {
        petugasOpname1: null,
        petugasOpname1Name: '',
        petugasOpname2: null,
        petugasOpname2Name: '',
        picRuangan: null,
        picRuanganName: '',
    };
}
```

Change:

```js
function opnameReducer(state, action) {
```

to:

```js
export function opnameReducer(state, action) {
```

Inside `ADD_CUSTOM_ROOM`, replace inline `signatures` object with:

```js
signatures: createEmptySignatures(),
```

Inside `ADD_SQL_IMPORTED_ROOM`, replace whole case with:

```js
        case 'ADD_SQL_IMPORTED_ROOM': {
            const { roomName, category, sourceRoom, assets, appendIfExist } = action.payload;
            const sheetName = `${roomName} — ${category}`;
            const existingIndex = state.rooms.findIndex((room) => room.meta?.roomName === sheetName);

            if (existingIndex !== -1 && appendIfExist) {
                const oldRoom = state.rooms[existingIndex];
                const oldAssetsMap = new Map();
                oldRoom.assets.forEach((asset) => {
                    const barcode = String(asset.barcode || '').trim();
                    if (barcode) oldAssetsMap.set(barcode, asset);
                });

                const newAssets = assets.filter((asset) => {
                    const barcode = String(asset.barcode || '').trim();
                    return barcode && !oldAssetsMap.has(barcode);
                });
                const newRooms = [...state.rooms];
                newRooms[existingIndex] = {
                    ...oldRoom,
                    assets: [...oldRoom.assets, ...newAssets],
                };

                return {
                    ...state,
                    rooms: newRooms,
                    currentRoomIndex: existingIndex,
                };
            }

            const newRoom = {
                sheetName,
                meta: {
                    title: 'RUANGAN SQL IMPORT',
                    area: '',
                    roomName: sheetName,
                    period: state.rooms[0]?.meta?.period || '',
                    picName: sourceRoom?.picRuangan || '',
                    date: new Date().toLocaleDateString('id-ID'),
                    source: 'sql-room-import',
                    sourceRoomName: sourceRoom?.namaRuangan || '',
                    sourceRoomId: sourceRoom?.ruanganId || null,
                    ownerCategory: category,
                },
                assets,
                noBarcodeAssets: [],
                notAtLocationAssets: [],
                signatures: createEmptySignatures(),
                isCustomRoom: false,
                isSqlImportedRoom: true,
            };

            return {
                ...state,
                rooms: [...state.rooms, newRoom],
                currentRoomIndex: state.rooms.length,
            };
        }
```

- [ ] **Step 4: Run reducer tests and verify pass**

Run from `app/`:

```bash
rtk npm run test -- useOpnameState.sqlRoomImport
```

Expected: PASS.

- [ ] **Step 5: Run existing reducer tests**

Run from `app/`:

```bash
rtk npm run test -- reducer
```

Expected: PASS.

- [ ] **Step 6: Commit reducer hardening**

```bash
rtk git add src/store/useOpnameState.jsx src/__tests__/useOpnameState.sqlRoomImport.test.js
rtk git commit -m "test: cover sql room reducer actions"
```

---

## Task 3: Validate SQL room assets endpoint owner query

**Files:**
- Modify: `app/server/routes/sqlRoute.js`
- Create: `app/src/__tests__/sqlRoute.rooms.test.js`

- [ ] **Step 1: Write failing route tests**

Create `app/src/__tests__/sqlRoute.rooms.test.js`:

```js
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestInput = vi.fn(function input() { return this; });
const requestQuery = vi.fn();
const poolRequest = vi.fn(() => ({ input: requestInput, query: requestQuery }));

vi.mock('mssql', () => ({
  default: {
    ConnectionPool: vi.fn(() => ({
      on: vi.fn(),
      connect: vi.fn(() => Promise.resolve({ request: poolRequest })),
    })),
    Int: 'Int',
    NVarChar: 'NVarChar',
  },
}));

const mockGuard = vi.fn(async (_name, fn) => fn());
vi.mock('../../server/utils/upstreamHealth.js', () => ({
  registry: { guard: (...args) => mockGuard(...args) },
  UpstreamOpenError: class extends Error {},
  UpstreamTimeoutError: class extends Error {},
}));

const { default: sqlRoute } = await import('../../server/routes/sqlRoute.js');

function extractMiddleware(routeFactory) {
  let middleware;
  routeFactory().configureServer({ middlewares: { use: (fn) => { middleware = fn; } } });
  return middleware;
}

function makeReqRes(url, method = 'GET') {
  const headersOut = {};
  let body = null;
  const res = {
    statusCode: 0,
    setHeader: (key, value) => { headersOut[key.toLowerCase()] = value; },
    end: (data) => {
      if (data) {
        body = JSON.parse(data);
      }
    },
  };

  return {
    req: { url, method, headers: { host: 'localhost' } },
    res,
    getBody: () => body,
    getStatus: () => res.statusCode,
    headersOut,
  };
}

async function flushMiddleware() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('sqlRoute room import endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestQuery.mockResolvedValue({ recordset: [] });
  });

  it('rejects room asset requests without valid owner query', async () => {
    const middleware = extractMiddleware(sqlRoute);
    const { req, res, getStatus, getBody } = makeReqRes('/api/db/rooms/RUANG%20SERVER/assets?owner=FINANCE');

    middleware(req, res, () => {});
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
```

- [ ] **Step 2: Run route tests and verify fail**

Run from `app/`:

```bash
rtk npm run test -- sqlRoute.rooms
```

Expected: FAIL because invalid owner query currently not rejected.

- [ ] **Step 3: Add owner validation to route**

In `app/server/routes/sqlRoute.js`, add near constants at top:

```js
const ROOM_IMPORT_OWNERS = new Set(['ICT', 'HRGA', 'ENG']);
```

Inside `/api/db/rooms/:roomName/assets` block, after `roomName` line:

```js
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const owner = String(url.searchParams.get('owner') || '').trim().toUpperCase();
```

Then after room name validation:

```js
      if (!ROOM_IMPORT_OWNERS.has(owner)) {
        sendJson(400, { success: false, error: 'Owner wajib salah satu: ICT, HRGA, ENG' });
        return;
      }
```

Do not add SQL filtering by owner yet. Keep query returning all latest assets for selected room.

- [ ] **Step 4: Run route tests and verify pass**

Run from `app/`:

```bash
rtk npm run test -- sqlRoute.rooms
```

Expected: PASS.

- [ ] **Step 5: Run existing SQL plugin tests**

Run from `app/`:

```bash
rtk npm run test -- sqlPlugin
```

Expected: PASS.

- [ ] **Step 6: Commit route validation**

```bash
rtk git add server/routes/sqlRoute.js src/__tests__/sqlRoute.rooms.test.js
rtk git commit -m "test: validate sql room import endpoints"
```

---

## Task 4: Fix SQL import modal API URLs and review state

**Files:**
- Modify: `app/src/components/SqlRoomPicker.jsx`
- Modify: `app/src/components/SqlRoomImportModal.jsx`
- Create: `app/src/__tests__/SqlRoomImportModal.test.jsx`

- [ ] **Step 1: Write failing modal tests**

Create `app/src/__tests__/SqlRoomImportModal.test.jsx`:

```jsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SqlRoomImportModal from '../components/SqlRoomImportModal';

const roomsResponse = {
  success: true,
  data: [
    { NAMA_RUANGAN: 'RUANG SERVER', PIC_RUANGAN: 'BUDI', RUANGAN_ID: 11, ASSET_COUNT: 3 },
  ],
};

const assetsResponse = {
  success: true,
  data: [
    { BARCODE_ASSET: '1300000001', NAMA_ASSET: 'LAPTOP', CREATE_USER: 'ICT_ADMIN', NAMA_RUANGAN: 'RUANG SERVER', NAMA_KONDISI: 'Baik' },
    { BARCODE_ASSET: '1300000002', NAMA_ASSET: 'MONITOR', CREATE_USER: '', NAMA_RUANGAN: 'RUANG SERVER', NAMA_KONDISI: 'Baik' },
    { BARCODE_ASSET: '1300000003', NAMA_ASSET: 'PANEL', CREATE_USER: 'ENG_USER', NAMA_RUANGAN: 'RUANG SERVER', NAMA_KONDISI: 'Baik' },
  ],
};

function mockFetchOnce() {
  global.fetch = vi.fn((url) => {
    const value = String(url);
    if (value.includes('/api/db/rooms/RUANG%20SERVER/assets?owner=ICT')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(assetsResponse) });
    }
    if (value.includes('/api/db/rooms')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(roomsResponse) });
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ success: false }) });
  });
}

describe('SqlRoomImportModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetchOnce();
  });

  it('loads rooms with relative API URL and imports only included assets after review', async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(<SqlRoomImportModal isOpen onClose={onClose} onImport={onImport} existingRooms={[]} />);

    fireEvent.focus(screen.getByPlaceholderText('Ketik nama atau kode ruang SQL...'));
    fireEvent.change(screen.getByPlaceholderText('Ketik nama atau kode ruang SQL...'), {
      target: { value: 'SERVER' },
    });

    const option = await screen.findByRole('button', { name: /RUANG SERVER/i });
    fireEvent.click(option);
    fireEvent.click(screen.getByText('ICT'));
    fireEvent.click(screen.getByRole('button', { name: /Lanjut Review Aset/i }));

    await screen.findByText(/Review: RUANG SERVER/i);

    expect(global.fetch).toHaveBeenCalledWith('/api/db/rooms');
    expect(global.fetch).toHaveBeenCalledWith('/api/db/rooms/RUANG%20SERVER/assets?owner=ICT');
    expect(screen.getByRole('button', { name: /Import 1 Aset ICT/i })).toBeDisabled();

    const reviewTab = screen.getByRole('button', { name: /Perlu Review/i });
    fireEvent.click(reviewTab);

    const reviewTable = screen.getByTestId('asset-import-review-table');
    fireEvent.click(within(reviewTable).getByTitle('Include ke ICT'));

    await waitFor(() => expect(screen.getByRole('button', { name: /Import 2 Aset ICT/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /Import 2 Aset ICT/i }));

    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({
      roomName: 'RUANG SERVER',
      category: 'ICT',
      sourceRoom: { namaRuangan: 'RUANG SERVER', picRuangan: 'BUDI', ruanganId: 11 },
      appendIfExist: false,
    }));
    expect(onImport.mock.calls[0][0].assets).toHaveLength(2);
    expect(onImport.mock.calls[0][0].assets.every((asset) => asset.isChecked === false)).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty state and disables import when selected room has no assets', async () => {
    global.fetch = vi.fn((url) => {
      const value = String(url);
      if (value.includes('/assets?owner=ICT')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(roomsResponse) });
    });

    render(<SqlRoomImportModal isOpen onClose={vi.fn()} onImport={vi.fn()} existingRooms={[]} />);

    fireEvent.focus(screen.getByPlaceholderText('Ketik nama atau kode ruang SQL...'));
    const option = await screen.findByRole('button', { name: /RUANG SERVER/i });
    fireEvent.click(option);
    fireEvent.click(screen.getByText('ICT'));
    fireEvent.click(screen.getByRole('button', { name: /Lanjut Review Aset/i }));

    expect(await screen.findByText('Tidak ada aset latest untuk ruangan ini.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import 0 Aset ICT/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run modal tests and verify fail**

Run from `app/`:

```bash
rtk npm run test -- SqlRoomImportModal
```

Expected: FAIL because current code uses hardcoded `http://localhost:3000`, assets URL lacks `owner=ICT`, picker options are not buttons, and no empty state text.

- [ ] **Step 3: Update `SqlRoomPicker.jsx` API and option semantics**

In `app/src/components/SqlRoomPicker.jsx`, add import:

```js
import { apiUrl } from '../utils/apiConfig';
```

Replace fetch:

```js
const res = await fetch('http://localhost:3000/api/db/rooms');
```

with:

```js
const res = await fetch(apiUrl('/api/db/rooms'));
```

Replace catch error line:

```js
if (mounted) setError(err.message);
```

with:

```js
if (mounted) setError('Koneksi SQL tidak tersedia. Coba lagi atau hubungi admin.');
```

Replace dropdown row `<div ... onClick={() => handleSelect(r)}>` with:

```jsx
<button
  key={r.NAMA_RUANGAN || i}
  type="button"
  className="w-full text-left p-3 border-b border-gray-100 cursor-pointer hover:bg-orange-50 transition-colors"
  onClick={() => handleSelect(r)}
>
  <div className="font-bold text-sm text-[#2d2a27]">{r.NAMA_RUANGAN}</div>
  <div className="text-xs text-[#756f68] mt-1">
    {r.ASSET_COUNT} aset · PIC: {r.PIC_RUANGAN || 'Belum ada'}
  </div>
</button>
```

- [ ] **Step 4: Update `SqlRoomImportModal.jsx` API and manual decisions**

In `app/src/components/SqlRoomImportModal.jsx`, add import:

```js
import { apiUrl } from '../utils/apiConfig';
```

Add state after error state:

```js
const [manualDecisions, setManualDecisions] = useState({});
```

Inside close reset effect add:

```js
setManualDecisions({});
```

Replace `fetchAssets` with:

```js
  const fetchAssets = async () => {
    if (!selectedRoom || !selectedCategory) return;

    setLoading(true);
    setError(null);
    setManualDecisions({});
    try {
      const roomName = encodeURIComponent(selectedRoom.NAMA_RUANGAN);
      const res = await fetch(apiUrl(`/api/db/rooms/${roomName}/assets?owner=${selectedCategory}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        const previewData = buildImportPreview(data.data || [], selectedCategory, {});
        setAssets([
          ...previewData.includeList,
          ...previewData.reviewList,
          ...previewData.excludeList,
        ]);
        setStep(3);
      } else {
        setError(data.error || 'Koneksi SQL tidak tersedia. Coba lagi atau hubungi admin.');
      }
    } catch {
      setError('Koneksi SQL tidak tersedia. Coba lagi atau hubungi admin.');
    } finally {
      setLoading(false);
    }
  };
```

Replace `handleAssetDecision` with:

```js
  const handleAssetDecision = (barcode, decision) => {
    const normalizedBarcode = String(barcode || '').trim();
    const nextManualDecisions = {
      ...manualDecisions,
      [normalizedBarcode]: decision,
    };
    const previewData = buildImportPreview(assets, selectedCategory, nextManualDecisions);

    setManualDecisions(nextManualDecisions);
    setAssets([
      ...previewData.includeList,
      ...previewData.reviewList,
      ...previewData.excludeList,
    ]);
  };
```

Replace `handleBatchDecision` with:

```js
  const handleBatchDecision = (decision) => {
    const reviewAssets = assets.filter((asset) => asset._classification.importDecision === 'review');
    const nextManualDecisions = reviewAssets.reduce((acc, asset) => ({
      ...acc,
      [String(asset.BARCODE_ASSET || '').trim()]: decision,
    }), manualDecisions);
    const previewData = buildImportPreview(assets, selectedCategory, nextManualDecisions);

    setManualDecisions(nextManualDecisions);
    setAssets([
      ...previewData.includeList,
      ...previewData.reviewList,
      ...previewData.excludeList,
    ]);
  };
```

Inside review step before `<AssetImportReviewTable ... />`, add:

```jsx
{assets.length === 0 && (
  <div className="p-4 bg-white border border-[#eaded4] rounded-xl text-sm font-bold text-[#756f68]">
    Tidak ada aset latest untuk ruangan ini.
  </div>
)}
```

Keep `AssetImportReviewTable` render below it; zero rows are OK.

- [ ] **Step 5: Add test id to review table**

In `app/src/components/AssetImportReviewTable.jsx`, change root:

```jsx
<div className="mt-4">
```

to:

```jsx
<div className="mt-4" data-testid="asset-import-review-table">
```

- [ ] **Step 6: Run modal tests and verify pass**

Run from `app/`:

```bash
rtk npm run test -- SqlRoomImportModal
```

Expected: PASS.

- [ ] **Step 7: Commit modal API fixes**

```bash
rtk git add src/components/SqlRoomPicker.jsx src/components/SqlRoomImportModal.jsx src/components/AssetImportReviewTable.jsx src/__tests__/SqlRoomImportModal.test.jsx
rtk git commit -m "test: cover sql room import modal"
```

---

## Task 5: Polish delete modal details and page wiring

**Files:**
- Modify: `app/src/components/DeleteRoomConfirmModal.jsx`
- Modify: `app/src/pages/OpnamePage.jsx`

- [ ] **Step 1: Update delete modal props and copy**

Replace `app/src/components/DeleteRoomConfirmModal.jsx` with:

```jsx
import React from 'react';

function DeleteRoomConfirmModal({ roomName, assetCount = 0, sourceLabel = 'Kertas kerja lokal', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#eaded4]">
        <div className="p-6 border-b border-[#eaded4] bg-[#fffaf5]">
          <h2 className="text-xl font-black text-[#2d2a27] m-0">Hapus ruangan dari kertas kerja?</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-[#756f68] mb-4">
            Anda akan menghapus ruangan <strong>{roomName}</strong> dari sesi opname saat ini.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
            <div className="p-3 rounded-xl border border-[#eaded4] bg-white">
              <div className="font-black text-[#2d2a27]">{assetCount}</div>
              <div className="text-[#756f68]">aset di kertas kerja</div>
            </div>
            <div className="p-3 rounded-xl border border-[#eaded4] bg-white">
              <div className="font-black text-[#2d2a27]">{sourceLabel}</div>
              <div className="text-[#756f68]">sumber ruangan</div>
            </div>
          </div>
          <div className="p-4 bg-[#fff1f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-xs font-bold leading-relaxed">
            Data SQL/server tidak akan berubah. Ruangan ini hanya dihapus dari kertas kerja lokal Anda.
          </div>
        </div>
        <div className="p-4 bg-gray-50 border-t border-[#eaded4] flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold bg-white border border-[#eaded4] rounded-xl text-[#2d2a27] hover:bg-gray-50 transition-colors shadow-[0_3px_0_#eaded4]"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold bg-[#fff1f2] border border-[#fecaca] rounded-xl text-[#b91c1c] hover:bg-red-50 transition-colors shadow-[0_3px_0_#fecaca]"
          >
            Hapus dari Kertas Kerja
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteRoomConfirmModal;
```

- [ ] **Step 2: Update page wiring**

In `app/src/pages/OpnamePage.jsx`, replace delete modal props:

```jsx
<DeleteRoomConfirmModal
    roomName={room.meta.roomName}
    onConfirm={() => {
```

with:

```jsx
<DeleteRoomConfirmModal
    roomName={room.meta.roomName}
    assetCount={(room.assets?.length || 0) + (room.noBarcodeAssets?.length || 0) + (room.notAtLocationAssets?.length || 0)}
    sourceLabel={room.meta?.source === 'sql-room-import' ? `SQL Import ${room.meta.ownerCategory || ''}`.trim() : room.isCustomRoom ? 'Custom lokal' : 'Excel/kertas kerja'}
    onConfirm={() => {
```

Replace toast:

```js
showToast('Ruangan dihapus dari kertas kerja lokal.', 'success');
```

with:

```js
showToast('Ruangan dihapus dari kertas kerja. Data server tidak berubah.', 'success');
```

- [ ] **Step 3: Run focused tests**

Run from `app/`:

```bash
rtk npm run test -- SqlRoomImportModal useOpnameState.sqlRoomImport
```

Expected: PASS.

- [ ] **Step 4: Commit delete modal polish**

```bash
rtk git add src/components/DeleteRoomConfirmModal.jsx src/pages/OpnamePage.jsx
rtk git commit -m "feat: clarify local room delete flow"
```

---

## Task 6: Full verification and review

**Files:**
- No source changes expected unless tests/build expose failures.

- [ ] **Step 1: Run all SQL room import tests**

Run from `app/`:

```bash
rtk npm run test -- sqlRoomImport useOpnameState.sqlRoomImport SqlRoomImportModal sqlRoute.rooms
```

Expected: PASS.

- [ ] **Step 2: Run existing related tests**

Run from `app/`:

```bash
rtk npm run test -- reducer sqlPlugin
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run from `app/`:

```bash
rtk npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual verification**

Run app from `app/`:

```bash
rtk npm run dev
```

Manual checks:

1. Open `/app1/opname`.
2. Click delete room button.
3. Confirm modal says `Data SQL/server tidak akan berubah` and shows asset count/source.
4. Confirm delete removes only local room from current session.
5. Open `+ Ruangan dari SQL`.
6. Confirm room picker loads via current host, not hardcoded `localhost:3000`.
7. Select `RUANG SERVER` or available SQL room.
8. Select `ICT`.
9. Confirm assets endpoint request includes `?owner=ICT`.
10. Confirm rows with `CREATE_USER` containing `ICT` are in `Masuk ICT`.
11. Confirm `ENG` rows are in `Exclude`.
12. Confirm blank/unknown `CREATE_USER` rows are in `Perlu Review`.
13. Include one review row.
14. Confirm import button disabled until all review rows decided.
15. Import.
16. Confirm new room name ends with `— ICT`.
17. Confirm all imported assets are unchecked.
18. Repeat same room/category and confirm append prompt appears and duplicate barcodes are not duplicated.

- [ ] **Step 5: Request code review subagent**

Use code reviewer after changes:

```text
Review SQL room import changes for correctness, immutability, security, and test quality. Focus files: app/server/routes/sqlRoute.js, app/src/utils/sqlRoomImport.js, app/src/store/useOpnameState.jsx, app/src/components/SqlRoomImportModal.jsx, app/src/components/SqlRoomPicker.jsx, app/src/components/AssetImportReviewTable.jsx, app/src/components/DeleteRoomConfirmModal.jsx, app/src/pages/OpnamePage.jsx, and new tests.
```

Expected: no CRITICAL/HIGH issues. Fix any CRITICAL/HIGH before finishing.

- [ ] **Step 6: Security review for SQL endpoint**

Use security reviewer:

```text
Review SQL room import endpoints and frontend flow. Verify routes are GET/read-only, SQL value inputs are parameterized, owner query is validated, errors do not leak credentials/connection strings, and frontend delete is local state only.
```

Expected: no CRITICAL/HIGH issues. Fix any CRITICAL/HIGH before finishing.

- [ ] **Step 7: Commit verification fixes if needed**

If review/test fixes were made:

```bash
rtk git add <changed-files>
rtk git commit -m "fix: harden sql room import flow"
```

Expected: commit created only if files changed.

---

## Acceptance Mapping

- User can remove room locally without SQL mutation: Task 2, Task 5.
- Delete confirmation says SQL/server unchanged: Task 5.
- User can create room from SQL dropdown: existing components hardened in Task 4.
- User can choose one category per create: existing `OwnerCategorySelector`, verified in Task 4.
- `CREATE_USER` determines owner category: Task 1.
- Unknown `CREATE_USER` requires review: Task 1, Task 4.
- Ambiguous keyword creates warning, not owner override: Task 1, Task 4.
- Only included assets enter kertas kerja: Task 1, Task 4.
- Imported assets start unchecked: Task 1, Task 2, Task 4.
- SQL endpoints read-only and parameterized: Task 3, Task 6.
- Build/tests pass: Task 6.

---

## Notes / Deliberate Non-Changes

- No new dependency. Existing React/Vitest utilities enough.
- No server-side owner filtering in first pass. Frontend classification needs full room rows so `Exclude` tab and review logic stay transparent.
- No virtualization yet. Add only if preview rows exceed 200 and performance becomes bad.
- No database schema change. Feature is read-only SQL + local React state.
