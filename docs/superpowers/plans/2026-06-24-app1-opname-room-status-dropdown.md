# APP1 Room Status Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom searchable room dropdown for APP1 Opname that shows explicit `Selesai`, `Proses`, and `Belum` status badges instead of relying only on progress numbers like `18/18`.

**Architecture:** Extend the existing pure room-navigation utility with status display/search helpers, then create a focused `RoomStatusSelect` component with its own tests. Integrate it into `OpnamePage.jsx` by replacing the native `<select>` only; preserve prev/next, progress ring, and `Lihat semua` grid behavior.

**Tech Stack:** React 19, Vite 7, Vitest, React Testing Library, CSS custom properties, lucide-react icons.

---

## File Structure

- Modify: `app/src/utils/opnameRoomNav.js`
  - Add pure helpers for room name fallback, progress text, status metadata, status description, and searchable text.
  - Keep helpers framework-agnostic for fast unit tests.
- Modify: `app/src/__tests__/opnameRoomNav.test.js`
  - Add unit tests for new helper behavior and edge cases.
- Create: `app/src/components/RoomStatusSelect.jsx`
  - APP1-specific custom dropdown component.
  - Owns open/search state, outside click close, Escape close, and rendering.
- Create: `app/src/__tests__/RoomStatusSelect.test.jsx`
  - Component tests for status labels, filtering, selection, and empty state.
- Modify: `app/src/pages/OpnamePage.jsx`
  - Import `RoomStatusSelect`.
  - Replace native room `<select>` with `RoomStatusSelect`.
  - Leave room grid, progress ring, prev/next, and room metadata unchanged.
- Modify: `app/src/styles/components.css`
  - Add `room-status-select` visual styles.
  - Keep existing `wa-room-nav` styles.
- Modify: `app/src/styles/responsive.css`
  - Add tablet/mobile sizing rules for trigger, popover, badges, and list rows.

---

### Task 1: Add room status helper tests

**Files:**
- Modify: `app/src/__tests__/opnameRoomNav.test.js`
- Target implementation in Task 2: `app/src/utils/opnameRoomNav.js`

- [ ] **Step 1: Replace helper test file with full coverage**

Replace `app/src/__tests__/opnameRoomNav.test.js` with:

```javascript
import { describe, expect, it } from 'vitest';
import {
  ROOM_NAV_ELLIPSIS,
  getRoomName,
  getRoomProgressText,
  getRoomSearchText,
  getRoomStatus,
  getRoomStatusDescription,
  getRoomStatusMeta,
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

  it('gets room name from metadata, sheet name, then fallback', () => {
    expect(getRoomName({ meta: { roomName: 'Ruang QA' }, sheetName: 'Sheet A' }, 0)).toBe('Ruang QA');
    expect(getRoomName({ meta: {}, sheetName: 'Sheet B' }, 1)).toBe('Sheet B');
    expect(getRoomName({}, 2)).toBe('Ruangan 3');
  });

  it('formats progress text with zero fallback', () => {
    expect(getRoomProgressText({ checked: 8, total: 12 })).toBe('8/12');
    expect(getRoomProgressText(undefined)).toBe('0/0');
  });

  it('returns visible metadata for every status', () => {
    expect(getRoomStatusMeta('done')).toEqual({ label: 'Selesai', icon: '✓' });
    expect(getRoomStatusMeta('progress')).toEqual({ label: 'Proses', icon: '…' });
    expect(getRoomStatusMeta('empty')).toEqual({ label: 'Belum', icon: '○' });
    expect(getRoomStatusMeta('unknown')).toEqual({ label: 'Belum', icon: '○' });
  });

  it('describes room status for operator-friendly copy', () => {
    expect(getRoomStatusDescription({ checked: 10, total: 10 }, 'done')).toBe('Semua aset sudah teropname');
    expect(getRoomStatusDescription({ checked: 4, total: 10 }, 'progress')).toBe('6 aset belum dicek');
    expect(getRoomStatusDescription({ checked: 0, total: 10 }, 'empty')).toBe('Belum mulai opname');
    expect(getRoomStatusDescription({ checked: 0, total: 0 }, 'empty')).toBe('Belum ada aset di ruangan ini');
  });

  it('creates searchable text from room number, room name, status, and progress', () => {
    const text = getRoomSearchText({
      room: { meta: { roomName: 'Ruang Packing' }, sheetName: 'Sheet 1' },
      index: 4,
      progress: { checked: 5, total: 8 },
    });

    expect(text).toContain('5');
    expect(text).toContain('ruang packing');
    expect(text).toContain('proses');
    expect(text).toContain('5/8');
  });
});
```

