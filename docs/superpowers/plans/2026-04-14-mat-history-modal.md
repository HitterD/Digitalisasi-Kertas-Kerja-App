# MAT History Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan modal timeline riwayat MAT (Mutasi Asset Transfer) yang bisa dibuka dari `BarcodeSearchModal`, menampilkan perpindahan aset dari ruangan asal ke tujuan beserta seluruh detail transaksi dan status "Proses MAT" jika ada transaksi aktif.

**Architecture:** Endpoint baru `/api/db/mat-history/:barcode` ditambahkan ke `sqlPlugin.js` yang sudah ada, query ke view `V_TRX_MAT`. Frontend: `matApi.js` sebagai client, `MatHistoryModal.jsx` sebagai komponen timeline yang dipanggil dari `BarcodeSearchModal.jsx` via tombol di section hasil pencarian.

**Tech Stack:** Node.js + `mssql` (backend), React + Vitest (frontend), CSS vanilla dengan variable CSS project yang sudah ada.

---

## File Map

| Aksi | Path | Tanggung Jawab |
|------|------|----------------|
| Modify | `app/src/server/plugins/sqlPlugin.js` | Tambah handler endpoint `/api/db/mat-history/:barcode` |
| Create | `app/src/utils/matApi.js` | API client untuk fetch riwayat MAT |
| Create | `app/src/__tests__/matApi.test.js` | Unit test untuk matApi.js |
| Create | `app/src/components/MatHistoryModal.css` | Styles untuk timeline modal |
| Create | `app/src/components/MatHistoryModal.jsx` | Komponen modal timeline riwayat MAT |
| Modify | `app/src/components/BarcodeSearchModal.jsx` | Tambah tombol trigger + render MatHistoryModal |
| Modify | `app/src/components/BarcodeSearchModal.css` | Tambah style untuk tombol trigger |

---

## Task 1: Backend — Endpoint `/api/db/mat-history/:barcode`

**Files:**
- Modify: `app/src/server/plugins/sqlPlugin.js` (tambah sebelum `next()` di baris ~338)

- [ ] **Step 1: Cari lokasi yang tepat di sqlPlugin.js**

Buka `app/src/server/plugins/sqlPlugin.js`. Temukan baris:
```javascript
  next();
}

export default function viteSqlServerPlugin() {
```
Handler baru disisipkan tepat sebelum `next();`.

- [ ] **Step 2: Tambahkan handler mat-history**

Sisipkan blok berikut tepat sebelum `next();`:

```javascript
  // GET /api/db/mat-history/:barcode
  const matHistoryMatch = req.url?.match(/^\/api\/db\/mat-history\/([^/?]+)/);
  if (matHistoryMatch && req.method === 'GET') {
    const barcode = decodeURIComponent(matHistoryMatch[1]);
    (async () => {
      if (!barcode.trim()) {
        sendJson(400, { success: false, error: 'Barcode tidak boleh kosong' });
        return;
      }
      try {
        const pool = await getPool();
        const result = await pool.request()
          .input('barcode', sql.NVarChar, barcode.trim())
          .query(`
            SELECT
              TRXID, NO_MAT, JENIS_MAT,
              ASAL_RUANGAN_ID, TUJUAN_RUANGAN_ID,
              LPB, KONDISI_ID, CREATED_DATE,
              USER_MAKER, NAME_MAKER,
              STATUS, PENJELASAN,
              COUNTER_NUM, STEP_APPROVAL,
              DEPT, BARCODE_ASSET, NAMA_ASSET,
              NEXT_VERIFICATOR, NEXT_ROLE_VERIFICATOR
            FROM [dbo].[V_TRX_MAT]
            WHERE LTRIM(RTRIM(BARCODE_ASSET)) = @barcode
            ORDER BY CREATED_DATE DESC
          `);

        const INACTIVE_STATUSES = ['COMPLETED', 'REJECTED'];
        const hasActiveMAT = result.recordset.some(
          (r) => !INACTIVE_STATUSES.includes((r.STATUS || '').toUpperCase())
        );

        console.log(`[SQL Server] MAT history for ${barcode}: ${result.recordset.length} records, hasActiveMAT=${hasActiveMAT}`);
        sendJson(200, {
          success: true,
          barcode: barcode.trim(),
          hasActiveMAT,
          count: result.recordset.length,
          data: result.recordset,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[SQL Server] MAT history query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }
```

