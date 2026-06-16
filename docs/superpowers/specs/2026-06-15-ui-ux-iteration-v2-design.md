# KKD UI/UX Iteration v2 — Design Spec

**Date:** 2026-06-15
**Status:** Awaiting user review
**Stack:** React 18 + Vite + react-router-dom + lucide-react
**Project:** "Kertas Kerja Digital" — PT Santos Jaya Abadi
**Supersedes:** §3 (Color System), §6.7 (Checkbox), §8.4 (OpnamePage header button) of `2026-06-15-ui-ux-redesign-design.md`

---

## 1. Context

Spec redesign v1 (2026-06-15) replaces neo-brutalism with a custom "Warm Atelier" palette (cream + charcoal + terracotta `#C96442`). Implementation progressed across 9 pages + login. User review now identifies:

1. **Palette drift:** User wants brand alignment with **Claude.ai's official palette** (familiar, battle-tested) — replace custom warm earth-tones with Claude orange `#D97757` + Claude neutrals.
2. **Dark mode:** No theme switching exists. User wants dark mode (toggle + auto from `prefers-color-scheme`).
3. **Checkbox app1 too small:** [AssetTable.jsx:147](app/src/components/AssetTable.jsx#L147) still uses legacy `checkbox-opname` (small, not tablet-friendly). User wants bigger, more touchable.
4. **Check Barcode UX basic:** "BARCODE CHECKER" header button is a plain charcoal button. Modal lacks recent searches, keyboard shortcut, helpful empty state.
5. **Inkonsistensi sisa:** [AssetTable.jsx](app/src/components/AssetTable.jsx) still references 25+ legacy CSS variables (`--warm-100`, `--blue-700`, `--neutral-400`, etc.) that don't exist in the new token system. This makes AssetTable render with **broken styles** in dark mode and produces visual artifacts.
6. **Animasi belum lengkap:** Checkbox check has no animation, modal has no entrance animation, tab switch has no underline transition, toast component doesn't exist.

**Goal:** Polish pass that aligns palette to Claude brand, adds dark mode, fixes checkbox + barcode UX, sweeps legacy variables, and completes the animation system. **No new features** (except dark mode toggle and keyboard shortcut).

---

## 2. Design Direction

| Decision | Value |
|---|---|
| Color palette | **Claude.ai official** (light + dark) |
| Theme switching | Manual toggle (Sun/Moon icon) + `prefers-color-scheme` default |
| Backward compat | Alias `--cream-*`, `--charcoal-*`, `--terracotta-*` ke Claude tokens di `:root` |
| Checkbox size | 24/28/32px (desktop/tablet/mobile) + 44px min touch target |
| Check Barcode | Recent searches + Cmd/Ctrl+K shortcut + empty state |
| Animations | Add: checkbox pop, modal open, tab underline slide, sync button spin |
| Reduced motion | Respect `prefers-reduced-motion: reduce` |
| Scope | Iteration on existing v1 implementation. No new pages. |

---

## 3. Color System — Claude Palette

### 3.1 Light tokens (Claude.ai official, verified)

| Token | Hex | Use |
|---|---|---|
| `--bg-primary` | `#FAF9F5` | Page background |
| `--bg-surface` | `#FFFFFF` | Card surface, input bg, table header |
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

### 3.2 Dark tokens (Claude.ai dark mode)

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
| `--accent` | `#D97757` | **Sama** — Claude orange works on both |
| `--accent-hover` | `#E58A6A` | Lighter on dark for hover |
| `--accent-soft` | `rgba(217,119,87,0.15)` | Soft accent bg (higher opacity) |
| `--accent-glow` | `rgba(217,119,87,0.30)` | Glow shadow |
| `--accent-ring` | `rgba(217,119,87,0.20)` | Focus ring |
| `--success-500` | `#3D8C5F` | Sama |
| `--warning-500` | `#C28B1A` | Sama |
| `--danger-500` | `#C44545` | Sama |

### 3.3 Aliasing strategy (backward compat)

`wa-*` classes dan existing component JSX reference `--cream-*`, `--charcoal-*`, `--terracotta-*`. **Rename via aliasing di `:root` (bukan sweeping semua file):**

```css
:root[data-theme="light"] {
  /* Claude palette */
  --bg-primary: #FAF9F5;
  --bg-surface: #FFFFFF;
  --bg-input: #F5F4EF;
  --text-primary: #262624;
  /* ... (all tokens from §3.1) ... */

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
  /* ... (all tokens from §3.2) ... */

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
- **Trade-off:** Naming confusing. Acceptable karena v3 future bisa hard rename kalau ada bandwidth.

### 3.4 Type & Spacing tokens (unchanged dari v1)

- Typography: Sora 400/500/600, DM Mono 500/600/700. Tidak ada perubahan.
- Spacing: 8pt grid (`--space-1` s.d. `--space-8`). Tidak ada perubahan.
- Radius: `--radius-sm: 8px`, `--radius-md: 10px`, `--radius-lg: 12px`, `--radius-xl: 14px`. Tidak ada perubahan.
- Shadow: `--shadow-xs/sm/md/lg` (soft, no hard offset). **Update opacity** karena dark mode butuh shadow lebih subtle: `rgba(0,0,0,0.15)` di dark, `rgba(45,45,45,0.06)` di light.

---

## 4. Checkbox v2 (touch-friendly)

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

## 5. Check Barcode UX v2

### 5.1 Header button — toggle with notification

**Current:** Plain `wa-btn` charcoal "BARCODE CHECKER" di [App.jsx](app/src/App.jsx) App1Layout header.

**New:** Toggle button dengan:
- Default state: "BARCODE CHECKER" charcoal
- Active state (modal open): "BARCODE CHECKER" + ring `--accent`
- Notification state: "BARCODE CHECKER · 2 BARU" dengan dot `--accent` pulse animation 1.5s loop

**Notification count mechanism:** Tracked in `BarcodeSearchModal` local state via `useState` hook + persisted to `localStorage` key `barcode-modal-new-count`. App1Layout reads count via prop drilling from a parent wrapper OR a small context (`BarcodeModalContext`). Recommendation: use simple prop — `App1Layout` already owns `isSearchOpen` state, so it can also own `newScanCount` state. `BarcodeSearchModal` receives `onNewScan` callback prop, calls it when user scans a barcode that's not yet in their AssetTable.

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
- Lifted ke `OpnameContext` (atau context baru) agar header (di `App.jsx`) bisa baca count yang di-increment dari `AssetTable.jsx` saat user centang checkbox
- Reset count: otomatis ke 0 saat modal BarcodeChecker dibuka
- Persist: tidak perlu (session-only)
- Limit max display: "99+ BARU" jika > 99

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

## 6. Dark Mode Implementation

### 6.1 Architecture

- **Storage:** `localStorage` key `kkd-theme` = `"light"` | `"dark"` | `"system"`
- **Application:** `<html data-theme="light|dark">` attribute
- **Default:** `"system"` → follow `prefers-color-scheme`
- **Pre-React anti-flash:** Inline script di `index.html` baca localStorage + apply data-theme sebelum React mount
- **Hook:** `useTheme()` returns `{theme, resolved, setTheme, toggle}`

### 6.2 Files to create

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

### 6.3 Toggle UI placement

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

### 6.4 Page transition
- Theme switch: smooth 200ms transition pada `background` dan `color` properties di `body` dan `.wa-card`
- Avoid transition pada semua property (causes flicker):
```css
body, .wa-card, .wa-input, .wa-table, .wa-app-header {
  transition: background-color 200ms var(--ease-out),
              color 200ms var(--ease-out),
              border-color 200ms var(--ease-out);
}
```

**Note:** Transition ini di-override oleh §7 reduced-motion media query (jadi 0.01ms saat user prefers reduced motion). Meminimalkan layout shift saat toggle theme.

---

## 7. Reduced Motion Support

**File:** `app/src/hooks/useReducedMotion.js` (NEW, ~10 LOC)
```js
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
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

## 8. Animation Completions

| Element | Animation | Implementation |
|---|---|---|
| Checkbox check | pop 1→1.08→1 + checkmark draw 0→1 | §4.4 |
| Tab switching | underline slide via CSS `::after` transform | `.wa-tab::after` width 0→100% with `transition: transform 220ms var(--ease-out)`. **No-op** untuk element yang tidak punya class `.wa-tab` (saat ini hanya Admin + App3 Tahap 1) |
| Modal open | backdrop fade 200ms + card scale 0.95→1, opacity 0→1, 250ms ease-out | keyframe `wa-modal-in` + apply to `.wa-card[role="dialog"]` |
| Toast | slide-up 16px + auto-dismiss 3s | New `.wa-toast` component (optional — not blocking) |
| Sync button | rotate 360° 1s linear infinite saat loading | `.wa-btn-terracotta.is-loading::before` rotating circle |
| Progress ring | stroke-dashoffset 400ms (existing) | Verify still works in dark mode |
| Page transition | cross-fade 250ms (optional, via React Router) | Defer to v3 — not blocking |

**Loading state class (sync button):**
```css
.wa-btn-terracotta.is-loading {
  pointer-events: none;
  opacity: 0.85;
  position: relative;
  color: transparent;
}
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
```

---

## 9. Legacy CSS Variable & Class Sweep

### 9.1 AssetTable.jsx — replace 25+ broken variable refs

**File:** [app/src/components/AssetTable.jsx](app/src/components/AssetTable.jsx)

| Old | New |
|---|---|
| `var(--warm-100)` | `var(--bg-input)` | 26 |
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

**Action:** Apply all 24 replacements dalam 1 commit.

### 9.2 Legacy class sweep

| Class lama | Lokasi | Ganti jadi |
|---|---|---|
| `checkbox-opname` | [AssetTable.jsx:147](app/src/components/AssetTable.jsx#L147) | `wa-check` (wrapped in label) |
| `form-input--compact` | AssetTable.jsx:85, 379, 391, 402, 411, 420, 430, 453 | `wa-input` (size auto-handled by parent) |
| `ghost-input` | AssetTable.jsx:200, 379, 391, 402, 411, 420, 430, 453 | Hapus (style ada di `wa-input`) |
| `btn--outline` | AssetTable.jsx:296, 308 | `wa-btn-ghost` |
| `btn--icon` | AssetTable.jsx:296, 308, 461 | Inline icon button atau `wa-btn-icon` new class |
| `btn--sm` | AssetTable.jsx:461 | Hapus (size dari padding) |
| `editable-row` | AssetTable.jsx:369 | Hapus (handled by `wa-table` tbody tr) |
| `tg-btn--active-*` (5 keys) | AssetTable.jsx:6-11 | **Hapus** — dead code (verify dengan Grep dulu) |
| `KONDISI_CLASS` constant | AssetTable.jsx:5-11 | **Hapus** jika tidak terpakai |
| `asset-table-wrapper` | AssetTable.jsx:257, 351 | Hapus atau ganti `wa-card` |

**Pre-flight check:** `grep -rn "KONDISI_CLASS\|tg-btn--active" app/src` harus 0 result sebelum hapus. Jika > 0, keep constant.

---

## 10. Layout Cleanup

### 10.1 BentoMenu — button → Link

**Current:** `<button onClick={() => navigate(app.path)}>` (line 138-160) — uses `useNavigate` hook
**New:** `<Link to={app.path}>` untuk proper SPA navigation + a11y. **Keep `useNavigate` import** (line 1) — masih dipakai oleh `handleLogout`. Hanya ganti card JSX dari `<button>` ke `<Link>`.

```jsx
import { Link, Navigate } from 'react-router-dom';
// remove useNavigate from line 1 import (logout still needs it)

// Inside visibleApps.map:
<Link key={app.id} to={app.path} className="wa-card" style={{ padding: 24, textAlign: 'left', fontFamily: 'inherit', border: 'none', textDecoration: 'none', display: 'block' }}>
  {/* same inner content */}
</Link>
```

Sama untuk Admin tile (line 167-194). `handleLogout` tetap pakai `useNavigate` (logout adalah action, bukan nav).

### 10.2 BentoMenu — body padding sync

**Current:** `padding: '24px 28px'` (inline, line 120)
**Fix:** Pakai class `wa-app-body` (sudah di spec) untuk konsistensi.

### 10.3 Header height consistency

**Verify:** Semua page (LoginPage, BentoMenu, App1Layout, App2Layout) pakai class `wa-app-header`. Hapus inline duplikat:
- `padding: '12px 24px'` inline → class `wa-app-header`
- Background inline `rgba(253, 251, 247, 0.85)` → class property

### 10.4 OpnamePage — mobile asset cards verify

**Spec §8.4:** Mobile shows asset cards instead of table. Verify implementasi di [OpnamePage.jsx](app/src/pages/OpnamePage.jsx):
- CSS: `.opname-asset-cards` (mobile) + `.opname-asset-table-wrapper` (desktop)
- Toggle via `@media (max-width: 767px)`

**Action:** Read file, identify gap, add if missing.

---

## 11. Files to Modify (summary)

```
app/index.html                              # prepend anti-flash script
app/src/main.jsx                            # mount useTheme provider (optional)
app/src/styles/tokens.css                   # REPLACE color tokens with Claude palette + aliases
app/src/styles/components.css               # ADD checkbox v2, modal in, pulse dot, theme toggle, reduced motion
app/src/pages/BentoMenu.jsx                 # button→Link, sync padding, add theme toggle
app/src/pages/UploadPage.jsx                # verify (sudah OK di v1, minor polish)
app/src/pages/OpnamePage.jsx                # verify mobile cards, sync palette
app/src/App.jsx                             # update BARCODE CHECKER button → toggle
app/src/components/AssetTable.jsx           # sweep 24+ var refs + 8 class refs
app/src/components/BarcodeSearchModal.jsx   # recent searches, empty state, keyboard nav
app/src/components/BarcodeSearchModal.css   # recent chip, empty state, result row
app/src/hooks/useTheme.js                   # NEW
app/src/hooks/useReducedMotion.js           # NEW
app/src/hooks/useKeyboardShortcuts.js       # NEW (Cmd+K handler)
app/src/hooks/useRecentBarcodes.js          # NEW (localStorage recent list)
```

**Total files touched:** 11 modified + 4 new = 15 files
**Files NOT touched:** server plugins, store, utils, tests, modal logic (SaveLoad, CustomRoom, Preview unchanged), App2/App3/Admin pages (sudah OK di v1)

---

## 12. Acceptance Criteria

A redesign is "done" when:

1. **Zero legacy CSS variables** di `app/src` (`grep -rn "var(--warm-\|var(--neutral-\|var(--blue-\|var(--primary-\|var(--warning-\|var(--success-6\|var(--success-7\|var(--danger-6\|var(--danger-7\|var(--font-size-xs)" app/src` returns 0 results)
2. **Zero legacy classes** `checkbox-opname`, `form-input--compact`, `ghost-input`, `btn--outline`, `btn--icon`, `btn--sm`, `editable-row`, `tg-btn--active-*` di `app/src/pages` dan `app/src/components`
3. **Light mode** visual identical to v1 spec (no regression on existing pages)
4. **Dark mode** all 9 pages render correctly:
   - Text contrast ≥ 4.5:1 (WCAG AA)
   - No `rgba(0,0,0,X)` shadows that disappear in dark (use `rgba(0,0,0,0.3)` only on light elements)
   - Accent orange `#D97757` readable on both bg
5. **Theme toggle** di BentoMenu works, persists across reload, respects `prefers-color-scheme` when "system" selected
6. **No FOUC** on page load (anti-flash script di `index.html`)
7. **Checkbox** tap target ≥ 44×44px di semua breakpoint; checkmark animates in
8. **Barcode Checker** modal: recent searches chip, empty state, Cmd+K shortcut, focus management
9. **All existing functionality preserved:** login, JWT auth, save/load, sync, PDF export, signatures, semua work
10. **Reduced motion:** `prefers-reduced-motion: reduce` disables transforms
11. **Build passes** (`npm run build`)
12. **Existing tests pass** (`npm test`)

---

## 13. Out of Scope (explicit non-goals)

- Camera-based barcode scanning (placeholder button only — feature for v3)
- Per-user theme sync (just localStorage, no server-side persistence)
- Hard rename of all `--cream-*` / `--charcoal-*` / `--terracotta-*` (aliasing strategy dipakai)
- Refactoring AssetTable to TypeScript (.jsx stays .jsx)
- New pages or features
- New tests beyond existing
- i18n / multi-language
- Per-component theme overrides (global theme only)

---

## 14. Open Questions (resolved)

- ✅ **Palette:** Claude.ai official (verified against claude.ai)
- ✅ **Dark mode:** Toggle + system default + localStorage persist + anti-flash
- ✅ **Checkbox size:** 24/28/32 across breakpoints + 44px min touch
- ✅ **Check Barcode:** Recent + Cmd+K + empty state + row layout
- ✅ **Backward compat:** Aliasing strategy (low risk, working code stays working)
- ✅ **Reduced motion:** Global override
- ✅ **Scope:** Iteration polish, no new features except dark mode + keyboard shortcut

---

## 15. References

- Spec v1: [docs/superpowers/specs/2026-06-15-ui-ux-redesign-design.md](2026-06-15-ui-ux-redesign-design.md)
- Implementation plan v1: [docs/superpowers/plans/2026-06-15-ui-ux-redesign.md](2026-06-15-ui-ux-redesign.md)
- Claude palette source: [claude.ai](https://claude.ai) (visual inspection of light + dark mode)
- WCAG 2.1 contrast: [w3.org/WAI/WCAG21/Understanding/contrast-minimum.html](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
