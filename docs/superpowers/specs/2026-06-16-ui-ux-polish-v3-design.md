# KKD UI/UX Polish v3 — Design Spec

**Date:** 2026-06-16
**Status:** Awaiting user review
**Stack:** React 18 + Vite + react-router-dom + lucide-react (no new deps)
**Project:** "Kertas Kerja Digital" — PT Santos Jaya Abadi
**Supersedes:** §11 (file list) of `2026-06-15-ui-ux-iteration-v2-design.md`. Carries over v2 §1-§10 with new bug fix + broader page/component polish.

---

## 1. Context

Spec redesign v1 (2026-06-15) replaced neo-brutalism with Warm Atelier (cream + charcoal + terracotta). Implementation across 9 pages + login. Spec iteration v2 (2026-06-15) added Claude palette, dark mode, larger checkbox, barcode UX, animation system, legacy CSS variable sweep — **status: "Awaiting user review"**.

User now requests v3 with explicit additions:
1. **App2 sync bug fix** — "tombol sinkronisasi malah memilih file excel, bukan sinkronisasi" (button "Sinkronisasi" on ExtractOpnamePage line 421 triggers file picker, not server sync).
2. **Checkbox App1 lebih besar** — easier to tick on tablet.
3. **Overall design, UI, UX, animation, layout cleanup** — masih berantakan.
4. **Improve sisanya sesuai temuan** — v3 designer's call.

**Goal:** Single spec v3 = approve v2 (Claude palette + dark mode + larger checkbox + barcode UX) + fix App2 sync + sweep 8 halaman + 17 components + animation completion + remove `extract-opname.css` orphan.

---

## 2. Goals & Non-Goals

### Goals
1. **App2 sync bug fix** — split tombol "Sinkronisasi" jadi "Pilih File" (file picker) + "Sinkron Data Opname" (fetch `/api/db/opname-data/:periode`). Add partial error handling.
2. **Implement v2 carryover** — Claude palette, dark mode, larger checkbox (24/28/32 + 44px touch), barcode UX with recent + Cmd+K, sweep legacy CSS variables.
3. **Polish 8 halaman** — LoginPage, UploadPage, OpnamePage, ExtractOpnamePage, BentoMenu, UnifiedMasterDataPage, App3ConsolidationPage, App4RecouncilPage.
4. **Polish 17 components** — AssetTable (priority), BarcodeSearchModal, SignaturePad, NetworkSyncHub, MatHistoryModal, SavedSessionCard, DatabaseUploadGrid, PreviewModal, SaveLoadModal, CustomRoomModal, SearchableGroupedSelect, NoBarcodeSection, NotAtLocationSection, ErrorBoundary, ServerFileBrowser, plus 2 modal subcomponents.
5. **Animation system** — checkbox pop, modal fade-in, tab underline slide, sync button spin, toast slide-up.
6. **Reduced motion + a11y** — respects `prefers-reduced-motion`, focus ring, keyboard nav.
7. **Zero legacy CSS variables** in `app/src`.
8. **Remove `extract-opname.css` orphan** — already migrated to `styles/*.css`.

### Non-Goals
- Camera-based barcode scanning
- Per-user theme sync (server-side)
- TypeScript migration
- Backend/API changes (except App2 sync partial-error handling in frontend)
- New pages or new features
- i18n / multi-language
- AdminPage, UnifiedPostOpnamePage, DashboardPage polish (defer to v4)
- Page transitions (defer to v4)
- iOS native Capacitor build (web only)

---

## 3. Color System — Claude Palette (from v2 §3, carried)

Claude.ai official palette, light + dark. Aliasing strategy for backward compat with `--cream-*`, `--charcoal-*`, `--terracotta-*`.

### 3.1 Light tokens

| Token | Hex | Use |
|---|---|---|
| `--bg-primary` | `#FAF9F5` | Page background |
| `--bg-surface` | `#FFFFFF` | Card surface, input bg |
| `--bg-input` | `#F5F4EF` | Secondary input bg, hover row |
| `--text-primary` | `#262624` | Primary text, primary CTA bg |
| `--text-secondary` | `#595755` | Body text secondary |
| `--text-tertiary` | `#8B8580` | Meta text, labels |
| `--text-muted` | `#BCB8B1` | Placeholder, disabled |
| `--border` | `#E8E5DE` | Hairline borders (1px) |
| `--border-strong` | `#D4D0C8` | Hover borders (1.5px) |
| `--accent` | `#D97757` | **Claude orange** — barcode text, active dot, sync button, focus ring |
| `--accent-hover` | `#C26A4D` | Accent hover state |
| `--accent-soft` | `rgba(217,119,87,0.10)` | Soft accent backgrounds |
| `--accent-glow` | `rgba(217,119,87,0.20)` | Accent shadow |
| `--accent-ring` | `rgba(217,119,87,0.12)` | Focus ring |
| `--success-500` | `#3D8C5F` | Success / "Baik" |
| `--success-50` | `rgba(61,140,95,0.10)` | Success soft bg |
| `--warning-500` | `#C28B1A` | Warning |
| `--warning-50` | `rgba(194,139,26,0.10)` | Warning soft bg |
| `--danger-500` | `#C44545` | Danger / "Rusak" |
| `--danger-50` | `rgba(196,69,69,0.10)` | Danger soft bg |

### 3.2 Dark tokens

