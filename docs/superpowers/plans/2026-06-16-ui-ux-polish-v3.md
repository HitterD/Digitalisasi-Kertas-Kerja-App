# KKD UI/UX Polish v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Approve v2 spec (Claude palette, dark mode, larger checkbox, barcode UX) + fix App2 sync bug + sweep legacy CSS variables + polish 8 halaman + 17 components + animation completion + remove `extract-opname.css` orphan.

**Architecture:** Single iteration over existing Warm Atelier + Claude palette system. Token-level swap via aliasing (no sweeping JSX). Component-level refactor for AssetTable (24+ var refs), BarcodeSearchModal (UX), SignaturePad (CSS class). Page-level polish for layout/typography/responsiveness. App2 sync fix: split misleading button into 2 (file picker + server fetch) with partial-error handling. Dark mode via `<html data-theme>` + anti-flash inline script.

**Tech Stack:** React 18 + Vite + react-router-dom + lucide-react. No new deps. Vitest for hook tests.

**Spec:** `docs/superpowers/specs/2026-06-16-ui-ux-polish-v3-design.md`

**File totals:** 32 modified + 6 new = 38 files.

---

## File Structure

### Foundation (Phase 1)
- `app/src/styles/tokens.css` (MODIFY) — Claude palette + `--cream-*`/`--charcoal-*`/`--terracotta-*` aliases
- `app/src/styles/components.css` (MODIFY) — add `.wa-check`, `.wa-pulse-dot`, `.wa-modal-in`, `.wa-theme-toggle`, `.wa-toast`, `.wa-btn.is-loading`, reduced-motion override, `.wa-signature-pad`, `.wa-alert`
- `app/src/styles/pages.css` (MODIFY) — `.summary-grid` responsive
- `app/src/hooks/useTheme.js` (NEW) — theme + localStorage + matchMedia
- `app/src/hooks/useReducedMotion.js` (NEW) — matchMedia wrapper
- `app/src/hooks/useKeyboardShortcuts.js` (NEW) — Cmd/Ctrl+K handler
- `app/src/hooks/useRecentBarcodes.js` (NEW) — localStorage recent list
- `app/src/components/Toast.jsx` + `Toast.css` (NEW) — toast component

### Bug Fix (Phase 2)
- `app/src/pages/ExtractOpnamePage.jsx` (MODIFY) — App2 sync split buttons, partial error handling, wa-alert

### Component Sweep (Phase 3)
- `app/src/components/AssetTable.jsx` (MODIFY) — 24+ var refs, 8 class refs, dead code removal
- `app/src/components/BarcodeSearchModal.jsx` (MODIFY) — recent + empty state + Cmd+K
- `app/src/components/BarcodeSearchModal.css` (MODIFY) — recent chip + empty state + result row
- `app/src/components/SignaturePad.jsx` (MODIFY) — wa-signature-pad class
- `app/src/components/NetworkSyncHub.jsx` (MODIFY) — sweep legacy var
- `app/src/components/MatHistoryModal.css` (MODIFY) — sweep legacy var

### Page Polish (Phase 4)
- `app/src/pages/LoginPage.jsx` (MODIFY) — wa-* migration
- `app/src/pages/BentoMenu.jsx` (MODIFY) — button→Link, theme toggle
- `app/src/pages/UploadPage.jsx` (MODIFY) — remove Card 4
- `app/src/pages/OpnamePage.jsx` (MODIFY) — mobile cards verify, padding sync
- `app/src/pages/UnifiedMasterDataPage.jsx` (MODIFY) — polish
- `app/src/pages/App3ConsolidationPage.jsx` (MODIFY) — polish
- `app/src/pages/App4RecouncilPage.jsx` (MODIFY) — polish
- `app/src/App.jsx` (MODIFY) — BARCODE CHECKER toggle, header height

### Cleanup (Phase 5)
- `app/src/extract-opname.css` (DELETE)
- `app/src/App.jsx` (MODIFY) — remove `import './extract-opname.css'`
- `app/index.html` (MODIFY) — anti-flash inline script

---

## Phase 1: Foundation

### Task 1: Update tokens.css with Claude palette + aliases

**Files:**
- Modify: `app/src/styles/tokens.css` (full file)

- [ ] **Step 1: Read current tokens.css**

Run: `read_file("D:/Digitalisasi Kertas Kerja APP/app/src/styles/tokens.css")`

Note current token definitions. Identify sections to replace.

- [ ] **Step 2: Replace palette section with Claude light + dark**

In `app/src/styles/tokens.css`, replace the color token section. Keep all other tokens (typography, spacing, radius, shadow) unchanged. Add aliasing block at end of `:root[data-theme="..."]`:

```css
/* === COLOR TOKENS (Claude.ai palette) === */
:root,
:root[data-theme="light"] {
  /* Surfaces */
  --bg-primary: #FAF9F5;
  --bg-surface: #FFFFFF;
  --bg-input: #F5F4EF;

  /* Text */
  --text-primary: #262624;
  --text-secondary: #595755;
  --text-tertiary: #8B8580;
  --text-muted: #BCB8B1;

  /* Borders */
  --border: #E8E5DE;
  --border-strong: #D4D0C8;

  /* Accent (Claude orange) */
  --accent: #D97757;
  --accent-hover: #C26A4D;
  --accent-soft: rgba(217, 119, 87, 0.10);
  --accent-glow: rgba(217, 119, 87, 0.20);
  --accent-ring: rgba(217, 119, 87, 0.12);

  /* Status */
  --success-500: #3D8C5F;
  --success-50: rgba(61, 140, 95, 0.10);
  --warning-500: #C28B1A;
  --warning-50: rgba(194, 139, 26, 0.10);
  --danger-500: #C44545;
  --danger-50: rgba(196, 69, 69, 0.10);

  /* Backward-compat aliases (v1 Warm Atelier) */
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
  /* Surfaces */
  --bg-primary: #262624;
  --bg-surface: #2D2D2B;
  --bg-input: #1F1F1D;

  /* Text */
  --text-primary: #F5F4EF;
  --text-secondary: #BCB8B1;
  --text-tertiary: #8B8580;
  --text-muted: #595755;

  /* Borders */
  --border: #3D3D3B;
  --border-strong: #4A4A48;

  /* Accent (same orange works on both) */
  --accent: #D97757;
  --accent-hover: #E58A6A;
  --accent-soft: rgba(217, 119, 87, 0.15);
  --accent-glow: rgba(217, 119, 87, 0.30);
  --accent-ring: rgba(217, 119, 87, 0.20);

  /* Status */
  --success-500: #3D8C5F;
  --success-50: rgba(61, 140, 95, 0.15);
  --warning-500: #C28B1A;
  --warning-50: rgba(194, 139, 26, 0.15);
  --danger-500: #C44545;
  --danger-50: rgba(196, 69, 69, 0.15);

  /* Backward-compat aliases (v1 Warm Atelier → dark) */
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

- [ ] **Step 3: Verify build doesn't break**

Run: `cd app && npm run build`
Expected: Build succeeds. Aliasing means no component is broken.

- [ ] **Step 4: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/styles/tokens.css
git commit -m "feat(tokens): switch to Claude palette with v1 aliases for backward compat"
```

