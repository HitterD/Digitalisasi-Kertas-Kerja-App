# Frontend Code Organization Refactor — Design Spec

**Date:** 2026-06-15
**Status:** Awaiting user review
**Stack:** React 19 + Vite + react-router-dom + lucide-react (no new deps)
**Project:** Kertas Kerja Digital — PT Santos Jaya Abadi

## 1. Context

After the 11-phase UI/UX redesign (17 commits, ending at `0742aa0`), the frontend code has grown to 5000+ lines in single files:
- `app/src/index.css` — **5013 lines** (CSS only, but unwieldy)
- `app/src/pages/AdminPage.jsx` — 751 lines
- `app/src/pages/ExtractOpnamePage.jsx` — 524 lines
- `app/src/components/AssetTable.jsx` — 481 lines
- `app/src/components/DatabaseUploadGrid.jsx` — 393 lines
- `app/src/pages/App3ConsolidationPage.jsx` — 391 lines
- `app/src/pages/OpnamePage.jsx` — 395 lines
- `app/src/components/SaveLoadModal.jsx` — 339 lines
- `app/src/components/ServerFileBrowser.jsx` — 337 lines
- `app/src/extract-opname.css` — 469 lines
- `app/src/components/MatHistoryModal.css` — 347 lines
- `app/src/components/MatHistoryModal.jsx` — 215 lines
- `app/src/pages/UploadPage.jsx` — 221 lines
- `app/src/components/BarcodeSearchModal.jsx` — 262 lines
- `app/src/components/NetworkSyncHub.jsx` — 273 lines
- ... (smaller files < 200 lines each)

A file with 5000+ lines is a signal it's doing too much. The goal is to make the codebase easier to navigate, maintain, and modify without changing behavior.

## 2. Goals & Non-Goals

**Goals:**
- Reduce `index.css` from 5013 lines to 6 focused files (each 80–1500 lines, largest single file ~1500).
- Reduce the 5 largest JSX pages (AdminPage, ExtractOpnamePage, OpnamePage, App3ConsolidationPage, App4RecouncilPage) to thin composers (50–150 lines) + 2–5 small extracted components per page.
- Zero behavior change. Zero new dependencies. Zero new tests required (existing tests must pass).
- Each file has one clear responsibility with a well-defined interface.

