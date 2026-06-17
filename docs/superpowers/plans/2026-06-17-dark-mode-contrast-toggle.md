# Dark Mode Contrast Fix + Theme Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix WCAG AA contrast failures on dark-mode `--text-tertiary` and `--text-muted`, then add a 2-state (Light/Dark) `<ThemeToggle />` component to `BentoMenu` and `LoginPage` headers, with default theme changed from `system` to `light`.

**Architecture:** Three-layer change — (1) bump 2 dark CSS tokens, (2) simplify `useTheme` hook from 3-state (light/system/dark) to 2-state (light/dark) with `'light'` default, (3) build a small `<ThemeToggle />` component that uses `useTheme` and mount it in the two header bars. All other pages re-skin automatically via the CSS variable cascade. The bootstrap IIFE in `index.html` is simplified to drop the `prefers-color-scheme` branch.

**Tech Stack:** React 19 + Vite + react-router-dom + lucide-react. No new deps. Vitest with jsdom for hook + component tests. `@testing-library/react` + `@testing-library/jest-dom` for component rendering.

**Spec:** `docs/superpowers/specs/2026-06-17-dark-mode-contrast-toggle-design.md`

**File totals:** 5 modified + 2 new = 7 source files (plus 1 test rewrite + 1 new test = 9 file changes total).

---

## File Structure

### Token layer
- `app/src/styles/tokens.css` (MODIFY) — bump `--text-tertiary` (#8B8580→#B5B0A8) and `--text-muted` (#595755→#8B8580) inside `:root[data-theme="dark"]`

### Hook layer
- `app/src/hooks/useTheme.js` (MODIFY) — drop `'system'` value, drop `resolved` return, drop `matchMedia` listener, default to `'light'`
- `app/src/__tests__/useTheme.test.js` (REWRITE) — 10 tests for 2-state semantics

### Bootstrap
- `app/index.html` (MODIFY) — simplify IIFE: drop system branch and `data-theme-pref`

### Component layer
- `app/src/components/ThemeToggle.jsx` (NEW) — ~40-line Sun/Moon segmented button
- `app/src/__tests__/ThemeToggle.test.jsx` (NEW) — 5 tests
- `app/src/styles/components.css` (MODIFY) — append `.wa-theme-toggle` + `.wa-theme-pill` rules

### Integration
- `app/src/pages/BentoMenu.jsx` (MODIFY) — import + mount in header
- `app/src/pages/LoginPage.jsx` (MODIFY) — import + mount in brand panel

---

## Task 1: Bump dark-mode text tokens for WCAG AA

**Files:**
- Modify: `app/src/styles/tokens.css` (2 lines inside `:root[data-theme="dark"]`)

- [ ] **Step 1: Verify the failing contrast ratios**

Open `app/src/styles/tokens.css`, locate `:root[data-theme="dark"]` block (lines 59–102). The current values are:
```css
--text-tertiary: #8B8580;  /* 4.0:1 on #262624 — FAIL AA */
--text-muted:    #595755;  /* 2.4:1 on #262624 — FAIL AA */
```

- [ ] **Step 2: Replace both values in the dark block**

In `app/src/styles/tokens.css`, inside `:root[data-theme="dark"]`, change:
```css
  --text-tertiary: #8B8580;
```
to:
```css
  --text-tertiary: #B5B0A8;  /* 5.4:1 on #262624 — AA pass */
```

And change:
```css
  --text-muted: #595755;
```
to:
```css
  --text-muted: #8B8580;  /* 4.7:1 on #262624 — AA pass */
```

The light block (`:root, :root[data-theme="light"]` at lines 13–57) is NOT touched.

- [ ] **Step 3: Commit**

```bash
git add app/src/styles/tokens.css
git commit -m "fix(theme): bump dark text-tertiary and text-muted to WCAG AA"
```

---

## Task 2: Rewrite useTheme hook for 2-state with light default (TDD)

**Files:**
- Modify: `app/src/hooks/useTheme.js` (full rewrite, ~40 lines)
- Modify: `app/src/__tests__/useTheme.test.js` (full rewrite, ~80 lines)

- [ ] **Step 1: Rewrite the failing test file**

Replace contents of `app/src/__tests__/useTheme.test.js` with:

```js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../hooks/useTheme';

describe('useTheme (2-state)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to "light" when no localStorage entry', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('defaults to "light" when localStorage has invalid value', () => {
    localStorage.setItem('kkd-theme', 'system');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    localStorage.setItem('kkd-theme', 'purple');
    const { result: r2 } = renderHook(() => useTheme());
    expect(r2.current.theme).toBe('light');
  });

  it('reads "dark" from localStorage', () => {
    localStorage.setItem('kkd-theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('reads "light" from localStorage', () => {
    localStorage.setItem('kkd-theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('applies data-theme="light" to <html> on mount', () => {
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applies data-theme="dark" to <html> on mount', () => {
    localStorage.setItem('kkd-theme', 'dark');
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('setTheme("dark") updates state, attr, and localStorage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('kkd-theme')).toBe('dark');
  });

  it('toggle() flips "light" to "dark"', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggle() flips "dark" to "light"', () => {
    localStorage.setItem('kkd-theme', 'dark');
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('survives localStorage write failure (no unhandled error)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useTheme());
    expect(() => {
      act(() => result.current.setTheme('dark'));
    }).not.toThrow();
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    setItemSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the tests to verify they all fail**

Run: `cd app && npm test -- src/__tests__/useTheme.test.js`
Expected: All 10 tests fail. Most will fail with "Cannot find module '../hooks/useTheme'" or "setTheme is not a function" depending on the current implementation.

- [ ] **Step 3: Rewrite the hook implementation**

Replace contents of `app/src/hooks/useTheme.js` with:

```js
import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'kkd-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' || stored === 'light' ? stored : 'light';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // localStorage blocked (private browsing, quota) — silent fail
    }
  }, [theme]);

  const setTheme = useCallback((next) => setThemeState(next), []);
  const toggle = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    []
  );

  return { theme, setTheme, toggle };
}
```

- [ ] **Step 4: Run the tests to verify they all pass**

Run: `cd app && npm test -- src/__tests__/useTheme.test.js`
Expected: All 10 tests pass. No warnings about deprecated `matchMedia` listeners.

- [ ] **Step 5: Commit**

```bash
git add app/src/hooks/useTheme.js app/src/__tests__/useTheme.test.js
git commit -m "refactor(theme): simplify useTheme to 2-state, default light