- [ ] **Step 3: Verifikasi manual via curl atau browser**

Jalankan dev server (`npm run dev` di folder `app/`), lalu test endpoint dengan barcode yang ada di database:

```
http://localhost:5173/api/db/mat-history/BARCODE_ASLI_ANDA
```

Expected response:
```json
{
  "success": true,
  "barcode": "...",
  "hasActiveMAT": true/false,
  "count": N,
  "data": [...],
  "timestamp": "..."
}
```

- [ ] **Step 4: Commit**

```bash
cd "d:/Digitalisasi Kertas Kerja APP/app"
git add src/server/plugins/sqlPlugin.js
git commit -m "feat: add GET /api/db/mat-history/:barcode endpoint"
```

---

## Task 2: API Client — `matApi.js`

**Files:**
- Create: `app/src/utils/matApi.js`
- Create: `app/src/__tests__/matApi.test.js`

- [ ] **Step 1: Tulis test yang gagal**

Buat file `app/src/__tests__/matApi.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiConfig sebelum import matApi
vi.mock('../utils/apiConfig', () => ({
  apiUrl: (path) => `http://localhost:5173${path}`,
  fetchWithAuth: vi.fn(),
}));

import { fetchMatHistory } from '../utils/matApi';
import * as apiConfig from '../utils/apiConfig';

describe('fetchMatHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches MAT history and returns parsed response', async () => {
    const mockResponse = {
      success: true,
      barcode: '10001',
      hasActiveMAT: true,
      count: 1,
      data: [
        {
          TRXID: 1,
          NO_MAT: 'MAT-001',
          STATUS: 'PENDING',
          ASAL_RUANGAN_ID: 'RUANG-A',
          TUJUAN_RUANGAN_ID: 'RUANG-B',
        },
      ],
      timestamp: '2026-04-14T00:00:00.000Z',
    };
    apiConfig.fetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchMatHistory('10001');

    expect(apiConfig.fetchWithAuth).toHaveBeenCalledWith(
      'http://localhost:5173/api/db/mat-history/10001',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.hasActiveMAT).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].ASAL_RUANGAN_ID).toBe('RUANG-A');
  });

  it('throws error with server message when response is not ok', async () => {
    apiConfig.fetchWithAuth.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Query gagal' }),
    });

    await expect(fetchMatHistory('99999')).rejects.toThrow('Query gagal');
  });

  it('throws HTTP status when server returns no error message', async () => {
    apiConfig.fetchWithAuth.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    });

    await expect(fetchMatHistory('99999')).rejects.toThrow('HTTP 503');
  });

  it('URL-encodes barcode with special characters', async () => {
    apiConfig.fetchWithAuth.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          barcode: 'A/1',
          hasActiveMAT: false,
          count: 0,
          data: [],
          timestamp: '',
        }),
    });

    await fetchMatHistory('A/1');

    expect(apiConfig.fetchWithAuth).toHaveBeenCalledWith(
      expect.stringContaining('A%2F1'),
      expect.any(Object)
    );
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

```bash
cd "d:/Digitalisasi Kertas Kerja APP/app"
npm run test -- matApi
```

Expected: Error `Cannot find module '../utils/matApi'`

- [ ] **Step 3: Buat `matApi.js`**

Buat file `app/src/utils/matApi.js`:

```javascript
import { apiUrl, fetchWithAuth } from './apiConfig';

function getApiBase() {
  return apiUrl('/api/db');
}

/**
 * Fetch MAT transaction history for a specific barcode from V_TRX_MAT.
 * @param {string} barcode
 * @returns {Promise<{success: boolean, barcode: string, hasActiveMAT: boolean, count: number, data: Array, timestamp: string}>}
 */
export async function fetchMatHistory(barcode) {
  const res = await fetchWithAuth(
    `${getApiBase()}/mat-history/${encodeURIComponent(barcode)}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }
  return res.json();
}
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

```bash
cd "d:/Digitalisasi Kertas Kerja APP/app"
npm run test -- matApi
```

