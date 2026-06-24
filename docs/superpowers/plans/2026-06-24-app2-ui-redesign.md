# App2 (Extract MAT) UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign komponen tampilan `ExtractOpnamePage` (/app2) jadi progress-first — progress hero, kartu ruangan, filter/export konsisten, dark mode via token — tanpa mengubah alur atau logika data.

**Architecture:** Logika murni progress/status diekstrak ke helper `utils/extractStats.js` (testable, tanpa mock page). Styling dipindah dari inline-style ke class `.x-*` di `extract-opname.css` (light+dark lewat token). JSX dirombak per-section memakai helper + class baru. Dead CSS `.extract-*` dihapus setelah verifikasi grep.

**Tech Stack:** React 19, Vite, Vitest 4 + @testing-library/react + jsdom, lucide-react, CSS custom properties (`tokens.css`).

**Spec:** `docs/superpowers/specs/2026-06-24-app2-ui-redesign-design.md`

---

## File Structure

- **Create:** `app/src/utils/extractStats.js` — fungsi murni: `overallProgress`, `roomProgress`, `roomStatus`. Satu tanggung jawab: hitung statistik tampilan.
- **Create:** `app/src/__tests__/extractStats.test.js` — unit test helper.
- **Modify:** `app/src/extract-opname.css` — tambah class `.x-*`, hapus dead `.extract-*`.
- **Modify:** `app/src/pages/ExtractOpnamePage.jsx` — pakai helper + class baru, ganti inline-style.

Catatan: `extract-loading` & `extract-spinner` dipakai JSX (loading state) — **jangan dihapus**.

---

## Task 1: Helper statistik murni (TDD)

**Files:**
- Create: `app/src/utils/extractStats.js`
- Test: `app/src/__tests__/extractStats.test.js`

- [ ] **Step 1: Tulis test yang gagal**

Create `app/src/__tests__/extractStats.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { overallProgress, roomProgress, roomStatus } from '../utils/extractStats';

describe('overallProgress', () => {
  it('hitung persen terscan dari total', () => {
    const r = overallProgress(340, 58);
    expect(r.total).toBe(398);
    expect(r.scannedPct).toBeCloseTo(85.4, 1);
    expect(r.notScannedPct).toBeCloseTo(14.6, 1);
    expect(r.hasData).toBe(true);
  });

  it('total 0 -> hasData false, persen 0', () => {
    const r = overallProgress(0, 0);
    expect(r.total).toBe(0);
    expect(r.scannedPct).toBe(0);
    expect(r.hasData).toBe(false);
  });
});

describe('roomProgress', () => {
  it('persen ruangan', () => {
    expect(roomProgress(7, 3).pct).toBeCloseTo(70, 5);
  });
  it('ruangan kosong -> 0', () => {
    expect(roomProgress(0, 0).pct).toBe(0);
  });
});

describe('roomStatus', () => {
  it('0 belum terscan -> done', () => {
    expect(roomStatus(0)).toBe('done');
  });
  it('ada yang belum terscan -> partial', () => {
    expect(roomStatus(3)).toBe('partial');
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd app && npx vitest run src/__tests__/extractStats.test.js`
Expected: FAIL — "Failed to resolve import '../utils/extractStats'".

- [ ] **Step 3: Implementasi minimal**

Create `app/src/utils/extractStats.js`:

```js
// Statistik murni untuk tampilan Extract MAT (app2). Tanpa side-effect.

/**
 * @param {number} scanned
 * @param {number} notScanned
 * @returns {{ total: number, scannedPct: number, notScannedPct: number, hasData: boolean }}
 */
export function overallProgress(scanned, notScanned) {
  const total = scanned + notScanned;
  if (total === 0) {
    return { total: 0, scannedPct: 0, notScannedPct: 0, hasData: false };
  }
  return {
    total,
    scannedPct: (scanned / total) * 100,
    notScannedPct: (notScanned / total) * 100,
    hasData: true,
  };
}

/**
 * @param {number} scanned
 * @param {number} notScanned
 * @returns {{ pct: number }}
 */
export function roomProgress(scanned, notScanned) {
  const total = scanned + notScanned;
  return { pct: total === 0 ? 0 : (scanned / total) * 100 };
}

/**
 * @param {number} notScannedCount
 * @returns {'done' | 'partial'}
 */
export function roomStatus(notScannedCount) {
  return notScannedCount > 0 ? 'partial' : 'done';
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd app && npx vitest run src/__tests__/extractStats.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/utils/extractStats.js app/src/__tests__/extractStats.test.js
git commit -m "feat(app2): add pure progress/status helpers for extract MAT"
```

