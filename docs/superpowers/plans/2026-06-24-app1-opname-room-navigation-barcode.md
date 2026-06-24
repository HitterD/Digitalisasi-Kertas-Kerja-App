# APP1 Opname Room Navigation + Barcode Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build APP1 Opname room navigation that avoids long horizontal scrolling and increase barcode number readability on web and APK.

**Architecture:** Extract pure room-navigation helpers into a focused utility with unit tests, then wire them into `OpnamePage.jsx` as a compact preview plus expandable grid. Keep all data logic unchanged; use CSS classes for visual states and responsive APK/tablet sizing.

**Tech Stack:** React 19, Vite 7, Vitest, CSS custom properties, Capacitor Android.

---

## File Structure

- Create: `app/src/utils/opnameRoomNav.js`
  - Pure helpers for compact room preview and room status.
  - No React dependency.
- Create: `app/src/__tests__/opnameRoomNav.test.js`
  - Unit tests for helper behavior: empty list, short list, long middle list, long edge list, status mapping.
- Modify: `app/src/pages/OpnamePage.jsx`
  - Import helper functions.
  - Add `isRoomGridOpen` state.
  - Replace horizontal all-room dot strip with compact preview + expandable grid.
  - Preserve existing select/progress/prev/next behavior.
- Modify: `app/src/styles/components.css`
  - Replace room nav dot styles with button-based preview/grid styles.
  - Increase table barcode typography only.
  - Add mobile card barcode class.
- Modify: `app/src/styles/responsive.css`
  - Update tablet/mobile room-nav wrapping, tap targets, grid panel sizing.
- Modify: `app/src/components/AssetTable.jsx`
  - Increase barcode card font via class.
  - Increase clicked barcode span weight to match CSS.

---

### Task 1: Room navigation helper tests

**Files:**
- Create: `app/src/__tests__/opnameRoomNav.test.js`
- Create later in Task 2: `app/src/utils/opnameRoomNav.js`

- [ ] **Step 1: Write failing helper tests**

Create `app/src/__tests__/opnameRoomNav.test.js`:

```javascript
import { describe, expect, it } from 'vitest';
import {
  ROOM_NAV_ELLIPSIS,
  getRoomStatus,
  getVisibleRoomItems,
} from '../utils/opnameRoomNav';

describe('opnameRoomNav', () => {
  it('returns empty preview when total room count is zero', () => {
    expect(getVisibleRoomItems(0, 0)).toEqual([]);
  });

  it('shows all rooms without ellipsis when room count is small', () => {
    expect(getVisibleRoomItems(2, 5)).toEqual([
      { type: 'room', index: 0 },
      { type: 'room', index: 1 },
      { type: 'room', index: 2 },
      { type: 'room', index: 3 },
      { type: 'room', index: 4 },
    ]);
  });

  it('shows first room, middle window, and last room for a long list', () => {
    expect(getVisibleRoomItems(11, 80)).toEqual([
      { type: 'room', index: 0 },
      { type: ROOM_NAV_ELLIPSIS, key: 'start' },
      { type: 'room', index: 9 },
      { type: 'room', index: 10 },
      { type: 'room', index: 11 },
      { type: 'room', index: 12 },
      { type: 'room', index: 13 },
      { type: ROOM_NAV_ELLIPSIS, key: 'end' },
      { type: 'room', index: 79 },
    ]);
  });

  it('keeps beginning rooms visible without duplicate first room', () => {
    expect(getVisibleRoomItems(1, 12)).toEqual([
      { type: 'room', index: 0 },
      { type: 'room', index: 1 },
      { type: 'room', index: 2 },
      { type: 'room', index: 3 },
      { type: ROOM_NAV_ELLIPSIS, key: 'end' },
      { type: 'room', index: 11 },
    ]);
  });

  it('keeps ending rooms visible without duplicate last room', () => {
    expect(getVisibleRoomItems(10, 12)).toEqual([
      { type: 'room', index: 0 },
      { type: ROOM_NAV_ELLIPSIS, key: 'start' },
      { type: 'room', index: 8 },
      { type: 'room', index: 9 },
      { type: 'room', index: 10 },
      { type: 'room', index: 11 },
    ]);
  });

  it('maps room progress to done, progress, and empty states', () => {
    expect(getRoomStatus({ checked: 10, total: 10 })).toBe('done');
    expect(getRoomStatus({ checked: 4, total: 10 })).toBe('progress');
    expect(getRoomStatus({ checked: 0, total: 10 })).toBe('empty');
    expect(getRoomStatus({ checked: 0, total: 0 })).toBe('empty');
    expect(getRoomStatus(undefined)).toBe('empty');
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run from `app/`:

```bash
rtk npm run test -- opnameRoomNav
```

Expected: FAIL because `../utils/opnameRoomNav` does not exist.

- [ ] **Step 3: Commit RED test**

```bash
rtk git add app/src/__tests__/opnameRoomNav.test.js && rtk git commit -m "test: add opname room navigation helper coverage"
```

---

### Task 2: Room navigation helper implementation

**Files:**
- Create: `app/src/utils/opnameRoomNav.js`
- Test: `app/src/__tests__/opnameRoomNav.test.js`

- [ ] **Step 1: Add pure helper implementation**

Create `app/src/utils/opnameRoomNav.js`:

```javascript
export const ROOM_NAV_ELLIPSIS = 'ellipsis';