| Token | Hex | Use |
|---|---|---|
| `--bg-primary` | `#262624` | Page bg (charcoal deep) |
| `--bg-surface` | `#2D2D2B` | Card surface (one shade up) |
| `--bg-input` | `#1F1F1D` | Input bg (one shade down) |
| `--text-primary` | `#F5F4EF` | Light cream text |
| `--text-secondary` | `#BCB8B1` | Body text |
| `--text-tertiary` | `#8B8580` | Meta text |
| `--text-muted` | `#595755` | Placeholder |
| `--border` | `#3D3D3B` | Hairline borders |
| `--border-strong` | `#4A4A48` | Hover borders |
| `--accent` | `#D97757` | **Same** — Claude orange works on both |
| `--accent-hover` | `#E58A6A` | Lighter on dark for hover |
| `--accent-soft` | `rgba(217,119,87,0.15)` | Soft accent bg (higher opacity) |
| `--accent-glow` | `rgba(217,119,87,0.30)` | Glow shadow |
| `--accent-ring` | `rgba(217,119,87,0.20)` | Focus ring |
| `--success-500` | `#3D8C5F` | Same |
| `--warning-500` | `#C28B1A` | Same |
| `--danger-500` | `#C44545` | Same |

### 3.3 Aliasing strategy (backward compat)

`wa-*` classes dan existing component JSX reference `--cream-*`, `--charcoal-*`, `--terracotta-*`. **Rename via aliasing di `:root` (bukan sweeping semua file):**

```css
:root[data-theme="light"] {
  /* Claude palette */
  --bg-primary: #FAF9F5;
  --bg-surface: #FFFFFF;
  --bg-input: #F5F4EF;
  --text-primary: #262624;
  --text-secondary: #595755;
  --text-tertiary: #8B8580;
  --text-muted: #BCB8B1;
  --border: #E8E5DE;
  --border-strong: #D4D0C8;
  --accent: #D97757;
  --accent-hover: #C26A4D;
  --accent-soft: rgba(217,119,87,0.10);
  --accent-glow: rgba(217,119,87,0.20);
  --accent-ring: rgba(217,119,87,0.12);
  --success-500: #3D8C5F;
  --success-50: rgba(61,140,95,0.10);
  --warning-500: #C28B1A;
  --warning-50: rgba(194,139,26,0.10);
  --danger-500: #C44545;
  --danger-50: rgba(196,69,69,0.10);

  /* Backward-compat aliases — point to Claude tokens */
  --cream-bg: var(--bg-primary);
  --cream-surface: var(--bg-surface);
  --cream-input: var(--bg-input);
  --charcoal-900: var(--text-primary);
  --charcoal-700: #2D2D2B;
  --charcoal-500: var(--text-secondary);
  --charcoal-400: var(--text-tertiary);
  --charcoal-300: var(--border);
  --terracotta-500: var(--accent);
  --terracotta-400: #E58A6A;
  --terracotta-600: var(--accent-hover);
}

:root[data-theme="dark"] {
  /* Claude dark palette */
  --bg-primary: #262624;
  --bg-surface: #2D2D2B;
  --bg-input: #1F1F1D;
  --text-primary: #F5F4EF;
  --text-secondary: #BCB8B1;
  --text-tertiary: #8B8580;
  --text-muted: #595755;
  --border: #3D3D3B;
  --border-strong: #4A4A48;
  --accent: #D97757;
  --accent-hover: #E58A6A;
  --accent-soft: rgba(217,119,87,0.15);
  --accent-glow: rgba(217,119,87,0.30);
  --accent-ring: rgba(217,119,87,0.20);
  --success-500: #3D8C5F;
  --warning-500: #C28B1A;
  --danger-500: #C44545;

  /* Backward-compat aliases */
  --cream-bg: var(--bg-primary);
  --cream-surface: var(--bg-surface);
  --cream-input: var(--bg-input);
  --charcoal-900: var(--text-primary);
  --charcoal-700: #F5F4EF;
  --charcoal-500: var(--text-secondary);
  --charcoal-400: var(--text-tertiary);
  --charcoal-300: var(--border);
  --terracotta-500: var(--accent);
  --terracotta-400: #E58A6A;
  --terracotta-600: var(--accent-hover);
}
```

**Mengapa aliasing (bukan hard rename):**
- 30+ file reference `--cream-*`, `--charcoal-*`, `--terracotta-*`. Hard rename = high risk + huge diff.
- Aliasing = 1 file (`tokens.css`) + 0 risk pada JSX. Working code stay working.
- **Trade-off:** Naming confusing. Acceptable karena v4 future bisa hard rename kalau ada bandwidth.

### 3.4 Type & Spacing tokens (unchanged dari v1)

- Typography: Sora 400/500/600, DM Mono 500/600/700.
- Spacing: 8pt grid (`--space-1` s.d. `--space-8`).
- Radius: `--radius-sm: 8px`, `--radius-md: 10px`, `--radius-lg: 12px`, `--radius-xl: 14px`.
- Shadow: `--shadow-xs/sm/md/lg` (soft, no hard offset). Update opacity untuk dark mode.

---

## 4. Checkbox v2 (from v2 §4, carried) — touch-friendly

### 4.1 Size tiers

| Context | Visual | Touch target | Media query |
|---|---|---|---|
| Desktop (mouse) | 24×24 | 44×44 | default |
| Tablet (coarse pointer) | 28×28 | 48×48 | `@media (pointer: coarse)` |
| Mobile (narrow) | 32×32 | 48×48 | `@media (max-width: 767px)` |

### 4.2 Visual states

