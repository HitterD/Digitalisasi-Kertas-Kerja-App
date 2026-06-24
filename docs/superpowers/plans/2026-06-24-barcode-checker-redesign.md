# Barcode Checker Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selaraskan `BarcodeSearchModal` ke palet warm app (oranye/cream) dan rapikan kartu hasil agar mudah dibaca, tanpa mengubah logika.

**Architecture:** Perubahan murni presentasi. CSS (`BarcodeSearchModal.css`) diganti dari token biru/abu + hex mentah → token warm (`--accent`, `--bg-*`, `--text-*`, `--border`). JSX (`BarcodeSearchModal.jsx`) tetap, kecuali: (a) struktur kartu hasil diganti dari hero+bento ke header→strip kunci→baris detail, (b) inline-style berulang dipindah ke class. Dark mode otomatis via token.

**Tech Stack:** React (JSX), CSS custom properties (`tokens.css`), lucide-react icons. Vite.

**Spec:** `docs/superpowers/specs/2026-06-24-barcode-checker-redesign-design.md`

---

## File Structure

- **Modify:** `app/src/components/BarcodeSearchModal.css` — semua warna → token warm; tambah class `.bcs-recent-chip`, `.bcs-keystrip`, `.bcs-keycell`, `.bcs-detail-row`; restyle kartu hasil, timeline, state.
- **Modify:** `app/src/components/BarcodeSearchModal.jsx` — ganti markup kartu hasil (hero+bento → header/strip/rows); pindahkan inline-style (recent chips, hero barcode/copy badge, warning) ke class.

Tidak ada file baru. Tidak ada unit test baru — perubahan murni visual; verifikasi manual (light/dark) + lint. Helper `getConditionClass` tak berubah.

---

## Task 1: Warm palette di CSS (search, tombol, chip, badge)

**Files:**
- Modify: `app/src/components/BarcodeSearchModal.css`

- [ ] **Step 1: Ganti warna search input + tombol Cari + close**

Di `.bcs-search-icon`, `.bcs-input:focus`, `.bcs-btn`, `.bcs-btn:hover`, `.bcs-close-btn:hover` — ganti `--primary-*`/`--neutral-*`/hex ke token warm:

```css
.bcs-search-icon { position: absolute; left: 20px; color: var(--accent); }
.bcs-input { width: 100%; height: 60px; padding: 0 20px 0 56px; font-size: 18px; font-weight: 500; background: var(--bg-input); color: var(--text-primary); border: 2px solid var(--border); border-radius: 16px; transition: all 0.2s; }
.bcs-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-ring); }
.bcs-btn { height: 60px; padding: 0 40px; font-size: 18px; font-weight: 700; border-radius: 16px; border: none; background: var(--accent); color: #fff; cursor: pointer; transition: all 0.2s; }
.bcs-btn:hover { background: var(--accent-hover); transform: translateY(-2px); box-shadow: 0 8px 20px var(--accent-glow); }
.bcs-btn:disabled { background: var(--bg-input); color: var(--text-muted); cursor: not-allowed; transform: none; }
.bcs-close-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: var(--bg-input); color: var(--text-tertiary); cursor: pointer; transition: all 0.2s ease; }
.bcs-close-btn:hover { background: var(--danger-50); color: var(--danger-600); transform: scale(1.05); }
```

- [ ] **Step 2: Modal/header/title surface pakai token**

```css
.bcs-modal { background: var(--bg-surface); border: 1px solid var(--border); box-shadow: 0 1px 2px rgba(45,45,45,.03), 0 14px 30px rgba(45,45,45,.08); display: flex; flex-direction: column; overflow: hidden; position: relative; width: 100%; max-width: 800px; height: 85vh; max-height: 900px; border-radius: var(--radius-xl, 14px); animation: bcs-slide-up 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
.bcs-header { display: flex; align-items: center; justify-content: space-between; padding: 24px 32px 20px; border-bottom: 1px solid var(--border); }
.bcs-title { display: flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
```

Juga ganti `.bcs-title` icon: di JSX (Task 4) class `text-primary-600` pada `<Search>` diganti — di CSS tidak perlu. Scrollbar thumb: `.bcs-body::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }`.

- [ ] **Step 3: Tambah class chip recent + badge kondisi token**

```css
.bcs-recent-label { font-size: 12px; font-weight: 600; color: var(--text-tertiary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
.bcs-recent-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.bcs-recent-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 600; color: var(--text-primary); cursor: pointer; transition: all 0.15s; }
.bcs-recent-chip:hover { border-color: var(--accent); color: var(--accent); }
```

Badge kondisi — sederhanakan ke token (hapus hex fallback):

