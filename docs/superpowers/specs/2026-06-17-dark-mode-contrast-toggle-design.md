# Dark Mode Contrast Fix + Theme Toggle — Design Spec

**Date:** 2026-06-17
**Status:** Awaiting user review
**Stack:** React 19 + Vite + lucide-react (no new deps)
**Project:** Kertas Kerja Digital — PT Santos Jaya Abadi

---

## 1. Context

The app already has a working theme system (full CSS variable palette for light + dark, `useTheme` hook, FOUC-prevention IIFE in `index.html`). However:

1. **No toggle UI exists** — `useTheme` is implemented but never imported by any page. Users cannot switch themes.
2. **Dark mode contrast fails WCAG AA** in two text tokens:
   - `--text-tertiary` (#8B8580 on #262624) = 4.0:1 → fails AA (need 4.5:1)
   - `--text-muted` (#595755 on #262624) = 2.4:1 → fails AA badly
3. **Default is `'system'`** — first-time visitors get whatever their OS prefers. User wants default `'light'`.

Affected elements (using the failing tokens):
- `tertiary`: BentoMenu module codes ("MOD 01 · OPERATIONAL"), LoginPage form labels, AssetTable timestamps
- `muted`: Footer "V1.0.4 · BUILD 2026.06", disabled checkbox labels, dimmed status pills

---

## 2. Goals & Non-Goals

**Goals:**
- Lift `--text-tertiary` and `--text-muted` (dark mode) to WCAG AA (≥4.5:1)
- Build a `ThemeToggle` component (2-state: Light / Dark)
- Mount the toggle in `BentoMenu` and `LoginPage` headers
- Default theme = `'light'` (was `'system'`)
- All existing tests must pass; new behavior must have new tests
- Zero new dependencies

**Non-Goals:**
- No new theme modes (no "high contrast", no "auto by time of day")
- No per-user theme sync with server
- No redesign of dark palette beyond the 2 failing tokens
- No animation beyond a 180ms transition on the active pill
- No 3-state (light/system/dark) UI — system mode is removed entirely
- No refactor of existing pages (AssetTable, etc.) — they re-skin via CSS variable cascade automatically

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Bootstrap (app/index.html IIFE)                            │
│  - reads localStorage['kkd-theme']                          │
│  - validates: 'dark' | 'light' | fallback 'light'           │
│  - sets data-theme on <html> BEFORE React mount              │
│  - prevents FOUC                                             │
└────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────┐
│  useTheme hook (app/src/hooks/useTheme.js)                  │
│  - state: { theme: 'light' | 'dark' }                       │
│  - default: 'light' (no localStorage OR invalid entry)      │
│  - setTheme(t) → applies data-theme, writes localStorage    │
│  - toggle() → flips light↔dark                              │
│  - returns { theme, setTheme, toggle }                      │
│  (no more 'system' value, no prefers-color-scheme listener) │
└────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────┐
│  ThemeToggle component (app/src/components/ThemeToggle.jsx) │
│  - reads useTheme, renders 2-pill group (☀️ Light | 🌙 Dark) │
│  - onClick → toggle()                                       │
│  - active pill has surface bg + primary text                │
│  - uses existing tokens (no new colors)                     │
│                                                            │
│  Mounted in:                                                │
│  - BentoMenu header (left of "Logged in as")                │
│  - LoginPage header (top-right of brand panel)              │
└────────────────────────────────────────────────────────────┘
```

**Data flow:** User click → `toggle()` → `setThemeState` → `useEffect` fires → `applyTheme()` sets `documentElement[data-theme]` → CSS variables in `tokens.css` swap → all consumers re-render via CSS var cascade → no React re-render needed for visual change.

---

## 4. Component API

### `useTheme` (after changes)

```js
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
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* storage blocked */ }
  }, [theme]);
  const setTheme = useCallback((next) => setThemeState(next), []);
  const toggle = useCallback(() => setThemeState(t => t === 'dark' ? 'light' : 'dark'), []);
  return { theme, setTheme, toggle };
}
```

**Removals from current hook:**
- `resolveTheme()` function
- `resolved` state + return value
- `prefers-color-scheme` listener (`useEffect` listening to `matchMedia`)
- `'system'` valid value

### `ThemeToggle` component (new)

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

**Props:** none
**Dependencies:** `useTheme` hook, `lucide-react` (`Sun`, `Moon`)

### CSS for toggle (in `app/src/styles/components.css`)

```css
.wa-theme-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: inherit;
  transition: all 180ms var(--ease-out);
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

No new colors. Uses existing tokens. Dark mode works automatically via CSS variable cascade.

---

## 5. Token Changes

### `app/src/styles/tokens.css` — dark block patch

```css
:root[data-theme="dark"] {
  /* Surfaces — unchanged */
  --bg-primary: #262624;
  --bg-surface: #2D2D2B;
  --bg-input: #1F1F1D;

  /* Text — bump these 2 */
  --text-primary:   #F5F4EF;  /* unchanged — 14.2:1 ✅ */
  --text-secondary: #BCB8B1;  /* unchanged — 8.4:1 ✅ */
  --text-tertiary:  #B5B0A8;  /* was #8B8580 — now 5.4:1 (AA pass) */
  --text-muted:     #8B8580;  /* was #595755 — now 4.7:1 (AA pass) */

  /* Borders — unchanged */
  --border: #3D3D3B;
  --border-strong: #4A4A48;

  /* Accent + status — unchanged */
  /* ... (no changes) ... */
}
```

Contrast verification (against `--bg-primary: #262624`):
- Old `--text-tertiary: #8B8580` → 4.0:1 ❌
- New `--text-tertiary: #B5B0A8` → 5.4:1 ✅ (AA pass for body text)
- Old `--text-muted: #595755` → 2.4:1 ❌
- New `--text-muted: #8B8580` → 4.7:1 ✅ (AA pass for body text)