```
┌──────────────────────┐
│ Default (off)        │  bg: --bg-surface
│   ┌──┐               │  border: 2px --border
│   │  │  24×24        │  border-radius: 6px
│   └──┘               │  Hover: border --accent, bg --accent-soft
│                      │  Active: scale(0.92) 80ms
│                      │  Focus-visible: 3px --accent-ring shadow
├──────────────────────┤
│ Checked              │  bg: --accent, border: --accent
│   ┌──┐               │  Checkmark: SVG inline 14px white
│   │✓ │  24×24        │  Animation 1: pop scale 1→1.08→1, 220ms ease-bounce
│   └──┘               │  Animation 2: checkmark draw 0→1, 180ms ease-out
│                      │  Row bg: --accent-soft (existing wa-table tr.checked)
├──────────────────────┤
│ Indeterminate        │  bg: --accent, border: --accent
│   ┌──┐               │  Dash mark: 8×2px white horizontal
│   │─ │               │  No animation (rare in opname use)
│   └──┘               │
└──────────────────────┘
```

### 4.3 Hit area wrapper

Wrap input dalam `<label>` dengan flex centering + min 44×44:

```jsx
<label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, cursor: 'pointer' }}>
  <input type="checkbox" className="wa-check" checked={checked} onChange={onChange} />
</label>
```

### 4.4 CSS

```css
.wa-check {
  appearance: none;
  width: 24px; height: 24px;
  border: 2px solid var(--border);
  border-radius: 6px;
  background: var(--bg-surface);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  margin: 0;
  transition: border-color 160ms var(--ease-out),
              background 160ms var(--ease-out),
              transform 80ms var(--ease-out);
}
.wa-check:hover { border-color: var(--accent); background: var(--accent-soft); }
.wa-check:active { transform: scale(0.92); }
.wa-check:focus-visible { box-shadow: 0 0 0 3px var(--accent-ring); outline: none; }
.wa-check:disabled { opacity: 0.4; cursor: not-allowed; }
.wa-check:checked {
  background: var(--accent);
  border-color: var(--accent);
  animation: wa-check-pop 220ms var(--ease-bounce);
}
.wa-check:checked::after {
  content: '';
  position: absolute; left: 6px; top: 2px;
  width: 7px; height: 12px;
  border: solid var(--bg-surface);
  border-width: 0 2.5px 2.5px 0;
  transform: rotate(45deg) scale(0);
  animation: wa-check-draw 180ms 40ms var(--ease-out) forwards;
}
.wa-check:indeterminate { background: var(--accent); border-color: var(--accent); }
.wa-check:indeterminate::after {
  content: '';
  position: absolute; left: 4px; top: 9px;
  width: 12px; height: 2px;
  background: var(--bg-surface);
}

@keyframes wa-check-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
@keyframes wa-check-draw {
  to { transform: rotate(45deg) scale(1); }
}

@media (pointer: coarse) {
  .wa-check { width: 28px; height: 28px; }
  .wa-check:checked::after { left: 8px; top: 3px; width: 8px; height: 13px; }
}
@media (max-width: 767px) {
  .wa-check { width: 32px; height: 32px; }
  .wa-check:checked::after { left: 10px; top: 4px; width: 9px; height: 14px; }
  .wa-check:indeterminate::after { left: 8px; top: 14px; width: 12px; height: 2px; }
}
```

---

## 5. Check Barcode UX v2 (from v2 §5, carried)

### 5.1 Header button — toggle with notification

**Current:** Plain `wa-btn` charcoal "BARCODE CHECKER" di [App.jsx](app/src/App.jsx) App1Layout header.

**New:** Toggle button dengan:
- Default state: "BARCODE CHECKER" charcoal
- Active state (modal open): "BARCODE CHECKER" + ring `--accent`
- Notification state: "BARCODE CHECKER · 2 BARU" dengan dot `--accent` pulse animation 1.5s loop

**Notification count mechanism:** Tracked in `BarcodeSearchModal` local state via `useState` hook + persisted to `localStorage` key `barcode-modal-new-count`. App1Layout owns `isSearchOpen` state dan `newScanCount` state. `BarcodeSearchModal` receives `onNewScan` callback prop.

```jsx
<button
  className={`wa-btn ${hasNewScans ? 'wa-btn--has-notification' : ''} ${isOpen ? 'wa-btn--active' : ''}`}
  onClick={() => setIsSearchOpen(true)}
  title="Cek barcode (Cmd+K)"
>
  <Search size={16} strokeWidth={3} />
  BARCODE CHECKER
  {hasNewScans && (
    <span className="wa-pulse-dot" aria-label={`${count} hasil baru`}>
      {count} BARU
    </span>
  )}
</button>
```

**Pulse dot CSS:**
```css
.wa-btn--has-notification {
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent);
}
.wa-pulse-dot {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.1em;
  padding: 2px 6px;
  background: var(--accent);
  color: var(--bg-surface);
  border-radius: 999px;
  position: relative;
  margin-left: 4px;
}
.wa-pulse-dot::before {
  content: '';
  position: absolute; inset: -2px;
  border: 1.5px solid var(--accent);
  border-radius: 999px;
  animation: wa-pulse 1.5s var(--ease-out) infinite;
}
@keyframes wa-pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}
```

**State management for `hasNewScans` count:**
- Lifted ke `App1Layout` yang sudah ada. `newScanCount` state local.
- `AssetTable.jsx` accept `onNewScan` callback prop. Dipanggil saat user centang checkbox untuk barcode yang baru di-scan.
- Reset count: otomatis ke 0 saat modal BarcodeChecker dibuka.
- Persist: tidak perlu (session-only).
- Limit max display: "99+ BARU" jika > 99.

