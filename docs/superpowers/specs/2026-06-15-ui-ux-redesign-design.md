# KKD UI/UX Redesign — Design Spec

**Date:** 2026-06-15
**Status:** Awaiting user review
**Stack:** React 18 + Vite + react-router-dom + lucide-react
**Project:** "Kertas Kerja Digital" — PT Santos Jaya Abadi (asset opname system)

## 1. Context

The current implementation uses a **neo-brutalism** visual language (2px solid charcoal borders, `4px 4px 0 var(--amber-400)` hard offset shadows, all-caps DM Mono labels, stark white-on-charcoal table headers). This reads as derivative of the AI-generated brutalist trend and feels disconnected from a premium enterprise tool used by staff on tablets and PCs.

**Goal:** Replace the brutalist language with a "Warm Atelier" aesthetic — soft warm neutrals (cream + charcoal + Claude-style terracotta accent), generous whitespace, soft elevation, refined micro-typography. Result: exclusive-feeling, non-AI-slop, tablet-friendly, consistent across all pages.

## 2. Design Direction (decided)

| Decision | Value |
|---|---|
| Visual style | **Warm Atelier** (Anthropic / Linear / Stripe Press) |
| Color palette | Cream + charcoal + Claude terracotta accent |
| Anti-pattern | Neo-brutalism (hard offset shadows, 2px black borders, all-caps mono labels) |
| Personality | Tenang, eksklusif, manusiawi. Bukan korporat kaku, bukan lebay. |
| Scope | 1 login + 9 app pages, desktop + tablet + mobile |

## 3. Color System

### Primary palette
| Token | Hex | Use |
|---|---|---|
| `--cream-bg` | `#F5EFE6` | App background (page bg) |
| `--cream-surface` | `#FDFCF7` | Card surface, input bg |
| `--cream-input` | `#FAF6EF` | Input field bg, table header bg, signature pad bg |
| `--charcoal-900` | `#1A1A1A` | Primary text, primary CTA bg, active nav dot |
| `--charcoal-700` | `#2D2D2D` | Body text secondary |
| `--charcoal-500` | `#6B6660` | Tertiary text, descriptions |
| `--charcoal-400` | `#8B8580` | Meta text, labels, captions |
| `--charcoal-300` | `#C9C2B5` | Hairline borders, placeholder borders |
| `--terracotta-500` | `#C96442` | **Primary accent** — barcode text, RECENT dot, sync button, focus ring |
| `--terracotta-400` | `#D88865` | Gradient end (used with terracotta-500 for progress bar) |
| `--terracotta-600` | `#D87554` | Sync button hover state |
| `--green-500` | `#16a34a` | Success / "Baik" condition |
| `--amber-500` | `#D4924A` | In-progress status |

### Usage rules
- **Oranye terracotta dipakai sangat jarang** — hanya untuk: barcode text, RECENT/active indicator, focus ring, Sync button. Bukan dekorasi.
- **Charcoal 1A1A1A** untuk primary action (CTA), text, dan active nav indicator.
- **Border sangat halus** — `1px solid rgba(26,26,26,0.06)` atau `0.08`. Tidak ada `2px solid black`.
- **No drop shadow brutalism** — hanya soft layered shadow: `0 1px 2px rgba(45,45,45,0.04), 0 8px 24px rgba(45,45,45,0.06)`.
- **No gradient mesh background** — flat cream. Maksimum radial highlight 10% opacity untuk depth.

## 4. Typography

| Role | Font | Weight | Size | Use |
|---|---|---|---|---|
| Display heading | Sora | 600 | 26–36px | Page title (e.g. "Kertas Kerja Digital", "Selamat datang") |
| Section heading | Sora | 600 | 14–17px | Card title, modal title |
| Body | Sora | 400–500 | 12–13px | Default body text |
| Label uppercase | DM Mono | 500–600 | 9–10px, letter-spacing 0.15–0.20em | Field labels, meta info, button text, table headers |
| Code / data | DM Mono | 600–700 | 10–12px | Barcode, ID, dates, version numbers |
| KBD brand mark | DM Mono | 700 | 8–10px | KKD logo monogram |