---

## Task 2: CSS class `.x-*` (light + dark via token)

**Files:**
- Modify: `app/src/extract-opname.css` (tambah di akhir file)

Tidak ada unit test (pure CSS — YAGNI). Verifikasi via build + visual saat Task 3-4.

- [ ] **Step 1: Tambahkan blok class baru di akhir `extract-opname.css`**

Append:

```css
/* ===== APP2 REDESIGN (progress-first) — class .x-* ===== */

/* --- Progress Hero --- */
.x-summary {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-surface);
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.x-summary__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 10px;
}
.x-summary__eyebrow {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-tertiary);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.x-summary__subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 2px;
}
.x-summary__pct {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1;
  text-align: right;
}
.x-summary__pct small { font-size: 14px; }
.x-summary__ratio {
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--text-tertiary);
  text-align: right;
  margin-top: 2px;
}
.x-bar {
  height: 10px;
  border-radius: 6px;
  background: var(--bg-input);
  overflow: hidden;
  display: flex;
}
.x-bar__scanned { background: var(--success-600); }
.x-bar__not { background: var(--danger-600); }
.x-summary__stats {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.x-stat { flex: 1; }
.x-stat__label {
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--text-tertiary);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.x-stat__value {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.x-stat__value--scanned { color: var(--success-600); }
.x-stat__value--danger { color: var(--danger-600); }
.x-stat__value--neutral { color: var(--text-primary); }
.x-summary__empty {
  font-size: 12px;
  color: var(--text-tertiary);
  font-style: italic;
  margin-top: 10px;
}

/* --- Room Card --- */
.x-rooms__header {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-tertiary);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.x-room {
  border: 1px solid var(--border);
  border-left: 3px solid var(--border-strong);
  border-radius: 10px;
  background: var(--bg-surface);
  margin-bottom: 8px;
  overflow: hidden;
}
.x-room--done { border-left-color: var(--success-500); }
.x-room--partial { border-left-color: var(--danger-500); }
.x-room__head {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 13px;
  cursor: pointer;
}
.x-room__chevron {
  color: var(--text-tertiary);
  display: inline-flex;
  transition: transform 200ms ease;
}
.x-room__chevron--open { transform: rotate(90deg); }
.x-room__main { flex: 1; min-width: 0; }
.x-room__name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.x-room__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}
.x-room__progress-track {
  width: 90px;
  height: 4px;
  border-radius: 3px;
  background: var(--bg-input);
  overflow: hidden;
}
.x-room__progress-fill {
  height: 100%;
  background: var(--success-600);
}
.x-room__progress-label {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-tertiary);
}
.x-pill {
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: 0.02em;
}
.x-pill--scanned { background: var(--success-100); color: var(--success-700); }
.x-pill--not { background: var(--danger-100); color: var(--danger-700); }
.x-pill--ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.x-room__body {
  padding: 11px 13px 13px 36px;
  border-top: 1px solid var(--border);
}
.x-room__group-label {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  margin: 0 0 5px;
}
.x-room__group-label--not { color: var(--danger-600); }
.x-room__group-label--scanned { color: var(--success-600); margin-top: 9px; }
.x-room__item {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 3px 0;
}
.x-room__more {
  font-size: 10px;
  color: var(--text-muted);
  font-style: italic;
  padding: 3px 0;
}
.x-rooms__empty {
  padding: 18px;
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  font-style: italic;
}

/* --- Filter Card --- */
.x-filter {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-surface);
  padding: 16px;
  margin-bottom: 14px;
}
.x-filter__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.x-field__label {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-tertiary);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 5px;
}
.x-filter__master {
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.x-filter__master-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.x-filefield {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 10px 12px;
}
.x-filefield__icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--success-50);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.x-filefield__name {
  font-size: 11.5px;
  color: var(--text-primary);
  font-weight: 600;
}
.x-filefield__status {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.05em;
  margin-top: 2px;
  font-weight: 600;
  color: var(--text-muted);
}
.x-filefield__status--loaded { color: var(--success-600); }

/* --- States --- */
.x-state {
  text-align: center;
  padding: 24px;
}
.x-state__icon { font-size: 30px; opacity: 0.4; margin-bottom: 8px; }
.x-state__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.x-state__hint { font-size: 11px; color: var(--text-tertiary); }
```