Expected output:
```
✓ fetches MAT history and returns parsed response
✓ throws error with server message when response is not ok
✓ throws HTTP status when server returns no error message
✓ URL-encodes barcode with special characters
Test Files  1 passed (1)
Tests  4 passed (4)
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/matApi.js src/__tests__/matApi.test.js
git commit -m "feat: add matApi.js with fetchMatHistory and unit tests"
```

---

## Task 3: Styles — `MatHistoryModal.css`

**Files:**
- Create: `app/src/components/MatHistoryModal.css`

- [ ] **Step 1: Buat file CSS**

Buat `app/src/components/MatHistoryModal.css` dengan isi berikut. Style mengikuti pola rounded/modern dari `BarcodeSearchModal.css` (`border-radius: 24px`, `box-shadow` soft). z-index overlay `1100` (di atas `bcs-overlay` yang `999`):

```css
/* MatHistoryModal.css */

.mhm-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: mhm-fade-in 0.2s ease forwards;
}

@keyframes mhm-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
}

.mhm-modal {
    background: #ffffff;
    border-radius: 24px;
    box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.35);
    width: 100%;
    max-width: 620px;
    max-height: 82vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: mhm-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes mhm-slide-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
    .mhm-overlay { align-items: flex-end; padding: 0; }
    .mhm-modal { border-radius: 24px 24px 0 0; max-height: 88vh; max-width: 100%; }
}

/* ── Header ───────────────────────────────────────────────── */
.mhm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 24px 28px 18px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.07);
    gap: 12px;
    flex-shrink: 0;
}

.mhm-header-left {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.mhm-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--neutral-900, #0f172a);
    line-height: 1.3;
}

.mhm-subtitle {
    font-size: 12px;
    color: var(--neutral-400, #94a3b8);
    font-weight: 500;
    letter-spacing: 0.02em;
}

.mhm-badge-active {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #fef3c7;
    color: #92400e;
    border: 1.5px solid #fbbf24;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    margin-top: 6px;
    width: fit-content;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.mhm-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--neutral-100, #f1f5f9);
    color: var(--neutral-500, #64748b);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
}
.mhm-close-btn:hover {
    background: var(--danger-50, #fef2f2);
    color: var(--danger-600, #dc2626);
}

/* ── Body ─────────────────────────────────────────────────── */
.mhm-body {
    overflow-y: auto;
    padding: 24px 28px 28px;
    flex: 1;
}
.mhm-body::-webkit-scrollbar { width: 6px; }
.mhm-body::-webkit-scrollbar-thumb { background: var(--neutral-200, #e2e8f0); border-radius: 99px; }

/* ── States ───────────────────────────────────────────────── */
.mhm-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 48px 0;
    color: var(--neutral-400, #94a3b8);
    font-size: 13px;
}

.mhm-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--neutral-200, #e2e8f0);
    border-top-color: var(--primary-500, #6366f1);
    border-radius: 50%;
    animation: mhm-spin 0.7s linear infinite;
}
@keyframes mhm-spin { to { transform: rotate(360deg); } }

.mhm-error {
    background: var(--danger-50, #fef2f2);
    border: 1.5px solid var(--danger-200, #fecaca);
    border-radius: 12px;
    padding: 16px 20px;
    color: var(--danger-700, #b91c1c);
    font-size: 14px;
    font-weight: 600;
}

.mhm-empty {
    text-align: center;
    padding: 48px 0;
    color: var(--neutral-400, #94a3b8);
}
.mhm-empty p {
    font-size: 14px;
    margin-top: 6px;
}

/* ── Timeline ─────────────────────────────────────────────── */
.mhm-timeline {
    display: flex;
    flex-direction: column;
}

.mhm-timeline-item {
    display: flex;
    gap: 14px;
}

.mhm-timeline-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 18px;
    padding-top: 2px;
}

.mhm-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--neutral-300, #cbd5e1);
    border: 2.5px solid #fff;
    box-shadow: 0 0 0 2px var(--neutral-300, #cbd5e1);
    flex-shrink: 0;
}
.mhm-dot.active {
    background: #f59e0b;
    box-shadow: 0 0 0 2px #f59e0b;
}

.mhm-line {
    width: 2px;
    flex: 1;
    background: var(--neutral-200, #e2e8f0);
    min-height: 12px;
    margin: 3px 0;
}
.mhm-timeline-item:last-child .mhm-line {
    display: none;
}

/* ── Card ─────────────────────────────────────────────────── */
.mhm-card {
    background: var(--neutral-50, #f8fafc);
    border: 1.5px solid var(--neutral-200, #e2e8f0);
    border-radius: 16px;
    padding: 14px 16px;
    margin-bottom: 16px;
    flex: 1;
    min-width: 0;
}

.mhm-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.mhm-card-date {
    font-size: 11px;
    color: var(--neutral-400, #94a3b8);
    font-weight: 600;
    letter-spacing: 0.04em;
}

.mhm-card-no-mat {
    font-size: 13px;
    font-weight: 700;
    color: var(--neutral-900, #0f172a);
    letter-spacing: 0.02em;
}

/* ── Status Badge ─────────────────────────────────────────── */
.mhm-status-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 9px;
    border-radius: 999px;
    border: 1.5px solid currentColor;
    flex-shrink: 0;
}
.mhm-status-badge.status-active  { color: #d97706; background: #fef3c7; }
.mhm-status-badge.status-done    { color: #059669; background: #d1fae5; }
.mhm-status-badge.status-rejected { color: #dc2626; background: #fee2e2; }

/* ── Movement Banner ──────────────────────────────────────── */
.mhm-movement {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--neutral-900, #0f172a);
    color: #fff;
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 12px;
    font-size: 12px;
    font-weight: 700;
}

.mhm-movement-from,
.mhm-movement-to {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mhm-movement-label {
    font-size: 9px;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    display: block;
    margin-bottom: 1px;
    font-weight: 600;
}

.mhm-movement-arrow {
    color: #fbbf24;
    flex-shrink: 0;
}

/* ── Fields Grid ──────────────────────────────────────────── */
.mhm-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
}

.mhm-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.mhm-field.full-width {
    grid-column: 1 / -1;
}

.mhm-field-label {
    font-size: 10px;
    color: var(--neutral-400, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
}

.mhm-field-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--neutral-700, #334155);
    word-break: break-word;
}

/* ── Footer ───────────────────────────────────────────────── */
.mhm-footer {
    padding: 14px 28px 18px;
    border-top: 1px solid rgba(0,0,0,0.07);
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
}

.mhm-btn-close {
    background: var(--neutral-900, #0f172a);
    color: #fff;
    border: none;
    border-radius: 12px;
    padding: 10px 28px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
}
.mhm-btn-close:hover { background: var(--neutral-700, #334155); }
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MatHistoryModal.css
git commit -m "feat: add MatHistoryModal.css timeline styles"
```