### Typography rules
- **Heading line-height**: 1.05–1.15 (tight)
- **Body line-height**: 1.5–1.6
- **No ALL-CAPS Sora** — only DM Mono gets all-caps with letter-spacing.
- **No italics on Sora** — for emphasis use weight (500 → 600 → 700) or color, not italic.
- **No font-size < 12px** for body. Mono label boleh 9–10px.

## 5. Spacing & Layout

- **8pt grid** (Tailwind-like 4/8/12/16/24/32/48).
- **Container max-width**: 1920px (header content area), 1024px (form max), 600px (mobile).
- **Page padding**: 18–32px horizontal desktop, 14px mobile.
- **Card padding**: 18–26px.
- **Section gap**: 12–14px between cards in main flow.
- **Hairline gap** (`1px`): use as table row divider.

## 6. Component Library

### 6.1 Button — Primary
```css
background: #1A1A1A;
color: #FDFCF7;
border: none;
border-radius: 8px;
padding: 8px 14px;
font: Sora 11px 600;
letter-spacing: 0.05em;
text-transform: uppercase;
```
- Hover: `background: #2A2A2A`, `translateY(-1px)`, `box-shadow: 0 4px 10px rgba(0,0,0,0.15)`
- Active: `translateY(0) scale(0.98)`, 80ms

### 6.2 Button — Ghost
```css
background: transparent;
color: #1A1A1A;
border: 1px solid rgba(26,26,26,0.12);
border-radius: 8px;
padding: 8px 14px;
```
- Hover: `background: #FDFCF7`, `border-color: #1A1A1A`

### 6.3 Button — Sync (terracotta)
```css
background: #C96442;
color: #FDFCF7;
box-shadow: 0 2px 6px rgba(201,100,66,0.2);
```
- Hover: `background: #D87554`, `translateY(-1px)`, `box-shadow: 0 6px 14px rgba(201,100,66,0.30)`

### 6.4 Button — Barcode Checker (icon + uppercase)
- Pill charcoal, icon + uppercase mono text
- Hover: bg + text invert to terracotta, lift -1px

### 6.5 Card (soft)
```css
background: #FDFCF7;
border: 1px solid rgba(26,26,26,0.06);
border-radius: 14px;
box-shadow: 0 1px 2px rgba(45,45,45,0.03),
            0 6px 18px rgba(45,45,45,0.04);
```
- Hover: `border-color: rgba(26,26,26,0.16)`, `box-shadow: 0 14px 30px rgba(45,45,45,0.08)`, `translateY(-2px)`
- Active: `scale(0.985)`, 80ms

### 6.6 Input (text + select)
- **Default**: `background: transparent`, `border: 1px solid transparent`, `padding: 6px 10px`, `font: 11px`
- **Row hover (in table)**: `background: #FDFCF7`, `border-color: rgba(26,26,26,0.1)`
- **Focus**: `background: #FDFCF7`, `border-color: #C96442`, `box-shadow: 0 0 0 3px rgba(201,100,66,0.12)`
- **Search input (prominent)**: `border-radius: 9–10px`, `padding: 9–11px 14px 9–11px 34px`, `box-shadow: 0 1px 2px rgba(45,45,45,0.02)`

### 6.7 Checkbox
```css
width: 18px; height: 18px;
border: 1.5px solid #C9C2B5;
border-radius: 4px;
background: #FDFCF7;
```
- Hover: `border-color: #C96442`
- On: `background: #C96442`, `border-color: #C96442`, white checkmark `::after`

### 6.8 Toggle Pill (ADA / TIDAK)
```css
display: inline-flex;
background: #FAF6EF;
border: 1px solid rgba(26,26,26,0.08);
border-radius: 999px;
padding: 2px;
```
- Pill item: `font: DM Mono 9px 700`, `letter-spacing: 0.08em`, `padding: 4px 10px`, `color: #8B8580`
- On state: `background: #C96442`, `color: #FDFCF7`
- Hover (off state): `color: #1A1A1A`

