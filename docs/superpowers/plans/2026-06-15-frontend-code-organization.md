# Frontend Code Organization Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `app/src/index.css` from 5013 lines to 6 focused files and split the 5 largest JSX pages (Opname, Extract, Admin, App3, App4) into thin composers with extracted subcomponents — **zero behavior change**.

**Architecture:** Mechanical refactor. Each file split is one atomic commit. No new dependencies. No new tests. Pure file-boundary changes; Vite handles `@import` natively in CSS, and React handles file splitting transparently in JSX.

**Tech Stack:** React 19 + Vite 7 + react-router-dom 7 + lucide-react. Plain global CSS (no modules, no Tailwind, no CSS-in-JS).

---

## File Structure (target)

```
app/src/
├── index.css                              (~25 lines, thin aggregator)
├── styles/                                (NEW directory)
│   ├── tokens.css                         (~70 lines)
│   ├── base.css                           (~30 lines)
│   ├── components.css                     (~600 lines, all .wa-*)
│   ├── pages.css                          (~1500 lines, page-specific)
│   ├── modals.css                         (~600 lines)
│   └── responsive.css                     (~500 lines, all @media)
├── components/
│   ├── opname/                            (NEW directory)
│   │   ├── OpnameContextBar.jsx
│   │   ├── OpnameMetaStrip.jsx
│   │   ├── OpnameActionBar.jsx
│   │   ├── OpnameCollapsibleSection.jsx
│   │   ├── OpnameMobileAssetCards.jsx
│   │   └── OpnameSignatureSection.jsx
│   ├── extract/                           (NEW directory)
│   │   ├── ExtractFilterCard.jsx
│   │   ├── ExtractSummaryTiles.jsx
│   │   ├── ExtractRoomList.jsx
│   │   └── ExtractStickyBar.jsx
│   ├── admin/                             (NEW directory)
│   │   ├── AdminPageHeader.jsx
│   │   ├── AdminTabsBar.jsx
│   │   ├── AdminUsersTab.jsx
│   │   ├── AdminAuditTab.jsx
│   │   ├── AdminBackupTab.jsx
│   │   ├── AdminSystemTab.jsx
│   │   └── AdminUserModal.jsx
│   ├── app3/                              (NEW directory)
│   │   ├── App3Stepper.jsx
│   │   ├── App3PipelineUpload.jsx
│   │   └── App3FilterCards.jsx
│   └── app4/                              (NEW directory)
│       ├── App4CrossVerification.jsx
│       └── App4ProcessButton.jsx
├── pages/
│   ├── OpnamePage.jsx                     (~120 lines composer)
│   ├── ExtractOpnamePage.jsx              (~150 lines composer)
│   ├── AdminPage.jsx                      (~150 lines composer)
│   ├── App3ConsolidationPage.jsx          (~120 lines composer)
│   └── App4RecouncilPage.jsx              (~110 lines composer)
└── (all other files unchanged)
```

**Constraint:** No new files outside `app/src/styles/`, `app/src/components/{opname,extract,admin,app3,app4}/`, and the 5 page files. `components/SignatureSection.jsx` may be deleted in Task 2 (Opname is the only consumer).

---

## Task 1: CSS split — `index.css` → 6 focused files

**Files:**
- Create: `app/src/styles/tokens.css`
- Create: `app/src/styles/base.css`
- Create: `app/src/styles/components.css`
- Create: `app/src/styles/pages.css`
- Create: `app/src/styles/modals.css`
- Create: `app/src/styles/responsive.css`
- Modify: `app/src/index.css` (replace entire content with thin aggregator)

**Commit:** `chore(css): split index.css into styles/{tokens,base,components,pages,modals,responsive}.css`

- [ ] **Step 1: Read the current `index.css` end-to-end to map all sections**

Run: `Read("d:\\Digitalisasi Kertas Kerja APP\\app\\src\\index.css")`

The file has 11 sections in order (by spec):
1. Google Fonts `@import` (line 1)
2. `:root` design tokens (lines 3–70)
3. Reset & base (lines 72–120)
4. `wa-*` component classes (variable range, ~600 lines)
5. Page-specific classes (admin-*, editorial-glass-card, bento-header, stat-card-premium)
6. Modal classes (modal-overlay, modal, mhm-*, bcs-*, sa-*, file-list-item)
7. `@media` queries at the bottom
8. (other utilities)

Note exact line ranges as you read — you'll move them block-by-block.

- [ ] **Step 2: Create `app/src/styles/tokens.css`**

Write the entire `:root { ... }` block from `index.css` lines 3–70 (all CSS variables: cream/charcoal/terracotta/status/typography/spacing/radius/shadows/easing).

Prepend the file with the comment header:
```css
/* === Design Tokens (Warm Atelier) === */
/* All :root CSS variables — colors, type, spacing, motion */
```

- [ ] **Step 3: Create `app/src/styles/base.css`**

Write the reset, body, html, scrollbar, code/pre, #root, app-header legacy rules (from `index.css` lines 72–~120 range, plus the `app-header` legacy block).

Prepend:
```css
/* === Base / Reset === */
/* Universal reset, body baseline, scrollbar, code fonts */
```

- [ ] **Step 4: Create `app/src/styles/components.css`**

Find the section in `index.css` containing all `.wa-*` classes. Move them verbatim. This is the largest CSS file (~600 lines).

Prepend:
```css
/* === wa-* Component Classes === */
/* Warm Atelier component primitives: card, btn, pill, input, table, etc. */
```

- [ ] **Step 5: Create `app/src/styles/pages.css`**

Find page-specific classes that are NOT component-level:
- `.admin-*` family (admin-card, admin-alert, admin-table, admin-callout, admin-loading, admin-table-wrapper, admin-badge, admin-table-tr)
- `.editorial-glass-card`
- `.bento-header`
- `.editor-gloss-card`
- `.stat-card-premium`

Move them verbatim (~1500 lines).

Prepend:
```css
/* === Page-specific Classes === */
/* Per-page layout/legacy classes (admin-*, editorial-glass-card, bento-header) */
```

- [ ] **Step 6: Create `app/src/styles/modals.css`**

Find and move all modal-related classes:
- `.modal-overlay` and overrides
- `.modal` and responsive variants
- `.mhm-*` (MatHistoryModal)
- `.bcs-*` (BarcodeSearchModal)
- `.sa-*` (SaveLoadModal)
- `.file-list-item` (ServerFileBrowser)
- `.preview-modal-*` (PreviewModal)

Move them verbatim (~600 lines).