- [ ] **Step 2: Run helper tests to verify RED**

Run from `app/`:

```bash
rtk npm run test -- opnameRoomNav
```

Expected: FAIL with missing exports like `getRoomName` and `getRoomStatusMeta`.

- [ ] **Step 3: Commit RED helper tests**

```bash
rtk git add app/src/__tests__/opnameRoomNav.test.js && rtk git commit -m "test: cover opname room status helpers"
```

---

### Task 2: Implement room status helpers

**Files:**
- Modify: `app/src/utils/opnameRoomNav.js`
- Test: `app/src/__tests__/opnameRoomNav.test.js`

- [ ] **Step 1: Replace helper implementation with status helpers included**

Replace `app/src/utils/opnameRoomNav.js` with:

```javascript
export const ROOM_NAV_ELLIPSIS = 'ellipsis';

const DEFAULT_SIDE_WINDOW = 2;
const SMALL_ROOM_COUNT_LIMIT = 7;

const ROOM_STATUS_META = {
  done: { label: 'Selesai', icon: '✓' },
  progress: { label: 'Proses', icon: '…' },
  empty: { label: 'Belum', icon: '○' },
};

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

function normalizeProgress(progress) {
  return {
    checked: Number.isFinite(progress?.checked) ? progress.checked : 0,
    total: Number.isFinite(progress?.total) ? progress.total : 0,
  };
}

export function getRoomStatus(progress) {
  const { checked, total } = normalizeProgress(progress);
  if (total <= 0 || checked <= 0) return 'empty';
  if (checked >= total) return 'done';
  return 'progress';
}

export function getRoomName(room, index) {
  return room?.meta?.roomName || room?.sheetName || `Ruangan ${index + 1}`;
}

export function getRoomProgressText(progress) {
  const { checked, total } = normalizeProgress(progress);
  return `${checked}/${total}`;
}

export function getRoomStatusMeta(status) {
  return ROOM_STATUS_META[status] || ROOM_STATUS_META.empty;
}

export function getRoomStatusDescription(progress, status) {
  const { checked, total } = normalizeProgress(progress);

  if (total <= 0) return 'Belum ada aset di ruangan ini';
  if (status === 'done') return 'Semua aset sudah teropname';
  if (status === 'progress') return `${Math.max(total - checked, 0)} aset belum dicek`;
  return 'Belum mulai opname';
}

export function getRoomSearchText({ room, index, progress }) {
  const status = getRoomStatus(progress);
  const statusMeta = getRoomStatusMeta(status);
  const roomName = getRoomName(room, index);
  const progressText = getRoomProgressText(progress);

  return [
    String(index + 1),
    roomName,
    status,
    statusMeta.label,
    progressText,
  ].join(' ').toLowerCase();
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

- [ ] **Step 2: Run helper tests to verify GREEN**

Run from `app/`:

```bash
rtk npm run test -- opnameRoomNav
```

Expected: PASS for all tests in `opnameRoomNav.test.js`.

- [ ] **Step 3: Commit helper implementation**

```bash
rtk git add app/src/utils/opnameRoomNav.js app/src/__tests__/opnameRoomNav.test.js && rtk git commit -m "feat: add opname room status helpers"
```

---

### Task 3: Add RoomStatusSelect component tests

**Files:**
- Create: `app/src/__tests__/RoomStatusSelect.test.jsx`
- Target implementation in Task 4: `app/src/components/RoomStatusSelect.jsx`

- [ ] **Step 1: Create component test file**

Create `app/src/__tests__/RoomStatusSelect.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RoomStatusSelect from '../components/RoomStatusSelect';

const rooms = [
  { meta: { roomName: 'RUANG 801 PACKING' }, sheetName: 'Sheet 801' },
  { meta: { roomName: 'RUANG 806 TRANSIT BARANG' }, sheetName: 'Sheet 806' },
  { meta: { roomName: 'RUANG 910 PACKING LINE 3' }, sheetName: 'Sheet 910' },
];