**Non-Goals:**
- No new features.
- No CSS-in-JS, no Tailwind, no module.css migration (keep plain global CSS).
- No custom hooks/utils extraction (that's Approach C — YAGNI for now).
- No data layer changes, no API changes, no server changes.

## 3. CSS File Structure (6 files + thin index)

```
app/src/styles/
  tokens.css         (all :root CSS variables — cream/charcoal/terracotta, status, typography, spacing, radius, shadows, easing)
  base.css           (resets: *, html, body, scrollbar, font-family, line-height, root container)
  components.css     (all .wa-* component classes: card, btn, btn-ghost, btn-terracotta, btn-danger, pill, pill-item, icon-wrap,
                      input, select, check, toggle, table, section, section-header, app-header, tabs, tab, page-header,
                      app-body, status, step-num, step-line, search, zone, toggle-switch, role-pill)
  pages.css          (page-specific classes that are NOT component-level: admin-*, page-specific section header, etc.)
  modals.css         (modal-specific: modal-overlay, modal, bcs-*, mhm-card, sa-*, etc.)
  responsive.css     (all @media queries: tablet portrait, landscape, mobile breakpoint, html.plt-capacitor, html.plt-android, opname-asset-table-wrapper, etc.)

app/src/index.css     (becomes thin: just @import statements + migration bridge)
```

### `index.css` after split:
```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');

@import './styles/tokens.css';
@import './styles/base.css';
@import './styles/components.css';
@import './styles/pages.css';
@import './styles/modals.css';
@import './styles/responsive.css';

/* Migration bridge (kept intentionally until all file-body CSS is migrated to new tokens) */
:root {
  --cream-bg: #F5EFE6;  /* etc — keep old token names for backward compat */
  /* ...all old tokens preserved... */
}
```

**No import change in `main.jsx` needed** — it still imports `'./index.css'`. Vite handles `@import` natively.

### File content rules

**`tokens.css`** (~80 lines):
- `:root` block with new Warm Atelier tokens (--cream-bg, --cream-surface, --cream-input, --charcoal-*, --terracotta-*, --success-*, --warning-*, --danger-*, --font-sora, --font-mono, --fs-*, --space-*, --radius-*, --shadow-*, --ease-*, --t-*)

**`base.css`** (~150 lines):
- Universal `*` reset (box-sizing, margin, padding)
- `html` (font-size 16px, text-size-adjust)
- `body` (font-family, font-size, color, background, line-height, antialiasing)
- `code, pre, .mono-text` etc. font-family
- `::-webkit-scrollbar` (custom scrollbar)
- `#root` (min-height, flex column)
- `.app-header` (legacy class kept for compat — soft version)

**`components.css`** (~600 lines):
- All `wa-*` component classes (from Phase 1: card, btn, btn-ghost, btn-terracotta, btn-danger, pill, pill-item, icon-wrap, input, select, check, toggle, table, section, section-header, app-header, tabs, tab, page-header, app-body, status, step-num, step-line, search, zone, toggle-switch, role-pill)
- All hover/active transition behaviors

**`pages.css`** (~1500 lines):
- `app-header` (legacy soft version, post-Phase 4)
- `bento-*` remnants (none should exist after Phase 3, but check)
- `lp-*` remnants (none after Phase 2)
- `room-nav`, `meta-info`, `actions-bar` remnants (none after Phase 5)
- `asset-table` remnants (none after Phase 5)
- `admin-card`, `admin-alert`, `admin-table`, `admin-callout`, `admin-loading`, `admin-table-wrapper`, `admin-badge`, `admin-table-tr` (kept for AdminPage)
- `editorial-glass-card` (legacy, used by some components still)
- `bento-header` (legacy, used by UploadPage)
- `editor-gloss-card` (legacy)
- `stat-card-premium` (used by extract-opname)

**`modals.css`** (~600 lines):
- `.modal-overlay` (with all its position/z-index overrides)
- `.modal` (with all its responsive variants)
- `.mhm-*` (MatHistoryModal classes)
- `.bcs-*` (BarcodeSearchModal classes)
- `.sa-*` (SaveLoadModal classes)
- `.file-list-item` (ServerFileBrowser file item)
- `.preview-modal-*` (PreviewModal)

**`responsive.css`** (~500 lines):
- All `@media` queries, organized by breakpoint:
  - `@media (min-width: 600px)` — tablet portrait
  - `@media (min-width: 768px)` — tablet landscape
  - `@media (min-width: 900px)` — desktop
  - `@media (min-width: 1024px)` — desktop wide
  - `@media (max-width: 767px)` — mobile
  - `html.plt-capacitor` — Capacitor APK
  - `html.plt-android` — Android
  - `.opname-asset-table-wrapper` / `.opname-asset-cards` (from Phase 5c)

**`index.css`** (~20 lines):
- Google Fonts `@import` (1 line)
- 6 internal `@import` statements (6 lines)
- Optional migration bridge `:root` (the old token block kept for backward compat)

## 4. Page JSX Splits

Each page becomes a thin composer. Extracted components live in `src/components/<page>/` (e.g. `src/components/opname/OpnameContextBar.jsx`).

### 4.1 OpnamePage (395 → ~120 lines composer)

```
src/components/opname/
  OpnameContextBar.jsx          (~90 lines)  prev/next + select + progress ring + dot grid
  OpnameMetaStrip.jsx           (~50 lines)  4-column meta card (Ruangan / PIC / Periode / Tanggal)
  OpnameActionBar.jsx           (~40 lines)  Daftar Aset + TEROPNAME + Custom + Save/Load + PDF + Sync
  OpnameCollapsibleSection.jsx  (~40 lines)  generic wa-section wrapper with header strip
  OpnameMobileAssetCards.jsx    (~70 lines)  mobile-only asset card list
  OpnameSignatureSection.jsx    (~80 lines)  3-column signature grid (wraps existing SignaturePad)
```

OpnamePage becomes a thin composer: imports the 6 components, renders them in order, keeps all `useState`/`useCallback`/`useMemo`/handlers, wires props. ~120 lines.

### 4.2 ExtractOpnamePage (524 → ~150 lines composer)

```
src/components/extract/
  ExtractFilterCard.jsx     (~80 lines)  2 dropdowns + master data upload row + Sinkronisasi button
  ExtractSummaryTiles.jsx   (~80 lines)  4 summary cards (Total / Scan / Tidak / Salah)
  ExtractRoomList.jsx       (~110 lines) expandable room rows + Preview button
  ExtractStickyBar.jsx      (~40 lines)  sticky bottom action bar with Export Semua Excel
```

### 4.3 AdminPage (751 → ~150 lines composer)

```
src/components/admin/
  AdminPageHeader.jsx   (~30 lines)  slim header with admin status pill
  AdminTabsBar.jsx      (~30 lines)  4-tab strip with wa-tab classes
  AdminUsersTab.jsx     (~210 lines) Add user form + users table (with toggles, role pills)
  AdminAuditTab.jsx     (~170 lines) audit log table + filter + pagination
  AdminBackupTab.jsx    (~80 lines)  backup create + list
  AdminSystemTab.jsx    (~50 lines)  system info grid
  AdminUserModal.jsx    (~30 lines)  edit/add user modal (was inline in AdminPage, extract to reusable modal)
```

### 4.4 App3ConsolidationPage (391 → ~120 lines composer)

```
src/components/app3/
  App3Stepper.jsx         (~50 lines)  3-step stepper visual (wa-step classes)
  App3PipelineUpload.jsx  (~140 lines) 4 upload slots (wa-zone) + extract filter button + extract result table
  App3FilterCards.jsx     (~80 lines)  5-card filter grid (ICT/ENG/BAT/HRGA/Kosong) + live summary + process button
```

### 4.5 App4RecouncilPage (287 → ~110 lines composer)

```
src/components/app4/
  App4CrossVerification.jsx  (~110 lines) 3 upload zones + divider + opsional badge
  App4ProcessButton.jsx      (~25 lines)  Proses Recouncil button
```

### 4.6 Pages NOT split (stay as-is or already focused)

| File | Lines | Why not split |
|---|---|---|
| `pages/LoginPage.jsx` | 256 | ~60% inline styles, already focused on single form |
| `pages/BentoMenu.jsx` | 172 | Already focused (4 cards) |
| `pages/UploadPage.jsx` | 221 | Already composer of 3 components + Card 4 inline |
| `pages/DashboardPage.jsx` | 366 | Legacy, will be deprecated; leave |
| `pages/UnifiedPostOpnamePage.jsx` | 77 | Already focused |
| `pages/App.jsx` | 203 | App shell, already focused |
| `components/AssetTable.jsx` | 481 | Could be split (table body / pagination / search) but acceptable as-is |
| `components/DatabaseUploadGrid.jsx` | 393 | Could be split (zone + button + list) but acceptable as-is |
| `components/SignaturePad.jsx` | 152 | Already focused |
| `components/SaveLoadModal.jsx` | 339 | Could be split (form / list / buttons) |
| `components/ServerFileBrowser.jsx` | 337 | Could be split (toolbar / list / file-item) |
| `components/BarcodeSearchModal.jsx` | 262 | Could be split (modal shell / search form / results) |
| `components/MatHistoryModal.jsx` | 215 | Already focused |
| `components/NetworkSyncHub.jsx` | 273 | Already focused |
| `components/SavedSessionCard.jsx` | 41 | Trivial |
| `components/SearchableGroupedSelect.jsx` | 91 | Trivial |
| `components/ErrorBoundary.jsx` | 100 | Trivial |
| `components/NoBarcodeSection.jsx` | 43 | Trivial |
| `components/NotAtLocationSection.jsx` | 44 | Trivial |
| `components/SignatureSection.jsx` | 57 | Could be replaced by OpnameSignatureSection |
| `components/CustomRoomModal.jsx` | 55 | Trivial |
| `components/PreviewModal.jsx` | 174 | Could be split |
| `components/AdminUserModal.jsx` | NEW | (extracted from AdminPage) |

**Note on `SignatureSection.jsx`:** after extracting `OpnameSignatureSection.jsx`, the original `components/SignatureSection.jsx` can be deleted IF no other page uses it. Check: only Opname uses it. Safe to delete.

## 5. Component Split Pattern

Each extracted component:
- **Receives props** explicitly (no hidden coupling to parent state)
- **Returns a single root `<div>`** (or `<section>` or `<>` fragment)
- **Reuses `wa-*` classes** from `components.css`
- **Has explicit prop types** in JSDoc comment (no TypeScript, just docs)
- **No state of its own** unless it's a discrete UI concern (e.g. modal open state)

Each page composer:
- **Holds all state** (`useState`, `useCallback`, `useMemo`)
- **Holds all handlers** (event functions)
- **Imports extracted components**
- **Renders them in order**
- **Wires props → state/handlers**
- **No JSX beyond the layout shell** (no inline big subtrees)

## 6. Migration Strategy & Rollback

**Strategy:** Each file split is one atomic commit.

| # | Commit message | Risk | Verification |
|---|---|---|---|
| 1 | `chore(css): split index.css into styles/{tokens,base,components,pages,modals,responsive}.css` | LOW (pure mechanical) | `npm run dev` → identical visual |
| 2 | `refactor(opname): extract OpnameContextBar/MetaStrip/ActionBar/CollapsibleSection/MobileAssetCards/SignatureSection into src/components/opname/` | LOW-MED | `npm run dev` → identical behavior |
| 3 | `refactor(extract): split ExtractOpnamePage into FilterCard/SummaryTiles/RoomList/StickyBar` | LOW-MED | Same |
| 4 | `refactor(admin): split AdminPage into PageHeader/TabsBar/UsersTab/AuditTab/BackupTab/SystemTab/UserModal` | LOW-MED | Same |
| 5 | `refactor(app3): split App3ConsolidationPage into Stepper/PipelineUpload/FilterCards` | LOW-MED | Same |
| 6 | `refactor(app4): split App4RecouncilPage into CrossVerification/ProcessButton` | LOW | Same |

**Total: 6 commits.**

**Rollback:** If a commit breaks anything, `git revert <sha>` to undo just that commit. Each is self-contained.

**Testing:** No new tests. Existing tests must pass after each commit. Manual `npm run dev` visual check after each commit. After CSS split: visual must be identical. After JSX split: behavior must be identical, only file boundaries changed.

## 7. File Creation Order (per commit)

**Commit 1: CSS split (lowest risk first)**

1. Create 6 new files in `app/src/styles/`:
   - `tokens.css` (extract from index.css L4-L95)
   - `base.css` (extract reset, body, scrollbar, #root)
   - `components.css` (extract all `.wa-*` classes)
   - `pages.css` (extract page-specific `.admin-*`, `.editorial-glass-card`, `.bento-header`, `.stat-card-premium`)
   - `modals.css` (extract `.modal-overlay`, `.modal`, `.bcs-*`, `.mhm-card`, `.sa-*`, `.file-list-item`)
   - `responsive.css` (extract all `@media` blocks)
2. Replace `index.css` content with: Google Fonts `@import` + 6 internal `@import` + migration bridge `:root`
3. Verify: `npm run dev` → identical visual
4. Commit

**Commit 2: Opname split**

1. Create `src/components/opname/` directory
2. Create 6 new files (OpnameContextBar, OpnameMetaStrip, OpnameActionBar, OpnameCollapsibleSection, OpnameMobileAssetCards, OpnameSignatureSection)
3. Each file: receives props, renders its subtree using `wa-*` classes
4. Edit `OpnamePage.jsx` to import and render these 6 components
5. Delete now-unused JSX blocks from `OpnamePage.jsx`
6. Verify: `npm run dev` → identical behavior
7. (Optional) Delete `components/SignatureSection.jsx` if no other page uses it (just Opname)
8. Commit

**Commit 3-6:** Same pattern, one per page.

## 8. Acceptance Criteria

The refactor is "done" when:

1. **No file in `app/src` exceeds 1500 lines** (was 5013, 751, 524, etc.)
2. **All pages still render identically** (visual + behavior, all features working)
3. **`npm run build` succeeds** without errors
4. **`npm test` passes** all existing tests
5. **No new dependencies** added
6. **No new files** outside `app/src/styles/` and `app/src/components/{opname,extract,admin,app3,app4}/`
7. **Each new file** has one clear responsibility (a 30-line component shouldn't be split further; a 150-line component should be considered for further split)
8. **Page composers** are 50-150 lines each
9. **All `wa-*` classes** are still imported via `index.css` (no `@import` directly in component files)

## 9. Out of Scope (explicit non-goals)

- Backend / API changes
- Database schema changes
- Auth flow changes
- Adding new features
- Writing new tests
- Performance optimization beyond CSS
- i18n / multi-language
- Dark mode (current app is light only)
- Custom hooks/utils extraction (Approach C — YAGNI for now)
- Splitting components < 200 lines (trivially small, already focused)

## 10. References

- Spec for previous redesign: `docs/superpowers/specs/2026-06-15-ui-ux-redesign-design.md`
- Plan for previous redesign: `docs/superpowers/plans/2026-06-15-ui-ux-redesign.md`
- Visual mockups: `http://localhost:62774/` (13 mockups listed in spec §15)
- Recent commits: `git log --oneline -17`