const DEFAULT_SIDE_WINDOW = 2;
const SMALL_ROOM_COUNT_LIMIT = 7;

function clampIndex(index, totalRooms) {
  if (totalRooms <= 0) return 0;
  return Math.min(Math.max(index, 0), totalRooms - 1);
}

function createRoomItem(index) {
  return { type: 'room', index };
}

function createEllipsisItem(key) {
  return { type: ROOM_NAV_ELLIPSIS, key };
}

export function getRoomStatus(progress) {
  if (!progress || progress.total <= 0 || progress.checked <= 0) return 'empty';
  if (progress.checked >= progress.total) return 'done';
  return 'progress';
}

export function getVisibleRoomItems(currentIndex, totalRooms, sideWindow = DEFAULT_SIDE_WINDOW) {
  if (totalRooms <= 0) return [];

  if (totalRooms <= SMALL_ROOM_COUNT_LIMIT) {
    return Array.from({ length: totalRooms }, (_, index) => createRoomItem(index));
  }

  const activeIndex = clampIndex(currentIndex, totalRooms);
  const start = Math.max(0, activeIndex - sideWindow);
  const end = Math.min(totalRooms - 1, activeIndex + sideWindow);
  const items = [createRoomItem(0)];

  if (start > 1) {
    items.push(createEllipsisItem('start'));
  }

  const visibleStart = Math.max(1, start);
  const visibleEnd = Math.min(totalRooms - 2, end);

  for (let index = visibleStart; index <= visibleEnd; index += 1) {
    items.push(createRoomItem(index));
  }

  if (end < totalRooms - 2) {
    items.push(createEllipsisItem('end'));
  }

  items.push(createRoomItem(totalRooms - 1));
  return items;
}
```

- [ ] **Step 2: Run helper test to verify GREEN**

Run from `app/`:

```bash
rtk npm run test -- opnameRoomNav
```

Expected: PASS for all tests in `opnameRoomNav.test.js`.

- [ ] **Step 3: Commit helper implementation**

```bash
rtk git add app/src/utils/opnameRoomNav.js app/src/__tests__/opnameRoomNav.test.js && rtk git commit -m "feat: add opname room navigation helpers"
```

---

### Task 3: Integrate compact preview and expandable grid into OpnamePage

**Files:**
- Modify: `app/src/pages/OpnamePage.jsx:1-218`
- Uses: `app/src/utils/opnameRoomNav.js`

- [ ] **Step 1: Update imports**

In `app/src/pages/OpnamePage.jsx`, replace line 1:

```javascript
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
```

with:

```javascript
import { useState, useCallback, useMemo } from 'react';
```

Add this import after `fetchJsonWithAuth` import:

```javascript
import {
    ROOM_NAV_ELLIPSIS,
    getRoomStatus,
    getVisibleRoomItems,
} from '../utils/opnameRoomNav';
```

- [ ] **Step 2: Replace obsolete dot ref auto-scroll state with grid state**

Remove this block from `app/src/pages/OpnamePage.jsx`:

```javascript
    const dotsRef = useRef(null);
    useEffect(() => {
        const el = dotsRef.current?.querySelector('[data-active="true"]');
        if (el) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, [roomIdx]);
```

Add this state after `isSaveModalOpen`:

```javascript
    const [isRoomGridOpen, setIsRoomGridOpen] = useState(false);
```

- [ ] **Step 3: Add compact preview and room select helpers**

Add this block after `overallProgress` memo:

```javascript
    const visibleRoomItems = useMemo(() => (
        getVisibleRoomItems(roomIdx, state.rooms.length)
    ), [roomIdx, state.rooms.length]);

    const handleRoomSelect = useCallback((targetIndex) => {
        setRoomIndex(targetIndex);
        setIsRoomGridOpen(false);
    }, [setRoomIndex]);

    const getRoomName = useCallback((targetIndex) => {
        const targetRoom = state.rooms[targetIndex];
        return targetRoom?.meta?.roomName || targetRoom?.sheetName || `Ruangan ${targetIndex + 1}`;
    }, [state.rooms]);

    const renderRoomNavButton = useCallback((targetIndex, variant = 'preview') => {
        const status = getRoomStatus(overallProgress[targetIndex]);
        const isActive = targetIndex === roomIdx;
        const roomName = getRoomName(targetIndex);

        return (
            <button
                key={`${variant}-${targetIndex}`}
                type="button"
                title={`${targetIndex + 1}. ${roomName}`}
                aria-label={`Buka ruangan ${targetIndex + 1}: ${roomName}`}
                aria-current={isActive ? 'true' : undefined}
                className={`wa-room-nav-dot wa-room-nav-dot--${variant} wa-room-nav-dot--${status}${isActive ? ' active' : ''}`}
                onClick={() => handleRoomSelect(targetIndex)}
            >
                {targetIndex + 1}
            </button>
        );
    }, [getRoomName, handleRoomSelect, overallProgress, roomIdx]);
```

- [ ] **Step 4: Make prev/next close expanded grid**

Replace `handlePrevRoom` and `handleNextRoom` with:

```javascript
    const handlePrevRoom = useCallback(() => {
        if (roomIdx > 0) {
            setRoomIndex(roomIdx - 1);
            setIsRoomGridOpen(false);
        }
    }, [roomIdx, setRoomIndex]);

    const handleNextRoom = useCallback(() => {
        if (roomIdx < state.rooms.length - 1) {
            setRoomIndex(roomIdx + 1);
            setIsRoomGridOpen(false);
        }
    }, [roomIdx, state.rooms.length, setRoomIndex]);
```

- [ ] **Step 5: Replace room navigation JSX**

Replace the full room navigation block from `app/src/pages/OpnamePage.jsx:156-218` with:

```jsx
            {/* Room Navigation */}
            <div className="wa-room-nav">
              {/* Prev/Next + select */}
              <div className="wa-room-nav-select-group">
                <button className="wa-room-nav-btn" onClick={handlePrevRoom} disabled={roomIdx === 0} aria-label="Ruangan sebelumnya">
                  <ChevronLeft size={16} />
                </button>
                <select className="wa-select wa-room-nav-select" value={roomIdx} onChange={(e) => handleRoomSelect(Number(e.target.value))}>
                  {state.rooms.map((r, i) => {
                    const op = overallProgress[i];
                    const pctStr = op ? ` (${op.checked}/${op.total})` : '';
                    return <option key={i} value={i}>{i + 1}. {r.meta.roomName || r.sheetName}{pctStr}</option>;
                  })}
                </select>
                <button className="wa-room-nav-btn" onClick={handleNextRoom} disabled={roomIdx === state.rooms.length - 1} aria-label="Ruangan berikutnya">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="wa-room-nav-divider" />

              {/* Progress ring + count */}
              <div className="wa-room-nav-progress-group">
                <div style={{ position: 'relative', width: 36, height: 36 }}>
                  <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--terracotta-500)" strokeWidth="3" strokeDasharray="87.96" strokeDashoffset={87.96 - (87.96 * progress.pct / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.25,1,0.5,1)' }} />
                  </svg>
                  <div className="wa-room-nav-progress-pct">{progress.pct}%</div>
                </div>
                <div>
                  <div className="wa-room-nav-progress-text" style={{ marginBottom: 2 }}>{progress.checked}/{progress.total}</div>
                  <div className="wa-room-nav-progress-text">{progress.total - progress.checked} SISA</div>
                </div>
              </div>

              <div className="wa-room-nav-divider" />

              <div className="wa-room-nav-summary" aria-live="polite">
                <span className="wa-room-nav-summary__current">Ruangan {roomIdx + 1}</span>
                <span className="wa-room-nav-summary__total">dari {state.rooms.length}</span>
              </div>

              <button
                type="button"
                className="wa-room-nav-toggle"
                aria-expanded={isRoomGridOpen}
                onClick={() => setIsRoomGridOpen((current) => !current)}
              >
                {isRoomGridOpen ? 'Tutup' : 'Lihat semua'}
                <ChevronDown size={14} className={isRoomGridOpen ? 'open' : ''} />
              </button>

              {/* Compact room preview */}
              <div className="wa-room-nav-dots wa-room-nav-dots--preview" aria-label="Preview nomor ruangan">
                {visibleRoomItems.map((item) => (
                  item.type === ROOM_NAV_ELLIPSIS
                    ? <span key={item.key} className="wa-room-nav-ellipsis">…</span>
                    : renderRoomNavButton(item.index, 'preview')
                ))}
              </div>

              {isRoomGridOpen && (
                <div className="wa-room-nav-grid-panel" role="region" aria-label="Pilih ruangan opname">
                  <div className="wa-room-nav-grid">
                    {state.rooms.map((_, i) => renderRoomNavButton(i, 'grid'))}
                  </div>
                </div>
              )}
            </div>