---

### Task 2: Add new CSS classes to components.css

**Files:**
- Modify: `app/src/styles/components.css` (append at end)

- [ ] **Step 1: Append all new classes**

At the end of `app/src/styles/components.css`, append:

```css
/* === Checkbox v2 (touch-friendly) === */
.wa-check {
  appearance: none;
  width: 24px;
  height: 24px;
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

/* === Notification pulse dot (BARCODE CHECKER) === */
.wa-btn--has-notification {
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--accent);
}
.wa-btn--active { box-shadow: 0 0 0 2px var(--accent-ring); }
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

/* === Modal entrance animation === */
@keyframes wa-modal-in {
  0% { opacity: 0; transform: scale(0.95) translateY(8px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.wa-card[role="dialog"],
.wa-modal {
  animation: wa-modal-in 250ms var(--ease-out);
}

/* === Theme toggle button === */
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

/* === Loading state (sync button) === */
.wa-btn.is-loading,
.wa-btn-terracotta.is-loading {
  pointer-events: none;
  opacity: 0.85;
  position: relative;
  color: transparent;
}
.wa-btn.is-loading::after,
.wa-btn-terracotta.is-loading::after {
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
.wa-spin { animation: wa-spin 800ms linear infinite; }

/* === Alert (formatted error) === */
.wa-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid;
  margin-bottom: 14px;
}
.wa-alert--danger {
  background: var(--danger-50);
  border-color: var(--danger-500);
  color: var(--danger-500);
}
.wa-alert--success {
  background: var(--success-50);
  border-color: var(--success-500);
  color: var(--success-500);
}
.wa-alert--warning {
  background: var(--warning-50);
  border-color: var(--warning-500);
  color: var(--warning-500);
}
.wa-alert__title {
  font-weight: 600;
  margin-bottom: 2px;
}
.wa-alert__hint {
  font-size: 11px;
  opacity: 0.85;
  margin-top: 4px;
}

/* === Signature pad === */
.wa-signature-pad {
  border: 1.5px dashed var(--border-strong);
  border-radius: 8px;
  height: 90px;
  background: var(--bg-input);
  cursor: crosshair;
  transition: border-color 180ms var(--ease-out), background 180ms var(--ease-out);
}
.wa-signature-pad:hover {
  border-color: var(--accent);
  background: var(--bg-surface);
}

/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .wa-card:hover,
  .wa-btn:hover,
  .wa-check:active {
    transform: none !important;
  }
}

/* === Page transitions (theme switch smooth) === */
body,
.wa-card,
.wa-input,
.wa-table,
.wa-app-header {
  transition: background-color 200ms var(--ease-out),
              color 200ms var(--ease-out),
              border-color 200ms var(--ease-out);
}
```

- [ ] **Step 2: Verify build doesn't break**

Run: `cd app && npm run build`
Expected: Build succeeds (no JS errors; new classes are inert until used).