### 6.9 Table
- **Header**: `background: #FAF6EF`, `font: DM Mono 9px 600`, `color: #8B8580`, `letter-spacing: 0.1–0.12em`, `text-transform: uppercase`, `border-bottom: 1px solid rgba(26,26,26,0.06)`
- **Row**: `font: 12px`, `border-bottom: 1px solid rgba(26,26,26,0.04)`
- **Row hover**: `background: rgba(201,100,66,0.04)`, `border-bottom-color: rgba(201,100,66,0.15)`
- **Row checked**: `background: rgba(201,100,66,0.05)`, `box-shadow: inset 3px 0 0 0 #C96442` on first td
- **Barcode cell**: `font: DM Mono 11px 700`, `color: #C96442`
- **Footer**: `background: #FAF6EF`, `border-top: 1px solid rgba(26,26,26,0.06)`, `font: DM Mono 9.5px`, `color: #6B6660`

### 6.10 Pill (nav active)
- Container: `background: rgba(26,26,26,0.04)`, `border-radius: 8px`, `padding: 3px`
- Item: `font: 11px 600`, `color: #6B6660`, `padding: 5px 12px`, `border-radius: 6px`
- Active: `background: #FDFCF7`, `color: #1A1A1A`, `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`, icon `color: #C96442`

### 6.11 Room dot
- 12–18px circle
- States: empty (`#FDFCF7` + 1.5px `#C9C2B5` border), done (`#1A1A1A` solid), process (`#C96442` solid), active (`#FDFCF7` + 2px `#C96442` border)
- Hover: `scale(1.5)`, dark tooltip with room name

### 6.12 Progress Ring (mini)
- 36–48px SVG ring, 3px stroke
- Track: `rgba(26,26,26,0.08)`
- Progress: `#C96442`, `stroke-linecap: round`
- Center: percent number, DM Mono 8.5–10px 700
- Transition: `stroke-dashoffset 400ms cubic-bezier(0.25,1,0.5,1)`

### 6.13 Section Header (collapsible)
- Strip with icon + title + count + action button + chevron
- `padding: 10px 14px`, `background: #FDFCF7`, `border: 1px solid rgba(26,26,26,0.06)`
- Round top corners when open + body below

### 6.14 Signature Pad
- `border: 1.5px dashed rgba(26,26,26,0.15)`, `border-radius: 8px`, `height: 90px`
- `background: #FAF6EF`
- Hover: `border-color: #C96442`, `background: #FDFCF7`
- Name input below: transparent bg, `border-bottom: 1px solid rgba(26,26,26,0.1)`, text-align center

### 6.15 Icon Wrap (Bento card)
- `width: 42px; height: 42px; border-radius: 10px; background: rgba(26,26,26,0.04)`
- Hover: `background: rgba(201,100,66,0.10)`, icon stroke → terracotta
- Transition: 220ms ease

## 7. Animation System

### 7.1 Standard easing
- **Primary**: `cubic-bezier(0.2, 0.8, 0.2, 1)` — natural, premium (Linear, Vercel, Stripe)
- **Bounce**: `cubic-bezier(0.2, 1.05, 0.4, 1)` — only for special emphasis

### 7.2 Timing
| Interaction | Duration |
|---|---|
| Hover state change | 180–220ms |
| Click compress | 80–90ms |
| Page transition | 250–300ms |
| Progress ring update | 400ms |
| Tooltip appear | 160ms |
| Toast | 250ms in, 3s hold, 250ms out |

### 7.3 Transform-only animations
- **Hanya animate** `transform` dan `opacity`. Jangan animate `width`, `height`, `top`, `left` (memicu layout thrashing).
- **Scale feedback**: 0.95–0.985 on press
- **Lift feedback**: -1 to -3px on hover
- **Translate feedback**: arrow icons 4–5px on parent hover