const progress = [
  { checked: 18, total: 18 },
  { checked: 9, total: 13 },
  { checked: 0, total: 1 },
];

function renderSelect(props = {}) {
  const onChange = vi.fn();
  render(
    <RoomStatusSelect
      rooms={rooms}
      progress={progress}
      value={0}
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange };
}

describe('RoomStatusSelect', () => {
  it('renders active room with explicit done status', () => {
    renderSelect();

    expect(screen.getByRole('button', { name: /pilih ruangan opname/i })).toHaveTextContent('RUANG 801 PACKING');
    expect(screen.getByText('Selesai')).toBeInTheDocument();
    expect(screen.getByText('18/18')).toBeInTheDocument();
  });

  it('opens dropdown and shows all status labels', () => {
    renderSelect();

    fireEvent.click(screen.getByRole('button', { name: /pilih ruangan opname/i }));

    expect(screen.getByRole('searchbox', { name: /cari ruangan/i })).toBeInTheDocument();
    expect(screen.getAllByText('Selesai').length).toBeGreaterThan(0);
    expect(screen.getByText('Proses')).toBeInTheDocument();
    expect(screen.getByText('Belum')).toBeInTheDocument();
    expect(screen.getByText('4 aset belum dicek')).toBeInTheDocument();
  });

  it('filters rooms by room name', () => {
    renderSelect();

    fireEvent.click(screen.getByRole('button', { name: /pilih ruangan opname/i }));
    fireEvent.change(screen.getByRole('searchbox', { name: /cari ruangan/i }), {
      target: { value: 'transit' },
    });

    expect(screen.getByText(/RUANG 806 TRANSIT BARANG/)).toBeInTheDocument();
    expect(screen.queryByText(/RUANG 910 PACKING LINE 3/)).not.toBeInTheDocument();
  });

  it('filters rooms by status text', () => {
    renderSelect();

    fireEvent.click(screen.getByRole('button', { name: /pilih ruangan opname/i }));
    fireEvent.change(screen.getByRole('searchbox', { name: /cari ruangan/i }), {
      target: { value: 'belum' },
    });

    expect(screen.getByText(/RUANG 910 PACKING LINE 3/)).toBeInTheDocument();
    expect(screen.queryByText(/RUANG 806 TRANSIT BARANG/)).not.toBeInTheDocument();
  });

  it('selects room and closes dropdown', () => {
    const { onChange } = renderSelect();

    fireEvent.click(screen.getByRole('button', { name: /pilih ruangan opname/i }));
    fireEvent.click(screen.getByRole('option', { name: /RUANG 806 TRANSIT BARANG/i }));

    expect(onChange).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('searchbox', { name: /cari ruangan/i })).not.toBeInTheDocument();
  });

  it('closes dropdown with Escape', () => {
    renderSelect();

    fireEvent.click(screen.getByRole('button', { name: /pilih ruangan opname/i }));
    expect(screen.getByRole('searchbox', { name: /cari ruangan/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('searchbox', { name: /cari ruangan/i })).not.toBeInTheDocument();
  });

  it('renders disabled empty state when there are no rooms', () => {
    renderSelect({ rooms: [], progress: [], value: 0 });

    const trigger = screen.getByRole('button', { name: /pilih ruangan opname/i });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent('Tidak ada ruangan');
  });
});
```

- [ ] **Step 2: Run component test to verify RED**

Run from `app/`:

```bash
rtk npm run test -- RoomStatusSelect
```

Expected: FAIL because `../components/RoomStatusSelect` does not exist.

- [ ] **Step 3: Commit RED component tests**

```bash
rtk git add app/src/__tests__/RoomStatusSelect.test.jsx && rtk git commit -m "test: add room status select coverage"
```

---

### Task 4: Implement RoomStatusSelect component

**Files:**
- Create: `app/src/components/RoomStatusSelect.jsx`
- Test: `app/src/__tests__/RoomStatusSelect.test.jsx`
- Uses: `app/src/utils/opnameRoomNav.js`

- [ ] **Step 1: Create RoomStatusSelect component**

Create `app/src/components/RoomStatusSelect.jsx`:

```jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  getRoomName,
  getRoomProgressText,
  getRoomSearchText,
  getRoomStatus,
  getRoomStatusDescription,
  getRoomStatusMeta,
} from '../utils/opnameRoomNav';