- [ ] **Step 3: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/styles/components.css
git commit -m "feat(css): add checkbox v2, modal-in, pulse dot, theme toggle, toast, reduced motion"
```

---

### Task 3: Add summary-grid responsive to pages.css

**Files:**
- Modify: `app/src/styles/pages.css` (append at end)

- [ ] **Step 1: Append responsive grid**

At the end of `app/src/styles/pages.css`, append:

```css
/* === Summary grid (Extract page cards) === */
.summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, 1fr);
  margin-bottom: 14px;
}
@media (max-width: 1023px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 599px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/styles/pages.css
git commit -m "feat(css): add responsive summary-grid (4-2-1 columns)"
```

---

### Task 4: useTheme hook + tests

**Files:**
- Create: `app/src/hooks/useTheme.js`
- Create: `app/src/__tests__/useTheme.test.js`

- [ ] **Step 1: Write failing test**

Create `app/src/__tests__/useTheme.test.js`:

```js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../hooks/useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-pref');
  });

  it('defaults to "system" when no localStorage entry', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
  });

  it('reads stored theme from localStorage', () => {
    localStorage.setItem('kkd-theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('applies data-theme to <html> on mount', () => {
    localStorage.setItem('kkd-theme', 'dark');
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggle() flips between light and dark', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
  });

  it('persists theme to localStorage on change', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(localStorage.getItem('kkd-theme')).toBe('dark');
  });

  it('resolves "system" to "light" or "dark" based on prefers-color-scheme', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolved).toBe('dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- useTheme`
Expected: FAIL with "Cannot find module '../hooks/useTheme'"

- [ ] **Step 3: Implement useTheme hook**

Create `app/src/hooks/useTheme.js`:

```js
import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'kkd-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem(STORAGE_KEY) || 'system';
}

function resolveTheme(theme) {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-theme-pref', theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [resolved, setResolved] = useState(() => resolveTheme(getInitialTheme()));

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // localStorage unavailable
    }
    setResolved(resolveTheme(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      applyTheme('system');
      setResolved(resolveTheme('system'));
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((next) => setThemeState(next), []);
  const toggle = useCallback(
    () => setThemeState((t) => (resolveTheme(t) === 'dark' ? 'light' : 'dark')),
    []
  );

  return { theme, resolved, setTheme, toggle };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- useTheme`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/hooks/useTheme.js app/src/__tests__/useTheme.test.js
git commit -m "feat(hooks): add useTheme with localStorage + prefers-color-scheme"
```

---

### Task 5: useReducedMotion hook + tests

**Files:**
- Create: `app/src/hooks/useReducedMotion.js`
- Create: `app/src/__tests__/useReducedMotion.test.js`

- [ ] **Step 1: Write failing test**

Create `app/src/__tests__/useReducedMotion.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from '../hooks/useReducedMotion';

describe('useReducedMotion', () => {
  let matchMediaMock;

  beforeEach(() => {
    matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;
  });

  it('returns true when prefers-reduced-motion is reduce', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('returns false when prefers-reduced-motion is no-preference', () => {
    matchMediaMock.mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- useReducedMotion`
Expected: FAIL

- [ ] **Step 3: Implement hook**

Create `app/src/hooks/useReducedMotion.js`:

```js
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- useReducedMotion`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/hooks/useReducedMotion.js app/src/__tests__/useReducedMotion.test.js
git commit -m "feat(hooks): add useReducedMotion for prefers-reduced-motion"
```

---

### Task 6: useRecentBarcodes hook + tests

**Files:**
- Create: `app/src/hooks/useRecentBarcodes.js`
- Create: `app/src/__tests__/useRecentBarcodes.test.js`

- [ ] **Step 1: Write failing test**

Create `app/src/__tests__/useRecentBarcodes.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentBarcodes } from '../hooks/useRecentBarcodes';

describe('useRecentBarcodes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty list', () => {
    const { result } = renderHook(() => useRecentBarcodes(5));
    expect(result.current.recent).toEqual([]);
  });

  it('add() prepends a barcode', () => {
    const { result } = renderHook(() => useRecentBarcodes(5));
    act(() => result.current.add('BC001'));
    expect(result.current.recent).toEqual(['BC001']);
  });

  it('add() moves existing barcode to front', () => {
    const { result } = renderHook(() => useRecentBarcodes(5));
    act(() => result.current.add('BC001'));
    act(() => result.current.add('BC002'));
    act(() => result.current.add('BC001'));
    expect(result.current.recent).toEqual(['BC001', 'BC002']);
  });

  it('add() caps at max entries (FIFO)', () => {
    const { result } = renderHook(() => useRecentBarcodes(2));
    act(() => result.current.add('BC001'));
    act(() => result.current.add('BC002'));
    act(() => result.current.add('BC003'));
    expect(result.current.recent).toEqual(['BC003', 'BC002']);
  });

  it('clear() empties the list', () => {
    const { result } = renderHook(() => useRecentBarcodes(5));
    act(() => result.current.add('BC001'));
    act(() => result.current.clear());
    expect(result.current.recent).toEqual([]);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useRecentBarcodes(5));
    act(() => result.current.add('BC001'));
    expect(JSON.parse(localStorage.getItem('barcode-recent'))).toEqual(['BC001']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- useRecentBarcodes`
Expected: FAIL

- [ ] **Step 3: Implement hook**

Create `app/src/hooks/useRecentBarcodes.js`:

```js
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'barcode-recent';

function readFromStorage(max) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, max) : [];
  } catch (e) {
    return [];
  }
}

function writeToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    // localStorage unavailable
  }
}

export function useRecentBarcodes(max = 5) {
  const [recent, setRecent] = useState(() => readFromStorage(max));

  useEffect(() => {
    writeToStorage(recent);
  }, [recent]);

  const add = useCallback(
    (barcode) => {
      const code = String(barcode || '').trim();
      if (!code) return;
      setRecent((prev) => {
        const filtered = prev.filter((b) => b !== code);
        return [code, ...filtered].slice(0, max);
      });
    },
    [max]
  );

  const clear = useCallback(() => setRecent([]), []);

  return { recent, add, clear };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- useRecentBarcodes`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/hooks/useRecentBarcodes.js app/src/__tests__/useRecentBarcodes.test.js
git commit -m "feat(hooks): add useRecentBarcodes (localStorage FIFO list)"
```

---

### Task 7: useKeyboardShortcuts hook + tests

**Files:**
- Create: `app/src/hooks/useKeyboardShortcuts.js`
- Create: `app/src/__tests__/useKeyboardShortcuts.test.js`

- [ ] **Step 1: Write failing test**

Create `app/src/__tests__/useKeyboardShortcuts.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let handler;

  beforeEach(() => {
    handler = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers handler on Cmd+K (Mac)', () => {
    renderHook(() => useKeyboardShortcuts({ 'mod+k': handler }));
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('triggers handler on Ctrl+K (Windows)', () => {
    renderHook(() => useKeyboardShortcuts({ 'mod+k': handler }));
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not trigger on plain K (no modifier)', () => {
    renderHook(() => useKeyboardShortcuts({ 'mod+k': handler }));
    fireEvent.keyDown(document, { key: 'k' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('prevents default on match', () => {
    renderHook(() => useKeyboardShortcuts({ 'mod+k': handler }));
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('supports Esc shortcut', () => {
    renderHook(() => useKeyboardShortcuts({ 'escape': handler }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('unregisters on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts({ 'mod+k': handler }));
    unmount();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- useKeyboardShortcuts`
Expected: FAIL

- [ ] **Step 3: Implement hook**

Create `app/src/hooks/useKeyboardShortcuts.js`:

```js
import { useEffect } from 'react';

function parseShortcut(spec) {
  const parts = String(spec).toLowerCase().split('+').map((s) => s.trim());
  const result = { key: '', mod: false, ctrl: false, shift: false, alt: false };
  for (const part of parts) {
    if (part === 'mod' || part === 'cmd' || part === 'meta') {
      result.mod = true;
      result.ctrl = true; // match both
    } else if (part === 'ctrl') {
      result.ctrl = true;
    } else if (part === 'shift') {
      result.shift = true;
    } else if (part === 'alt') {
      result.alt = true;
    } else if (part === 'escape' || part === 'esc') {
      result.key = 'escape';
    } else {
      result.key = part;
    }
  }
  return result;
}

function matchShortcut(event, spec) {
  if (event.key.toLowerCase() !== spec.key) return false;
  if (spec.mod && !(event.metaKey || event.ctrlKey)) return false;
  if (spec.ctrl && !event.ctrlKey && !event.metaKey) return false;
  if (spec.shift !== event.shiftKey) return false;
  if (spec.alt !== event.altKey) return false;
  return true;
}

export function useKeyboardShortcuts(map) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = (event) => {
      for (const [spec, fn] of Object.entries(map)) {
        if (typeof fn !== 'function') continue;
        const parsed = parseShortcut(spec);
        if (matchShortcut(event, parsed)) {
          event.preventDefault();
          fn(event);
          break;
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [map]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- useKeyboardShortcuts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/hooks/useKeyboardShortcuts.js app/src/__tests__/useKeyboardShortcuts.test.js
git commit -m "feat(hooks): add useKeyboardShortcuts (mod+k, esc, etc)"
```

---

### Task 8: Toast component (Toast.jsx + Toast.css)

**Files:**
- Create: `app/src/components/Toast.jsx`
- Create: `app/src/components/Toast.css`
- Create: `app/src/__tests__/Toast.test.js`

- [ ] **Step 1: Write failing test**

Create `app/src/__tests__/Toast.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Toast from '../components/Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message', () => {
    render(<Toast type="success" message="Saved" onClose={() => {}} />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('applies type class', () => {
    const { container } = render(<Toast type="danger" message="Error" onClose={() => {}} />);
    expect(container.querySelector('.wa-toast--danger')).toBeInTheDocument();
  });

  it('auto-dismisses after duration', () => {
    const onClose = vi.fn();
    render(<Toast type="success" message="Hi" duration={1000} onClose={onClose} />);
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not auto-dismiss when duration is 0', () => {
    const onClose = vi.fn();
    render(<Toast type="success" message="Hi" duration={0} onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- Toast`
Expected: FAIL

- [ ] **Step 3: Create Toast.css**

Create `app/src/components/Toast.css`:

```css
.wa-toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.wa-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  min-width: 280px;
  max-width: 420px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  font-size: 12px;
  color: var(--text-primary);
  animation: wa-toast-in 250ms var(--ease-out);
  pointer-events: auto;
}
.wa-toast--success { border-left-color: var(--success-500); }
.wa-toast--danger  { border-left-color: var(--danger-500); }
.wa-toast--warning { border-left-color: var(--warning-500); }
.wa-toast__title { font-weight: 600; margin-bottom: 2px; }
.wa-toast__body { color: var(--text-secondary); }
.wa-toast__close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
}
.wa-toast__close:hover { color: var(--text-primary); }
@keyframes wa-toast-in {
  0% { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 4: Create Toast.jsx**

Create `app/src/components/Toast.jsx`:

```jsx
import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import './Toast.css';

const ICONS = {
  success: CheckCircle2,
  danger: AlertCircle,
  warning: AlertTriangle,
};

export default function Toast({ type = 'success', title, message, duration = 3000, onClose }) {
  useEffect(() => {
    if (!duration || typeof onClose !== 'function') return undefined;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const Icon = ICONS[type] || CheckCircle2;
  const iconColor =
    type === 'success' ? 'var(--success-500)' :
    type === 'danger' ? 'var(--danger-500)' :
    type === 'warning' ? 'var(--warning-500)' :
    'var(--accent)';

  return (
    <div className={`wa-toast wa-toast--${type}`} role="status">
      <Icon size={16} color={iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        {title && <div className="wa-toast__title">{title}</div>}
        {message && <div className="wa-toast__body">{message}</div>}
      </div>
      {typeof onClose === 'function' && (
        <button className="wa-toast__close" onClick={onClose} aria-label="Tutup">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd app && npm test -- Toast`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/components/Toast.jsx app/src/components/Toast.css app/src/__tests__/Toast.test.js
git commit -m "feat(toast): add Toast component with auto-dismiss + type variants"
```

---

### Task 9: Anti-flash inline script in index.html

**Files:**
- Modify: `app/index.html`

- [ ] **Step 1: Read index.html head section**

Run: `read_file("D:/Digitalisasi Kertas Kerja APP/app/index.html", limit: 30)`

- [ ] **Step 2: Prepend anti-flash script**

In `app/index.html`, immediately after `<head>`, before any other content, insert:

```html
<script>
  (function() {
    try {
      var theme = localStorage.getItem('kkd-theme') || 'system';
      var resolved = theme === 'system'
        ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.setAttribute('data-theme-pref', theme);
    } catch (e) {
      // Silent fail: default to light theme
    }
  })();
</script>
```

- [ ] **Step 3: Verify build**

Run: `cd app && npm run build`
Expected: Build succeeds. No FOUC on reload.

- [ ] **Step 4: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/index.html
git commit -m "feat(html): add anti-flash inline script for dark mode"
```

---

## Phase 2: App2 Sync Bug Fix (Critical)

### Task 10: Fix App2 sync button + partial error handling

**Files:**
- Modify: `app/src/pages/ExtractOpnamePage.jsx`

- [ ] **Step 1: Update handleSync to aggregate errors**

In `app/src/pages/ExtractOpnamePage.jsx`, find the `handleSync` useCallback (around line 182-224). Replace the success checks and state updates:

```js
const handleSync = useCallback(async () => {
  if (!selectedPeriod) return;
  setLoading(true);
  setError('');
  setSynced(false);

  try {
    const [scannedRes, notScannedRes, app1Res] = await Promise.all([
      fetchWithAuth(apiUrl(`/api/db/opname-data/${encodeURIComponent(selectedPeriod)}`)),
      fetchWithAuth(apiUrl(`/api/db/opname-not-scanned/${encodeURIComponent(selectedPeriod)}`)),
      fetchWithAuth(apiUrl(`/api/app1/opname-data/${encodeURIComponent(selectedPeriod)}`))
    ]);

    const scannedJson = await scannedRes.json();
    const notScannedJson = await notScannedRes.json();
    const app1Json = await app1Res.json();

    // Aggregate per-endpoint errors instead of all-or-nothing
    const errors = [];
    let successCount = 0;

    if (scannedJson.success) {
      setScannedData(scannedJson.data);
      successCount++;
    } else {
      errors.push(`Data terscan: ${scannedJson.error || 'gagal'}`);
    }

    if (notScannedJson.success) {
      setNotScannedData(notScannedJson.data);
      successCount++;
    } else {
      errors.push(`Data tidak terscan: ${notScannedJson.error || 'gagal'}`);
    }

    if (app1Json.success && Array.isArray(app1Json.data)) {
      const newApp1Map = new Map();
      app1Json.data.forEach(item => {
        const barcode = item.barcode || item.BARCODE_ASSET;
        if (barcode) {
          newApp1Map.set(String(barcode).trim().toUpperCase(), item);
        }
      });
      setApp1DataMap(newApp1Map);
      successCount++;
    }

    if (successCount > 0) {
      setSynced(true);
    }

    if (errors.length > 0) {
      setError(`Sinkronisasi partial (${successCount}/3 endpoint berhasil): ${errors.join('; ')}`);
    } else {
      setError('');
    }
  } catch (err) {
    setError(err.message);
    console.error('Sync failed:', err);
  } finally {
    setLoading(false);
  }
}, [selectedPeriod]);
```

- [ ] **Step 2: Split upload + sync buttons**

In the filter+upload card (around line 421), replace the single button with two buttons:

```jsx
<input type="file" accept=".xlsx,.xls" onChange={handleOracleUpload} style={{ display: 'none' }} ref={oracleInputRef} />
<div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
  <button
    className="wa-btn-ghost"
    onClick={() => oracleInputRef.current?.click()}
    title="Pilih file Excel master data"
  >
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
```

- [ ] **Step 3: Add Loader2 import**

In the imports at the top of the file, add `Loader2` to the lucide-react import:

```jsx
import { Download, RefreshCw, Database, ChevronDown, ChevronRight, FileSpreadsheet, Search, Upload, Building2, ScanLine, AlertCircle, XCircle, CheckCircle2, Eye, Loader2 } from 'lucide-react';
```

- [ ] **Step 4: Replace raw error banner with wa-alert**

Find the error banner at line ~369:

```jsx
{error && (
  <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14, color: '#dc2626', fontSize: '0.875rem' }}>
    {error}
  </div>
)}
```

Replace with:

```jsx
{error && (
  <div className="wa-alert wa-alert--danger">
    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
    <div>
      <div className="wa-alert__title">Sinkronisasi gagal</div>
      <div>{error}</div>
      <div className="wa-alert__hint">
        Cek koneksi SQL Server (192.168.2.111) atau pilih periode lain.
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Verify build**

Run: `cd app && npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Manual smoke test**

1. Start dev server: `cd app && npm run dev`
2. Login, navigate to App2 (Extract)
3. Pilih periode → klik "Sinkron Data Opname" → spinner muncul, summary cards populated
4. Klik "Pilih File" → file picker muncul
5. Verify "Sinkron Data Opname" disabled saat no periode dipilih

- [ ] **Step 7: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/pages/ExtractOpnamePage.jsx
git commit -m "fix(app2): split sinkronisasi button + partial error handling + wa-alert"
```

---

### Task 11: Apply responsive summary-grid class to App2

**Files:**
- Modify: `app/src/pages/ExtractOpnamePage.jsx`

- [ ] **Step 1: Replace inline grid style**

Find the 4 summary cards section (around line 429):

```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
```

Replace with:

```jsx
<div className="summary-grid">
```

- [ ] **Step 2: Verify build + visual**

Run: `cd app && npm run build`
Expected: Build succeeds. Open App2 in browser at 1023px width → 2x2 grid. At 599px width → 1 column.

- [ ] **Step 3: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/pages/ExtractOpnamePage.jsx
git commit -m "style(app2): apply responsive summary-grid class (4-2-1 columns)"
```

---

## Phase 3: Component Sweep

### Task 12: AssetTable — sweep 24+ legacy CSS variable references

**Files:**
- Modify: `app/src/components/AssetTable.jsx`

- [ ] **Step 1: Apply all 24+ var ref replacements**

In `app/src/components/AssetTable.jsx`, use Edit with `replace_all: true` for each global pattern. Exact replacements:

| Find | Replace With |
|---|---|
| `var(--warm-100)` | `var(--bg-input)` |
| `var(--warm-200)` | `var(--border)` |
| `var(--blue-700)` | `var(--accent)` |
| `var(--neutral-400)` | `var(--text-muted)` |
| `var(--neutral-600)` | `var(--text-tertiary)` |
| `var(--neutral-200)` | `var(--border)` |
| `var(--neutral-50)` | `var(--bg-input)` |
| `var(--success-600)` | `var(--success-500)` |
| `var(--success-200)` | `rgba(61, 140, 95, 0.2)` |
| `var(--danger-600)` | `var(--danger-500)` |
| `var(--danger-200)` | `rgba(196, 69, 69, 0.2)` |
| `var(--primary-700)` | `var(--text-primary)` |
| `var(--primary-50)` | `var(--bg-input)` |
| `var(--primary-200)` | `var(--border)` |
| `var(--warning-700)` | `var(--warning-500)` |
| `var(--warning-50)` | `var(--bg-input)` |
| `var(--warning-200)` | `rgba(194, 139, 26, 0.2)` |
| `var(--success-700)` | `var(--success-500)` |
| `var(--success-50)` | `var(--bg-input)` |
| `var(--danger-700)` | `var(--danger-500)` |
| `var(--danger-50)` | `var(--bg-input)` |
| `var(--font-size-xs)` | `'0.75rem'` |

For each replacement, use Edit with `replace_all: true`:
```js
old_string: "var(--warm-100)"
new_string: "var(--bg-input)"
replace_all: true
```

- [ ] **Step 2: Verify build**

Run: `cd app && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/components/AssetTable.jsx
git commit -m "refactor(AssetTable): sweep 24+ legacy CSS variable references"
```

---

### Task 13: AssetTable — sweep legacy classes + remove dead code

**Files:**
- Modify: `app/src/components/AssetTable.jsx`

- [ ] **Step 1: Verify KONDISI_CLASS is dead code**

Run:
```bash
cd "D:/Digitalisasi Kertas Kerja APP" && grep -rn "KONDISI_CLASS\|tg-btn--active" app/src
```

Expected: Returns only the 2 definitions in AssetTable.jsx. If elsewhere, **STOP** and keep constants.

- [ ] **Step 2: Remove KONDISI_CLASS + tg-btn--active-* dead code**

Find lines 5-11 in AssetTable.jsx:

```js
const KONDISI_CLASS = {
    'Baik': 'tg-btn--active-green',
    'Rusak': 'tg-btn--active-red',
    'Cetak Ulang': 'tg-btn--active-warning',
    'Salah Ruangan': 'tg-btn--active-warning',
    'Pending': 'tg-btn--active-neutral',
};
```

Replace with empty block:
```js
// KONDISI_CLASS removed in v3 — dead code, replaced by KondisiDropdown dynamic styling
```

- [ ] **Step 3: Replace checkbox-opname → wa-check**

Find line 147:
```jsx
<input
  type="checkbox"
  className="checkbox-opname"
  checked={asset.isChecked}
  onChange={() => onToggleCheck(roomIndex, i)}
/>
```

Replace with (wrap in label for 44px touch target):
```jsx
<label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, cursor: 'pointer' }}>
  <input
    type="checkbox"
    className="wa-check"
    checked={asset.isChecked}
    onChange={() => onToggleCheck(roomIndex, i)}
  />
</label>
```

- [ ] **Step 4: Replace form-input--compact → wa-input**

Use Edit with `replace_all: true`:
```js
old_string: "form-input form-input--compact ghost-input"
new_string: "wa-input"
replace_all: true
```

Note: also collapses `ghost-input` (style included in `wa-input`).

- [ ] **Step 5: Replace form-select form-input--compact → wa-select**

Use Edit with `replace_all: true`:
```js
old_string: "form-select form-input--compact"
new_string: "wa-select"
replace_all: true
```

- [ ] **Step 6: Remove `editable-row` class**

Use Edit with `replace_all: true`:
```js
old_string: 'editable-row'
new_string: ''
replace_all: true
```

Or remove the className attribute entirely if `editable-row` is the only class.

- [ ] **Step 7: Replace btn--outline → wa-btn-ghost, btn--icon → wa-btn-icon, btn--sm → ''**

Apply replacements:
```js
"btn btn--outline" → "wa-btn-ghost"  (replace_all)
"btn--icon" → "wa-btn-icon"  (replace_all)
"btn--sm" → ""  (replace_all)
```

- [ ] **Step 8: Verify build**

Run: `cd app && npm run build`
Expected: Build succeeds.

- [ ] **Step 9: Verify no remaining legacy class**

Run:
```bash
cd "D:/Digitalisasi Kertas Kerja APP" && grep -rn "checkbox-opname\|form-input--compact\|ghost-input\|btn--outline\|btn--icon\|btn--sm\|editable-row\|tg-btn--active" app/src
```

Expected: 0 results.

- [ ] **Step 10: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/components/AssetTable.jsx
git commit -m "refactor(AssetTable): sweep legacy classes + remove dead KONDISI_CLASS code"
```

---

### Task 14: NetworkSyncHub — sweep legacy var

**Files:**
- Modify: `app/src/components/NetworkSyncHub.jsx`

- [ ] **Step 1: Find legacy var refs**

Run: `cd "D:/Digitalisasi Kertas Kerja APP" && grep -n "var(--warm-\|var(--neutral-\|var(--blue-\|var(--primary-\|var(--success-6\|var(--success-7\|var(--danger-6\|var(--danger-7\|var(--warning-7\|var(--font-size-xs)" app/src/components/NetworkSyncHub.jsx`

- [ ] **Step 2: Apply same replacements as Task 12**

For each finding, replace with the new token per the table in Task 12 step 1.

- [ ] **Step 3: Verify build + commit**

Run: `cd app && npm run build`
```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/components/NetworkSyncHub.jsx
git commit -m "refactor(NetworkSyncHub): sweep legacy CSS variable references"
```

---

### Task 15: MatHistoryModal.css — sweep legacy var

**Files:**
- Modify: `app/src/components/MatHistoryModal.css`

- [ ] **Step 1: Find legacy var refs**

Run: `cd "D:/Digitalisasi Kertas Kerja APP" && grep -n "var(--warm-\|var(--neutral-\|var(--blue-\|var(--primary-\|var(--success-6\|var(--success-7\|var(--danger-6\|var(--danger-7\|var(--warning-7\|var(--font-size-xs)" app/src/components/MatHistoryModal.css`

- [ ] **Step 2: Apply same replacements as Task 12**

For each finding, replace with the new token per the table in Task 12 step 1.

- [ ] **Step 3: Verify build + commit**

Run: `cd app && npm run build`
```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/components/MatHistoryModal.css
git commit -m "refactor(MatHistoryModal): sweep legacy CSS variable references"
```

---

### Task 16: SignaturePad — apply wa-signature-pad class

**Files:**
- Modify: `app/src/components/SignaturePad.jsx`

- [ ] **Step 1: Find inline signature pad styles**

Run: `cd "D:/Digitalisasi Kertas Kerja APP" && grep -n "dashed\|border:" app/src/components/SignaturePad.jsx`

- [ ] **Step 2: Apply className**

Find the canvas/wrapper element. Replace inline styles:

```jsx
// Before
<canvas style={{ border: '1.5px dashed rgba(26,26,26,0.15)', borderRadius: 8, height: 90, background: '#FAF6EF' }} />

// After
<canvas className="wa-signature-pad" />
```

(or wrap in div if canvas has fixed width styling needs).

- [ ] **Step 3: Verify + commit**

Run: `cd app && npm run build`
```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/components/SignaturePad.jsx
git commit -m "refactor(SignaturePad): use wa-signature-pad class"
```

---

### Task 17: BarcodeSearchModal — add recent searches + empty state

**Files:**
- Modify: `app/src/components/BarcodeSearchModal.jsx`
- Modify: `app/src/components/BarcodeSearchModal.css`

- [ ] **Step 1: Add useRecentBarcodes hook + state**

In `app/src/components/BarcodeSearchModal.jsx`, add import + state at top of component:

```jsx
import { useRecentBarcodes } from '../hooks/useRecentBarcodes';
// ...
export default function BarcodeSearchModal({ isOpen, onClose, onNewScan }) {
  const { masterDb, historyDb } = useOpname();
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState(null);
  const [historyResult, setHistoryResult] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showMatHistory, setShowMatHistory] = useState(false);
  const { recent, add: addRecent, clear: clearRecent } = useRecentBarcodes(5);
  const inputRef = useRef(null);
  // ...
```

- [ ] **Step 2: Add recent + empty state UI**

In the modal JSX, after the search input, add recent chips and empty state:

```jsx
{/* Recent searches */}
{!hasSearched && recent.length > 0 && (
  <div className="barcode-recent-strip">
    <span className="barcode-recent-label">TERAKHIR</span>
    {recent.map((code) => (
      <button
        key={code}
        className="barcode-recent-chip"
        onClick={() => {
          setBarcode(code);
          setTimeout(() => handleSearch({ preventDefault: () => {} }), 50);
        }}
      >
        {code}
      </button>
    ))}
    <button className="barcode-recent-clear" onClick={clearRecent}>Clear</button>
  </div>
)}

{/* Empty state */}
{!hasSearched && (
  <div className="barcode-empty-state">
    <ScanLine size={48} strokeWidth={1.5} />
    <p>Scan barcode menggunakan scanner USB, atau ketik manual di kolom pencarian di atas.</p>
    <p className="barcode-empty-shortcut">Shortcut: ⌘K (Mac) / Ctrl+K (Windows)</p>
  </div>
)}
```

- [ ] **Step 3: Add ScanLine to imports**

Add `ScanLine` to lucide-react import at top.

- [ ] **Step 4: Add CSS for new elements**

Append to `app/src/components/BarcodeSearchModal.css`:

```css
.barcode-recent-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
  background: var(--bg-input);
}
.barcode-recent-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.1em;
  margin-right: 4px;
}
.barcode-recent-chip {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 160ms var(--ease-out);
}
.barcode-recent-chip:hover {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent);
}
.barcode-recent-clear {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.barcode-recent-clear:hover { color: var(--text-primary); }
.barcode-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-tertiary);
}
.barcode-empty-state p {
  margin: 8px 0 0;
  font-size: 12px;
  max-width: 320px;
  line-height: 1.5;
}
.barcode-empty-shortcut {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-top: 16px !important;
}
```

- [ ] **Step 5: Track new scans in handleSearch**

In `handleSearch` function, after successful lookup, add to recent:

```js
const handleSearch = (e) => {
  e.preventDefault();
  const trimCode = barcode.trim();
  if (!trimCode) return;

  addRecent(trimCode);
  if (typeof onNewScan === 'function') onNewScan(trimCode);

  const data = lookupBarcode(masterDb, trimCode);
  const histData = lookupBarcodeHistory(historyDb, trimCode);
  setResult(data);
  setHistoryResult(histData);
  setHasSearched(true);
};
```

- [ ] **Step 6: Verify + commit**

Run: `cd app && npm run build`
```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/components/BarcodeSearchModal.jsx app/src/components/BarcodeSearchModal.css
git commit -m "feat(BarcodeSearchModal): add recent searches + empty state + Cmd+K hint"
```

---

## Phase 4: Page Polish

### Task 18: BentoMenu — button → Link + theme toggle

**Files:**
- Modify: `app/src/pages/BentoMenu.jsx`

- [ ] **Step 1: Add useTheme import + useNavigate keep**

Add to imports:
```jsx
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';
```

- [ ] **Step 2: Use theme hook in component**

Inside the component function, after `useNavigate`:
```jsx
const navigate = useNavigate();
const { resolved, toggle } = useTheme();
```

- [ ] **Step 3: Replace `<button onClick={navigate}>` with `<Link>`**

Find the visible apps loop. Replace each card button with Link:

```jsx
<Link
  key={app.id}
  to={app.path}
  className="wa-card"
  style={{...existing card styles, textAlign: 'left', textDecoration: 'none', display: 'block', border: 'none'}}
>
  {/* existing inner content */}
</Link>
```

- [ ] **Step 4: Add theme toggle button to top bar**

In the top bar JSX, add before user info / logout:

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

- [ ] **Step 5: Verify + commit**

Run: `cd app && npm run build`
```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/pages/BentoMenu.jsx
git commit -m "refactor(BentoMenu): button→Link + add theme toggle in top bar"
```

---

### Task 19: UploadPage — remove Card 4 (Database Master Aset)

**Files:**
- Modify: `app/src/pages/UploadPage.jsx`

- [ ] **Step 1: Find Card 4 JSX**

Find the Card 4 block (around line 164-183). It contains:
```jsx
{/* Card 4: Database Master Aset (full-width) */}
<div className="wa-card" style={{ gridColumn: 'span 2', padding: 22 }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
    {/* icon-wrap + title + status */}
  </div>
  <div style={{ padding: 14, background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10 }}>
    {/* status info */}
  </div>
  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
    <button className="wa-btn-ghost">Sinkron Ulang</button>
    <button className="wa-btn-ghost">Upload File</button>
  </div>
</div>
```

- [ ] **Step 2: Delete the entire Card 4 block**

Remove all JSX from `<!-- Card 4 -->` to closing `</div>` of Card 4.

- [ ] **Step 3: Adjust grid layout**

Change:
```jsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
```

To:
```jsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
  <SavedSessionCard />
  <NetworkSyncHub />
  <div style={{ gridColumn: 'span 2' }}>
    <DatabaseUploadGrid />
  </div>
</div>
```

Remove the outer wrapping `wa-card` div since DatabaseUploadGrid is already wrapped.

- [ ] **Step 4: Verify + commit**

Run: `cd app && npm run build`
Expected: Build succeeds. UploadPage shows 2 cards in row + 1 full-width card (DatabaseUploadGrid). No Card 4.
```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/pages/UploadPage.jsx
git commit -m "refactor(UploadPage): remove Card 4 (duplicated DatabaseUploadGrid)"
```

---

### Task 20: App.jsx — update BARCODE CHECKER button + header height

**Files:**
- Modify: `app/src/App.jsx`

- [ ] **Step 1: Find App1Layout BARCODE CHECKER button**

Find the button that opens BarcodeSearchModal. Currently looks like:
```jsx
<button className="wa-btn" onClick={() => setIsSearchOpen(true)}>
  BARCODE CHECKER
</button>
```

- [ ] **Step 2: Update button to toggle state + newScanCount**

```jsx
<button
  className={`wa-btn ${hasNewScans ? 'wa-btn--has-notification' : ''} ${isSearchOpen ? 'wa-btn--active' : ''}`}
  onClick={() => setIsSearchOpen(true)}
  title="Cek barcode (Cmd+K)"
>
  <Search size={16} strokeWidth={3} />
  BARCODE CHECKER
  {hasNewScans && (
    <span className="wa-pulse-dot" aria-label={`${newScanCount} hasil baru`}>
      {newScanCount > 99 ? '99+' : newScanCount} BARU
    </span>
  )}
</button>
```

- [ ] **Step 3: Add state in App1Layout**

Find App1Layout function. Add:
```jsx
function App1Layout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [newScanCount, setNewScanCount] = useState(0);
  const resetNewScanCount = useCallback(() => setNewScanCount(0), []);
  // ...
```

- [ ] **Step 4: Pass onNewScan callback to BarcodeSearchModal**

```jsx
<BarcodeSearchModal
  isOpen={isSearchOpen}
  onClose={() => {
    setIsSearchOpen(false);
    resetNewScanCount();
  }}
  onNewScan={() => setNewScanCount((c) => c + 1)}
/>
```

- [ ] **Step 5: Sync header height via wa-app-header class**

Find inline `padding: '12px 24px'` in headers (BentoMenu, App1Layout, App2Layout). Replace inline padding with class:

```jsx
// Before
<header style={{ padding: '12px 24px', ... }}>

// After
<header className="wa-app-header" style={{...}}>
```

- [ ] **Step 6: Verify + commit**

Run: `cd app && npm run build`
```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/App.jsx
git commit -m "feat(App): BARCODE CHECKER toggle w/ notification + use wa-app-header class"
```

---

### Task 21: OpnamePage — mobile cards verify + sync palette

**Files:**
- Modify: `app/src/pages/OpnamePage.jsx`

- [ ] **Step 1: Find mobile card markup**

Run: `cd "D:/Digitalisasi Kertas Kerja APP" && grep -n "opname-asset-cards\|opname-asset-table-wrapper" app/src/pages/OpnamePage.jsx`

- [ ] **Step 2: Verify CSS exists**

Run: `cd "D:/Digitalisasi Kertas Kerja APP" && grep -n "opname-asset-cards\|opname-asset-table-wrapper" app/src/styles/*.css`

If missing, append to `pages.css`:
```css
.opname-asset-table-wrapper { display: block; }
.opname-asset-cards { display: none; }
@media (max-width: 767px) {
  .opname-asset-table-wrapper { display: none; }
  .opname-asset-cards { display: block; }
}
```

- [ ] **Step 3: Apply wa-app-body class if not already**

Find `className="opname-page"` or similar. Replace outer wrapper with `<div className="wa-app-body">`.

- [ ] **Step 4: Verify + commit**

Run: `cd app && npm run build`
```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/pages/OpnamePage.jsx app/src/styles/pages.css
git commit -m "style(OpnamePage): verify mobile cards + sync wa-app-body class"
```

---

### Task 22: LoginPage — migrate to wa-* system

**Files:**
- Modify: `app/src/pages/LoginPage.jsx`
- Modify: `app/src/index.css` (remove lp-* classes)

- [ ] **Step 1: Find LoginPage JSX and lp-* classes**

Run: `cd "D:/Digitalisasi Kertas Kerja APP" && grep -n "lp-\|className=" app/src/pages/LoginPage.jsx | head -30`

- [ ] **Step 2: Apply wa-* classes to LoginPage**

Replace `className="lp-..."` with `className="wa-..."` equivalents (per design system). Key replacements:
- `lp-card` → `wa-card`
- `lp-input` → `wa-input`
- `lp-btn` → `wa-btn`
- `lp-title` → use Sora 600 26px styling
- `lp-subtitle` → use Sora 400 13px secondary

- [ ] **Step 3: Remove lp-* classes from index.css**

Run:
```bash
cd "D:/Digitalisasi Kertas Kerja APP" && grep -n "^\.lp-\|^  \.lp-" app/src/index.css
```

Delete all `.lp-*` CSS rules.

- [ ] **Step 4: Verify + commit**

Run: `cd app && npm run build`
```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/pages/LoginPage.jsx app/src/index.css
git commit -m "refactor(LoginPage): migrate to wa-* system + remove lp-* classes"
```

---

### Task 23: App3 pages polish (UnifiedMasterData, App3Consolidation, App4Recouncil)

**Files:**
- Modify: `app/src/pages/UnifiedMasterDataPage.jsx`
- Modify: `app/src/pages/App3ConsolidationPage.jsx`
- Modify: `app/src/pages/App4RecouncilPage.jsx`

- [ ] **Step 1: Apply wa-app-body class to all 3 pages**

Find outermost `<div className="...">`. Replace with `<div className="wa-app-body">`.

- [ ] **Step 2: Sweep any inline `rgba(...)` shadows → var(--shadow-*) tokens**

In each page, find inline `boxShadow: '0 2px 6px rgba(0,0,0,0.05)'` etc. Replace with `var(--shadow-sm)` or appropriate.

- [ ] **Step 3: Verify wa-page-header usage**

Each page should use `<div className="wa-page-header">` for top section. If inline padding, replace with class.

- [ ] **Step 4: Verify + commit**

Run: `cd app && npm run build`
```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add app/src/pages/UnifiedMasterDataPage.jsx app/src/pages/App3ConsolidationPage.jsx app/src/pages/App4RecouncilPage.jsx
git commit -m "style(app3): polish 3 pages with wa-app-body + sweep inline shadows"
```

---

## Phase 5: Cleanup

### Task 24: Remove extract-opname.css

**Files:**
- Delete: `app/src/extract-opname.css`
- Modify: `app/src/App.jsx` (remove import)
- Modify: `app/src/main.jsx` (if imported)

- [ ] **Step 1: Find all extract-opname.css references**

Run: `cd "D:/Digitalisasi Kertas Kerja APP" && grep -rn "extract-opname.css" app/src`

- [ ] **Step 2: Verify no usage**

Run: `cd "D:/Digitalisasi Kertas Kerja APP" && grep -rn "extract-" app/src --include="*.jsx" --include="*.js" | head -20`

If only the import line uses it, proceed.

- [ ] **Step 3: Remove import from App.jsx**

Find:
```js
import './extract-opname.css';
```

Delete this line.

- [ ] **Step 4: Delete file**

```bash
cd "D:/Digitalisasi Kertas Kerja APP" && rm app/src/extract-opname.css
```

- [ ] **Step 5: Verify build**

Run: `cd app && npm run build`
Expected: Build succeeds. No missing CSS.

- [ ] **Step 6: Commit**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git add -A
git commit -m "chore: remove extract-opname.css (migrated to styles/*.css)"
```

---

## Phase 6: Verification

### Task 25: Final acceptance — grep + build + tests

**Files:** (verification only)

- [ ] **Step 1: Verify zero legacy CSS variables**

Run:
```bash
cd "D:/Digitalisasi Kertas Kerja APP" && grep -rn "var(--warm-\|var(--neutral-\|var(--blue-\|var(--primary-\|var(--warning-\|var(--success-6\|var(--success-7\|var(--danger-6\|var(--danger-7\|var(--font-size-xs)" app/src
```

Expected: 0 results.

- [ ] **Step 2: Verify zero legacy classes**

Run:
```bash
cd "D:/Digitalisasi Kertas Kerja APP" && grep -rn "checkbox-opname\|form-input--compact\|ghost-input\|btn--outline\|btn--icon\|btn--sm\|editable-row\|tg-btn--active" app/src
```

Expected: 0 results.

- [ ] **Step 3: Run all tests**

Run: `cd app && npm test`
Expected: All existing tests + new hook tests + Toast test pass.

- [ ] **Step 4: Build verification**

Run: `cd app && npm run build`
Expected: Build succeeds with no warnings about missing imports or broken references.

- [ ] **Step 5: Manual smoke test — App2 sync fix**

1. `cd app && npm run dev`
2. Login, navigate to App2 (Extract)
3. Pilih periode → "Sinkron Data Opname" → spinner, summary populated
4. Verify partial error handling: kill server → click sync → warning tampil, app tetap usable
5. "Pilih File" → file picker → upload master data Excel
6. Toggle theme (sun/moon) di BentoMenu → dark mode works di semua page

- [ ] **Step 6: Final commit (if any pending changes)**

```bash
cd "D:/Digitalisasi Kertas Kerja APP"
git status
# If any uncommitted changes:
git add -A
git commit -m "chore: v3 polish final verification"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** §3 (palette) → Task 1. §4 (checkbox) → Task 2. §5 (barcode) → Task 17. §6 (App2 sync) → Task 10, 11. §7 (layout) → Task 18-23. §8 (component) → Task 12-17. §9 (animation) → Task 2. §10 (dark mode) → Task 1, 4, 9, 18. §11 (reduced motion) → Task 2. §12 (file ops) → all tasks. §13 (acceptance) → Task 25.
- [x] **Placeholder scan:** No TBD/TODO. Each task has concrete code.
- [x] **Type consistency:** `useTheme` signature `{theme, resolved, setTheme, toggle}` used consistently. Toast props `type/message/duration/onClose` consistent. `wa-check`, `wa-alert`, `wa-toast` class names consistent.
- [x] **Bite-sized:** Each task 2-5 min. Foundation phase hooks have TDD (write test → fail → implement → pass → commit).

---

## Plan Stats

- **25 tasks** across 6 phases
- **Estimated commits:** 25-30
- **Estimated time:** 4-6 hours of focused work
- **Test coverage:** 4 new test files (useTheme, useReducedMotion, useRecentBarcodes, useKeyboardShortcuts, Toast) + existing tests preserved
- **No new dependencies** required