### 5.2 Modal UX improvements

**A. Empty state (initial load):**
```
┌────────────────────────────────────────┐
│            [BarcodeScan icon]          │
│      Scan barcode menggunakan          │
│      scanner USB, atau ketik manual    │
│      di kolom pencarian di atas.       │
│                                        │
│      Shortcut: Cmd+K (Mac) /           │
│      Ctrl+K (Windows/Linux)            │
└────────────────────────────────────────┘
```
Soft centered, monospace text `--text-tertiary`, icon 48px `--text-muted`.

**B. Result row layout:**
```
┌────────────────────────────────────────────┐
│ [BC] 1500001                  [TERSCAN ✓]  │
│  ↑  LAPTOP LENOVO X1 CARBON                │
│ icon Ruangan 301 · PO 4500123456           │
│     ─────────────────────────────────      │
│     Kondisi: Baik · PIC: Andi              │
└────────────────────────────────────────────┘
```
- `[BC]` = icon wrap 32px rounded 8px, bg `--bg-input`
- Barcode: mono 11px 700, color `--accent`
- Status pill: `Terscan` hijau / `Tidak ditemukan` merah
- Hover row: bg `--bg-input`
- Klik row: highlight + auto-scroll ke row di AssetTable (existing functionality)

**C. Recent searches strip:**
- Di bawah search input
- 5 barcode terakhir (localStorage key `barcode-recent`)
- Chip clickable, mono 10px, bg `--bg-input`, hover bg `--accent-soft`
- "Clear" ghost button di kanan

**D. Keyboard shortcuts:**
- `Cmd/Ctrl + K` → buka Barcode Checker dari mana saja di App1
- `Esc` → tutup modal
- `Enter` di search → submit scan
- `↑/↓` → navigate result list

### 5.3 Mobile/tablet
- Modal full-screen di mobile (existing pattern dari SaveLoadModal)
- "SCAN DENGAN KAMERA" placeholder button (disabled, tooltip "Coming soon")
- Touch-optimized result row: min-height 56px

---

## 6. App2 Sync Bug Fix (NEW)

### 6.1 Bug description