```css
.bcs-badge { padding: 8px 16px; border-radius: 99px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
.bcs-badge.safe { background: var(--success-100); color: var(--success-800); border: 1px solid var(--success-200); }
.bcs-badge.danger { background: var(--danger-100); color: var(--danger-800); border: 1px solid var(--danger-200); }
.bcs-badge.unknown { background: var(--warning-100); color: var(--warning-800); border: 1px solid var(--warning-200); }
```

- [ ] **Step 4: Lint**

Run: `cd app && rtk lint src/components/BarcodeSearchModal.css`
Expected: tidak ada error baru.

- [ ] **Step 5: Commit**

```bash
rtk git add app/src/components/BarcodeSearchModal.css
rtk git commit -m "style(barcode): warm palette for search, button, chip, badge"
```

---

## Task 2: Kartu hasil CSS (header → strip kunci → baris detail)

**Files:**
- Modify: `app/src/components/BarcodeSearchModal.css`

- [ ] **Step 1: Ganti `.bcs-hero` + hapus bento grid, tambah struktur baru**

Hapus blok `.bcs-hero*`, `.bcs-specs-grid`, `.bcs-spec-item`, `.bcs-spec-full`, `.bcs-spec-label`, `.bcs-spec-value` lama. Ganti dengan:

```css
.bcs-result-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; box-shadow: 0 8px 24px rgba(45,45,45,.05); }

.bcs-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 22px 24px; border-bottom: 1px solid var(--border); }
.bcs-card-barcode { display: inline-flex; align-items: center; gap: 6px; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 8px; cursor: pointer; user-select: none; }
.bcs-card-name { font-size: 22px; font-weight: 800; color: var(--text-primary); margin: 0; line-height: 1.2; letter-spacing: -0.01em; }
.bcs-copied-tag { font-size: 9px; background: var(--success-500); color: #fff; padding: 2px 6px; border-radius: 999px; font-weight: 800; letter-spacing: 0.05em; margin-left: 8px; }

.bcs-keystrip { display: flex; gap: 12px; padding: 16px 24px; background: var(--bg-primary); border-bottom: 1px solid var(--border); }
.bcs-keycell { flex: 1; min-width: 0; }
.bcs-keylabel { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
.bcs-keyvalue { font-size: 15px; font-weight: 700; color: var(--text-primary); word-break: break-word; }

.bcs-detail-list { padding: 6px 24px 14px; }
.bcs-detail-row { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.bcs-detail-row:last-child { border-bottom: none; }
.bcs-detail-label { display: flex; align-items: center; gap: 8px; color: var(--text-tertiary); font-weight: 500; flex: none; }
.bcs-detail-label::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex: none; }
.bcs-detail-value { color: var(--text-primary); font-weight: 600; text-align: right; word-break: break-word; }

@media (max-width: 480px) { .bcs-keystrip { flex-direction: column; gap: 12px; } .bcs-detail-row { flex-direction: column; gap: 4px; } .bcs-detail-value { text-align: left; } }
```

- [ ] **Step 2: MAT track button → accent**

```css
.bcs-mat-track-btn { display: inline-flex; align-items: center; gap: 8px; margin: 16px 0 8px; padding: 10px 20px; background: var(--accent); color: #fff; border: none; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; letter-spacing: 0.01em; }
.bcs-mat-track-btn:hover { background: var(--accent-hover); transform: translateY(-1px); }
```

- [ ] **Step 3: Lint**

Run: `cd app && rtk lint src/components/BarcodeSearchModal.css`
Expected: tidak ada error baru.

- [ ] **Step 4: Commit**

```bash
rtk git add app/src/components/BarcodeSearchModal.css
rtk git commit -m "style(barcode): redesign result card to header/key/rows layout"
```

---

## Task 3: Timeline + state CSS → warm

**Files:**
- Modify: `app/src/components/BarcodeSearchModal.css`

- [ ] **Step 1: Timeline pakai accent/success token**

Ganti blok timeline (`.bcs-icon-box*`, `.bcs-timeline-*`) — neutral/primary → token:

```css
.bcs-icon-box { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.bcs-icon-box.history { background: var(--accent-soft); color: var(--accent); }
.bcs-icon-box.opname { background: var(--success-100); color: var(--success-700); }
.bcs-timeline-header { display: flex; align-items: center; gap: 12px; font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
.bcs-timeline-list::before { content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 2px; background: var(--border); border-radius: 99px; }
.bcs-timeline-item::before { content: ''; position: absolute; top: 20px; left: -25px; width: 12px; height: 12px; border-radius: 50%; background: var(--bg-surface); border: 2px solid var(--accent); box-shadow: 0 0 0 4px var(--bg-surface); z-index: 1; }
.bcs-timeline-section.opname .bcs-timeline-item::before { border-color: var(--success-500); }
.bcs-timeline-card { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,.02); transition: all 0.2s ease; }
.bcs-timeline-card:hover { border-color: var(--border-strong); box-shadow: 0 8px 24px rgba(0,0,0,.06); transform: translateX(4px); }
.bcs-timeline-section.opname .bcs-timeline-card { background: var(--success-50); border-color: var(--success-200); }
.bcs-timeline-section.opname .bcs-timeline-card:hover { border-color: var(--success-300); }
.bcs-timeline-location { font-size: 15px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px; line-height: 1.4; }
.bcs-timeline-section.opname .bcs-timeline-location { color: var(--success-900); }
.bcs-timeline-date { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 6px 12px; background: var(--bg-input); color: var(--text-secondary); border-radius: 8px; }
.bcs-timeline-section.opname .bcs-timeline-date { background: var(--bg-surface); color: var(--success-700); border: 1px solid var(--success-200); }
.bcs-timeline-desc { font-size: 15px; color: var(--text-secondary); margin: 0 0 16px 0; line-height: 1.6; }
.bcs-timeline-section.opname .bcs-timeline-desc { color: var(--success-800); }
.bcs-timeline-extra { font-size: 13px; font-weight: 500; padding: 12px 16px; background: var(--bg-input); color: var(--text-secondary); border-radius: 12px; border: 1px dashed var(--border); }
.bcs-timeline-section.opname .bcs-timeline-extra { background: var(--bg-surface); color: var(--success-700); border-color: var(--success-200); font-weight: 600; }
```

- [ ] **Step 2: Empty / not-found state → warm**

```css
.bcs-empty-state { padding: 64px 32px; text-align: center; background: var(--bg-primary); border-radius: 24px; border: 2px dashed var(--border-strong); animation: bcs-fade-in 0.4s ease forwards; }
.bcs-empty-state h4 { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 16px 0 8px; }
.bcs-empty-state p { font-size: 14px; color: var(--text-tertiary); line-height: 1.55; margin: 0; }
.bcs-empty-icon { width: 80px; height: 80px; border-radius: 50%; background: var(--bg-input); color: var(--text-tertiary); display: inline-flex; align-items: center; justify-content: center; }
.bcs-empty-history { padding: 32px; background: var(--bg-primary); border-radius: 16px; border: 2px dashed var(--border); text-align: center; color: var(--text-tertiary); font-weight: 500; }
```

- [ ] **Step 3: Lint**

Run: `cd app && rtk lint src/components/BarcodeSearchModal.css`
Expected: tidak ada error baru.

- [ ] **Step 4: Commit**

```bash
rtk git add app/src/components/BarcodeSearchModal.css
rtk git commit -m "style(barcode): warm timeline and empty states"
```

---

## Task 4: JSX — markup kartu hasil baru + pindah inline-style ke class

**Files:**
- Modify: `app/src/components/BarcodeSearchModal.jsx`

- [ ] **Step 1: Title icon — buang warna biru**

Ganti `<Search size={24} className="text-primary-600" />` (baris ~108) menjadi:

```jsx
<Search size={24} style={{ color: 'var(--accent)' }} />
```

- [ ] **Step 2: Recent searches — pakai class (buang inline)**

Ganti blok recent (baris ~139-169) menjadi:

```jsx
{!hasSearched && recentSearches.length > 0 && (
    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <div className="bcs-recent-label">Pencarian Terakhir</div>
        <div className="bcs-recent-wrap">
            {recentSearches.map((code) => (
                <button key={code} className="bcs-recent-chip" onClick={() => handleSearch(null, code)}>
                    <History size={12} />
                    {code}
                </button>
            ))}
        </div>
    </div>
)}
```

- [ ] **Step 3: Warning DB — pakai token warm**

Ganti blok `{!masterDb && (...)}` (baris ~172-179) — hilangkan `--warning-800` hardcode reliance tetap pakai token, set warna teks via token:

```jsx
{!masterDb && (
    <div className="alert alert--warning" style={{ borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <Info size={24} style={{ color: 'var(--warning-600)', flex: 'none' }} />
        <span style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.5, color: 'var(--warning-800)' }}>
            Database Master Aset belum dimuat. Silakan sinkronasikan dari SQL Server di halaman Upload terlebih dahulu.
        </span>
    </div>
)}
```

- [ ] **Step 4: Ganti kartu hasil (hero + bento) dengan struktur baru**

Ganti seluruh blok dari `{/* Hero Card */}` sampai akhir `{/* Bento Specs Grid */}` (baris ~186-237) menjadi:

```jsx
{/* Result Card */}
<div className="bcs-result-card">
    <div className="bcs-card-header">
        <div>
            <div className="bcs-card-barcode" onClick={() => handleCopy(barcode.toUpperCase())} title="Tap untuk salin">
                <Hash size={14} />
                <span style={{ color: isCopied ? 'var(--success-600)' : 'inherit', transition: 'color 0.2s' }}>
                    {barcode.toUpperCase()}
                </span>
                {isCopied && <span className="bcs-copied-tag">TERSALIN</span>}
            </div>
            <h3 className="bcs-card-name">{result.namaAset || '(Tanpa Nama)'}</h3>
        </div>
        <div className={`bcs-badge ${getConditionClass(result.kondisi)}`}>
            {result.kondisi || 'TIDAK DIKETAHUI'}
        </div>
    </div>

    <div className="bcs-keystrip">
        <div className="bcs-keycell">
            <div className="bcs-keylabel">Lokasi</div>
            <div className="bcs-keyvalue">{result.lokasi || '-'}</div>
        </div>
        <div className="bcs-keycell">
            <div className="bcs-keylabel">PIC</div>
            <div className="bcs-keyvalue">{result.pic || '-'}</div>
        </div>
    </div>

    <div className="bcs-detail-list">
        <div className="bcs-detail-row">
            <span className="bcs-detail-label">Nomor PO</span>
            <span className="bcs-detail-value">{result.noPO || '-'}</span>
        </div>
        <div className="bcs-detail-row">
            <span className="bcs-detail-label">Tipe Aset</span>
            <span className="bcs-detail-value">{result.tipe || '-'}</span>
        </div>
        <div className="bcs-detail-row">
            <span className="bcs-detail-label">Periode Perolehan</span>
            <span className="bcs-detail-value">{`${result.bulanPerolehan || '-'} / ${result.tahunPerolehan || '-'}`}</span>
        </div>
        <div className="bcs-detail-row">
            <span className="bcs-detail-label">Keterangan Dasar</span>
            <span className="bcs-detail-value">{result.keterangan || '-'}</span>
        </div>
    </div>
</div>
```

Catatan: `DetailItem` lama (baris ~355-365) jadi tak terpakai — hapus fungsinya dan import ikon yang tak lagi dipakai (`Package`, `Calendar`, `Building`, `User`, `FileText` — cek: `Package` masih dipakai di empty state & `Info` di warning; hapus hanya yang benar-benar tak dipakai). Jalankan lint untuk konfirmasi unused.

- [ ] **Step 5: Empty state icon wrap**

Pastikan empty state (baris ~332-338) ikon `<Package>` dibungkus `.bcs-empty-icon` (sudah ada). Tidak berubah selain warna via CSS Task 3.

- [ ] **Step 6: Lint + buang import tak terpakai**

Run: `cd app && rtk lint src/components/BarcodeSearchModal.jsx`
Expected: tidak ada error. Perbaiki `no-unused-vars` dengan menghapus import ikon yang sudah tidak dipakai.

- [ ] **Step 7: Commit**

```bash
rtk git add app/src/components/BarcodeSearchModal.jsx
rtk git commit -m "feat(barcode): new readable result card markup, drop inline styles"
```

---

## Task 5: Verifikasi manual (light + dark)

**Files:** none (manual)

- [ ] **Step 1: Jalankan app**

Run: `cd app && rtk npm run dev`
Buka modal Barcode Checker.

- [ ] **Step 2: Cek skenario**

- Barcode ditemukan: header/strip/rows tampil rapi; badge kondisi warna benar (baik=hijau, rusak=merah).
- Tap barcode → tersalin (tag "TERSALIN" muncul).
- Recent searches: chip warm, klik → cari ulang.
- Barcode tidak ada → empty state warm.
- Master DB belum dimuat → warning kuning.
- Timeline: dot perpindahan oranye, opname hijau.

- [ ] **Step 3: Toggle dark mode**

Ulangi cek; pastikan kontras teks badge & nilai terbaca, tak ada sisa biru/abu dingin.

- [ ] **Step 4: Commit (jika ada perbaikan)**

```bash
rtk git add -A
rtk git commit -m "fix(barcode): dark mode contrast tweaks"
```

---

## Self-Review Notes

- **Spec coverage:** §3.1 search/button → Task 1; §3.2 recent → Task 1+4; §3.3 result card → Task 2+4; §3.4 MAT btn → Task 2; §3.5 timeline → Task 3; §3.6 state → Task 3+4; warna semua → Task 1-3. ✓
- **Tanpa test unit:** perubahan murni visual; verifikasi manual + lint (sesuai sifat task). `getConditionClass` tak berubah.
- **Konsistensi class:** `.bcs-result-card`, `.bcs-keystrip`, `.bcs-keycell`, `.bcs-detail-row/-label/-value`, `.bcs-recent-chip` dipakai konsisten di CSS (Task 2) & JSX (Task 4).