```

- [ ] **Step 6: Run helper test after integration**

Run from `app/`:

```bash
rtk npm run test -- opnameRoomNav
```

Expected: PASS.

- [ ] **Step 7: Commit OpnamePage integration**

```bash
rtk git add app/src/pages/OpnamePage.jsx && rtk git commit -m "feat: add expandable room navigation to opname"
```

---

### Task 4: Room navigation and barcode styling

**Files:**
- Modify: `app/src/styles/components.css:945`
- Modify: `app/src/styles/components.css:1328-1343`

- [ ] **Step 1: Increase table barcode font only**

In `app/src/styles/components.css`, replace the existing one-line rule:

```css
.wa-table .col-barcode { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--accent); letter-spacing: 0.02em; }
```

with:

```css
.wa-table .col-barcode {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}
.wa-table .col-barcode span {
  font-size: inherit;
  font-variant-numeric: tabular-nums;
}
.asset-card-barcode {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 800;
  color: var(--terracotta-500);
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Replace room nav CSS with compact/grid styles**

In `app/src/styles/components.css`, replace the block `/* ===== ROOM NAV BAR ===== */` through `.wa-room-nav-dot.active` with:

```css
/* ===== ROOM NAV BAR ===== */
.wa-room-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: var(--cream-surface);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.wa-room-nav-select-group {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.wa-room-nav-select {
  min-width: 260px;
  font-size: 13px;
  font-weight: 700;
}
.wa-room-nav-btn {
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--charcoal-900);
  cursor: pointer;
  transition: all 150ms ease;
}
.wa-room-nav-btn:hover:not(:disabled) { background: var(--bg-input); }
.wa-room-nav-btn:disabled { cursor: not-allowed; opacity: 0.3; }
.wa-room-nav-divider { width: 1px; height: 24px; background: var(--border); }
.wa-room-nav-progress-group { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.wa-room-nav-progress-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: var(--charcoal-900); }
.wa-room-nav-progress-text { font-family: var(--font-mono); font-size: 9px; color: var(--charcoal-500); letter-spacing: 0.08em; text-transform: uppercase; }
.wa-room-nav-summary {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  min-width: 82px;
  flex-shrink: 0;
}
.wa-room-nav-summary__current {
  font-family: var(--font-sora);
  font-size: 12px;
  font-weight: 800;
  color: var(--charcoal-900);
  letter-spacing: -0.01em;
}
.wa-room-nav-summary__total {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  color: var(--charcoal-500);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.wa-room-nav-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--cream-surface);
  color: var(--charcoal-900);
  font-family: var(--font-sora);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 160ms ease;
}
.wa-room-nav-toggle:hover { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.wa-room-nav-toggle svg { transition: transform 180ms ease; }
.wa-room-nav-toggle svg.open { transform: rotate(180deg); }
.wa-room-nav-dots {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.wa-room-nav-dots--preview {
  flex: 1;
  overflow: hidden;
}
.wa-room-nav-dot {
  min-width: 30px;
  height: 30px;
  border-radius: 999px;
  flex-shrink: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  background: var(--cream-surface);
  color: var(--text-tertiary);
  border: 1.5px solid var(--border-strong);
  transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease, color 150ms ease, border-color 150ms ease;
}
.wa-room-nav-dot:hover { transform: translateY(-1px); border-color: var(--accent); color: var(--accent); }
.wa-room-nav-dot--done { background: var(--accent); color: var(--cream-surface); border-color: var(--accent); }
.wa-room-nav-dot--progress { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); }
.wa-room-nav-dot--empty { background: var(--cream-surface); color: var(--text-tertiary); border-color: var(--border-strong); }
.wa-room-nav-dot.active { transform: scale(1.08); box-shadow: 0 0 0 2px var(--accent); border-color: var(--accent); color: var(--accent); background: var(--cream-surface); }
.wa-room-nav-dot--done.active { background: var(--accent); color: var(--cream-surface); }
.wa-room-nav-ellipsis {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 800;
  color: var(--text-muted);
  padding: 0 2px;
}
.wa-room-nav-grid-panel {
  flex-basis: 100%;
  border-top: 1px solid var(--border);
  padding-top: 12px;
  max-height: 260px;
  overflow-y: auto;
}
.wa-room-nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
  gap: 8px;
}
.wa-room-nav-dot--grid {
  width: 100%;
  min-width: 38px;
  height: 38px;
}
```

- [ ] **Step 3: Commit CSS room nav and table barcode styles**

```bash
rtk git add app/src/styles/components.css && rtk git commit -m "style: improve opname room navigation and barcode readability"
```

---

### Task 5: Asset card barcode class and inline font cleanup

**Files:**
- Modify: `app/src/components/AssetTable.jsx:112-116`
- Modify: `app/src/components/AssetTable.jsx:181-183`

- [ ] **Step 1: Update copied barcode span weight**

In `AssetRow`, replace the barcode `<span style={{ ... }}>` style block:

```jsx
                    <span style={{ 
                        color: isCopied ? 'var(--success-500)' : 'var(--accent)', 
                        fontWeight: 700, 
                        transition: 'color 0.2s'
                    }}>
```

with:

```jsx
                    <span style={{ 
                        color: isCopied ? 'var(--success-500)' : 'var(--accent)', 
                        fontWeight: 800, 
                        transition: 'color 0.2s'
                    }}>
```

- [ ] **Step 2: Replace mobile/card barcode inline style with class**

In `AssetCard`, replace:

```jsx
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--terracotta-500)' }}>{asset.barcode}</div>
```

with:

```jsx
                    <div className="asset-card-barcode">{asset.barcode}</div>
```

- [ ] **Step 3: Run helper tests**

Run from `app/`:

```bash
rtk npm run test -- opnameRoomNav
```

Expected: PASS.

- [ ] **Step 4: Commit AssetTable typography cleanup**

```bash
rtk git add app/src/components/AssetTable.jsx app/src/styles/components.css && rtk git commit -m "style: enlarge opname asset barcode text"
```

---

### Task 6: Responsive web/APK room navigation sizing

**Files:**
- Modify: `app/src/styles/responsive.css:276-295`

- [ ] **Step 1: Update tablet responsive rules**

In `app/src/styles/responsive.css`, replace the existing tablet opname block:

```css
/* ===== Opname tablet ===== */
@media (min-width: 768px) and (max-width: 1024px) {
  .wa-room-nav { flex-wrap: wrap; }
  .wa-room-nav-dots { order: 3; flex-basis: 100%; }
  .wa-room-meta-grid { grid-template-columns: repeat(2, 1fr); row-gap: 14px; }
  .wa-room-meta-col { border-right: none; padding: 0 14px; }
  .signature-section--three { grid-template-columns: repeat(2, 1fr) !important; }
}
```

with:

```css
/* ===== Opname tablet ===== */
@media (min-width: 768px) and (max-width: 1024px) {
  .wa-room-nav { flex-wrap: wrap; align-items: flex-start; }
  .wa-room-nav-select-group { flex: 1 1 420px; }
  .wa-room-nav-select { min-width: 0; flex: 1; }
  .wa-room-nav-dots--preview { order: 3; flex-basis: 100%; }
  .wa-room-nav-grid-panel { order: 4; max-height: 260px; }
  .wa-room-nav-dot--grid { min-width: 42px; height: 42px; font-size: 12px; }
  .wa-room-meta-grid { grid-template-columns: repeat(2, 1fr); row-gap: 14px; }
  .wa-room-meta-col { border-right: none; padding: 0 14px; }
  .signature-section--three { grid-template-columns: repeat(2, 1fr) !important; }
}
```

- [ ] **Step 2: Update mobile responsive rules**

In `app/src/styles/responsive.css`, replace the mobile opname room nav lines:

```css
  .wa-room-nav { flex-wrap: wrap; gap: 10px; padding: 10px 14px; }
  .wa-room-nav-divider { display: none; }
  .wa-room-nav-dots { order: 3; flex-basis: 100%; }
```

with:

```css
  .wa-room-nav { flex-wrap: wrap; gap: 10px; padding: 10px 14px; }
  .wa-room-nav-select-group { flex: 1 1 100%; }
  .wa-room-nav-select { min-width: 0; flex: 1; }
  .wa-room-nav-divider { display: none; }
  .wa-room-nav-progress-group { order: 2; }
  .wa-room-nav-summary { order: 2; min-width: 76px; }
  .wa-room-nav-toggle { order: 2; margin-left: auto; }
  .wa-room-nav-dots--preview { display: none; }
  .wa-room-nav-grid-panel { order: 4; max-height: 240px; }
  .wa-room-nav-grid { grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); }
  .wa-room-nav-dot--grid { min-width: 44px; height: 44px; font-size: 13px; }
```

Keep the existing mobile rules after those lines:

```css
  .wa-room-meta-grid { grid-template-columns: repeat(2, 1fr); row-gap: 12px; }
  .wa-room-meta-col { border-right: none; padding: 0; }
  .opname-actions-bar { gap: 6px; }
  .signature-section--three { grid-template-columns: 1fr !important; }
  .signature-pad__canvas-wrap { height: 180px; }
```

- [ ] **Step 3: Commit responsive rules**

```bash
rtk git add app/src/styles/responsive.css && rtk git commit -m "style: tune opname room navigation for tablet and mobile"
```

---

### Task 7: Full verification and APK refresh

**Files:**
- Verify: `app/src/utils/opnameRoomNav.js`
- Verify: `app/src/pages/OpnamePage.jsx`
- Verify: `app/src/components/AssetTable.jsx`
- Verify: `app/src/styles/components.css`
- Verify: `app/src/styles/responsive.css`
- Optional build artifact update: `app/OpnameAsetICT.apk`

- [ ] **Step 1: Run focused unit test**

Run from `app/`:

```bash
rtk npm run test -- opnameRoomNav
```

Expected: PASS.

- [ ] **Step 2: Run full unit test suite**

Run from `app/`:

```bash
rtk npm run test
```

Expected: PASS. If unrelated existing tests fail, record exact failing test names and continue to Step 3 only after confirming failures are pre-existing with user approval.

- [ ] **Step 3: Run production web build**

Run from `app/`:

```bash
rtk npm run build
```

Expected: Vite build completes and writes `dist/` assets.

- [ ] **Step 4: Sync Capacitor Android assets**

Run from `app/`:

```bash
rtk npx cap sync android
```

Expected: Capacitor sync completes and updates Android web assets.

- [ ] **Step 5: Build Android debug APK**

Run from `app/`:

```bash
rtk ./android/gradlew -p android assembleDebug
```

Expected: Gradle build succeeds and produces `app/android/app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 6: Update root APK deliverable**

Run from `app/`:

```bash
rtk cp android/app/build/outputs/apk/debug/app-debug.apk OpnameAsetICT.apk
```

Expected: `app/OpnameAsetICT.apk` contains newest debug APK build.

- [ ] **Step 7: Manual web verification**

Open `/app1/opname` with uploaded data containing at least 12 rooms. Verify these exact outcomes:

- Default room nav shows compact preview, not all rooms in a long horizontal strip.
- `Lihat semua` opens multi-row number grid.
- `Tutup` closes grid.
- Clicking a far room number changes select value, progress ring, metadata, and asset list.
- Grid closes after selecting a room number.
- Done, progress, empty, and active numbers have distinct styles.
- Barcode digits in desktop table are visibly larger than asset name/no PO/type text.
- Non-barcode table text remains same size as before.

- [ ] **Step 8: Manual APK/tablet verification**

Install `app/OpnameAsetICT.apk` on test tablet. Verify these exact outcomes:

- APP1 Opname opens.
- Room nav does not require horizontal scroll to access far rooms.
- `Lihat semua` grid number buttons are easy to tap.
- Barcode digits in table/card are visibly larger.
- APK status bar/safe area remains normal.

- [ ] **Step 9: Final commit**

```bash
rtk git add app/src/utils/opnameRoomNav.js app/src/__tests__/opnameRoomNav.test.js app/src/pages/OpnamePage.jsx app/src/components/AssetTable.jsx app/src/styles/components.css app/src/styles/responsive.css app/OpnameAsetICT.apk && rtk git commit -m "feat: improve opname room navigation and barcode visibility"
```

If `app/OpnameAsetICT.apk` is not regenerated because Android build is unavailable on the machine, use this commit instead and report APK as not built:

```bash
rtk git add app/src/utils/opnameRoomNav.js app/src/__tests__/opnameRoomNav.test.js app/src/pages/OpnamePage.jsx app/src/components/AssetTable.jsx app/src/styles/components.css app/src/styles/responsive.css && rtk git commit -m "feat: improve opname room navigation and barcode visibility"
```

---

## Self-Review

- **Spec coverage:** Compact preview, expandable grid, room status states, responsive web/APK sizing, barcode size increase, accessibility labels, and APK refresh are covered in Tasks 1–7.
- **No placeholders:** Plan contains concrete file paths, code blocks, commands, expected results, and manual verification steps.
- **Type/name consistency:** `ROOM_NAV_ELLIPSIS`, `getRoomStatus`, `getVisibleRoomItems`, `isRoomGridOpen`, `visibleRoomItems`, and `renderRoomNavButton` names are consistent across tests, helper implementation, and React integration.