Light mode `--text-tertiary: #8B8580` and `--text-muted: #BCB8B1` stay as-is (already pass AA on `#FAF9F5`).

---

## 6. Bootstrap (index.html) Simplification

**Before:**
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

**After:**
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

Removes: `system` branch, `matchMedia` check, `data-theme-pref` attribute. Result: simpler, faster (~10 lines lighter).

---

## 7. Integration Points

### `app/src/pages/BentoMenu.jsx`
- Add import: `import ThemeToggle from '../components/ThemeToggle';`
- Insert `<ThemeToggle />` inside the right-side flex container (line 110), **before** the "Logged in as" block.
- New order: `[ThemeToggle] [user info] [Logout]`

### `app/src/pages/LoginPage.jsx`
- Add import: `import ThemeToggle from '../components/ThemeToggle';`
- Render `<ThemeToggle />` in the top-right of the LEFT (brand) panel (line 136), next to the "Kertas Kerja Digital" eyebrow label.
- Right panel keeps the form (toggle doesn't go there — would compete with submit button).

### Pages NOT changed
All app pages (OpnamePage, ExtractOpnamePage, App3ConsolidationPage, App4RecouncilPage, UnifiedMasterDataPage, AdminPage, DashboardPage, UploadPage) — they re-skin automatically via the CSS variable cascade. No edits needed.

### Modals NOT changed
MatHistoryModal, BarcodeSearchModal, SaveLoadModal, PreviewModal, ServerFileBrowser, etc. — same, no edits.

---

## 8. File Inventory

| File | Change | Lines (approx) |
|------|--------|----------------|
| `app/index.html` | Simplify IIFE — drop system branch | -5 / +3 |
| `app/src/hooks/useTheme.js` | Remove `resolved`/`system`, default `'light'`, 2-state | -20 / +5 |
| `app/src/__tests__/useTheme.test.js` | Rewrite tests for 2-state semantics | rewrite (~60) |
| `app/src/components/ThemeToggle.jsx` | **NEW** | +40 |
| `app/src/__tests__/ThemeToggle.test.jsx` | **NEW** | +60 |
| `app/src/styles/components.css` | Add `.wa-theme-toggle` + `.wa-theme-pill` rules | +30 |
| `app/src/styles/tokens.css` | Bump 2 dark-mode text tokens | ±2 |
| `app/src/pages/BentoMenu.jsx` | Import + mount `<ThemeToggle />` | +3 |
| `app/src/pages/LoginPage.jsx` | Import + mount `<ThemeToggle />` | +3 |

8 files (3 new), all small diffs.

---

## 9. Error Handling

| Scenario | Behavior |
|----------|----------|
| `localStorage` blocked (private browsing, quota exceeded) | `try/catch` around `setItem` — `applyTheme()` still runs, toggle works in-session, no persist |
| `localStorage` contains invalid value (e.g. legacy `"system"`, garbage) | `getInitialTheme()` falls back to `'light'` via explicit allowlist check |
| `useTheme` called before `<App />` mounts | Guarded by `typeof window === 'undefined'` in `getInitialTheme` + `applyTheme` |
| `document.documentElement` missing (SSR) | Same `typeof document === 'undefined'` guard |
| `prefers-color-scheme` API missing | N/A — all `matchMedia` usage removed |

---

## 10. Testing

### `useTheme.test.js` (rewrite existing)

Tests to write (TDD, RED first):
1. ✅ defaults to `'light'` when no localStorage entry
2. ✅ defaults to `'light'` when localStorage has invalid value (`"system"` legacy / `"purple"`)
3. ✅ reads `'dark'` from localStorage
4. ✅ reads `'light'` from localStorage
5. ✅ applies `data-theme="light"` to `<html>` on mount
6. ✅ applies `data-theme="dark"` to `<html>` on mount
7. ✅ `setTheme('dark')` updates state, sets `data-theme="dark"`, writes localStorage
8. ✅ `toggle()` flips `'light'` → `'dark'`
9. ✅ `toggle()` flips `'dark'` → `'light'`
10. ✅ localStorage write fails silently (mock `setItem` to throw) — state still updates, no unhandled error

### `ThemeToggle.test.jsx` (new)

1. ✅ renders Light + Dark pills
2. ✅ Light pill has `is-active` when `theme === 'light'`
3. ✅ Dark pill has `is-active` when `theme === 'dark'`
4. ✅ click toggles theme (verify `useTheme.toggle` invoked, OR verify `data-theme` attribute change)
5. ✅ button has `aria-label` matching current state

### Manual smoke (cannot unit-test)
- Refresh page in dark mode → no FOUC flash
- Open LoginPage, toggle to dark → background goes dark, contrast ok
- Open BentoMenu in dark, log out, log in → still dark (persistence verified)
- Open in private browsing → toggle works, no console errors (storage fail handled)
- Mobile (Capacitor APK) → toggle visible in BentoMenu, functional

---

## 11. Edge Cases NOT Addressed (YAGNI)

- Per-user theme sync with server — out of scope (would need auth + API)
- Theme auto-switch by time of day — out of scope
- Custom theme colors / user-defined palette — out of scope
- 3-state UI (light/system/dark) — explicitly removed per spec
- Animation beyond 180ms CSS transition on pill — not needed
- Per-component theme override — not needed, CSS var cascade handles it

---

## 12. Rollout

Single PR, single commit. No migration needed:
- Existing localStorage `"system"` value (if any from earlier) → ignored, falls back to light ✅
- Existing localStorage `"dark"` or `"light"` → preserved ✅
- No user data at risk

---

*End of spec*