### 7.4 Reduced motion
- Respect `prefers-reduced-motion: reduce` — disable transforms, keep only opacity transitions at 100ms.

## 8. Page Specifications

### 8.1 LoginPage (`app/src/pages/LoginPage.jsx`) — VALIDATED v2

**Mockup**: [02-c-v2.html](http://localhost:62774/02-c-v2.html)

**Layout**: Split pane 1.15fr / 1fr (desktop), single column stacked (mobile).
- **Left panel** (cream): top wordmark strip + display title "Kertas Kerja Digital" + subtitle + hairline+dot signature + 2x2 module grid (number, name, hairline rows) + footer.
- **Right panel** (cream): form card with title "Masuk" + subtitle + username + password + remember + Masuk button + micro footer.
- **Modal** (server config, native only): same card style.

**Files to change**:
- `app/src/pages/LoginPage.jsx` — JSX (new layout, two-pane)
- `app/src/index.css` — replace `lp-*` classes with new system (see §6 component library)

### 8.2 BentoMenu (`app/src/pages/BentoMenu.jsx`) — VALIDATED v2

**Mockup**: [04-bento-v2.html](http://localhost:62774/04-bento-v2.html)

**Layout**: top bar (KKD + brand + user info + Logout link) + welcome strip + 2x2 module grid + footer meta.
- **Top bar**: cream surface, hairline border, KKD monogram + "Kertas Kerja Digital" + user info + ghost Logout
- **Welcome**: small monospace date + "Selamat datang, Andi." + "PILIH APLIKASI →" right-aligned
- **Cards**: equal 2x2, soft card, icon-wrap + title + description + meta + arrow. RECENT dot terracotta on MOD 01.
- **Footer**: monospace meta strip (version, brand, env)
- **Hover/click animations** on every card, button, dot.

**Files to change**:
- `app/src/pages/BentoMenu.jsx` — JSX (new layout, 2x2 grid)
- `app/src/index.css` — replace `bm-*` classes

### 8.3 UploadPage (`app/src/pages/UploadPage.jsx`) — VALIDATED v2

**Mockup**: [17-app1-upload-v2.html](http://localhost:62774/17-app1-upload-v2.html) — match struktur aktual

**Layout**: in-app header + page header (display title + 2 CTA buttons) + 4-card grid (2x2).
- **Tombol CTA**: "Lanjutkan dari Lokal (Save)" (charcoal primary) + "Ambil Data Server (Baru)" (terracotta primary). Soft style, no hard-shadow.
- **Card 1 — Opname Tersimpan**: icon-wrap + nama file + badge "79 RUANGAN" + tombol "LANJUTKAN OPNAME →" charcoal.
- **Card 2 — Hub Sinkronisasi Jaringan**: icon-wrap + sub-description "PC & Tablet" + 2 inline action: "Bagikan Sesi (PC → JARINGAN LOKAL)" + "Tarik Hasil Opname (TABLET → PC)" (keduanya ghost button dengan arrow).
- **Card 3 — Sumber Data Aset** (full-width): icon-wrap + status pill "98,837 record tersedia" + timestamp sync terakhir + tombol "Sinkron Semua dari Server" terracotta.
- **Card 4 — Database Master Aset** (full-width): icon-wrap hijau + badge "✓ 98,837 ASET" + status card hijau "SQL Server (98837 aset) — 98,837 barcode dimuat" dengan timestamp. 2 tombol: "Sinkron Ulang" + "Upload File".

**Files to change**:
- `app/src/pages/UploadPage.jsx` — JSX (4-card layout)
- `app/src/components/SavedSessionCard.jsx` — soft card
- `app/src/components/NetworkSyncHub.jsx` — 2 inline actions
- `app/src/components/DatabaseUploadGrid.jsx` — soft upload zones
- `app/src/index.css` — `.upload-zone`, `.card` refinement

### 8.4 OpnamePage (`app/src/pages/OpnamePage.jsx`) — VALIDATED v4 (tablet + mobile)

**Mockup**: [08-opname-v4-stacked.html](http://localhost:62774/08-opname-v4-stacked.html) — side-by-side tablet + mobile.

**Layout (desktop/tablet ≥768px)**:
1. **Sticky in-app header** (56px): KKD + brand + Home/Kertas Kerja pills + BARCODE CHECKER button
2. **Context bar** (one row, 56px): room nav (prev/next + select) + progress ring 36px + dot grid horizontal scroll
3. **Action bar** (slim): Daftar Aset title + TEROPNAME badge + custom + save/load + PDF + Sync
4. **Search input** (prominent, 360px)
5. **Main table** (full width, 8 columns)
6. **Aset Tanpa Barcode** (collapsible card)
7. **Aset Tidak Ada di Lokasi** (collapsible card)
8. **Signature section** (3-column: Petugas 1, Petugas 2, PIC)

**Layout (mobile <768px)**:
1. **Mobile header** (sticky slim): back + KKD + room name + barcode icon
2. **Context strip** (single row): progress ring 32px + room name + prev/next stacked
3. **Action bar** (horizontal scroll): PDF, Sync, Custom, Save/Load
4. **Search input** (full width)
5. **Asset cards** (vertical list, one card per row): checkbox + barcode + name + ADA/TDK toggle + Kondisi select + Keterangan input
6. **Bottom tab bar** (4 tabs): Aset, Tanpa BC, Salah, Ttd

**Animations per element** (see §6 and §7).

**Files to change**:
- `app/src/pages/OpnamePage.jsx` — major refactor
- `app/src/components/AssetTable.jsx` — table style refactor
- `app/src/components/NoBarcodeSection.jsx` — collapsible section
- `app/src/components/NotAtLocationSection.jsx` — collapsible section
- `app/src/components/SignatureSection.jsx` — 3-column grid
- `app/src/index.css` — full asset table rewrite, room nav, dot grid

### 8.5 ExtractOpnamePage (`app/src/pages/ExtractOpnamePage.jsx`) — VALIDATED v2

**Mockup**: [18-app2-extract-v2.html](http://localhost:62774/18-app2-extract-v2.html) — match struktur aktual (Modul 2 Extract MAT)

**Layout**:
1. In-app header (KKD + "Extract & MAT" + BARCODE CHECKER)
2. Page header: meta uppercase + display title "Extract MAT" + sub-descripsi
3. Filter + Upload card (gabung jadi 1 card):
   - 2 dropdown: PERIODE OPNAME + FILTER DEPARTEMEN ASET
   - Master Data Asset Management (ASPxGridView1) upload row dengan icon-wrap + file yang dimuat + tombol "Sinkronisasi" terracotta
4. 4 summary cards (icon-wrap + label uppercase + angka besar berwarna):
   - Total Ruangan (charcoal) | Aset Terscan (hijau) | Aset Tidak Terscan (merah) | Salah Ruangan MAT (merah)
5. Room expandable list (card dengan header strip + room rows):
   - Tiap row: chevron + nama ruang + counter (0/1) + status pill (Terscan hijau / Tidak Terscan merah) + tombol Preview ghost
   - Saat expanded: muncul sub-table "TIDAK TERSCAN (N)" dengan NO + BARCODE terracotta + NAMA + LOKASI (MASTER) + KONDISI
6. **Bottom fixed action bar** (sticky): icon-wrap + "12 file Excel (97 terscan + 31 tidak terscan)" + "✓ 1 HASIL_MAT" status + tombol "Export Semua Excel" charcoal primary

**Files to change**:
- `app/src/pages/ExtractOpnamePage.jsx` — JSX (filter card + summary + room list + bottom bar)
- `app/src/index.css` — filter card, expandable row, bottom action bar

### 8.6 UnifiedMasterDataPage & App4RecouncilPage — VALIDATED v1+v3

**Mockup Tahap 1 (Master) — Consolidation Pipeline**: [13-master-v2-pipeline.html](http://localhost:62774/13-master-v2-pipeline.html)
**Mockup Tahap 1 (Master) — Stepper with Filter**: [14-app3-v3-stepper.html](http://localhost:62774/14-app3-v3-stepper.html)
**Mockup Tahap 2 (Recouncil) v2 — match aktual**: [19-app3-tahap2-v2.html](http://localhost:62774/19-app3-tahap2-v2.html)

**Layout (App3 Tahap 1)** — 3 step eksplisit:
1. **Step 1 — Pipeline Ingestion**: 4 upload zones (Master Eksisting opsional, EXA, ADD, INV). Card collapsible setelah selesai.
2. **Step 2 — Pilih Filter** (AKTIF): 5 card kategori (ICT, ENG, BAT, HRGA, Kosong) dengan **count per kategori**. Multi-select. Live summary "Filter Terpilih: X, Y — Total N record" update real-time. Tombol "Pilih Semua" / "Reset" / "← Kembali" / "Generate Excel →" (terracotta).
3. **Step 3 — Generate Excel**: disabled sampai Step 2 diproses.

**Stepper visual** di header page: charcoal = aktif, hijau + centang = selesai, abu-abu = belum. Line hijau 400ms saat step selesai.

**Layout (App3 Tahap 2 — Recouncil Intelligence)** — match struktur aktual:
- Tab strip (Consolidation non-aktif | Evaluation aktif charcoal, dengan icon-ic accent terracotta)
- Page header: badge "FINAL EVALUATION MODULE" charcoal pill + display title "Recouncil **Intelligence**" (Intelligence terracotta) + sub-descripsi dengan emphasis 3 poin (Barcode loss, Perbedaan Ruangan, Status Kesesuaian)
- **Cross-Verification Data** card:
  - Card header: step 01 + "Cross-Verification Data" + sub-descripsi + counter "0/3 DIMUAT"
  - 2 zone top (1.4fr 1fr): "Hasil Opname (App2)" + "Master Data (App3)" — drag & drop, border dashed charcoal
  - Divider "PENGAYAAN DATA TAMBAHAN" dengan hairline + label uppercase mono di tengah
  - 1 zone bottom (full-width, horizontal layout): "Master Data Asset Management (ASPxGridView1)" + icon-wrap 48px + badge "OPSIONAL" pill di kanan
- Tombol "Proses Recouncil Sekarang →" terracotta prominent (14px padding, 12px font, terracotta shadow)

**Files to change**:
- `app/src/pages/UnifiedMasterDataPage.jsx` — major refactor (stepper pattern)
- `app/src/pages/App3ConsolidationPage.jsx` — major refactor (stepper pattern + filter chips)
- `app/src/pages/App4RecouncilPage.jsx` — refactor (Recouncil Intelligence layout)
- `app/src/index.css` — stepper, filter chip, status pill, divider, recouncil card

### 8.7 AdminPage (`app/src/pages/AdminPage.jsx`) — VALIDATED v1

**Mockup**: [15-admin-v1.html](http://localhost:62774/15-admin-v1.html)

**Layout**:
1. In-app header (KKD + "System Configuration" + BARCODE CHECKER)
2. Page header (display title + admin badge "ADMINISTRATOR · username" pill terracotta)
3. 4-tab strip: Users (active) | Audit Trail | Backup | System Info. Aktif = charcoal text + 2px terracotta underline.
4. **Users tab content**:
   - Tambah User form (inline, bukan modal): Username + Password + Role + Tambah terracotta
   - Search input (240px)
   - Users table: avatar monogram + Username + Last login + Role pill (admin terracotta / user abu-abu) + 3 toggle App1/App2/App3 + Status pill (Aktif/Offline) + Aksi (Reset PW ghost / Hapus danger-red)

**Files to change**:
- `app/src/pages/AdminPage.jsx` — refactor (page header, tab strip, inline form, table)
- `app/src/index.css` — toggle switch, role pill, danger button

### 8.8 Navigation Flow — VALIDATED

**Mockup**: [16-flow-diagram.html](http://localhost:62774/16-flow-diagram.html)

Diagram SVG dari semua halaman + koneksi:
- **Login** → **Bento Menu** (solid arrow)
- **Bento Menu** → **Upload** → **Opname** (workflow utama App1)
- **Bento Menu** → **Extract** (App2)
- **Bento Menu** → **Master (Tab 1) → Recouncil (Tab 2)** (App3)
- **Bento Menu** → **Admin** (admin only, dashed border)
- **Opname → Extract**: data flow (dashed terracotta) — hasil scan dipakai App2
- **Extract → Master**: data flow (dashed terracotta) — rekap dipakai Master
- **Master → Recouncil**: data flow (dashed terracotta) — konsolidasi dipakai Recouncil

**Mobile flow (Capacitor APK)**: Login → Bento → redirect ke App1 Upload (otomatis). App2, App3, Admin disembunyikan.

### 8.9 Mobile App1 Layout (Capacitor APK) — follows system

When running on tablet via Capacitor (per existing `isCapacitor` logic):
- Respect safe-area insets
- Touch targets ≥44px
- Barcode input is auto-focused on mount (existing)
- Long-press barcode = edit (existing)
- All hover effects become press effects

## 9. Responsive Strategy

| Breakpoint | Behavior |
|---|---|
| ≥1280px (desktop) | Full layout, 1024px content max for forms, full table |
| 768–1279px (tablet landscape) | Same as desktop, slightly tighter padding |
| 481–767px (tablet portrait) | Sidebar collapses to top bar, table gets full width |
| ≤480px (phone) | Tabel → kartu vertikal per-aset, bottom tab bar |

Use **mobile-first** approach: write base styles for mobile, layer up.

## 10. Anti-Patterns to Remove

The following must be deleted from the codebase during this redesign:

1. **All `2px solid var(--charcoal-900)` borders** in app-header, table headers, buttons
2. **All `4px 4px 0 var(--amber-400)` hard offset shadows** on search buttons, signature pads
3. **`0 2px 0 var(--amber-500)` underlines** under headers
4. **Charcoal-900 + white text table headers** — replace with cream + monospace gray
5. **`accent-color: var(--charcoal-900)` checkboxes** with 2px black borders
6. **`border-radius: 4px` on `.room-nav` and other places** — use 12–14px
7. **`::after` "industrial corner" effect on `.card`** (the 15px L-shape amber accent)
8. **DM Mono all-caps with `font-weight: 800`** for body — only for monospace data/labels at 600–700 max
9. **`box-shadow: 0 4px 0 var(--amber-500)`** on any element

## 11. Files to Modify (summary)

```
app/src/index.css                          # rewrite color tokens, all utility classes
app/src/pages/LoginPage.jsx                # new layout
app/src/pages/BentoMenu.jsx                # 2x2 grid, top bar
app/src/pages/UploadPage.jsx               # polish upload zones
app/src/pages/OpnamePage.jsx               # full refactor (v4)
app/src/pages/ExtractOpnamePage.jsx        # follow system
app/src/pages/UnifiedMasterDataPage.jsx    # follow system
app/src/pages/App4RecouncilPage.jsx        # follow system
app/src/pages/App3ConsolidationPage.jsx    # follow system
app/src/pages/AdminPage.jsx                # follow system
app/src/pages/DashboardPage.jsx            # follow system
app/src/App.jsx                            # in-app header restyle (App1Layout, App2Layout)
app/src/components/AssetTable.jsx          # table style refactor
app/src/components/NoBarcodeSection.jsx    # collapsible section
app/src/components/NotAtLocationSection.jsx # collapsible section
app/src/components/SignatureSection.jsx    # 3-column grid
app/src/components/SignaturePad.jsx        # soft pad style
app/src/components/SavedSessionCard.jsx    # card style
app/src/components/DatabaseUploadGrid.jsx  # card style
app/src/components/ServerFileBrowser.jsx   # list item style
app/src/components/BarcodeSearchModal.css  # modal + table style
app/src/components/BarcodeSearchModal.jsx  # (no logic changes)
app/src/components/MatHistoryModal.css     # modal style
app/src/components/MatHistoryModal.jsx     # (no logic changes)
app/src/extract-opname.css                 # extract page styles
```

**Total estimated files touched**: 20–25.
**Files NOT touched**: server-side plugins, store, utils, tests, modal logic.

## 12. Acceptance Criteria

A redesign is "done" when:

1. **No neo-brutalism elements remain** anywhere in the app (per §10 checklist).
2. **Color tokens** in `:root` use the new palette (§3). No raw hex in components.
3. **All pages** render with the Warm Atelier language (cream + charcoal + terracotta).
4. **Hover/click animations** present on all interactive elements (cards, buttons, rows, dots, arrows).
5. **Tablet (1024px)** and **mobile (390px)** mockups match the validated v4 design.
6. **No emoji** used as icons — only lucide-react SVGs.
7. **Touch targets** ≥44px on mobile.
8. **No `console.log`** added in modified files.
9. **Existing functionality preserved**: login, JWT auth, save/load, sync, PDF export, signatures, all work as before.
10. **Build passes** (`npm run build`).
11. **Existing tests still pass** (`npm test`).
12. **No new dependencies** — only existing lucide-react, react, etc.

## 13. Out of Scope (explicit non-goals)

- Backend / API changes
- Database schema changes
- Auth flow changes
- Adding new features
- Writing new tests (existing tests must pass; no new test coverage required for design changes)
- Performance optimization beyond CSS
- i18n / multi-language
- Dark mode (current app is light only)

## 14. Open Questions (none)

All visual decisions resolved through brainstorming:
- Style: Warm Atelier ✅
- Palette: cream + charcoal + terracotta ✅
- Brutalism replacement: soft cards + hairline borders ✅
- Title: "Kertas Kerja Digital" (no italics, no drama) ✅
- Bento: 2x2 equal grid (no hero) ✅
- Opname: 1-row context bar (no sidebar) ✅
- Responsive: tablet = stacked, mobile = cards + bottom tabs ✅

## 15. References

- Login v2: [02-c-v2.html](http://localhost:62774/02-c-v2.html)
- Bento v2: [04-bento-v2.html](http://localhost:62774/04-bento-v2.html)
- App1 Upload v2: [17-app1-upload-v2.html](http://localhost:62774/17-app1-upload-v2.html) *(match aktual)*
- Opname v4 (tablet + mobile side-by-side): [08-opname-v4-stacked.html](http://localhost:62774/08-opname-v4-stacked.html)
- App2 Extract v2: [18-app2-extract-v2.html](http://localhost:62774/18-app2-extract-v2.html) *(match aktual)*
- App3 Tahap 1 Pipeline v2: [13-master-v2-pipeline.html](http://localhost:62774/13-master-v2-pipeline.html)
- App3 Tahap 1 Stepper v3: [14-app3-v3-stepper.html](http://localhost:62774/14-app3-v3-stepper.html)
- App3 Tahap 2 Recouncil v2: [19-app3-tahap2-v2.html](http://localhost:62774/19-app3-tahap2-v2.html) *(match aktual)*
- App4 Recouncil v1: [12-recouncil-v1.html](http://localhost:62774/12-recouncil-v1.html) *(data flow version)*
- Admin v1: [15-admin-v1.html](http://localhost:62774/15-admin-v1.html)
- Navigation Flow: [16-flow-diagram.html](http://localhost:62774/16-flow-diagram.html)
- All brainstorm artifacts: `d:\Digitalisasi Kertas Kerja APP\.superpowers\brainstorm\1010-1781499549\content\`