---

## Task 4: Komponen — `MatHistoryModal.jsx`

**Files:**
- Create: `app/src/components/MatHistoryModal.jsx`

- [ ] **Step 1: Buat komponen**

Buat `app/src/components/MatHistoryModal.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { X, ArrowRight, AlertTriangle } from 'lucide-react';
import { fetchMatHistory } from '../utils/matApi';
import './MatHistoryModal.css';

const INACTIVE_STATUSES = ['COMPLETED', 'REJECTED'];

function getStatusClass(status) {
    const s = (status || '').toUpperCase();
    if (s === 'REJECTED') return 'status-rejected';
    if (INACTIVE_STATUSES.includes(s)) return 'status-done';
    return 'status-active';
}

function formatDate(value) {
    if (!value) return '-';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value).trim();
        const day = d.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
    } catch {
        return String(value).trim();
    }
}

export default function MatHistoryModal({ barcode, namaAset, isOpen, onClose }) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [hasActiveMAT, setHasActiveMAT] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !barcode) return;

        let cancelled = false;
        setLoading(true);
        setData([]);
        setHasActiveMAT(false);
        setError(null);

        fetchMatHistory(barcode)
            .then((res) => {
                if (cancelled) return;
                setData(res.data || []);
                setHasActiveMAT(res.hasActiveMAT || false);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err.message || 'Gagal mengambil data riwayat MAT');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [isOpen, barcode]);

    if (!isOpen) return null;

    return (
        <div className="mhm-overlay" onClick={onClose} role="presentation">
            <div
                className="mhm-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Riwayat MAT Aset"
            >
                {/* Header */}
                <div className="mhm-header">
                    <div className="mhm-header-left">
                        <div className="mhm-title">Riwayat MAT — {namaAset || barcode}</div>
                        <div className="mhm-subtitle">Barcode: {barcode}</div>
                        {hasActiveMAT && (
                            <div className="mhm-badge-active">
                                <AlertTriangle size={11} strokeWidth={2.5} />
                                Proses MAT
                            </div>
                        )}
                    </div>
                    <button
                        className="mhm-close-btn"
                        onClick={onClose}
                        aria-label="Tutup modal riwayat MAT"
                    >
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body */}
                <div className="mhm-body">
                    {loading && (
                        <div className="mhm-loading">
                            <div className="mhm-spinner" />
                            Mengambil riwayat MAT...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="mhm-error">{error}</div>
                    )}

                    {!loading && !error && data.length === 0 && (
                        <div className="mhm-empty">
                            <p>Tidak ada riwayat MAT untuk aset ini.</p>
                        </div>
                    )}

                    {!loading && !error && data.length > 0 && (
                        <div className="mhm-timeline">
                            {data.map((item, idx) => {
                                const isActive = !INACTIVE_STATUSES.includes(
                                    (item.STATUS || '').toUpperCase()
                                );
                                return (
                                    <div key={item.TRXID ?? idx} className="mhm-timeline-item">
                                        <div className="mhm-timeline-left">
                                            <div className={`mhm-dot${isActive ? ' active' : ''}`} />
                                            <div className="mhm-line" />
                                        </div>

                                        <div className="mhm-card">
                                            <div className="mhm-card-header">
                                                <div>
                                                    <div className="mhm-card-date">
                                                        {formatDate(item.CREATED_DATE)}
                                                    </div>
                                                    <div className="mhm-card-no-mat">
                                                        {item.NO_MAT || '-'}
                                                    </div>
                                                </div>
                                                <div className={`mhm-status-badge ${getStatusClass(item.STATUS)}`}>
                                                    {item.STATUS || '-'}
                                                </div>
                                            </div>

                                            <div className="mhm-movement">
                                                <div className="mhm-movement-from">
                                                    <span className="mhm-movement-label">Dari</span>
                                                    {item.ASAL_RUANGAN_ID || '-'}
                                                </div>
                                                <ArrowRight
                                                    className="mhm-movement-arrow"
                                                    size={16}
                                                    strokeWidth={2.5}
                                                />
                                                <div className="mhm-movement-to">
                                                    <span className="mhm-movement-label">Ke</span>
                                                    {item.TUJUAN_RUANGAN_ID || '-'}
                                                </div>
                                            </div>

                                            <div className="mhm-fields">
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">Jenis MAT</span>
                                                    <span className="mhm-field-value">{item.JENIS_MAT || '-'}</span>
                                                </div>
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">LPB</span>
                                                    <span className="mhm-field-value">{item.LPB || '-'}</span>
                                                </div>
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">Kondisi</span>
                                                    <span className="mhm-field-value">{item.KONDISI_ID || '-'}</span>
                                                </div>
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">Dept</span>
                                                    <span className="mhm-field-value">{item.DEPT || '-'}</span>
                                                </div>
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">Pembuat</span>
                                                    <span className="mhm-field-value">{item.NAME_MAKER || '-'}</span>
                                                </div>
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">Step Approval</span>
                                                    <span className="mhm-field-value">
                                                        {item.COUNTER_NUM != null && item.STEP_APPROVAL != null
                                                            ? `${item.COUNTER_NUM} / ${item.STEP_APPROVAL}`
                                                            : '-'}
                                                    </span>
                                                </div>
                                                <div className="mhm-field full-width">
                                                    <span className="mhm-field-label">Penjelasan</span>
                                                    <span className="mhm-field-value">{item.PENJELASAN || '-'}</span>
                                                </div>
                                                {item.NEXT_VERIFICATOR && (
                                                    <div className="mhm-field full-width">
                                                        <span className="mhm-field-label">Next Verificator</span>
                                                        <span className="mhm-field-value">
                                                            {item.NEXT_VERIFICATOR}
                                                            {item.NEXT_ROLE_VERIFICATOR
                                                                ? ` (${item.NEXT_ROLE_VERIFICATOR})`
                                                                : ''}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mhm-footer">
                    <button className="mhm-btn-close" onClick={onClose}>Tutup</button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Jalankan test suite penuh — pastikan tidak ada yang rusak**

```bash
cd "d:/Digitalisasi Kertas Kerja APP/app"
npm run test
```

Expected: semua test existing lulus, tidak ada error baru.

- [ ] **Step 3: Commit**

```bash
git add src/components/MatHistoryModal.jsx
git commit -m "feat: add MatHistoryModal timeline component"
```

---

## Task 5: Integrasi — Tombol Trigger di `BarcodeSearchModal.jsx`

**Files:**
- Modify: `app/src/components/BarcodeSearchModal.jsx`
- Modify: `app/src/components/BarcodeSearchModal.css`

- [ ] **Step 1: Tambah import di baris atas BarcodeSearchModal.jsx**

Di baris 1-6, tambahkan dua hal:

**Baris 2** — tambahkan `ArrowLeftRight` ke import lucide yang sudah ada:
```javascript
import { useState, useRef, useEffect } from 'react';
import { Search, X, Package, Hash, Calendar, Building, User, Info, FileText, History, MapPin, ClipboardCheck, Clock, ArrowLeftRight } from 'lucide-react';
import { useOpname } from '../store/OpnameContext';
import { lookupBarcode } from '../utils/masterDbParser';
import { lookupBarcodeHistory } from '../utils/historyDbParser';
import MatHistoryModal from './MatHistoryModal';
import './BarcodeSearchModal.css';
```

- [ ] **Step 2: Tambah state `showMatHistory`**

Setelah baris `const [hasSearched, setHasSearched] = useState(false);` (baris 13), tambahkan:

```javascript
const [showMatHistory, setShowMatHistory] = useState(false);
```

- [ ] **Step 3: Reset `showMatHistory` saat modal dibuka ulang**

Di dalam `useEffect` (baris 16-24), tambahkan reset:

```javascript
useEffect(() => {
    if (isOpen) {
        setBarcode('');
        setResult(null);
        setHistoryResult([]);
        setHasSearched(false);
        setShowMatHistory(false);
        setTimeout(() => inputRef.current?.focus(), 150);
    }
}, [isOpen]);
```

- [ ] **Step 4: Tambahkan tombol "Lacak Riwayat MAT" setelah bcs-specs-grid**

Cari blok `{/* Bento Specs Grid */}` (sekitar baris 121) yang diakhiri dengan `</div>` penutup grid. Tepat setelah tag penutup grid tersebut (sebelum `{/* History Section */}`), tambahkan:

```jsx
{/* MAT History Trigger Button */}
<button
    className="bcs-mat-track-btn"
    onClick={() => setShowMatHistory(true)}
    type="button"