export default function RoomStatusSelect({ rooms, progress, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const activeRoom = safeRooms[value];
  const activeProgress = progress?.[value];
  const activeStatus = getRoomStatus(activeProgress);
  const activeStatusMeta = getRoomStatusMeta(activeStatus);
  const activeRoomName = activeRoom ? getRoomName(activeRoom, value) : 'Tidak ada ruangan';
  const activeProgressText = getRoomProgressText(activeProgress);
  const isDisabled = safeRooms.length === 0;

  const roomOptions = useMemo(() => (
    safeRooms.map((room, index) => {
      const roomProgress = progress?.[index];
      const status = getRoomStatus(roomProgress);
      const statusMeta = getRoomStatusMeta(status);
      const roomName = getRoomName(room, index);

      return {
        index,
        roomName,
        progress: roomProgress,
        progressText: getRoomProgressText(roomProgress),
        searchText: getRoomSearchText({ room, index, progress: roomProgress }),
        status,
        statusMeta,
        description: getRoomStatusDescription(roomProgress, status),
      };
    })
  ), [progress, safeRooms]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roomOptions;
    return roomOptions.filter((option) => option.searchText.includes(query));
  }, [roomOptions, search]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  function handleToggle() {
    if (isDisabled) return;
    setIsOpen((current) => !current);
  }

  function handleSelect(index) {
    onChange(index);
    setIsOpen(false);
    setSearch('');
  }

  return (
    <div className="room-status-select" ref={wrapperRef}>
      <button
        type="button"
        className={`room-status-select__trigger room-status-select__trigger--${activeStatus}`}
        aria-label="Pilih ruangan opname"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={isDisabled}
        onClick={handleToggle}
      >
        <span className={`room-status-select__icon room-status-select__icon--${activeStatus}`} aria-hidden="true">
          {activeStatusMeta.icon}
        </span>
        <span className="room-status-select__main">
          <span className="room-status-select__eyebrow">
            {isDisabled ? 'Ruangan' : `Ruangan ${value + 1} dari ${safeRooms.length}`}
          </span>
          <span className="room-status-select__name" title={activeRoomName}>{activeRoomName}</span>
        </span>
        {!isDisabled && (
          <>
            <span className={`room-status-select__badge room-status-select__badge--${activeStatus}`}>
              {activeStatusMeta.label}
            </span>
            <span className="room-status-select__progress">{activeProgressText}</span>
          </>
        )}
        <ChevronDown className={isOpen ? 'room-status-select__chevron open' : 'room-status-select__chevron'} size={16} />
      </button>

      {isOpen && (
        <div className="room-status-select__popover">
          <div className="room-status-select__search">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              role="searchbox"
              aria-label="Cari ruangan"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama / nomor / status ruangan…"
              autoFocus
            />
            <span className="room-status-select__count">{safeRooms.length} ruang</span>
          </div>

          <div className="room-status-select__list" role="listbox" aria-label="Daftar ruangan opname">
            {filteredOptions.length === 0 ? (
              <div className="room-status-select__empty">Ruangan tidak ditemukan</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.index === value;

                return (
                  <button
                    key={option.index}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`room-status-select__option room-status-select__option--${option.status}${isSelected ? ' is-selected' : ''}`}
                    title={`${option.index + 1}. ${option.roomName}`}
                    onClick={() => handleSelect(option.index)}
                  >
                    <span className={`room-status-select__option-icon room-status-select__option-icon--${option.status}`} aria-hidden="true">
                      {option.statusMeta.icon}
                    </span>
                    <span className="room-status-select__option-main">
                      <span className="room-status-select__option-name">{option.index + 1}. {option.roomName}</span>
                      <span className="room-status-select__option-desc">{option.description}</span>
                    </span>
                    <span className={`room-status-select__badge room-status-select__badge--${option.status}`}>
                      {option.statusMeta.label}
                    </span>
                    <span className="room-status-select__option-progress">{option.progressText}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run component tests to verify GREEN**

Run from `app/`:

```bash
rtk npm run test -- RoomStatusSelect
```

Expected: PASS for all tests in `RoomStatusSelect.test.jsx`.

- [ ] **Step 3: Commit component implementation**

```bash
rtk git add app/src/components/RoomStatusSelect.jsx app/src/__tests__/RoomStatusSelect.test.jsx && rtk git commit -m "feat: add room status select component"
```

---

### Task 5: Integrate RoomStatusSelect into OpnamePage

**Files:**
- Modify: `app/src/pages/OpnamePage.jsx:1-214`
- Uses: `app/src/components/RoomStatusSelect.jsx`

- [ ] **Step 1: Add component import**

In `app/src/pages/OpnamePage.jsx`, add this import after `SignatureSection`:

```javascript
import RoomStatusSelect from '../components/RoomStatusSelect';
```

Imports at the top should become:

```javascript
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import AssetTable from '../components/AssetTable';
import NoBarcodeSection from '../components/NoBarcodeSection';
import NotAtLocationSection from '../components/NotAtLocationSection';
import SignatureSection from '../components/SignatureSection';
import RoomStatusSelect from '../components/RoomStatusSelect';
import { saveRoomPDF, generateAndSaveAllPDFs } from '../utils/pdfGenerator';
import { apiUrl, fetchJsonWithAuth } from '../utils/apiConfig';
```

- [ ] **Step 2: Replace native select with RoomStatusSelect**

In `app/src/pages/OpnamePage.jsx`, replace this block:

```jsx
                <select className="wa-select wa-room-nav-select" value={roomIdx} onChange={(e) => handleRoomSelect(Number(e.target.value))}>
                  {state.rooms.map((r, i) => {
                    const op = overallProgress[i];
                    const pctStr = op ? ` (${op.checked}/${op.total})` : '';
                    return <option key={i} value={i}>{i + 1}. {r.meta.roomName || r.sheetName}{pctStr}</option>;
                  })}
                </select>
```

with:

```jsx
                <RoomStatusSelect
                  rooms={state.rooms}
                  progress={overallProgress}
                  value={roomIdx}
                  onChange={handleRoomSelect}
                />
```

- [ ] **Step 3: Run focused tests after integration**

Run from `app/`:

```bash
rtk npm run test -- RoomStatusSelect opnameRoomNav
```

Expected: PASS for `RoomStatusSelect.test.jsx` and `opnameRoomNav.test.js`.

- [ ] **Step 4: Commit OpnamePage integration**

```bash
rtk git add app/src/pages/OpnamePage.jsx && rtk git commit -m "feat: use status dropdown in opname room nav"
```

---

### Task 6: Add RoomStatusSelect styling

**Files:**
- Modify: `app/src/styles/components.css:1347-1486`
- Modify: `app/src/styles/responsive.css:276-307`

- [ ] **Step 1: Add base component styles**

In `app/src/styles/components.css`, insert this block after `.wa-room-nav-select` and before `.wa-room-nav-btn`:

```css
.room-status-select {
  position: relative;
  min-width: 360px;
  flex: 1 1 420px;
  z-index: 30;
}
.room-status-select__trigger {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1.5px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--cream-surface);
  color: var(--charcoal-900);
  cursor: pointer;
  text-align: left;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.room-status-select__trigger:hover:not(:disabled),
.room-status-select__trigger[aria-expanded="true"] {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(212, 146, 74, 0.18);
  background: var(--bg-surface);
}
.room-status-select__trigger:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.room-status-select__trigger:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.room-status-select__icon,
.room-status-select__option-icon {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 900;
}
.room-status-select__icon--done,
.room-status-select__option-icon--done { background: var(--success-500); color: #ffffff; }
.room-status-select__icon--progress,
.room-status-select__option-icon--progress { background: var(--warning-500); color: #ffffff; }
.room-status-select__icon--empty,
.room-status-select__option-icon--empty { background: var(--neutral-200); color: var(--neutral-600); }
.room-status-select__main,
.room-status-select__option-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.room-status-select__eyebrow {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  color: var(--terracotta-500);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.room-status-select__name,
.room-status-select__option-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-sora);
  font-size: 13px;
  font-weight: 800;
  color: var(--charcoal-900);
}
.room-status-select__option-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  color: var(--charcoal-500);
}
.room-status-select__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}
.room-status-select__badge--done { background: var(--success-50); color: var(--success-700); border-color: var(--success-100); }
.room-status-select__badge--progress { background: var(--warning-50); color: var(--warning-600); border-color: var(--warning-100); }
.room-status-select__badge--empty { background: var(--neutral-100); color: var(--neutral-600); border-color: var(--neutral-200); }
.room-status-select__progress,
.room-status-select__option-progress {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 900;
  color: var(--charcoal-600);
  font-variant-numeric: tabular-nums;
}
.room-status-select__chevron {
  flex-shrink: 0;
  color: var(--charcoal-500);
  transition: transform 180ms ease;
}
.room-status-select__chevron.open { transform: rotate(180deg); }
.room-status-select__popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 80;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: 0 18px 44px rgba(13, 17, 23, 0.18);
}
.room-status-select__search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--cream-surface);
  color: var(--terracotta-500);
}
.room-status-select__search input {
  min-width: 0;
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--charcoal-900);
  font-family: var(--font-family);
  font-size: 13px;
  font-weight: 600;
}
.room-status-select__search input::placeholder { color: var(--charcoal-400); }
.room-status-select__count {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;
  color: var(--terracotta-500);
  text-transform: uppercase;
}
.room-status-select__list {
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
}
.room-status-select__option {
  width: 100%;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  padding: 10px 8px;
  border: none;
  border-left: 4px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 140ms ease, border-color 140ms ease;
}
.room-status-select__option:hover,
.room-status-select__option.is-selected { background: var(--accent-soft); }
.room-status-select__option--done { border-left-color: var(--success-500); }
.room-status-select__option--progress { border-left-color: var(--warning-500); }
.room-status-select__option--empty { border-left-color: var(--neutral-300); }
.room-status-select__option:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.room-status-select__empty {
  padding: 18px 12px;
  text-align: center;
  color: var(--charcoal-500);
  font-size: 13px;
  font-weight: 700;
}
```

- [ ] **Step 2: Add responsive styles**

In `app/src/styles/responsive.css`, update the tablet opname block to include `room-status-select`:

```css
/* ===== Opname tablet ===== */
@media (min-width: 768px) and (max-width: 1024px) {
  .wa-room-nav { flex-wrap: wrap; align-items: flex-start; }
  .wa-room-nav-select-group { flex: 1 1 420px; }
  .wa-room-nav-select { min-width: 0; flex: 1; }
  .room-status-select { min-width: 0; flex: 1; }
  .room-status-select__list { max-height: 280px; }
  .wa-room-nav-dots--preview { order: 3; flex-basis: 100%; }
  .wa-room-nav-grid-panel { order: 4; max-height: 260px; }
  .wa-room-nav-dot--grid { min-width: 42px; height: 42px; font-size: 12px; }
  .wa-room-meta-grid { grid-template-columns: repeat(2, 1fr); row-gap: 14px; }
  .wa-room-meta-col { border-right: none; padding: 0 14px; }
  .signature-section--three { grid-template-columns: repeat(2, 1fr) !important; }
}
```

Then update the mobile opname block to include `room-status-select`:

```css
/* ===== Opname mobile ===== */
@media (max-width: 767px) {
  .wa-room-nav { flex-wrap: wrap; gap: 10px; padding: 10px 14px; }
  .wa-room-nav-select-group { flex: 1 1 100%; }
  .wa-room-nav-select { min-width: 0; flex: 1; }
  .room-status-select { min-width: 0; flex: 1; }
  .room-status-select__trigger { min-height: 48px; padding: 8px 10px; gap: 8px; }
  .room-status-select__badge { display: none; }
  .room-status-select__progress { font-size: 11px; }
  .room-status-select__popover { position: fixed; left: 12px; right: 12px; top: auto; bottom: 12px; max-height: 70vh; }
  .room-status-select__list { max-height: 56vh; }
  .room-status-select__option { grid-template-columns: 30px minmax(0, 1fr) auto; }
  .room-status-select__option .room-status-select__badge { display: inline-flex; }
  .room-status-select__option-progress { display: none; }
  .wa-room-nav-divider { display: none; }
  .wa-room-nav-progress-group { order: 2; }
  .wa-room-nav-summary { order: 2; min-width: 76px; }
  .wa-room-nav-toggle { order: 2; margin-left: auto; }
  .wa-room-nav-dots--preview { display: none; }
  .wa-room-nav-grid-panel { order: 4; max-height: 240px; }
  .wa-room-nav-grid { grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); }
  .wa-room-nav-dot--grid { min-width: 44px; height: 44px; font-size: 13px; }
  .wa-room-meta-grid { grid-template-columns: repeat(2, 1fr); row-gap: 12px; }
  .wa-room-meta-col { border-right: none; padding: 0; }
  .opname-actions-bar { gap: 6px; }
  .signature-section--three { grid-template-columns: 1fr !important; }
  .signature-pad__canvas-wrap { height: 260px; }
}
```

- [ ] **Step 3: Run focused tests after CSS changes**

Run from `app/`:

```bash
rtk npm run test -- RoomStatusSelect opnameRoomNav
```

Expected: PASS.

- [ ] **Step 4: Commit styling**

```bash
rtk git add app/src/styles/components.css app/src/styles/responsive.css && rtk git commit -m "style: add room status dropdown styling"
```

---

### Task 7: Final verification

**Files:**
- Verify: `app/src/utils/opnameRoomNav.js`
- Verify: `app/src/__tests__/opnameRoomNav.test.js`
- Verify: `app/src/components/RoomStatusSelect.jsx`
- Verify: `app/src/__tests__/RoomStatusSelect.test.jsx`
- Verify: `app/src/pages/OpnamePage.jsx`
- Verify: `app/src/styles/components.css`
- Verify: `app/src/styles/responsive.css`

- [ ] **Step 1: Run focused tests**

Run from `app/`:

```bash
rtk npm run test -- RoomStatusSelect opnameRoomNav
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run from `app/`:

```bash
rtk npm run test
```

Expected: PASS. If unrelated existing tests fail, record exact failing test file and error output before continuing.

- [ ] **Step 3: Run production build**

Run from `app/`:

```bash
rtk npm run build
```

Expected: Vite build succeeds and writes production assets to `app/dist/`.

- [ ] **Step 4: Manual web verification**

Open `/app1/opname` with data containing done, progress, and empty rooms. Verify these exact outcomes:

- Native room `<select>` no longer appears in the room nav.
- New trigger shows room icon, `Ruangan X dari Y`, room name, status badge, progress text, and chevron.
- Done room shows `Selesai` with check icon.
- Partial room shows `Proses` with ellipsis icon.
- Zero room shows `Belum` with circle icon.
- Opening dropdown shows search input and room count.
- Searching `801` finds the room whose name or number includes 801.
- Searching `selesai` shows done rooms.
- Searching `proses` shows partial rooms.
- Searching `belum` shows empty rooms.
- Selecting a far room updates room metadata, asset list, progress ring, and trigger status.
- Clicking outside closes dropdown.
- Pressing Escape closes dropdown.
- Prev/next buttons still change rooms and update trigger status.
- `Lihat semua` grid still opens and selecting a room still works.
- Long room names truncate with ellipsis and do not overflow.

- [ ] **Step 5: Manual responsive verification**

Resize browser to 1024px, 768px, and 390px widths. Verify these exact outcomes:

- Trigger remains tappable and readable.
- Mobile badge does not crowd the room name.
- Mobile popover appears within viewport.
- Dropdown options remain easy to tap.
- Existing grid number buttons remain 44px-class tap targets on mobile.

- [ ] **Step 6: Final commit if verification required edits**

If final verification required fixes, commit them:

```bash
rtk git add app/src/utils/opnameRoomNav.js app/src/__tests__/opnameRoomNav.test.js app/src/components/RoomStatusSelect.jsx app/src/__tests__/RoomStatusSelect.test.jsx app/src/pages/OpnamePage.jsx app/src/styles/components.css app/src/styles/responsive.css && rtk git commit -m "fix: finalize opname room status dropdown"
```

If no files changed after prior task commits, skip this commit and report that verification passed without additional changes.

---

## Self-Review

- **Spec coverage:** Explicit status labels, icons, status descriptions, progress detail, search by name/number/status/progress, native select replacement, prev/next preservation, grid preservation, long-name ellipsis, empty state, outside click, Escape close, accessibility roles, and responsive behavior are covered in Tasks 1–7.
- **Placeholder scan:** No placeholders, incomplete code blocks, undefined task references, or vague test instructions remain.
- **Type/name consistency:** Plan consistently uses `RoomStatusSelect`, `rooms`, `progress`, `value`, `onChange`, `getRoomName`, `getRoomProgressText`, `getRoomSearchText`, `getRoomStatus`, `getRoomStatusDescription`, and `getRoomStatusMeta`.