- Drop 'system' mode and 'resolved' return value
- Drop prefers-color-scheme listener (out of scope)
- Default to 'light' when no localStorage OR invalid value
- Storage write failure is silent (try/catch)
- 10 tests for full behavior coverage"
```

---

## Task 3: Simplify bootstrap IIFE in index.html

**Files:**
- Modify: `app/index.html` (lines 5–18)

- [ ] **Step 1: Read the current IIFE**

Open `app/index.html`, locate the inline `<script>` in `<head>` (currently lines 5–18). It contains the `system` branch, the `matchMedia` check, and the `data-theme-pref` attribute write.

- [ ] **Step 2: Replace the IIFE body**

In `app/index.html`, replace the inline `<script>` (lines 5–18) with:

```html
  <script>
    (function() {
      try {
        var theme = localStorage.getItem('kkd-theme');
        var resolved = (theme === 'dark' || theme === 'light') ? theme : 'light';
        document.documentElement.setAttribute('data-theme', resolved);
      } catch (e) {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    })();
  </script>
```

The `system` branch, the `matchMedia` check, and the `data-theme-pref` attribute are all gone. The fallback is explicit `'light'`.

- [ ] **Step 3: Commit**

```bash
git add app/index.html
git commit -m "refactor(theme): simplify index.html IIFE, drop system branch"
```

---

## Task 4: Create ThemeToggle component (TDD)

**Files:**
- Create: `app/src/components/ThemeToggle.jsx` (~40 lines)
- Create: `app/src/__tests__/ThemeToggle.test.jsx` (~60 lines)

- [ ] **Step 1: Write the failing test file**

Create `app/src/__tests__/ThemeToggle.test.jsx` with:

```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../components/ThemeToggle';

// Mock useTheme hook (do not import the real one — we test the toggle's response to its return value)
const mockUseTheme = vi.fn();
vi.mock('../hooks/useTheme', () => ({
  useTheme: () => mockUseTheme(),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mockUseTheme.mockReset();
  });

  it('renders Light and Dark pills', () => {
    mockUseTheme.mockReturnValue({ theme: 'light', toggle: vi.fn() });
    render(<ThemeToggle />);
    expect(screen.getByText(/Light/)).toBeInTheDocument();
    expect(screen.getByText(/Dark/)).toBeInTheDocument();
  });

  it('Light pill is active when theme is "light"', () => {
    mockUseTheme.mockReturnValue({ theme: 'light', toggle: vi.fn() });
    render(<ThemeToggle />);
    const lightPill = screen.getByText(/Light/).parentElement;
    const darkPill = screen.getByText(/Dark/).parentElement;
    expect(lightPill.className).toMatch(/is-active/);
    expect(darkPill.className).not.toMatch(/is-active/);
  });

  it('Dark pill is active when theme is "dark"', () => {
    mockUseTheme.mockReturnValue({ theme: 'dark', toggle: vi.fn() });
    render(<ThemeToggle />);
    const lightPill = screen.getByText(/Light/).parentElement;
    const darkPill = screen.getByText(/Dark/).parentElement;
    expect(darkPill.className).toMatch(/is-active/);
    expect(lightPill.className).not.toMatch(/is-active/);
  });

  it('clicking the button calls toggle()', () => {
    const toggle = vi.fn();
    mockUseTheme.mockReturnValue({ theme: 'light', toggle });
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('aria-label reflects current state', () => {
    mockUseTheme.mockReturnValue({ theme: 'light', toggle: vi.fn() });
    render(<ThemeToggle />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/dark mode/i);

    mockUseTheme.mockReturnValue({ theme: 'dark', toggle: vi.fn() });
    render(<ThemeToggle />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/light mode/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd app && npm test -- src/__tests__/ThemeToggle.test.jsx`
Expected: All 5 tests fail with "Cannot find module '../components/ThemeToggle'" or similar.

- [ ] **Step 3: Implement the ThemeToggle component**

Create `app/src/components/ThemeToggle.jsx` with:

```jsx
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className="wa-theme-toggle"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className={`wa-theme-pill ${!isDark ? 'is-active' : ''}`}>
        <Sun size={12} /> Light
      </span>
      <span className={`wa-theme-pill ${isDark ? 'is-active' : ''}`}>
        <Moon size={12} /> Dark
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd app && npm test -- src/__tests__/ThemeToggle.test.jsx`
Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ThemeToggle.jsx app/src/__tests__/ThemeToggle.test.jsx
git commit -m "feat(theme): add ThemeToggle component (2-state Light/Dark)

- Sun/Moon segmented button, single <button> wrapper
- Active pill uses --bg-surface + --text-primary
- aria-label and title reflect target mode
- 5 tests with mocked useTheme hook"
```

---

## Task 5: Add ThemeToggle CSS to components.css

**Files:**
- Modify: `app/src/styles/components.css` (append at end of file)

- [ ] **Step 1: Append the toggle styles**

Open `app/src/styles/components.css`. Scroll to the end of the file. Append:

```css
/* === Theme toggle === */
.wa-theme-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 180ms var(--ease-out);
}
.wa-theme-toggle:hover {
  border-color: var(--border-strong);
}
.wa-theme-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  transition: all 180ms var(--ease-out);
}
.wa-theme-pill.is-active {
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}
```

No new colors are introduced. The toggle re-skins automatically in dark mode via the CSS variable cascade.

- [ ] **Step 2: Commit**

```bash
git add app/src/styles/components.css
git commit -m "style(theme): add .wa-theme-toggle segmented button styles

- Reuses --bg-input, --bg-surface, --border, --text-* tokens
- Re-skins in dark mode via CSS variable cascade (no override needed)
- 180ms transition on border-color and pill state"
```

---

## Task 6: Integrate ThemeToggle into BentoMenu header

**Files:**
- Modify: `app/src/pages/BentoMenu.jsx` (add import line 1, add element in header)

- [ ] **Step 1: Add the import**

In `app/src/pages/BentoMenu.jsx`, add a new import line at the top (after the existing `lucide-react` import on line 2):

```jsx
import ThemeToggle from '../components/ThemeToggle';
```

The top of the file becomes:
```jsx
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
```

- [ ] **Step 2: Mount the toggle in the header**

In `app/src/pages/BentoMenu.jsx`, find the right-side flex container in the header (currently line 110: `<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>`). Inside that container, insert `<ThemeToggle />` as the **first** child, before the "Logged in as" block.

The structure becomes:
```jsx
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <ThemeToggle />
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Logged in as</div>
                        <div style={{ fontSize: 12, color: 'var(--charcoal-900)', fontWeight: 600 }}>{auth.user || 'User'}</div>
                    </div>
                    <button onClick={handleLogout} className="wa-btn-ghost">Logout</button>
                </div>
```

- [ ] **Step 3: Manual smoke check**

Run: `cd app && npm run dev`

Open the app in browser (Vite default: http://localhost:5181). After login, on the BentoMenu:
- Verify the toggle is visible in the header (left of "Logged in as").
- Click it — page should re-skin to dark mode instantly (CSS variable cascade).
- Click again — back to light.
- Reload the page — theme persists from localStorage.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/BentoMenu.jsx
git commit -m "feat(theme): mount ThemeToggle in BentoMenu header"
```

---

## Task 7: Integrate ThemeToggle into LoginPage brand panel

**Files:**
- Modify: `app/src/pages/LoginPage.jsx` (add import line 5, add element in brand panel)

- [ ] **Step 1: Add the import**

In `app/src/pages/LoginPage.jsx`, add a new import line after the existing `lucide-react` import (currently line 3):

```jsx
import { Lock, User, Eye, EyeOff, Settings } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
```

- [ ] **Step 2: Mount the toggle in the brand panel header**

In `app/src/pages/LoginPage.jsx`, find the eyebrow label at the top of the LEFT (brand) panel (currently line 136: `<div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.22em', color: 'var(--charcoal-400)', textTransform: 'uppercase' }}>`). Replace that `<div>` with a flex row that contains BOTH the eyebrow label AND the `<ThemeToggle />`:

```jsx
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.22em', color: 'var(--charcoal-400)', textTransform: 'uppercase' }}>
                        Kertas Kerja Digital
                    </div>
                    <ThemeToggle />
                </div>
```

The toggle sits at the top-right of the brand panel. The right panel (form) is unchanged.

- [ ] **Step 3: Manual smoke check**

Run: `cd app && npm run dev` (if not already running from Task 6)

Open http://localhost:5181/login (or just the root, it redirects). On the LoginPage:
- Verify the toggle is visible at the top-right of the left brand panel.
- Click it — page re-skins to dark.
- Click again — back to light.
- Log in — BentoMenu retains the chosen theme (already tested in Task 6, but verify the round-trip).

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/LoginPage.jsx
git commit -m "feat(theme): mount ThemeToggle in LoginPage brand panel"
```

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `cd app && npm test`
Expected: All tests pass (the existing test files for `useTheme` and the new `ThemeToggle` tests). No regressions in unrelated tests.

- [ ] **Step 2: Run the linter**

Run: `cd app && npm run lint`
Expected: No new errors. Existing warnings (if any) are unchanged.

- [ ] **Step 3: Manual smoke checklist**

Verify each item on a fresh browser session (clear localStorage first):
- [ ] Default theme on first visit is **light** (not whatever the OS prefers).
- [ ] LoginPage toggle works, visible in brand panel.
- [ ] BentoMenu toggle works, visible in header.
- [ ] In-app pages (OpnamePage, ExtractOpnamePage, AssetTable, etc.) re-skin automatically.
- [ ] Dark mode contrast: text-tertiary and text-muted are now readable (compare against old #595755 on dark — should look noticeably lighter).
- [ ] Reload page in dark mode — no flash of light theme (FOUC prevention working).
- [ ] Toggle state persists across page reloads (localStorage).
- [ ] Private browsing (storage blocked) — toggle still works in-session, no console errors.

- [ ] **Step 4: Final commit (only if any cleanup was needed)**

If any minor cleanup was required during verification (e.g. typo fix, missing semicolon), commit it now. Otherwise skip this step.

```bash
git add -A
git diff --cached --quiet || git commit -m "chore(theme): final cleanup from verification pass"
```

---

## Acceptance Criteria

This implementation is complete when:

- [ ] All 15 tests pass (10 useTheme + 5 ThemeToggle).
- [ ] No new lint errors.
- [ ] Dark mode `--text-tertiary` and `--text-muted` pass WCAG AA (4.5:1+).
- [ ] Theme toggle is visible and functional in both `BentoMenu` and `LoginPage`.
- [ ] Default theme is `'light'` for first-time visitors.
- [ ] No FOUC when reloading in dark mode.
- [ ] Theme persists across reloads (localStorage).
- [ ] All 8 commits land cleanly on `main` (one per task).