Prepend:
```css
/* === Modal Classes === */
/* All modal shells, overlays, and per-modal families */
```

- [ ] **Step 7: Create `app/src/styles/responsive.css`**

Find and move every `@media` block, organized by breakpoint. Keep them in source order if possible:
- `@media (min-width: 600px)`
- `@media (min-width: 768px)`
- `@media (min-width: 900px)`
- `@media (min-width: 1024px)`
- `@media (max-width: 767px)`
- `html.plt-capacitor`
- `html.plt-android`
- `.opname-asset-table-wrapper` / `.opname-asset-cards` overrides

Move them verbatim (~500 lines).

Prepend:
```css
/* === Responsive Overrides === */
/* All @media queries, organized by breakpoint */
```

- [ ] **Step 8: Replace `app/src/index.css` with thin aggregator**

Overwrite the entire file. New content:

```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');

@import './styles/tokens.css';
@import './styles/base.css';
@import './styles/components.css';
@import './styles/pages.css';
@import './styles/modals.css';
@import './styles/responsive.css';
```

**CRITICAL:** Do not leave any leftover rules in `index.css` that should have been moved. If unsure, keep a class in `index.css` (it's still served) — better to have duplication than to lose a rule.

- [ ] **Step 9: Verify visual parity in dev**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk proxy npm run dev`

Wait for "Local: http://localhost:5173" message. Open each route:
- `/` (Login)
- `/bento` (Menu)
- `/app1` (Upload)
- `/app2` (Extract)
- `/opname/:roomId` (Opname)
- `/app3` (Consolidation)
- `/app4` (Recouncil)
- `/admin` (Admin)

Expected: all pages render identically to before the split. No missing styles, no broken layouts.

- [ ] **Step 10: Verify build still succeeds**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP\\app" && rtk vite build`

Expected: build completes without errors. (Vite resolves `@import` natively; no special config needed.)

- [ ] **Step 11: Run existing tests**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP\\app" && rtk vitest run`

Expected: all existing tests pass (no test changes needed for CSS split).

- [ ] **Step 12: Commit**

```bash
cd "d:\\Digitalisasi Kertas Kerja APP"
git add app/src/index.css app/src/styles/
git commit -m "chore(css): split index.css into styles/{tokens,base,components,pages,modals,responsive}.css"
```

Expected: 1 commit, 7 files changed, ~5000 lines rebalanced.

---

## Task 2: OpnamePage split — extract 6 subcomponents

**Files:**
- Create: `app/src/components/opname/OpnameContextBar.jsx`
- Create: `app/src/components/opname/OpnameMetaStrip.jsx`
- Create: `app/src/components/opname/OpnameActionBar.jsx`
- Create: `app/src/components/opname/OpnameCollapsibleSection.jsx`
- Create: `app/src/components/opname/OpnameMobileAssetCards.jsx`
- Create: `app/src/components/opname/OpnameSignatureSection.jsx`
- Modify: `app/src/pages/OpnamePage.jsx` (395 → ~120 lines)
- Delete (optional): `app/src/components/SignatureSection.jsx` (Opname is the only consumer)

**Commit:** `refactor(opname): extract OpnameContextBar/MetaStrip/ActionBar/CollapsibleSection/MobileAssetCards/SignatureSection into src/components/opname/`

- [ ] **Step 1: Read `OpnamePage.jsx` in full to map its current structure**

Run: `Read("d:\\Digitalisasi Kertas Kerja APP\\app\\src\\pages\\OpnamePage.jsx")`

Identify the 6 logical sections (per spec §4.1):
1. **ContextBar** — prev/next room + room select + progress ring + dot grid (search for `handlePrevRoom`, `handleNextRoom`, `progress` usage in JSX)
2. **MetaStrip** — 4-column meta card (Ruangan / PIC / Periode / Tanggal) — search for `room.meta`
3. **ActionBar** — Daftar Aset + TEROPNAME + Custom + Save/Load + PDF + Sync buttons
4. **CollapsibleSection** — generic wa-section wrapper (search for repeated `<div className="wa-section">` patterns)
5. **MobileAssetCards** — mobile-only asset card list (search for `opname-asset-cards` CSS class)
6. **SignatureSection** — 3-column signature grid (currently uses `<SignatureSection>` import from `components/`)

- [ ] **Step 2: Create `OpnameContextBar.jsx`**

Path: `app/src/components/opname/OpnameContextBar.jsx`

```jsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Top bar of OpnamePage: room navigation, select, progress ring, dot grid.
 * @param {Object} props
 * @param {Object} props.room - Current room object (room.meta, room.assets, etc.)
 * @param {number} props.roomIdx - Current room index
 * @param {number} props.totalRooms - Total number of rooms
 * @param {Function} props.onPrev - () => void
 * @param {Function} props.onNext - () => void
 * @param {Function} props.onSelectRoom - (idx: number) => void
 * @param {{ checked: number, total: number, pct: number }} props.progress
 * @param {Array<{ checked: number, total: number }>} props.overallProgress
 */
export default function OpnameContextBar({
    room, roomIdx, totalRooms, onPrev, onNext, onSelectRoom, progress, overallProgress
}) {
    return (
        <div className="wa-section">
            {/* ... extracted JSX from OpnamePage for context bar ... */}
        </div>
    );
}
```

Fill the body with the actual JSX extracted from `OpnamePage.jsx` (do not paraphrase — copy verbatim, just change variable references to props).

- [ ] **Step 3: Create `OpnameMetaStrip.jsx`**

Path: `app/src/components/opname/OpnameMetaStrip.jsx`

```jsx
/**
 * 4-column meta strip showing room meta (Ruangan / PIC / Periode / Tanggal).
 * @param {Object} props
 * @param {Object} props.meta - room.meta (roomName, pic, periode, tanggal, etc.)
 * @param {string} props.sheetName - room.sheetName (fallback)
 */
export default function OpnameMetaStrip({ meta, sheetName }) {
    return (
        <div className="opname-meta-strip">
            {/* 4-column grid: Ruangan, PIC, Periode, Tanggal */}
        </div>
    );
}
```

- [ ] **Step 4: Create `OpnameActionBar.jsx`**

Path: `app/src/components/opname/OpnameActionBar.jsx`

```jsx
import { FileDown, FilePlus, MapPin, List, PenTool, UploadCloud, Search, Save } from 'lucide-react';

/**
 * Action button bar: Daftar Aset, TEROPNAME, Custom Room, Save/Load, PDF, Sync.
 * @param {Object} props
 * @param {boolean} props.generating
 * @param {boolean} props.isSyncing
 * @param {Function} props.onCustomRoom
 * @param {Function} props.onSaveLoad
 * @param {Function} props.onGenerateCurrentPDF
 * @param {Function} props.onGenerateAllPDFs
 * @param {Function} props.onNetworkSync
 * @param {Function} props.onToggleSearch
 */
export default function OpnameActionBar({
    generating, isSyncing, onCustomRoom, onSaveLoad,
    onGenerateCurrentPDF, onGenerateAllPDFs, onNetworkSync, onToggleSearch
}) {
    return (
        <div className="opname-action-bar">
            {/* button row */}
        </div>
    );
}
```

- [ ] **Step 5: Create `OpnameCollapsibleSection.jsx`**

Path: `app/src/components/opname/OpnameCollapsibleSection.jsx`

```jsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Generic wa-section wrapper with collapsible header strip.
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {boolean} props.defaultOpen
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.headerRight]
 */
export default function OpnameCollapsibleSection({ title, subtitle, defaultOpen = true, children, headerRight }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <section className="wa-section">
            <header className="wa-section-header" onClick={() => setOpen(o => !o)}>
                <div>
                    <h3>{title}</h3>
                    {subtitle && <p className="wa-section-subtitle">{subtitle}</p>}
                </div>
                <div className="wa-section-header-right">
                    {headerRight}
                    <ChevronDown className={open ? 'rotated' : ''} size={18} />
                </div>
            </header>
            {open && <div className="wa-section-body">{children}</div>}
        </section>
    );
}
```

- [ ] **Step 6: Create `OpnameMobileAssetCards.jsx`**

Path: `app/src/components/opname/OpnameMobileAssetCards.jsx`

```jsx
import AssetTable from '../AssetTable';

/**
 * Mobile-only asset card list (CSS class `.opname-asset-cards`).
 * Falls back to AssetTable on desktop.
 * @param {Object} props
 * @param {Array} props.assets
 * @param {Function} props.onToggle
 * @param {Function} props.onUpdateField
 */
export default function OpnameMobileAssetCards({ assets, onToggle, onUpdateField }) {
    return (
        <div className="opname-asset-cards">
            {assets.map(asset => (
                <div key={asset.id || asset.barcode} className="opname-asset-card">
                    {/* card body */}
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 7: Create `OpnameSignatureSection.jsx`**

Path: `app/src/components/opname/OpnameSignatureSection.jsx`

```jsx
import SignaturePad from '../SignaturePad';

/**
 * 3-column signature grid for OpnamePage.
 * @param {Object} props
 * @param {Object} props.signatures - { field1: dataURL, field2: dataURL, field3: dataURL }
 * @param {string[]} props.labels - 3 labels for each signature column
 * @param {Function} props.onChange - (slot: number, dataURL: string) => void
 */
export default function OpnameSignatureSection({ signatures, labels, onChange }) {
    return (
        <div className="opname-signature-grid">
            {[0, 1, 2].map(i => (
                <div key={i} className="opname-signature-cell">
                    <span className="form-label">{labels[i]}</span>
                    <SignaturePad
                        value={signatures[i] || null}
                        onChange={(dataURL) => onChange(i, dataURL)}
                    />
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 8: Rewrite `OpnamePage.jsx` as thin composer**

Replace the body of `OpnamePage()` (everything after the `useState` declarations and handlers) with imports + composition:

```jsx
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import { saveRoomPDF, generateAndSaveAllPDFs } from '../utils/pdfGenerator';
import { apiUrl, fetchWithAuth } from '../utils/apiConfig';

import OpnameContextBar from '../components/opname/OpnameContextBar';
import OpnameMetaStrip from '../components/opname/OpnameMetaStrip';
import OpnameActionBar from '../components/opname/OpnameActionBar';
import OpnameCollapsibleSection from '../components/opname/OpnameCollapsibleSection';
import OpnameMobileAssetCards from '../components/opname/OpnameMobileAssetCards';
import OpnameSignatureSection from '../components/opname/OpnameSignatureSection';

import CustomRoomModal from '../components/CustomRoomModal';
import SaveLoadModal from '../components/SaveLoadModal';
import AssetTable from '../components/AssetTable';
import NoBarcodeSection from '../components/NoBarcodeSection';
import NotAtLocationSection from '../components/NotAtLocationSection';

export default function OpnamePage() {
    // ... ALL existing useState, useCallback, useMemo, handlers stay here ...
    // (copy from current OpnamePage.jsx, do NOT delete any state/handlers)

    return (
        <div className="wa-page app-body">
            <OpnameContextBar
                room={room} roomIdx={roomIdx} totalRooms={state.rooms.length}
                onPrev={handlePrevRoom} onNext={handleNextRoom} onSelectRoom={setRoomIndex}
                progress={progress} overallProgress={overallProgress}
            />
            <OpnameMetaStrip meta={room?.meta} sheetName={room?.sheetName} />
            <OpnameActionBar
                generating={generating} isSyncing={isSyncing}
                onCustomRoom={() => setIsCustomModalOpen(true)}
                onSaveLoad={() => setIsSaveModalOpen(true)}
                onGenerateCurrentPDF={handleGenerateCurrentPDF}
                onGenerateAllPDFs={handleGenerateAllPDFs}
                onNetworkSync={handleNetworkSync}
                onToggleSearch={() => setSearchQuery(q => q === '' ? 'open' : '')}
            />
            {/* the rest of the render tree, using OpnameCollapsibleSection for wa-section wrappers,
                OpnameMobileAssetCards for mobile, OpnameSignatureSection for signatures */}
        </div>
    );
}
```

**Constraint:** DO NOT remove any `useState`/`useCallback`/`useMemo`/handlers. Only the JSX body of `return (...)` gets replaced with composition.

- [ ] **Step 9: Verify `OpnamePage.jsx` line count is now ~120 lines**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk wc -l app/src/pages/OpnamePage.jsx`

Expected: between 100 and 160 lines. If higher, you forgot to move JSX blocks out.

- [ ] **Step 10: Delete `components/SignatureSection.jsx` (Opname is the only consumer)**

Run: `Grep("SignatureSection", "app/src")` to confirm Opname is the only file referencing it.

If confirmed:
```bash
cd "d:\\Digitalisasi Kertas Kerja APP"
rm app/src/components/SignatureSection.jsx
```

Update `OpnameSignatureSection.jsx` (already created) to NOT import the deleted file — it should import `SignaturePad` directly (already done in Step 7).

- [ ] **Step 11: Verify behavior in dev**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk proxy npm run dev`

Open `/opname/<any-room>`. Check:
- Context bar (prev/next, progress, dot grid) renders
- Meta strip (4 columns) renders
- Action bar (all 6 buttons) renders
- Collapsible sections toggle
- Mobile asset cards render in mobile viewport (DevTools)
- Signature section renders 3 columns
- Save/Load modal opens
- Custom Room modal opens
- All existing handlers work (toggle check, generate PDF, sync)

Expected: identical behavior to before. Only file boundaries changed.

- [ ] **Step 12: Verify build + tests pass**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP\\app" && rtk vite build && rtk vitest run`

Expected: build succeeds, all tests pass.

- [ ] **Step 13: Commit**

```bash
cd "d:\\Digitalisasi Kertas Kerja APP"
git add app/src/components/opname/ app/src/pages/OpnamePage.jsx
git rm app/src/components/SignatureSection.jsx  # only if Step 10 deleted it
git commit -m "refactor(opname): extract 6 subcomponents into src/components/opname/, slim page composer to ~120 lines"
```

Expected: 7 files added, 1 modified, optionally 1 deleted. `git diff --stat HEAD~1` shows OpnamePage shrinking by ~270 lines.

---

## Task 3: ExtractOpnamePage split — extract 4 subcomponents

**Files:**
- Create: `app/src/components/extract/ExtractFilterCard.jsx`
- Create: `app/src/components/extract/ExtractSummaryTiles.jsx`
- Create: `app/src/components/extract/ExtractRoomList.jsx`
- Create: `app/src/components/extract/ExtractStickyBar.jsx`
- Modify: `app/src/pages/ExtractOpnamePage.jsx` (524 → ~150 lines)

**Commit:** `refactor(extract): split ExtractOpnamePage into FilterCard/SummaryTiles/RoomList/StickyBar`

- [ ] **Step 1: Read `ExtractOpnamePage.jsx` in full and map its 4 sections**

Run: `Read("d:\\Digitalisasi Kertas Kerja APP\\app\\src\\pages\\ExtractOpnamePage.jsx")`

Identify:
1. **FilterCard** — 2 dropdowns + master data upload row + Sinkronisasi button (search for "Sinkronisasi" string)
2. **SummaryTiles** — 4 summary cards (Total / Scan / Tidak / Salah) — search for repeated `<div className="stat-card-premium">`
3. **RoomList** — expandable room rows + Preview button (search for `expanded` state and room iteration)
4. **StickyBar** — sticky bottom action bar with "Export Semua Excel" (search for "Export" button and position: sticky)

- [ ] **Step 2: Create `ExtractFilterCard.jsx`**

Path: `app/src/components/extract/ExtractFilterCard.jsx`

```jsx
import { UploadCloud } from 'lucide-react';

/**
 * Top filter card: dropdowns + master data upload + Sinkronisasi button.
 * @param {Object} props
 * @param {string} props.selectedCategory
 * @param {Function} props.onCategoryChange
 * @param {string} props.selectedRoom
 * @param {Function} props.onRoomChange
 * @param {Array} props.categories
 * @param {Array} props.rooms
 * @param {Function} props.onUploadMaster
 * @param {Function} props.onSync
 * @param {boolean} props.syncing
 */
export default function ExtractFilterCard({ /* props */ }) {
    return (
        <div className="wa-section extract-filter-card">
            {/* filter JSX */}
        </div>
    );
}
```

- [ ] **Step 3: Create `ExtractSummaryTiles.jsx`**

Path: `app/src/components/extract/ExtractSummaryTiles.jsx`

```jsx
/**
 * 4 summary tiles: Total / Scan / Tidak / Salah.
 * @param {Object} props
 * @param {{ total: number, scan: number, tidak: number, salah: number }} props.summary
 */
export default function ExtractSummaryTiles({ summary }) {
    const tiles = [
        { label: 'Total', value: summary.total, color: 'var(--charcoal-900)' },
        { label: 'Scan', value: summary.scan, color: 'var(--success-500)' },
        { label: 'Tidak', value: summary.tidak, color: 'var(--warning-500)' },
        { label: 'Salah', value: summary.salah, color: 'var(--danger-500)' },
    ];
    return (
        <div className="extract-summary-tiles">
            {tiles.map(t => (
                <div key={t.label} className="stat-card-premium">
                    <span className="stat-label">{t.label}</span>
                    <span className="stat-value" style={{ color: t.color }}>{t.value}</span>
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 4: Create `ExtractRoomList.jsx`**

Path: `app/src/components/extract/ExtractRoomList.jsx`

```jsx
import { useState } from 'react';
import { ChevronDown, FileDown } from 'lucide-react';

/**
 * Expandable room rows with Preview button per row.
 * @param {Object} props
 * @param {Array} props.rooms
 * @param {Function} props.onPreview - (roomId: string) => void
 */
export default function ExtractRoomList({ rooms, onPreview }) {
    const [expandedId, setExpandedId] = useState(null);
    return (
        <div className="extract-room-list">
            {rooms.map(room => (
                <div key={room.id} className="wa-section">
                    <header onClick={() => setExpandedId(id => id === room.id ? null : room.id)}>
                        <span>{room.name}</span>
                        <div>
                            <button onClick={(e) => { e.stopPropagation(); onPreview(room.id); }}>
                                <FileDown size={16} /> Preview
                            </button>
                            <ChevronDown className={expandedId === room.id ? 'rotated' : ''} />
                        </div>
                    </header>
                    {expandedId === room.id && <div>{/* expanded content */}</div>}
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 5: Create `ExtractStickyBar.jsx`**

Path: `app/src/components/extract/ExtractStickyBar.jsx`

```jsx
import { Download } from 'lucide-react';

/**
 * Sticky bottom action bar with "Export Semua Excel" button.
 * @param {Object} props
 * @param {Function} props.onExportAll
 * @param {boolean} props.exporting
 * @param {boolean} props.disabled
 */
export default function ExtractStickyBar({ onExportAll, exporting, disabled }) {
    return (
        <div className="extract-sticky-bar">
            <button
                className="wa-btn wa-btn-terracotta"
                onClick={onExportAll}
                disabled={disabled || exporting}
            >
                <Download size={16} /> {exporting ? 'Mengekspor...' : 'Export Semua Excel'}
            </button>
        </div>
    );
}
```

- [ ] **Step 6: Rewrite `ExtractOpnamePage.jsx` as thin composer**

Replace the JSX body (everything inside `return (...)`) with composition of the 4 subcomponents. **Keep all `useState`/`useEffect`/handlers** in the page.

```jsx
import ExtractFilterCard from '../components/extract/ExtractFilterCard';
import ExtractSummaryTiles from '../components/extract/ExtractSummaryTiles';
import ExtractRoomList from '../components/extract/ExtractRoomList';
import ExtractStickyBar from '../components/extract/ExtractStickyBar';
import '../extract-opname.css';

export default function ExtractOpnamePage() {
    // ... all existing state + handlers stay ...

    return (
        <div className="wa-page app-body extract-opname-page">
            <ExtractFilterCard /* ... */ />
            <ExtractSummaryTiles summary={summary} />
            <ExtractRoomList rooms={filteredRooms} onPreview={handlePreview} />
            <ExtractStickyBar
                onExportAll={handleExportAll}
                exporting={exporting}
                disabled={!filteredRooms.length}
            />
        </div>
    );
}
```

- [ ] **Step 7: Verify line count is ~150 lines**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk wc -l app/src/pages/ExtractOpnamePage.jsx`

Expected: 130–180 lines.

- [ ] **Step 8: Verify behavior in dev**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk proxy npm run dev`

Open `/app2` (Extract). Check:
- Filter card with 2 dropdowns renders
- Sinkronisasi button works
- 4 summary tiles update
- Room list expands/collapses
- Preview button works
- Sticky bar with Export Semua Excel renders at bottom

Expected: identical behavior.

- [ ] **Step 9: Verify build + tests**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP\\app" && rtk vite build && rtk vitest run`

Expected: build + tests pass.

- [ ] **Step 10: Commit**

```bash
cd "d:\\Digitalisasi Kertas Kerja APP"
git add app/src/components/extract/ app/src/pages/ExtractOpnamePage.jsx
git commit -m "refactor(extract): split ExtractOpnamePage into FilterCard/SummaryTiles/RoomList/StickyBar"
```

---

## Task 4: AdminPage split — extract 7 subcomponents

**Files:**
- Create: `app/src/components/admin/AdminPageHeader.jsx`
- Create: `app/src/components/admin/AdminTabsBar.jsx`
- Create: `app/src/components/admin/AdminUsersTab.jsx`
- Create: `app/src/components/admin/AdminAuditTab.jsx`
- Create: `app/src/components/admin/AdminBackupTab.jsx`
- Create: `app/src/components/admin/AdminSystemTab.jsx`
- Create: `app/src/components/admin/AdminUserModal.jsx`
- Modify: `app/src/pages/AdminPage.jsx` (751 → ~150 lines)

**Commit:** `refactor(admin): split AdminPage into PageHeader/TabsBar/UsersTab/AuditTab/BackupTab/SystemTab/UserModal`

- [ ] **Step 1: Read `AdminPage.jsx` in full and identify the 7 sections**

Run: `Read("d:\\Digitalisasi Kertas Kerja APP\\app\\src\\pages\\AdminPage.jsx")`

Sections to find (search for these strings):
1. **PageHeader** — `Link to="/bento"` + admin status pill (search for `ArrowLeft` icon)
2. **TabsBar** — 4-tab strip with `activeTab` state (search for `setActiveTab`)
3. **UsersTab** — Add user form + users table with role pills (search for `formData`, `users` state)
4. **AuditTab** — audit log table + filter + pagination (search for `auditLogs`, `auditFilters`)
5. **BackupTab** — backup create + list (search for `backups` state)
6. **SystemTab** — system info grid (search for `systemInfo` state)
7. **UserModal** — edit/add user modal (search for `isEditing` and modal pattern)

- [ ] **Step 2: Create `AdminPageHeader.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldPlus } from 'lucide-react';

/**
 * Slim admin header with back link + admin status pill.
 * @param {Object} props
 * @param {string} props.username
 */
export default function AdminPageHeader({ username }) {
    return (
        <header className="wa-section admin-page-header">
            <Link to="/bento" className="wa-btn wa-btn-ghost">
                <ArrowLeft size={16} /> Menu
            </Link>
            <h1>Admin Panel</h1>
            <span className="role-pill role-pill-admin">
                <ShieldPlus size={14} /> {username}
            </span>
        </header>
    );
}
```

- [ ] **Step 3: Create `AdminTabsBar.jsx`**

```jsx
import { Users, Activity, Database, Settings2 } from 'lucide-react';

const TABS = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'audit', label: 'Audit', icon: Activity },
    { id: 'backup', label: 'Backup', icon: Database },
    { id: 'system', label: 'System', icon: Settings2 },
];

/**
 * 4-tab strip with wa-tab classes.
 * @param {Object} props
 * @param {string} props.activeTab
 * @param {Function} props.onChange
 */
export default function AdminTabsBar({ activeTab, onChange }) {
    return (
        <div className="wa-tabs admin-tabs">
            {TABS.map(t => {
                const Icon = t.icon;
                return (
                    <button
                        key={t.id}
                        className={`wa-tab ${activeTab === t.id ? 'active' : ''}`}
                        onClick={() => onChange(t.id)}
                    >
                        <Icon size={16} /> {t.label}
                    </button>
                );
            })}
        </div>
    );
}
```

- [ ] **Step 4: Create `AdminUsersTab.jsx`**

This is the largest of the admin tabs (~210 lines). Move:
- Add user form (username, password, role, access checkboxes)
- Users table (with toggles, role pills, edit/delete actions)

```jsx
import { useState } from 'react';
import { UserPlus, Trash2, KeySquare, ShieldPlus, Save, X } from 'lucide-react';

/**
 * Users tab: add user form + users table.
 * @param {Object} props
 * @param {Array} props.users
 * @param {Function} props.onAddUser
 * @param {Function} props.onUpdateUser
 * @param {Function} props.onDeleteUser
 * @param {Function} props.onToggleAccess
 */
export default function AdminUsersTab({ users, onAddUser, onUpdateUser, onDeleteUser, onToggleAccess }) {
    // ... moved state + JSX from AdminPage ...
    return (
        <div className="wa-section admin-users-tab">
            {/* form + table */}
        </div>
    );
}
```

- [ ] **Step 5: Create `AdminAuditTab.jsx`**

```jsx
import { useState } from 'react';
import { Search as SearchIcon, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

/**
 * Audit log table with filter + pagination.
 * @param {Object} props
 * @param {Array} props.logs
 * @param {Object} props.filters
 * @param {Object} props.pagination
 * @param {Function} props.onFilterChange
 * @param {Function} props.onPageChange
 * @param {Function} props.onViewLog
 */
export default function AdminAuditTab({ logs, filters, pagination, onFilterChange, onPageChange, onViewLog }) {
    // ... moved state + JSX ...
    return (
        <div className="wa-section admin-audit-tab">
            {/* filter bar + log table + pagination */}
        </div>
    );
}
```

- [ ] **Step 6: Create `AdminBackupTab.jsx`**

```jsx
import { Download, UploadCloud, HardDrive } from 'lucide-react';

/**
 * Backup tab: create backup + list of existing backups.
 * @param {Object} props
 * @param {Array} props.backups
 * @param {Function} props.onCreate
 * @param {Function} props.onDownload
 * @param {boolean} props.creating
 */
export default function AdminBackupTab({ backups, onCreate, onDownload, creating }) {
    return (
        <div className="wa-section admin-backup-tab">
            <button className="wa-btn wa-btn-terracotta" onClick={onCreate} disabled={creating}>
                <HardDrive size={16} /> {creating ? 'Membuat...' : 'Buat Backup'}
            </button>
            <table className="wa-table">
                {/* backups list */}
            </table>
        </div>
    );
}
```

- [ ] **Step 7: Create `AdminSystemTab.jsx`**

```jsx
import { Server, Clock, Activity } from 'lucide-react';

/**
 * System info grid: server status, uptime, db info.
 * @param {Object} props
 * @param {Object} props.systemInfo
 */
export default function AdminSystemTab({ systemInfo }) {
    if (!systemInfo) return <div className="wa-section">Loading...</div>;
    return (
        <div className="wa-section admin-system-tab">
            <div className="admin-info-grid">
                <div><Server size={14} /> Server: {systemInfo.server}</div>
                <div><Clock size={14} /> Uptime: {systemInfo.uptime}</div>
                <div><Activity size={14} /> Status: {systemInfo.status}</div>
            </div>
        </div>
    );
}
```

- [ ] **Step 8: Create `AdminUserModal.jsx`**

```jsx
import { X, Save } from 'lucide-react';

/**
 * Add/Edit user modal — extracted from AdminPage's inline modal.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Object} props.user - { username, password, role, access }
 * @param {Function} props.onChange
 * @param {Function} props.onSave
 * @param {Function} props.onClose
 * @param {boolean} props.isEditing
 */
export default function AdminUserModal({ open, user, onChange, onSave, onClose, isEditing }) {
    if (!open) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <header>
                    <h3>{isEditing ? 'Edit User' : 'Tambah User'}</h3>
                    <button onClick={onClose}><X size={18} /></button>
                </header>
                <div className="modal-body">
                    <input className="wa-input" placeholder="Username" value={user.username}
                        onChange={(e) => onChange({ ...user, username: e.target.value })} />
                    <input className="wa-input" type="password" placeholder="Password" value={user.password}
                        onChange={(e) => onChange({ ...user, password: e.target.value })} />
                    <select className="wa-select" value={user.role}
                        onChange={(e) => onChange({ ...user, role: e.target.value })}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <footer>
                    <button className="wa-btn wa-btn-terracotta" onClick={onSave}>
                        <Save size={16} /> Simpan
                    </button>
                </footer>
            </div>
        </div>
    );
}
```

- [ ] **Step 9: Rewrite `AdminPage.jsx` as thin composer**

Keep ALL state and handlers in the page. Replace the `return (...)` body with composition:

```jsx
import AdminPageHeader from '../components/admin/AdminPageHeader';
import AdminTabsBar from '../components/admin/AdminTabsBar';
import AdminUsersTab from '../components/admin/AdminUsersTab';
import AdminAuditTab from '../components/admin/AdminAuditTab';
import AdminBackupTab from '../components/admin/AdminBackupTab';
import AdminSystemTab from '../components/admin/AdminSystemTab';
import AdminUserModal from '../components/admin/AdminUserModal';

export default function AdminPage() {
    // ... all state + handlers (fetchUsers, fetchAuditLogs, etc.) stay here ...

    return (
        <div className="wa-page app-body">
            <AdminPageHeader username={/* from auth context */} />
            <AdminTabsBar activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'users' && <AdminUsersTab /* ...props */ />}
            {activeTab === 'audit' && <AdminAuditTab /* ...props */ />}
            {activeTab === 'backup' && <AdminBackupTab /* ...props */ />}
            {activeTab === 'system' && <AdminSystemTab systemInfo={systemInfo} />}
            <AdminUserModal
                open={isEditing}
                user={formData}
                isEditing={isEditing}
                onChange={setFormData}
                onSave={handleSaveUser}
                onClose={() => setIsEditing(false)}
            />
            {success && <div className="admin-alert success">{success}</div>}
            {error && <div className="admin-alert error">{error}</div>}
        </div>
    );
}
```

- [ ] **Step 10: Verify line count is ~150 lines**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk wc -l app/src/pages/AdminPage.jsx`

Expected: 130–200 lines.

- [ ] **Step 11: Verify behavior in dev**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk proxy npm run dev`

Open `/admin`. Test each tab:
- Users: add user, edit user (modal opens), delete user, toggle access
- Audit: filter, paginate, view log details
- Backup: create, list, download
- System: shows server info

Expected: identical behavior.

- [ ] **Step 12: Verify build + tests**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP\\app" && rtk vite build && rtk vitest run`

- [ ] **Step 13: Commit**

```bash
cd "d:\\Digitalisasi Kertas Kerja APP"
git add app/src/components/admin/ app/src/pages/AdminPage.jsx
git commit -m "refactor(admin): split AdminPage into PageHeader/TabsBar/UsersTab/AuditTab/BackupTab/SystemTab/UserModal"
```

---

## Task 5: App3ConsolidationPage split — extract 3 subcomponents

**Files:**
- Create: `app/src/components/app3/App3Stepper.jsx`
- Create: `app/src/components/app3/App3PipelineUpload.jsx`
- Create: `app/src/components/app3/App3FilterCards.jsx`
- Modify: `app/src/pages/App3ConsolidationPage.jsx` (391 → ~120 lines)

**Commit:** `refactor(app3): split App3ConsolidationPage into Stepper/PipelineUpload/FilterCards`

- [ ] **Step 1: Read `App3ConsolidationPage.jsx` in full and map its 3 sections**

Identify:
1. **Stepper** — 3-step visual (wa-step classes)
2. **PipelineUpload** — 4 upload slots (wa-zone) + extract filter button + extract result table
3. **FilterCards** — 5-card filter grid (ICT/ENG/BAT/HRGA/Kosong) + live summary + process button

- [ ] **Step 2: Create `App3Stepper.jsx`**

```jsx
import { CheckCircle2, Circle } from 'lucide-react';

const STEPS = [
    { id: 1, label: 'Pipeline' },
    { id: 2, label: 'Filter' },
    { id: 3, label: 'Process' },
];

/**
 * 3-step stepper visual.
 * @param {Object} props
 * @param {number} props.currentStep - 1, 2, or 3
 */
export default function App3Stepper({ currentStep }) {
    return (
        <div className="wa-stepper app3-stepper">
            {STEPS.map((s, i) => (
                <div key={s.id} className={`wa-step ${currentStep >= s.id ? 'active' : ''} ${currentStep > s.id ? 'done' : ''}`}>
                    <span className="step-num">
                        {currentStep > s.id ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </span>
                    <span className="step-label">{s.label}</span>
                    {i < STEPS.length - 1 && <span className="step-line" />}
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 3: Create `App3PipelineUpload.jsx`**

```jsx
import { UploadCloud } from 'lucide-react';

/**
 * 4 upload slots + extract filter button + extract result table.
 * @param {Object} props
 * @param {Object} props.slots - { ict: File, eng: File, bat: File, hrga: File }
 * @param {Function} props.onUpload - (slotId: string, file: File) => void
 * @param {Function} props.onExtract
 * @param {boolean} props.extracting
 * @param {Array} props.extractResult
 */
export default function App3PipelineUpload({ slots, onUpload, onExtract, extracting, extractResult }) {
    const SLOT_IDS = ['ict', 'eng', 'bat', 'hrga'];
    return (
        <div className="wa-section app3-pipeline">
            <div className="app3-upload-grid">
                {SLOT_IDS.map(id => (
                    <div key={id} className="wa-zone">
                        <UploadCloud size={20} />
                        <span>{id.toUpperCase()}</span>
                        <input type="file" onChange={(e) => onUpload(id, e.target.files[0])} />
                        {slots[id] && <small>{slots[id].name}</small>}
                    </div>
                ))}
            </div>
            <button className="wa-btn wa-btn-terracotta" onClick={onExtract} disabled={extracting}>
                {extracting ? 'Mengekstrak...' : 'Ekstrak'}
            </button>
            {extractResult.length > 0 && (
                <table className="wa-table">
                    {/* extract result rows */}
                </table>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Create `App3FilterCards.jsx`**

```jsx
import { useState } from 'react';

/**
 * 5-card filter grid (ICT/ENG/BAT/HRGA/Kosong) + live summary + process button.
 * @param {Object} props
 * @param {Object} props.counts - { ict: number, eng: number, bat: number, hrga: number, kosong: number }
 * @param {Function} props.onProcess
 * @param {boolean} props.processing
 */
export default function App3FilterCards({ counts, onProcess, processing }) {
    const CARDS = [
        { id: 'ict', label: 'ICT', color: 'var(--terracotta-500)' },
        { id: 'eng', label: 'ENG', color: 'var(--charcoal-700)' },
        { id: 'bat', label: 'BAT', color: 'var(--success-500)' },
        { id: 'hrga', label: 'HRGA', color: 'var(--warning-500)' },
        { id: 'kosong', label: 'Kosong', color: 'var(--danger-500)' },
    ];
    return (
        <div className="wa-section app3-filter-cards">
            <div className="app3-card-grid">
                {CARDS.map(c => (
                    <div key={c.id} className="app3-filter-card">
                        <span className="card-label">{c.label}</span>
                        <span className="card-count" style={{ color: c.color }}>{counts[c.id] || 0}</span>
                    </div>
                ))}
            </div>
            <button className="wa-btn wa-btn-terracotta" onClick={onProcess} disabled={processing}>
                {processing ? 'Memproses...' : 'Proses Konsolidasi'}
            </button>
        </div>
    );
}
```

- [ ] **Step 5: Rewrite `App3ConsolidationPage.jsx` as thin composer**

```jsx
import App3Stepper from '../components/app3/App3Stepper';
import App3PipelineUpload from '../components/app3/App3PipelineUpload';
import App3FilterCards from '../components/app3/App3FilterCards';

export default function App3ConsolidationPage() {
    // ... all state + handlers stay ...

    return (
        <div className="wa-page app-body">
            <App3Stepper currentStep={currentStep} />
            {currentStep === 1 && <App3PipelineUpload /* ... */ />}
            {currentStep === 2 && <App3FilterCards /* ... */ />}
            {currentStep === 3 && <div>/* results */</div>}
        </div>
    );
}
```

- [ ] **Step 6: Verify line count is ~120 lines**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk wc -l app/src/pages/App3ConsolidationPage.jsx`

Expected: 100–150 lines.

- [ ] **Step 7: Verify behavior in dev**

Open `/app3`. Check:
- Stepper shows 3 steps with current highlighted
- Pipeline step: 4 upload zones work, extract button works
- Filter step: 5 cards show counts, process button works

Expected: identical behavior.

- [ ] **Step 8: Verify build + tests**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP\\app" && rtk vite build && rtk vitest run`

- [ ] **Step 9: Commit**

```bash
cd "d:\\Digitalisasi Kertas Kerja APP"
git add app/src/components/app3/ app/src/pages/App3ConsolidationPage.jsx
git commit -m "refactor(app3): split App3ConsolidationPage into Stepper/PipelineUpload/FilterCards"
```

---

## Task 6: App4RecouncilPage split — extract 2 subcomponents

**Files:**
- Create: `app/src/components/app4/App4CrossVerification.jsx`
- Create: `app/src/components/app4/App4ProcessButton.jsx`
- Modify: `app/src/pages/App4RecouncilPage.jsx` (287 → ~110 lines)

**Commit:** `refactor(app4): split App4RecouncilPage into CrossVerification/ProcessButton`

- [ ] **Step 1: Read `App4RecouncilPage.jsx` in full and map its 2 sections**

Identify:
1. **CrossVerification** — 3 upload zones + divider + opsional badge
2. **ProcessButton** — "Proses Recouncil" button

- [ ] **Step 2: Create `App4CrossVerification.jsx`**

```jsx
import { UploadCloud } from 'lucide-react';

const ZONES = [
    { id: 'master', label: 'Master Data', required: true },
    { id: 'app1', label: 'APP1 Upload', required: true },
    { id: 'opsional', label: 'Opsional', required: false },
];

/**
 * 3 upload zones for cross-verification.
 * @param {Object} props
 * @param {Object} props.files - { master: File, app1: File, opsional: File }
 * @param {Function} props.onUpload - (zoneId: string, file: File) => void
 */
export default function App4CrossVerification({ files, onUpload }) {
    return (
        <div className="wa-section app4-cross-verification">
            {ZONES.map((z, i) => (
                <div key={z.id} className="wa-zone">
                    {i === 1 && <div className="divider" />}
                    <UploadCloud size={20} />
                    <span>{z.label}</span>
                    {!z.required && <span className="badge-opsional">Opsional</span>}
                    <input type="file" onChange={(e) => onUpload(z.id, e.target.files[0])} />
                    {files[z.id] && <small>{files[z.id].name}</small>}
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 3: Create `App4ProcessButton.jsx`**

```jsx
import { Activity } from 'lucide-react';

/**
 * Proses Recouncil button.
 * @param {Object} props
 * @param {Function} props.onClick
 * @param {boolean} props.processing
 * @param {boolean} props.disabled
 */
export default function App4ProcessButton({ onClick, processing, disabled }) {
    return (
        <button
            className="wa-btn wa-btn-terracotta app4-process-btn"
            onClick={onClick}
            disabled={disabled || processing}
        >
            <Activity size={16} /> {processing ? 'Memproses...' : 'Proses Recouncil'}
        </button>
    );
}
```

- [ ] **Step 4: Rewrite `App4RecouncilPage.jsx` as thin composer**

```jsx
import App4CrossVerification from '../components/app4/App4CrossVerification';
import App4ProcessButton from '../components/app4/App4ProcessButton';

export default function App4RecouncilPage() {
    // ... all state + handlers stay ...

    return (
        <div className="wa-page app-body">
            <App4CrossVerification files={files} onUpload={handleUpload} />
            <App4ProcessButton
                onClick={handleProcess}
                processing={processing}
                disabled={!files.master || !files.app1}
            />
            {/* result display */}
        </div>
    );
}
```

- [ ] **Step 5: Verify line count is ~110 lines**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk wc -l app/src/pages/App4RecouncilPage.jsx`

Expected: 90–140 lines.

- [ ] **Step 6: Verify behavior in dev**

Open `/app4`. Check:
- 3 upload zones render (master, app1, opsional with badge)
- Upload to each works
- Process button enabled only when master + app1 uploaded
- Process button shows processing state

Expected: identical behavior.

- [ ] **Step 7: Verify build + tests**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP\\app" && rtk vite build && rtk vitest run`

- [ ] **Step 8: Commit**

```bash
cd "d:\\Digitalisasi Kertas Kerja APP"
git add app/src/components/app4/ app/src/pages/App4RecouncilPage.jsx
git commit -m "refactor(app4): split App4RecouncilPage into CrossVerification/ProcessButton"
```

---

## Task 7: Final verification — all 9 acceptance criteria

- [ ] **Step 1: Verify no file in `app/src` exceeds 1500 lines**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk find app/src -name "*.jsx" -o -name "*.css" -o -name "*.js" | xargs wc -l | sort -rn | head -20`

Expected: largest file ≤ 1500 lines (likely `pages.css` or `components.css`).

- [ ] **Step 2: Verify all pages render identically**

Re-open every route in dev (`rtk proxy npm run dev`):
- `/` Login
- `/bento` Menu
- `/app1` Upload
- `/app2` Extract
- `/opname/:roomId` Opname
- `/app3` Consolidation
- `/app4` Recouncil
- `/admin` Admin

Check each: layout, colors, animations, all features functional. No visual regression.

- [ ] **Step 3: Verify `npm run build` succeeds**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP\\app" && rtk vite build`

Expected: build completes without errors.

- [ ] **Step 4: Verify `npm test` passes**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP\\app" && rtk vitest run`

Expected: all existing tests pass (no test changes were made).

- [ ] **Step 5: Verify no new dependencies**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && git diff HEAD~7 HEAD -- app/package.json`

Expected: empty diff (no package.json changes).

- [ ] **Step 6: Verify all new files are in expected directories**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && git diff --name-only HEAD~7 HEAD | grep -E "^\+ app/src/" | grep -vE "^app/src/(styles/|components/(opname|extract|admin|app3|app4)/|pages/(OpnamePage|ExtractOpnamePage|AdminPage|App3ConsolidationPage|App4RecouncilPage)\.jsx|index\.css$)"`

Expected: empty (no files outside the allowed directories).

- [ ] **Step 7: Verify each new file has one clear responsibility**

Open each new file. Confirm: single concern, no mixing of unrelated state, no cross-page coupling.

- [ ] **Step 8: Verify page composers are 50-150 lines**

Run: `cd "d:\\Digitalisasi Kertas Kerja APP" && rtk wc -l app/src/pages/{OpnamePage,ExtractOpnamePage,AdminPage,App3ConsolidationPage,App4RecouncilPage}.jsx`

Expected: each between 50 and 150 lines.

- [ ] **Step 9: Verify all `wa-*` classes still resolve**

Open DevTools on any page. Check computed styles for any `.wa-*` element. Expected: styles applied (not missing).

- [ ] **Step 10: Final report**

Write a brief report:
```
Frontend refactor complete. 6 atomic commits.
- index.css: 5013 → ~25 lines
- 5 page files: 751/524/395/391/287 → 110-150 lines each
- 23 new component files (6 opname + 4 extract + 7 admin + 3 app3 + 2 app4)
- 6 new CSS files (tokens/base/components/pages/modals/responsive)
- 1 file deleted (components/SignatureSection.jsx)
- All 9 acceptance criteria met.
- Build + tests pass.
- 0 behavior changes.
```

---

## Acceptance Criteria Mapping

| Spec Criterion | Verified in Task |
|---|---|
| 1. No file > 1500 lines | Task 7, Step 1 |
| 2. All pages render identically | Task 7, Step 2 (per-task visual checks in 2-6) |
| 3. `npm run build` succeeds | Each task's build step + Task 7, Step 3 |
| 4. `npm test` passes | Each task's test step + Task 7, Step 4 |
| 5. No new dependencies | Task 7, Step 5 |
| 6. No new files outside allowed dirs | Task 7, Step 6 |
| 7. Each new file = one responsibility | Task 7, Step 7 |
| 8. Page composers 50-150 lines | Each task's line count step + Task 7, Step 8 |
| 9. `wa-*` classes still resolve | Task 7, Step 9 |

---

## Rollback Plan

If any commit breaks anything:

```bash
git revert <commit-sha>  # undo just that commit
```

Each of the 6 commits is self-contained. Worst case: revert all 6 with `git revert HEAD~6..HEAD`.

---

## References

- Spec: `docs/superpowers/specs/2026-06-15-frontend-code-organization.md`
- Vite `@import` docs: https://vitejs.dev/guide/assets.html#importing-asset-as-url