**File:** [app/src/pages/ExtractOpnamePage.jsx:421](app/src/pages/ExtractOpnamePage.jsx#L421)

```jsx
<button className="wa-btn-terracotta" onClick={() => oracleInputRef.current?.click()}>
  <RefreshCw size={13} /> Sinkronisasi   // ← misleading name
</button>
```

Button ini trigger file picker (upload Excel), bukan sinkronisasi data dari server. Fungsi `handleSync()` (line 182) yang fetch dari `/api/db/opname-data/:periode` dkk — tidak pernah di-trigger dari UI.

### 6.2 Fix: 2 tombol terpisah

```jsx
<div style={{ display: 'flex', gap: 8 }}>
  {/* Upload file Excel (existing behavior) */}
  <button className="wa-btn-ghost" onClick={() => oracleInputRef.current?.click()}>
    <Upload size={13} /> Pilih File
  </button>

  {/* Sync from server (NEW — expose handleSync) */}
  <button
    className="wa-btn-terracotta"
    onClick={handleSync}
    disabled={!selectedPeriod || loading}
    title={!selectedPeriod ? 'Pilih periode dulu' : 'Tarik data opname dari server'}
  >
    {loading ? <Loader2 size={13} className="wa-spin" /> : <RefreshCw size={13} />}
    Sinkron Data Opname
  </button>
</div>
```

### 6.3 Partial error handling

**Current** (line 196-201):
```js
if (!scannedJson.success) throw new Error(scannedJson.error || 'Failed to fetch scanned data');
if (!notScannedJson.success) throw new Error(notScannedJson.error || 'Failed to fetch not-scanned data');
// 1 fail = all fail
```

**New** — aggregate errors, save partial data:

```js
const errors = [];
const successes = {};

// Try scanned data
if (scannedJson.success) {
  successes.scanned = scannedJson.data;
} else {
  errors.push(`Data terscan: ${scannedJson.error}`);
}

// Try not-scanned data
if (notScannedJson.success) {
  successes.notScanned = notScannedJson.data;
} else {
  errors.push(`Data tidak terscan: ${notScannedJson.error}`);
}

// Try app1 data (optional, hanya untuk app1DataMap)
if (app1Json.success && Array.isArray(app1Json.data)) {
  // Build map
  const newApp1Map = new Map();
  app1Json.data.forEach(item => {
    const barcode = item.barcode || item.BARCODE_ASSET;
    if (barcode) newApp1Map.set(String(barcode).trim().toUpperCase(), item);
  });
  successes.app1Map = newApp1Map;
}

// Update state hanya dengan data yang sukses
if (successes.scanned) setScannedData(successes.scanned);
if (successes.notScanned) setNotScannedData(successes.notScanned);
if (successes.app1Map) setApp1DataMap(successes.app1Map);

// Set sync flag true jika minimal 1 endpoint sukses
setSynced(errors.length < 3);

// Show partial error
if (errors.length > 0) {
  setError(`Sinkronisasi partial: ${errors.join('; ')}`);
}
```

### 6.4 Toast notification

After successful sync, show toast:
```jsx
<Toast
  type="success"
  message={`Data berhasil disinkronkan: ${scannedData.length} terscan, ${Object.values(notScannedData).flat().length} tidak terscan`}
/>
```

Toast auto-dismiss 3s.

### 6.5 Error formatting

Reuse pattern dari `DatabaseUploadGrid` formatted error display (per obs 178):
```jsx
{error && (
  <div className="wa-alert wa-alert--danger">
    <AlertCircle size={14} />
    <div>
      <strong>Sinkronisasi gagal</strong>
      <p>{error}</p>
      <p className="wa-alert__hint">Cek koneksi SQL Server (192.168.2.111) atau pilih periode lain.</p>
    </div>
  </div>
)}
```

Replace raw inline error banner di line 369.

---

## 7. Layout & Polish — 8 Halaman

### 7.1 Halaman polish matrix

| Halaman | Issues ditemukan | Fix |
|---|---|---|
| **LoginPage** | Inline style masih dominan per obs 162-163. BEM `lp-*` di `index.css` masih ada. | Migrate ke wa-* system. Hapus `lp-*` classes. |
| **BentoMenu** | Pakai `<button onClick={navigate}>` bukan `<Link>` per v2 §10.1. Padding inline `24px 28px`. Tidak ada theme toggle. | Ganti `<button>` → `<Link>`. Pakai class `wa-app-body`. Tambah `<ThemeToggle/>` di top bar. |
| **UploadPage** | Card 4 (Database Master Aset) duplikat Card 3 (DatabaseUploadGrid). Tombol "Sinkron Ulang" + "Upload File" tidak ada handler. Status "98,837 aset" hardcoded. | **Hapus Card 4** (sudah covered by DatabaseUploadGrid). Layout jadi 1+1+1 lebih clean. |
| **OpnamePage** | Mobile asset cards verify per v2 §10.4. Sticky bottom bar height belum konsisten. | Verify mobile cards, sync padding dengan wa-app-body. |
| **ExtractOpnamePage** | **App2 sync bug** (lihat §6). Summary cards `repeat(4, 1fr)` overflow di mobile. Inline error banner raw hex. | Fix sync, responsive summary (4→2→1 columns), wa-alert class untuk error. |
| **UnifiedMasterDataPage** | Stepper pattern, pipeline ingestion card per v2 §8.6. Polish spacing. | Verify stepper visual, padding, transitions. |
| **App3ConsolidationPage** | Stepper, filter chips. | Polish filter card, transitions. |
| **App4RecouncilPage** | Recouncil Intelligence layout, cross-verification. | Polish card layout, drag-drop zones, button hierarchy. |

### 7.2 UploadPage Card 4 — keputusan

**Hapus Card 4.** Karena:
1. DatabaseUploadGrid (Card 3) sudah cover master DB sync dengan handler real
2. Card 4 tombol "Sinkron Ulang" + "Upload File" tidak ada `onClick` — dead code
3. Status "98,837 aset" hardcoded — bukan data real
4. Visual cleaner tanpa redundansi

**Side effect:** Layout dari `1fr 1fr` dengan 2 cards full-width jadi `1fr 1fr` 2 cards biasa + 1 full-width = lebih clean, less scrolling.

### 7.3 ExtractOpnamePage summary cards responsive

**Current** (line 429):
```css
grid-template-columns: repeat(4, 1fr);  // overflow di mobile
```

**Fix** — pakai class `.summary-grid`:
```css
.summary-grid { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); }
@media (max-width: 1023px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 599px) { .summary-grid { grid-template-columns: 1fr; } }
```

### 7.4 BentoMenu button→Link

**Current** (line 138-160):
```jsx
<button onClick={() => navigate(app.path)}>...</button>
```

**New:**
```jsx
<Link to={app.path} className="wa-card" style={{...}}>...</Link>
```

`useNavigate` tetap dipakai untuk `handleLogout` (action, bukan nav).

### 7.5 Header height consistency

Verify semua page (LoginPage, BentoMenu, App1Layout, App2Layout) pakai class `wa-app-header`. Hapus inline duplikat:
- `padding: '12px 24px'` inline → class
- Background inline `rgba(253,251,247,0.85)` → class property

### 7.6 OpnamePage — mobile asset cards verify

Per v2 §8.4:
- CSS: `.opname-asset-cards` (mobile) + `.opname-asset-table-wrapper` (desktop)
- Toggle via `@media (max-width: 767px)`

Read file, identify gap, add if missing.

---

## 8. Component Library Polish

### 8.1 AssetTable.jsx — sweep legacy refs (priority)

**File:** [app/src/components/AssetTable.jsx](app/src/components/AssetTable.jsx)

| Old | New | Line |
|---|---|---|
| `var(--warm-100)` | `var(--bg-input)` | 26, 29 |
| `var(--warm-200)` | `var(--border)` | 29 |
| `var(--blue-700)` | `var(--accent)` | 155 |
| `var(--neutral-400)` | `var(--text-muted)` | 285, 372, 426 |
| `var(--neutral-600)` | `var(--text-tertiary)` | 180, 304 |
| `var(--neutral-200)` | `var(--border)` | 294 |
| `var(--neutral-50)` | `var(--bg-input)` | 294 |
| `var(--success-600)` | `var(--success-500)` | 50, 155 |
| `var(--success-200)` | `rgba(61,140,95,0.2)` | 51, 73 |
| `var(--danger-600)` | `var(--danger-500)` | 73 |
| `var(--danger-200)` | `rgba(196,69,69,0.2)` | 74 |
| `var(--primary-700)` | `var(--text-primary)` | 89 |
| `var(--primary-50)` | `var(--bg-input)` | 89 |
| `var(--primary-200)` | `var(--border)` | 89 |
| `var(--warning-700)` | `var(--warning-500)` | 88 |
| `var(--warning-50)` | `var(--bg-input)` | 88 |
| `var(--warning-200)` | `rgba(194,139,26,0.2)` | 88 |
| `var(--success-700)` | `var(--success-500)` | 86 |
| `var(--success-50)` | `var(--bg-input)` | 86 |
| `var(--success-200)` | `rgba(61,140,95,0.2)` | 86 |
| `var(--danger-700)` | `var(--danger-500)` | 87 |
| `var(--danger-50)` | `var(--bg-input)` | 87 |
| `var(--danger-200)` | `rgba(196,69,69,0.2)` | 87 |
| `var(--font-size-xs)` | `'0.75rem'` | 373 |

**Class sweep:**

| Class lama | Lokasi | Ganti jadi |
|---|---|---|
| `checkbox-opname` | line 147 | `wa-check` (wrapped in label) |
| `form-input--compact` | line 85, 379, 391, 402, 411, 420, 430, 453 | `wa-input` |
| `ghost-input` | line 200, 379, 391, 402, 411, 420, 430, 453 | Hapus (style ada di `wa-input`) |
| `btn--outline` | line 296, 308 | `wa-btn-ghost` |
| `btn--icon` | line 296, 308, 461 | `wa-btn-icon` |
| `btn--sm` | line 461 | Hapus (size dari padding) |
| `editable-row` | line 369 | Hapus |
| `tg-btn--active-*` (5 keys) | line 6-11 | **Hapus** — dead code (verify dengan Grep dulu) |
| `KONDISI_CLASS` constant | line 5-11 | **Hapus** jika tidak terpakai |
| `asset-table-wrapper` | line 257, 351 | Hapus atau ganti `wa-card` |

**Pre-flight check:** `grep -rn "KONDISI_CLASS\|tg-btn--active" app/src` harus 0 result sebelum hapus. Jika > 0, keep constant.

### 8.2 Dark mode coverage

Semua `var(--cream-*)`, `var(--charcoal-*)` di component otomatis bekerja karena aliasing. Yang perlu di-audit:
- Inline `rgba(...)` shadows → pakai `var(--shadow-*)` token
- Inline `rgba(22,163,74,0.10)` → `var(--success-50)`
- `background: '#fef2f2'` (raw hex) di error banner (line 369 ExtractOpnamePage) → class `wa-alert wa-alert--danger`

### 8.3 Component polish list

| Component | Issue | Fix |
|---|---|---|
| **AssetTable** | Legacy var, class, dead code (24+ var refs, 8 class refs) | Sweep per §8.1 |
| **BarcodeSearchModal** | Tidak ada recent searches, empty state, Cmd+K | Tambah recent chip, empty state, keyboard nav per §5 |
| **SignaturePad** | Border inline `1.5px dashed rgba(26,26,26,0.15)` | Pakai class `wa-signature-pad` |
| **NetworkSyncHub** | Legacy var `var(--warm-100)` | Sweep |
| **MatHistoryModal** | Legacy var per grep | Sweep |
| **SavedSessionCard** | Verify style | Polish if needed |
| **DatabaseUploadGrid** | Sync error formatting (per obs 178) | Keep + verify |
| **SearchableGroupedSelect** | Verify | Polish if needed |
| **PreviewModal** | Verify | Polish |
| **SaveLoadModal** | Verify | Polish |
| **CustomRoomModal** | Verify | Polish |
| **NoBarcodeSection** | Collapsible card per v2 §8.4 | Polish |
| **NotAtLocationSection** | Collapsible card per v2 §8.4 | Polish |
| **ErrorBoundary** | Verify | Polish |
| **ServerFileBrowser** | Verify | Polish |

---

## 9. Animation System (from v2 §8, carried + extensions)

| Element | Animation | Implementation |
|---|---|---|
| Checkbox check | pop 1→1.08→1 + checkmark draw 0→1 | §4.4 |
| Tab switching | underline slide via CSS `::after` transform | `.wa-tab::after` width 0→100% with `transition: transform 220ms var(--ease-out)`. Scope: Admin + App3 Tahap 1 (existing). |
| Modal open | backdrop fade 200ms + card scale 0.95→1, opacity 0→1, 250ms ease-out | keyframe `wa-modal-in` + apply to `.wa-card[role="dialog"]` |
| Toast | slide-up 16px + auto-dismiss 3s | New `.wa-toast` component |
| Sync button | rotate 360° 1s linear infinite saat loading | `.wa-btn.is-loading::after` rotating circle |
| Progress ring | stroke-dashoffset 400ms (existing) | Verify still works in dark mode |
| Page transition | cross-fade 250ms (optional) | **Defer to v4** — not blocking |
| Summary card count | number tween 600ms (optional) | IntersectionObserver + JS counter (defer to v4) |

**Loading state class (sync button):**
```css
.wa-btn.is-loading {
  pointer-events: none;
  opacity: 0.85;
  position: relative;
  color: transparent;
}
.wa-btn.is-loading::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 14px; height: 14px;
  margin: -7px 0 0 -7px;
  border: 2px solid var(--bg-surface);
  border-top-color: transparent;
  border-radius: 50%;
  animation: wa-spin 800ms linear infinite;
}
@keyframes wa-spin { to { transform: rotate(360deg); } }
```

---

## 10. Dark Mode Implementation (from v2 §6, carried)

### 10.1 Architecture

- **Storage:** `localStorage` key `kkd-theme` = `"light"` | `"dark"` | `"system"`
- **Application:** `<html data-theme="light|dark">` attribute
- **Default:** `"system"` → follow `prefers-color-scheme`
- **Pre-React anti-flash:** Inline script di `index.html` baca localStorage + apply data-theme sebelum React mount
- **Hook:** `useTheme()` returns `{theme, resolved, setTheme, toggle}`

### 10.2 Files

**`app/src/hooks/useTheme.js`** (NEW, ~30 LOC)
```js
import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'kkd-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(STORAGE_KEY) || 'system';
}

function resolveTheme(theme) {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-theme-pref', theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [resolved, setResolved] = useState(() => resolveTheme(getInitialTheme()));

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    setResolved(resolveTheme(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      applyTheme('system');
      setResolved(resolveTheme('system'));
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((next) => setThemeState(next), []);
  const toggle = useCallback(() => setThemeState((t) => (resolveTheme(t) === 'dark' ? 'light' : 'dark')), []);

  return { theme, resolved, setTheme, toggle };
}
```

**`app/index.html`** — prepend inline script di `<head>` sebelum module script:
```html
<script>
  (function() {
    try {
      var theme = localStorage.getItem('kkd-theme') || 'system';
      var resolved = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.setAttribute('data-theme-pref', theme);
    } catch (e) {}
  })();
</script>
```

### 10.3 Toggle UI placement

**BentoMenu top bar** (visible to all users):
```jsx
<button
  onClick={toggle}
  className="wa-theme-toggle"
  title={`Tema: ${resolved === 'dark' ? 'Gelap' : 'Terang'}`}
  aria-label="Toggle theme"
>
  {resolved === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
</button>
```

CSS:
```css
.wa-theme-toggle {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 180ms var(--ease-out);
}
.wa-theme-toggle:hover {
  background: var(--bg-input);
  border-color: var(--border-strong);
  color: var(--text-primary);
}
```

### 10.4 Page transition

Theme switch: smooth 200ms transition pada `background` dan `color` di `body` dan `.wa-card`. Avoid transition pada semua property (causes flicker):
```css
body, .wa-card, .wa-input, .wa-table, .wa-app-header {
  transition: background-color 200ms var(--ease-out),
              color 200ms var(--ease-out),
              border-color 200ms var(--ease-out);
}
```

**Note:** Transition ini di-override oleh §11 reduced-motion media query.

---

## 11. Reduced Motion Support (from v2 §7, carried)

**File:** `app/src/hooks/useReducedMotion.js` (NEW, ~10 LOC)
```js
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('prefers-reduced-motion: reduce').matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia('prefers-reduced-motion: reduce');
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
```

**CSS override di `components.css`:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .wa-card:hover { transform: none !important; }
  .wa-btn:hover { transform: none !important; }
  .wa-check:active { transform: none !important; }
}
```

---

## 12. File Operations

### 12.1 Files to Modify (28)

```
app/index.html                              # prepend anti-flash script
app/src/main.jsx                            # mount useTheme provider (optional)
app/src/styles/tokens.css                   # REPLACE color tokens with Claude palette + aliases
app/src/styles/components.css               # ADD checkbox v2, modal in, pulse dot, theme toggle, reduced motion
app/src/styles/pages.css                    # ADD summary-grid responsive
app/src/styles/modals.css                   # dark mode audit
app/src/styles/base.css                     # legacy var sweep
app/src/App.jsx                             # update BARCODE CHECKER button → toggle
app/src/pages/LoginPage.jsx                 # migrate to wa-* system, remove lp-* classes
app/src/pages/BentoMenu.jsx                 # button→Link, sync padding, add theme toggle
app/src/pages/UploadPage.jsx                # remove Card 4
app/src/pages/OpnamePage.jsx                # verify mobile cards, sync palette
app/src/pages/ExtractOpnamePage.jsx         # App2 sync fix, responsive summary, error formatting
app/src/pages/UnifiedMasterDataPage.jsx     # polish
app/src/pages/App3ConsolidationPage.jsx     # polish
app/src/pages/App4RecouncilPage.jsx         # polish
app/src/components/AssetTable.jsx           # sweep 24+ var refs + 8 class refs
app/src/components/BarcodeSearchModal.jsx   # recent searches, empty state, keyboard nav
app/src/components/BarcodeSearchModal.css   # recent chip, empty state, result row
app/src/components/SignaturePad.jsx         # wa-signature-pad class
app/src/components/NetworkSyncHub.jsx       # sweep legacy var
app/src/components/MatHistoryModal.css      # sweep legacy var
app/src/components/SavedSessionCard.jsx     # verify + polish
app/src/components/DatabaseUploadGrid.jsx   # verify
app/src/components/PreviewModal.jsx         # verify
app/src/components/SaveLoadModal.jsx        # verify
app/src/components/CustomRoomModal.jsx      # verify
app/src/components/SearchableGroupedSelect.jsx # verify
app/src/components/NoBarcodeSection.jsx     # verify
app/src/components/NotAtLocationSection.jsx # verify
app/src/components/ErrorBoundary.jsx        # verify
app/src/extract-opname.css                  # DELETE (already migrated to styles/*.css)
```

### 12.2 New files (6)

```
app/src/hooks/useTheme.js                   # NEW
app/src/hooks/useReducedMotion.js           # NEW
app/src/hooks/useKeyboardShortcuts.js       # NEW (Cmd+K handler)
app/src/hooks/useRecentBarcodes.js          # NEW (localStorage recent list)
app/src/components/Toast.jsx                # NEW
app/src/components/Toast.css                # NEW
```

**Total: 32 modified + 6 new = 38 files**

**NOT touched:** server plugins, store, utils, tests, login logic, save/load logic, sync logic (kecuali App2 sync partial-error handling di frontend).

---

## 13. Acceptance Criteria

1. **Zero legacy CSS variables** di `app/src` (`grep -rn "var(--warm-\|var(--neutral-\|var(--blue-\|var(--primary-\|var(--warning-\|var(--success-6\|var(--success-7\|var(--danger-6\|var(--danger-7\|var(--font-size-xs)" app/src` returns 0 results)
2. **Zero legacy classes** `checkbox-opname`, `form-input--compact`, `ghost-input`, `btn--outline`, `btn--icon`, `btn--sm`, `editable-row`, `tg-btn--active-*` di `app/src/pages` dan `app/src/components`
3. **App2 sync works** — Klik "Sinkron Data Opname" (orange button) → fetch 3 endpoint paralel → tampilkan summary cards dengan data real (97 terscan, 31 tidak, dst). Partial error handling: kalau 1 endpoint gagal, tampilkan warning tapi data dari endpoint sukses tetap di-load.
4. **App2 upload file works** — Klik "Pilih File" (ghost button) → file picker → parse → `oracleDataMap` populated.
5. **App2 tidak bingung lagi** — Tidak ada tombol "Sinkronisasi" yang misleading. 2 tombol dengan nama + fungsi jelas.
6. **Checkbox ≥ 44×44** touch target di semua breakpoint, 24/28/32 visual.
7. **Dark mode** — Toggle works, persists, no FOUC. WCAG AA contrast.
8. **Light mode** — Visual identical to v1/v2 spec (no regression).
9. **Build passes** (`npm run build`).
10. **Existing tests pass** (`npm test`).
11. **No new deps** — hanya existing libs.
12. **8 halaman + 17 components visually consistent** — same spacing, typography, state colors, animation timing.
13. **Reduced motion** respected.
14. **No console.log** added.
15. **extract-opname.css dihapus** dari `app/src/index.css` import.

---

## 14. Out of Scope (explicit non-goals)

- Camera-based barcode scanning (placeholder button only — feature for v4)
- Per-user theme sync (just localStorage, no server-side persistence)
- Hard rename of all `--cream-*` / `--charcoal-*` / `--terracotta-*` (aliasing strategy dipakai)
- Refactoring AssetTable to TypeScript (.jsx stays .jsx)
- New pages or features
- New tests beyond existing
- i18n / multi-language
- Per-component theme overrides (global theme only)
- AdminPage, UnifiedPostOpnamePage, DashboardPage polish (defer to v4)
- Page transitions cross-fade (defer to v4)
- iOS native Capacitor build (web only)

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Dark mode reveals inline `rgba()` shadows yang invisible | Visual bug di dark | Audit semua inline style, replace dengan `var(--shadow-*)` |
| App2 sync partial error handling breaks existing flow | Data inconsistency | Aggregate errors, only overwrite state untuk endpoint yg sukses; preserve old state on failure |
| AssetTable sweep terlalu agresif | Visual regression | Test semua kondisi (Baik/Rusak/Cetak/Salah/Pending) sebelum/ sesudah |
| `extract-opname.css` removal breaks import | Build fail | Verify di `index.css` import line, remove only after search confirms no usage |
| UploadPage Card 4 removal shifts layout | Visual surprise | Verify UploadPage looks balanced di semua breakpoints |
| `useKeyboardShortcuts` Cmd+K conflict dengan browser shortcut | UX issue | Check `e.preventDefault()` works, fallback to Esc-to-close |

---

## 16. References

- Spec v1: [docs/superpowers/specs/2026-06-15-ui-ux-redesign-design.md](2026-06-15-ui-ux-redesign-design.md)
- Spec v2: [docs/superpowers/specs/2026-06-15-ui-ux-iteration-v2-design.md](2026-06-15-ui-ux-iteration-v2-design.md)
- Implementation plan v2: [docs/superpowers/plans/2026-06-15-ui-ux-iteration-v2.md](2026-06-15-ui-ux-iteration-v2.md) (to be created)
- Frontend code organization: [docs/superpowers/specs/2026-06-15-frontend-code-organization.md](2026-06-15-frontend-code-organization.md)
- Upstream resilience: [docs/superpowers/specs/2026-06-15-upstream-resilience-design.md](2026-06-15-upstream-resilience-design.md)
- Claude palette source: [claude.ai](https://claude.ai) (visual inspection of light + dark mode)
- WCAG 2.1 contrast: [w3.org/WAI/WCAG21/Understanding/contrast-minimum.html](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- App2 sync bug: [app/src/pages/ExtractOpnamePage.jsx:421](app/src/pages/ExtractOpnamePage.jsx#L421)
- App2 sync function: [app/src/pages/ExtractOpnamePage.jsx:182](app/src/pages/ExtractOpnamePage.jsx#L182)
- App2 sync error raw: [app/src/pages/ExtractOpnamePage.jsx:369](app/src/pages/ExtractOpnamePage.jsx#L369)
- AssetTable legacy: [app/src/components/AssetTable.jsx:5-11](app/src/components/AssetTable.jsx#L5-L11), [:147](app/src/components/AssetTable.jsx#L147)