>
    <ArrowLeftRight size={15} strokeWidth={2.5} />
    Lacak Riwayat MAT
</button>
```

Hasilnya di area sekitar baris 121-133 menjadi:
```jsx
{/* Bento Specs Grid */}
<div className="bcs-specs-grid">
    <DetailItem icon={<Package />} label="Nomor PO" value={result.noPO} />
    <DetailItem icon={<Info />} label="Tipe Aset" value={result.tipe} />
    <DetailItem icon={<Calendar />} label="Periode Perolehan" value={`${result.bulanPerolehan || '-'} / ${result.tahunPerolehan || '-'}`} />
    <DetailItem icon={<Building />} label="Lokasi" value={result.lokasi} />
    <DetailItem icon={<User />} label="PIC" value={result.pic} />
    <div className="bcs-spec-full">
        <DetailItem icon={<FileText />} label="Keterangan Dasar" value={result.keterangan} />
    </div>
</div>

{/* MAT History Trigger Button */}
<button
    className="bcs-mat-track-btn"
    onClick={() => setShowMatHistory(true)}
    type="button"
>
    <ArrowLeftRight size={15} strokeWidth={2.5} />
    Lacak Riwayat MAT
</button>

{/* History Section */}
{historyDb && (
```

- [ ] **Step 5: Ubah return menjadi React fragment dan tambah MatHistoryModal**

Baris terakhir komponen saat ini:
```jsx
    return (
        <div className="bcs-overlay" ...>
            ...
        </div>
    );
```

Ubah menjadi fragment agar `MatHistoryModal` bisa dirender sebagai sibling (dengan z-index lebih tinggi):
```jsx
    return (
        <>
            <div className="bcs-overlay" onClick={onClose} role="presentation">
                <div className="bcs-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Cari Barcode Master Aset">
                    {/* ... semua konten yang sudah ada ... */}
                </div>
            </div>
            <MatHistoryModal
                barcode={barcode}
                namaAset={result?.namaAset}
                isOpen={showMatHistory}
                onClose={() => setShowMatHistory(false)}
            />
        </>
    );
```

- [ ] **Step 6: Tambah style tombol di BarcodeSearchModal.css**

Tambahkan di akhir file `app/src/components/BarcodeSearchModal.css`:

```css
/* ── MAT History Track Button ─────────────────────────────── */
.bcs-mat-track-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 16px 0 8px;
    padding: 10px 20px;
    background: var(--neutral-900, #0f172a);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.01em;
}
.bcs-mat-track-btn:hover {
    background: var(--neutral-700, #334155);
    transform: translateY(-1px);
}
```

- [ ] **Step 7: Jalankan dev server dan verifikasi fitur secara manual**

```bash
cd "d:/Digitalisasi Kertas Kerja APP/app"
npm run dev
```

Checklist verifikasi manual di browser:
1. Buka aplikasi → klik ikon pencarian barcode untuk membuka `BarcodeSearchModal`
2. Ketik barcode yang valid → klik "Cari"
3. Pastikan tombol **"Lacak Riwayat MAT"** muncul di bawah grid spesifikasi
4. Klik tombol → pastikan `MatHistoryModal` terbuka di atas `BarcodeSearchModal`
5. Jika barcode punya riwayat MAT: pastikan timeline tampil dengan kartu "Dari → Ke"
6. Jika ada transaksi aktif (STATUS bukan COMPLETED/REJECTED): pastikan badge **"Proses MAT"** muncul di header
7. Jika tidak ada riwayat MAT: pastikan pesan "Tidak ada riwayat MAT untuk aset ini" tampil
8. Klik backdrop atau tombol "Tutup" → `MatHistoryModal` tutup, `BarcodeSearchModal` tetap terbuka
9. Klik "X" di `BarcodeSearchModal` → keduanya tertutup

- [ ] **Step 8: Jalankan test suite penuh — pastikan semua lulus**

```bash
cd "d:/Digitalisasi Kertas Kerja APP/app"
npm run test
```

Expected: semua test lulus termasuk test matApi yang baru.

- [ ] **Step 9: Commit**

```bash
git add src/components/BarcodeSearchModal.jsx src/components/BarcodeSearchModal.css
git commit -m "feat: integrate MatHistoryModal trigger in BarcodeSearchModal"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Semua requirement dari spec tercakup — endpoint backend, matApi.js, MatHistoryModal dengan timeline, badge Proses MAT, stacking modal, trigger di BarcodeSearchModal
- [x] **Placeholder scan:** Tidak ada TBD, TODO, atau "implement later" — semua kode lengkap
- [x] **Type consistency:** `fetchMatHistory` di Task 2 → diimport di Task 4 → dipanggil di `useEffect` — nama konsisten. `barcode`, `namaAset`, `isOpen`, `onClose` props konsisten antara Task 4 dan Task 5. `INACTIVE_STATUSES` didefinisikan di Task 4 dan digunakan konsisten. `hasActiveMAT` dari response API konsisten dengan penggunaan di komponen
- [x] **CSS class consistency:** Semua class `mhm-*` di CSS (Task 3) cocok dengan penggunaan di JSX (Task 4). Class `bcs-mat-track-btn` didefinisikan di Task 5 step 6 dan dipakai di step 4