- [ ] **Step 2: Tambahkan override dark-mode untuk shade kontras**

Append (setelah blok di atas):

```css
/* Dark mode: shade lebih terang untuk kontras AA pada angka & bar.
   Selector terverifikasi: tokens.css pakai :root[data-theme="dark"]. */
:root[data-theme="dark"] .x-bar__scanned { background: var(--success-500); }
:root[data-theme="dark"] .x-bar__not { background: var(--danger-500); }
:root[data-theme="dark"] .x-stat__value--scanned { color: var(--success-400); }
:root[data-theme="dark"] .x-stat__value--danger { color: var(--danger-400); }
:root[data-theme="dark"] .x-room__group-label--not { color: var(--danger-400); }
:root[data-theme="dark"] .x-room__group-label--scanned { color: var(--success-400); }
:root[data-theme="dark"] .x-pill--scanned { background: rgba(34, 197, 94, 0.18); color: var(--success-400); }
:root[data-theme="dark"] .x-pill--not { background: rgba(239, 68, 68, 0.18); color: var(--danger-400); }
```

> Selector dark sudah diverifikasi terhadap `tokens.css` (`:root[data-theme="dark"]`). `--success-50`/`--success-100`/dll sudah punya nilai dark-mode di tokens.css, jadi `.x-pill` & `.x-filefield__icon` otomatis benar tanpa override tambahan.

- [ ] **Step 3: Verifikasi build tidak rusak**

Run: `cd app && npx vite build`
Expected: build sukses (CSS valid, tak ada error parse).

- [ ] **Step 4: Commit**

```bash
git add app/src/extract-opname.css
git commit -m "style(app2): add .x-* component classes for progress-first redesign"
```

---

## Task 3: Refactor JSX — Progress Hero + Kartu Ruangan

**Files:**
- Modify: `app/src/pages/ExtractOpnamePage.jsx`

- [ ] **Step 1: Import helper**

Di `ExtractOpnamePage.jsx`, tambah setelah baris import `buildPreviewData` (sekitar baris 4):

```js
import { overallProgress, roomProgress, roomStatus } from '../utils/extractStats';
```

- [ ] **Step 2: Ganti blok Summary Bar (JSX lama baris ~471-498) dengan Progress Hero**

Hapus blok `{/* Sleek Summary Bar */}` lama, ganti dengan:

```jsx
{/* Progress Hero */}
{(() => {
    const op = overallProgress(filteredTotalScanned, filteredTotalNotScanned);
    const fmt = (n) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 });
    return (
        <div className="x-summary">
            <div className="x-summary__top">
                <div>
                    <div className="x-summary__eyebrow">Progres Opname</div>
                    <div className="x-summary__subtitle">
                        {totalRooms} ruangan{selectedPeriod ? ` · ${selectedPeriod}` : ''}
                    </div>
                </div>
                <div>
                    <div className="x-summary__pct">
                        {op.hasData ? fmt(op.scannedPct) : '—'}<small>%</small>
                    </div>
                    <div className="x-summary__ratio">{filteredTotalScanned} / {op.total} ASET</div>
                </div>
            </div>
            <div className="x-bar">
                <div className="x-bar__scanned" style={{ width: `${op.scannedPct}%` }} />
                <div className="x-bar__not" style={{ width: `${op.notScannedPct}%` }} />
            </div>
            {!op.hasData && <div className="x-summary__empty">Belum ada data — pilih periode lalu sinkron.</div>}
            <div className="x-summary__stats">
                <div className="x-stat">
                    <div className="x-stat__label">Terscan</div>
                    <div className="x-stat__value x-stat__value--scanned">{filteredTotalScanned}</div>
                </div>
                <div className="x-stat">
                    <div className="x-stat__label">Tidak Terscan</div>
                    <div className="x-stat__value x-stat__value--danger">{filteredTotalNotScanned}</div>
                </div>
                <div className="x-stat">
                    <div className="x-stat__label">Salah Ruangan</div>
                    <div className="x-stat__value x-stat__value--danger">{salahRuanganCount}</div>
                </div>
                <div className="x-stat">
                    <div className="x-stat__label">Ruangan</div>
                    <div className="x-stat__value x-stat__value--neutral">{totalRooms}</div>
                </div>
            </div>
        </div>
    );
})()}
```

- [ ] **Step 3: Ganti blok Room list (JSX lama baris ~500-559) dengan kartu ruangan**

Hapus blok `{/* Room expandable list */}` lama, ganti dengan:

```jsx
{/* Room cards */}
<div className="x-rooms">
    <div className="x-rooms__header">Daftar Ruangan · {totalRooms}</div>
    {allRooms.length === 0 ? (
        <div className="x-rooms__empty">Pilih periode dan sinkronisasi data untuk melihat ruangan.</div>
    ) : (
        allRooms.map((room) => {
            const notScannedItems = filteredNotScannedData[room] || [];
            const scannedItems = scannedByRoom[room] || [];
            const isExpanded = expandedRooms.has(room);
            const status = roomStatus(notScannedItems.length);
            const pct = roomProgress(scannedItems.length, notScannedItems.length).pct;

            return (
                <div key={room} className={`x-room x-room--${status}`}>
                    <div className="x-room__head" onClick={() => toggleRoom(room)}>
                        <span className={`x-room__chevron${isExpanded ? ' x-room__chevron--open' : ''}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </span>
                        <div className="x-room__main">
                            <div className="x-room__name">{room}</div>
                            <div className="x-room__progress">
                                <div className="x-room__progress-track">
                                    <div className="x-room__progress-fill" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="x-room__progress-label">{Math.round(pct)}%</span>
                            </div>
                        </div>
                        <span className="x-pill x-pill--scanned">{scannedItems.length} TERSCAN</span>
                        {notScannedItems.length > 0 && (
                            <span className="x-pill x-pill--not">{notScannedItems.length} TIDAK</span>
                        )}
                        <button className="x-pill x-pill--ghost" onClick={(e) => { e.stopPropagation(); handlePreviewSingleRoom(room); }}>
                            <Eye size={11} /> Preview
                        </button>
                    </div>
                    {isExpanded && (
                        <div className="x-room__body">
                            {notScannedItems.length > 0 && (
                                <div>
                                    <div className="x-room__group-label x-room__group-label--not">BELUM TERSCAN ({notScannedItems.length})</div>
                                    {notScannedItems.map((item, i) => (
                                        <div key={i} className="x-room__item">• {item.BARCODE_ASSET} — {item.NAMA_ASSET}</div>
                                    ))}
                                </div>
                            )}
                            {scannedItems.length > 0 && (
                                <div>
                                    <div className="x-room__group-label x-room__group-label--scanned">TERSCAN ({scannedItems.length})</div>
                                    {scannedItems.slice(0, 10).map((item, i) => (
                                        <div key={i} className="x-room__item">• {item.Barcode}</div>
                                    ))}
                                    {scannedItems.length > 10 && (
                                        <div className="x-room__more">...dan {scannedItems.length - 10} lainnya</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        })
    )}
</div>
```

- [ ] **Step 4: Verifikasi lint + build**

Run: `cd app && npx eslint src/pages/ExtractOpnamePage.jsx && npx vite build`
Expected: lint bersih (atau hanya warning lama yang tak terkait), build sukses.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/ExtractOpnamePage.jsx
git commit -m "feat(app2): progress hero + room cards using .x-* classes"
```

---

## Task 4: Refactor JSX — Filter Card, States, Export Bar

**Files:**
- Modify: `app/src/pages/ExtractOpnamePage.jsx`

- [ ] **Step 1: Ganti Filter+Upload card (JSX lama baris ~409-469) pakai class `.x-filter`**

Ganti blok `{/* Filter + Upload card */}` lama dengan:

```jsx
{/* Filter + Upload card */}
<div className="x-filter">
    <div className="x-filter__grid">
        <div>
            <div className="x-field__label">Periode Opname</div>
            <SearchableGroupedSelect
                groupedOptions={groupedPeriods}
                value={selectedPeriod}
                onChange={(val) => { setSelectedPeriod(val); setSynced(false); }}
                placeholder="— Pilih Periode —"
            />
        </div>
        <div>
            <div className="x-field__label">Filter Departemen Aset</div>
            <select className="wa-select" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                <option value="Semua Departemen">Semua Departemen</option>
                <option value="ICT">ICT / IT</option>
                <option value="HRGA">HRGA / HRD</option>
                <option value="ENG">ENGINEERING</option>
                <option value="LAINNYA">Lainnya</option>
            </select>
        </div>
    </div>

    <div className="x-filter__master">
        <div className="x-field__label">Master Data Asset Management (ASPxGridView1)</div>
        <div className="x-filter__master-row">
            <div className="x-filefield">
                <div className="x-filefield__icon">
                    <FileSpreadsheet size={14} color="var(--success-500)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="x-filefield__name">{oracleFileName || 'Pilih File Excel...'}</div>
                    <div className={`x-filefield__status${oracleDataMap ? ' x-filefield__status--loaded' : ''}`}>
                        {oracleDataMap ? '✓ MASTER DATA DIMUAT' : 'OPSIONAL · DRAG & DROP'}
                    </div>
                </div>
            </div>
            <input type="file" accept=".xlsx,.xls" onChange={handleOracleUpload} style={{ display: 'none' }} ref={oracleInputRef} />
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="wa-btn-ghost" onClick={() => oracleInputRef.current?.click()} title="Pilih file Excel master data">
                    <Upload size={13} /> Pilih File
                </button>
                <button
                    className="wa-btn-terracotta"
                    onClick={handleSync}
                    disabled={!selectedPeriod || loading}
                    title={!selectedPeriod ? 'Pilih periode dulu' : 'Tarik data opname dari server'}
                >
                    {loading
                        ? <><Loader2 size={13} className="wa-spin" /> Menyinkronkan...</>
                        : <><RefreshCw size={13} /> Sinkron Data Opname</>}
                </button>
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Rapikan loading state (JSX lama baris ~401-407)**

Blok loading sudah pakai `.extract-loading` + `.extract-spinner` (didefinisikan di CSS, dipertahankan). Biarkan apa adanya — tidak diubah. Verifikasi class masih ada:

Run: `cd app && grep -n "extract-loading\|extract-spinner" src/extract-opname.css`
Expected: keduanya muncul (ada definisi). Jika TIDAK ada definisi `.extract-spinner`/`.extract-loading` di CSS, tambahkan:

```css
.extract-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  font-size: 12px;
  color: var(--text-secondary);
}
.extract-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

> Hanya tambahkan jika grep menunjukkan class belum terdefinisi. Jangan duplikat.

- [ ] **Step 3: Export bar — biarkan (sudah inline & berfungsi)**

Sticky export bar (JSX baris ~561-575) memakai inline-style + `wa-btn`/`wa-icon-wrap`. Fungsi tidak berubah. **Tidak diubah** di task ini (out of scope visual-tweak; menjaga diff kecil). Lewati.

- [ ] **Step 4: Verifikasi lint + build**

Run: `cd app && npx eslint src/pages/ExtractOpnamePage.jsx && npx vite build`
Expected: lint bersih, build sukses.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/ExtractOpnamePage.jsx app/src/extract-opname.css
git commit -m "feat(app2): filter card via .x-filter, ensure loading state styles"
```

---

## Task 5: Hapus dead CSS `.extract-*`

**Files:**
- Modify: `app/src/extract-opname.css`

- [ ] **Step 1: Daftar class `.extract-*` yang masih dipakai JSX**

Run:
```bash
cd app && grep -rohE "extract-[a-z0-9_-]+" src/pages src/components | sort -u
```
Expected: hanya `extract-loading`, `extract-spinner` (class CSS yang dipakai). `extract-opname-state` adalah key IndexedDB di db.js, BUKAN class — abaikan.

- [ ] **Step 2: Hapus definisi `.extract-*` yang tak dipakai**

Di `extract-opname.css`, hapus semua rule dengan selector `.extract-page`, `.extract-controls-*`, `.extract-field-*`, `.extract-upload-*`, `.btn-sync-gradient`, `.extract-stats*`, `.stat-card-*`, `.stat-icon-*`, `.stat-value-*`, `.extract-room*`, `.btn-preview-elegant`, `.extract-export-bar*`, `.extract-room__progress*`.

**PERTAHANKAN:** `.extract-loading`, `.extract-spinner`, `@keyframes spin`, `@keyframes fadeIn` (jika dipakai), dan semua class `.x-*` dari Task 2.

Sebelum hapus tiap selector, pastikan TIDAK muncul di output Step 1.

- [ ] **Step 3: Verifikasi tak ada class hilang yang masih dirujuk**

Run:
```bash
cd app && for c in $(grep -rohE "extract-[a-z0-9_-]+" src/pages src/components | sort -u); do echo "$c:"; grep -c "\.$c" src/extract-opname.css; done
```
Expected: `extract-loading` dan `extract-spinner` => count ≥ 1. Tidak ada class dipakai-JSX dengan count 0.

- [ ] **Step 4: Build**

Run: `cd app && npx vite build`
Expected: build sukses.

- [ ] **Step 5: Commit**

```bash
git add app/src/extract-opname.css
git commit -m "chore(app2): remove unused .extract-* dead CSS"
```

---

## Task 6: Verifikasi manual akhir

**Files:** none (verifikasi)

- [ ] **Step 1: Jalankan seluruh test**

Run: `cd app && npx vitest run`
Expected: semua lulus, termasuk `extractStats.test.js`.

- [ ] **Step 2: Jalankan dev server & cek visual**

Run: `cd app && npm run dev`
Cek di browser `/app2`:
- Progress hero tampil; persen & bar benar setelah sinkron.
- Empty state "Belum ada data" sebelum sinkron.
- Kartu ruangan: border-kiri hijau (100%) / merah (ada belum terscan); badge "TIDAK" hilang saat 0.
- Accordion expand/collapse jalan; Preview buka modal.
- Toggle dark mode: semua kontras benar, tak ada warna hardcode rusak.
- Export Semua Excel & Export single (via Preview) tetap jalan.

- [ ] **Step 3: Lint penuh**

Run: `cd app && npx eslint src/pages/ExtractOpnamePage.jsx src/utils/extractStats.js`
Expected: bersih.

---

## Self-Review Notes

- Spec §3.1 Hero → Task 3 Step 2. §3.2 Kartu ruangan → Task 3 Step 3. §3.3 Filter → Task 4 Step 1. §3.4 Export bar → dipertahankan (spec: "tidak ubah perilaku"). §3.5 States → Task 4 Step 2 (loading) + Task 3 (empty). §4 Cleanup → Task 5.
- Nama fungsi konsisten: `overallProgress`/`roomProgress`/`roomStatus` dipakai sama di helper, test, dan JSX.
- Selector dark mode terverifikasi: `:root[data-theme="dark"]` (tokens.css:113).
