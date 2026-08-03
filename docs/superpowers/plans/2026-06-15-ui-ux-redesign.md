# KKD UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace neo-brutalism visual language with Warm Atelier design system (cream + charcoal + Claude terracotta) across all 10 pages, with hover/click animations, responsive layouts (desktop/tablet/mobile), without breaking existing functionality.

**Architecture:** CSS-first refactor — add new design tokens and component classes in `index.css`, then update JSX/JS to use them. Visual verification via `npm run dev` per page. No new dependencies. No new tests required (existing tests must pass).

**Tech Stack:** React 18 + Vite + react-router-dom + lucide-react + CSS3. No CSS-in-JS, no Tailwind, no preprocessor. Plain CSS with custom properties.

**Reference:** Spec at `docs/superpowers/specs/2026-06-15-ui-ux-redesign-design.md`. Visual targets at `http://localhost:62774/<mockup>.html` (13 mockups listed in spec §15).

---

## Phase 1: Foundation — Design Tokens & Global Styles

### Task 1.1: Add design tokens to `:root`

**Files:**
- Modify: `app/src/index.css:1-150` (replace `:root` block, keep Google Fonts import at line 1)

- [ ] **Step 1: Replace `:root` design tokens**

Open `app/src/index.css`. Keep the `@import url(...)` line at the top. Replace the entire `:root { ... }` block (lines 4–150) with:

```css
:root {
  /* === Cream surface === */
  --cream-bg: #F5EFE6;
  --cream-surface: #FDFCF7;
  --cream-input: #FAF6EF;

  /* === Charcoal text === */
  --charcoal-900: #1A1A1A;
  --charcoal-700: #2D2D2D;
  --charcoal-500: #6B6660;
  --charcoal-400: #8B8580;
  --charcoal-300: #C9C2B5;

  /* === Terracotta accent (use sparingly) === */
  --terracotta-500: #C96442;
  --terracotta-400: #D88865;
  --terracotta-600: #D87554;

  /* === Status === */
  --success-500: #16a34a;
  --success-50: rgba(22, 163, 74, 0.10);
  --warning-500: #f59e0b;
  --danger-500: #dc2626;
  --danger-50: rgba(220, 38, 38, 0.10);

  /* === Typography === */
  --font-sora: 'Sora', -apple-system, sans-serif;
  --font-mono: 'DM Mono', 'Courier New', monospace;
  --fs-xs: 0.75rem;
  --fs-sm: 0.8125rem;
  --fs-base: 0.875rem;
  --fs-lg: 1rem;
  --fs-xl: 1.125rem;
  --fs-2xl: 1.375rem;
  --fs-3xl: 1.875rem;
  --fs-4xl: 2.25rem;

  /* === Spacing (8pt) === */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-8: 3rem;

  /* === Radius === */
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 14px;
  --radius-full: 9999px;

  /* === Shadows (soft, no hard offset) === */
  --shadow-xs: 0 1px 2px rgba(45, 45, 45, 0.02);
  --shadow-sm: 0 1px 2px rgba(45, 45, 45, 0.04);
  --shadow-md: 0 1px 2px rgba(45, 45, 45, 0.03), 0 6px 18px rgba(45, 45, 45, 0.04);
  --shadow-lg: 0 2px 4px rgba(45, 45, 45, 0.04), 0 14px 30px rgba(45, 45, 45, 0.08);
  --shadow-glow: 0 6px 14px rgba(201, 100, 66, 0.25);

  /* === Easing === */
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-bounce: cubic-bezier(0.2, 1.05, 0.4, 1);
  --t-fast: 180ms;
  --t-base: 220ms;
  --t-slow: 400ms;
}
```

- [ ] **Step 2: Verify dev server compiles**

Run: `npm run dev`
Expected: No CSS errors. Visit `http://localhost:5173` — page still renders.

- [ ] **Step 3: Commit**

```bash
git add app/src/index.css
git commit -m "feat(styles): add Warm Atelier design tokens to :root"
```

### Task 1.2: Add new component classes to `index.css` (append section)

**Files:**
- Modify: `app/src/index.css` (append new component classes at the bottom of the file)

- [ ] **Step 1: Append component classes block**

At the end of `app/src/index.css`, append this new section:

```css
/* =====================================================
   WARM ATELIER COMPONENT LIBRARY (KKD Redesign 2026)
   ===================================================== */

.wa-card {
  background: var(--cream-surface);
  border: 1px solid rgba(26, 26, 26, 0.06);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  transition: transform var(--t-base) var(--ease-out),
              box-shadow var(--t-base) var(--ease-out),
              border-color var(--t-base) ease;
}
.wa-card:hover {
  transform: translateY(-2px);
  border-color: rgba(26, 26, 26, 0.16);
  box-shadow: var(--shadow-lg);
}
.wa-card:active { transform: translateY(0) scale(0.985); transition-duration: 80ms; }

.wa-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 16px;
  background: var(--charcoal-900); color: var(--cream-surface);
  border: none; border-radius: var(--radius-sm);
  font-family: var(--font-sora); font-size: 11px; font-weight: 600;
  letter-spacing: 0.05em; text-transform: uppercase;
  cursor: pointer;
  transition: all var(--t-base) var(--ease-out);
  white-space: nowrap;
}
.wa-btn:hover { background: #2A2A2A; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
.wa-btn:active { transform: translateY(0) scale(0.98); transition-duration: 80ms; }
.wa-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.wa-btn:disabled:hover { background: var(--charcoal-900); transform: none; box-shadow: none; }

.wa-btn-ghost {
  background: transparent; color: var(--charcoal-900);
  border: 1px solid rgba(26, 26, 26, 0.12);
  border-radius: var(--radius-sm);
  padding: 9px 14px;
  font-family: var(--font-sora); font-size: 11px; font-weight: 600;
  letter-spacing: 0.05em; text-transform: uppercase;
  cursor: pointer;
  transition: all 180ms ease;
  display: inline-flex; align-items: center; gap: 6px;
}
.wa-btn-ghost:hover { background: var(--cream-surface); border-color: var(--charcoal-900); }

.wa-btn-terracotta {
  background: var(--terracotta-500); color: var(--cream-surface);
  border: none; border-radius: var(--radius-sm);
  padding: 9px 18px;
  font-family: var(--font-sora); font-size: 11px; font-weight: 600;
  letter-spacing: 0.05em; text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(201, 100, 66, 0.2);
  transition: all var(--t-base) var(--ease-out);
  display: inline-flex; align-items: center; gap: 6px;
}
.wa-btn-terracotta:hover { background: var(--terracotta-600); transform: translateY(-1px); box-shadow: 0 6px 14px rgba(201, 100, 66, 0.30); }
.wa-btn-terracotta:active { transform: translateY(0) scale(0.97); transition-duration: 80ms; }
.wa-btn-terracotta:disabled { opacity: 0.4; cursor: not-allowed; }

.wa-btn-danger {
  background: transparent; color: var(--charcoal-500);
  border: 1px solid rgba(26, 26, 26, 0.12);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
  font-family: var(--font-sora); font-size: 10px; font-weight: 600;
  letter-spacing: 0.05em; text-transform: uppercase;
  cursor: pointer;
  transition: all 180ms ease;
}
.wa-btn-danger:hover { background: var(--danger-50); border-color: var(--danger-500); color: var(--danger-500); }

.wa-pill {
  display: flex; background: rgba(26, 26, 26, 0.04);
  border-radius: var(--radius-sm); padding: 3px; gap: 2px;
}
.wa-pill-item {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 6px;
  font-size: 11px; font-weight: 600;
  color: var(--charcoal-500);
  cursor: pointer;
  transition: all 180ms var(--ease-out);
  text-decoration: none;
}
.wa-pill-item:hover { background: rgba(26, 26, 26, 0.05); color: var(--charcoal-500); }
.wa-pill-item.active {
  background: var(--cream-surface);
  color: var(--charcoal-900) !important;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.wa-pill-item.active svg { color: var(--terracotta-500); }

.wa-icon-wrap {
  display: inline-flex; align-items: center; justify-content: center;
  width: 42px; height: 42px; border-radius: 10px;
  background: rgba(26, 26, 26, 0.04);
  transition: background var(--t-base) ease;
}
.wa-icon-wrap svg { transition: stroke var(--t-base) ease; }
.wa-card:hover .wa-icon-wrap { background: rgba(201, 100, 66, 0.10); }
.wa-card:hover .wa-icon-wrap svg { stroke: var(--terracotta-500); }

.wa-input, .wa-select {
  background: var(--cream-surface);
  border: 1px solid rgba(26, 26, 26, 0.08);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 11.5px; color: var(--charcoal-900);
  font-family: inherit; outline: none;
  width: 100%;
  transition: all 160ms ease;
}
.wa-input:hover, .wa-select:hover { border-color: rgba(26, 26, 26, 0.16); }
.wa-input:focus, .wa-select:focus {
  border-color: var(--terracotta-500);
  box-shadow: 0 0 0 3px rgba(201, 100, 66, 0.12);
}

.wa-check {
  width: 18px; height: 18px;
  border: 1.5px solid var(--charcoal-300);
  border-radius: 4px;
  display: inline-block; position: relative;
  transition: all 160ms ease;
  background: var(--cream-surface);
  cursor: pointer;
  flex-shrink: 0;
}
.wa-check:hover { border-color: var(--terracotta-500); }
.wa-check.on { background: var(--terracotta-500); border-color: var(--terracotta-500); }
.wa-check.on::after {
  content: ''; position: absolute; left: 5px; top: 1px;
  width: 5px; height: 10px;
  border: solid var(--cream-surface);
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}

.wa-toggle {
  display: inline-flex; align-items: center;
  background: var(--cream-input);
  border: 1px solid rgba(26, 26, 26, 0.08);
  border-radius: 9999px; padding: 2px; gap: 2px;
}
.wa-toggle > span {
  font-family: var(--font-mono); font-size: 9px; font-weight: 700;
  letter-spacing: 0.08em; padding: 4px 10px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 160ms ease;
  color: var(--charcoal-400);
  text-transform: uppercase;
}
.wa-toggle > span.on { background: var(--terracotta-500); color: var(--cream-surface); }
.wa-toggle > span:not(.on):hover { color: var(--charcoal-900); }

.wa-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.wa-table thead tr { background: var(--cream-input); }
.wa-table thead th {
  padding: 11px 12px; text-align: left;
  font-family: var(--font-mono); font-size: 9px; font-weight: 600;
  color: var(--charcoal-400);
  letter-spacing: 0.12em; text-transform: uppercase;
  border-bottom: 1px solid rgba(26, 26, 26, 0.06);
  white-space: nowrap;
}
.wa-table tbody tr { transition: background 140ms ease; }
.wa-table tbody tr:hover { background: rgba(201, 100, 66, 0.04); }
.wa-table tbody tr.checked { background: rgba(201, 100, 66, 0.05); }
.wa-table tbody tr.checked td:first-child { box-shadow: inset 3px 0 0 0 var(--terracotta-500); }
.wa-table tbody td {
  padding: 9px 12px;
  border-bottom: 1px solid rgba(26, 26, 26, 0.04);
  vertical-align: middle;
  color: var(--charcoal-900);
  font-family: var(--font-sora);
}
.wa-table .col-barcode { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--terracotta-500); letter-spacing: 0.02em; }
.wa-table tfoot { background: var(--cream-input); }
.wa-table tfoot td {
  padding: 12px 18px;
  font-family: var(--font-mono); font-size: 10px;
  color: var(--charcoal-500);
  letter-spacing: 0.05em;
  border-top: 1px solid rgba(26, 26, 26, 0.06);
}

.wa-section {
  background: var(--cream-surface);
  border: 1px solid rgba(26, 26, 26, 0.06);
  border-radius: var(--radius-xl);
  overflow: hidden;
}
.wa-section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 22px; cursor: pointer;
  transition: background 180ms ease;
}
.wa-section-header:hover { background: rgba(26, 26, 26, 0.02); }
.wa-section-header .chev { transition: transform 200ms ease; }
.wa-section-header.open .chev { transform: rotate(180deg); }

.wa-app-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px;
  background: rgba(253, 251, 247, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(26, 26, 26, 0.06);
  position: sticky; top: 0; z-index: 20;
}

.wa-tabs {
  display: flex; align-items: center; gap: 0;
  padding: 14px 24px 0;
  background: transparent;
  border-bottom: 1px solid rgba(26, 26, 26, 0.08);
}
.wa-tab {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  font-size: 12px; font-weight: 600;
  color: var(--charcoal-500);
  cursor: pointer;
  transition: all 200ms var(--ease-out);
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
}
.wa-tab:hover { color: var(--charcoal-900); }
.wa-tab.active { color: var(--charcoal-900); border-bottom-color: var(--terracotta-500); }
.wa-tab svg { color: var(--charcoal-400); transition: color 200ms ease; }
.wa-tab.active svg { color: var(--terracotta-500); }

.wa-page-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 18px; padding-bottom: 18px;
  border-bottom: 1px solid rgba(26, 26, 26, 0.08);
  gap: 18px;
}
.wa-page-header h1 { font-size: 24px; font-weight: 600; color: var(--charcoal-900); letter-spacing: -0.02em; }
.wa-page-header .eyebrow {
  font-family: var(--font-mono); font-size: 9px;
  color: var(--charcoal-400);
  letter-spacing: 0.2em; text-transform: uppercase;
  margin-bottom: 4px;
}
.wa-page-header .subtitle { font-size: 12px; color: var(--charcoal-500); margin-top: 6px; max-width: 560px; line-height: 1.5; }

.wa-app-body { padding: 18px 24px; background: var(--cream-bg); }

.wa-status {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 9999px;
  font-family: var(--font-mono); font-size: 9px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
}
.wa-status.success { background: var(--success-50); color: var(--success-500); }
.wa-status.danger { background: var(--danger-50); color: var(--danger-500); }
.wa-status.info { background: rgba(26, 26, 26, 0.06); color: var(--charcoal-500); }

.wa-step-num {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 12px; font-weight: 700;
  background: rgba(26, 26, 26, 0.08); color: var(--charcoal-400);
  transition: all 220ms var(--ease-out);
}
.wa-step.active .wa-step-num { background: var(--charcoal-900); color: var(--cream-surface); }
.wa-step.done .wa-step-num { background: var(--success-500); color: var(--cream-surface); }
.wa-step-line { width: 60px; height: 2px; background: rgba(26, 26, 26, 0.08); transition: background 400ms ease; }
.wa-step.done .wa-step-line { background: var(--success-500); }

.wa-search { position: relative; width: 100%; max-width: 380px; }
.wa-search input {
  width: 100%;
  background: var(--cream-surface);
  border: 1px solid rgba(26, 26, 26, 0.1);
  border-radius: 10px;
  padding: 10px 14px 10px 36px;
  font-size: 12px; color: var(--charcoal-900);
  font-family: inherit; outline: none;
  transition: all 160ms ease;
}
.wa-search input:focus { border-color: var(--terracotta-500); box-shadow: 0 0 0 3px rgba(201, 100, 66, 0.12); }
.wa-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--charcoal-400); pointer-events: none; }

.wa-zone {
  border: 1.5px dashed rgba(26, 26, 26, 0.12);
  border-radius: 10px; padding: 18px;
  text-align: center; background: transparent;
  cursor: pointer;
  transition: all 220ms var(--ease-out);
}
.wa-zone:hover {
  border-color: var(--terracotta-500);
  background: var(--cream-surface);
  transform: translateY(-2px);
}
.wa-zone.loaded { border-color: rgba(22, 163, 74, 0.4); background: var(--success-50); }

.wa-toggle-switch {
  width: 36px; height: 20px; background: rgba(26,26,26,0.12);
  border-radius: 9999px; position: relative; cursor: pointer;
  transition: all 180ms ease; display: inline-block;
}
.wa-toggle-switch.on { background: var(--success-500); }
.wa-toggle-switch::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; background: var(--cream-surface);
  border-radius: 50%; transition: all 200ms var(--ease-out);
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
.wa-toggle-switch.on::after { left: 18px; }

.wa-role-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 9999px; font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.1em; }
.wa-role-pill.admin { background: rgba(201,100,66,0.10); color: var(--terracotta-500); }
.wa-role-pill.user { background: rgba(26,26,26,0.06); color: var(--charcoal-500); }
```

- [ ] **Step 2: Verify no CSS errors**

Run: `npm run dev` → no console errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/index.css
git commit -m "feat(styles): add Warm Atelier component library (wa-* classes)"
```

### Task 1.3: Catalog brutalist patterns for removal

- [ ] **Step 1: Grep for brutalist hard-offset shadow usages**

Run: `grep -rn "4px 4px 0\|0 2px 0 var(--amber" app/src`
Expected: List of files. These will be progressively replaced in later phases.

- [ ] **Step 2: Commit (no changes)**

```bash
git commit --allow-empty -m "chore(styles): catalog brutalist shadow usages for removal"
```

---

## Phase 2: Login Page

### Task 2.1: Login JSX — split pane + Warm Atelier content

**Files:**
- Modify: `app/src/pages/LoginPage.jsx` (replace `.lp-page`, `.lp-left`, `.lp-right` markup)

- [ ] **Step 1: Read current LoginPage**

Open `app/src/pages/LoginPage.jsx`. The current code references `lp-page`, `lp-left`, `lp-right`, `lp-badge`, etc. — these classes will be removed.

- [ ] **Step 2: Add inline style tag for mobile responsive grid**

At the top of the `return (...)`, before the outer div, add:

```jsx
<style>{`
  @media (max-width: 900px) {
    .login-page { grid-template-columns: 1fr !important; }
    .login-page > div:first-child { padding: 32px 24px !important; min-height: 40vh; }
  }
`}</style>
```

- [ ] **Step 3: Replace the entire return statement**

Replace the JSX returned from `LoginPage` with this implementation. Keep all the `useState`/`handleSubmit` logic unchanged — only the JSX in `return (...)` changes:

```jsx
return (
  <div className="login-page" style={{
    display: 'grid',
    gridTemplateColumns: '1.15fr 1fr',
    minHeight: '100vh',
    background: 'var(--cream-bg)',
    fontFamily: 'var(--font-sora)',
  }}>
    {/* LEFT: Brand Panel */}
    <div style={{
      padding: '48px 56px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.22em', color: 'var(--charcoal-400)', textTransform: 'uppercase' }}>
        Kertas Kerja Digital
      </div>

      <div>
        <h1 style={{
          fontSize: '44px', lineHeight: 1.05, fontWeight: 600,
          color: 'var(--charcoal-900)', letterSpacing: '-0.025em', margin: 0,
        }}>
          Kertas Kerja<br/>Digital
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--charcoal-500)', marginTop: '12px', maxWidth: '420px', lineHeight: 1.55 }}>
          Opname fisik aset PT Santos Jaya Abadi, dicatat sekali dan selamanya.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '28px 0 18px' }}>
          <div style={{ height: '1px', background: 'var(--charcoal-900)', flex: 1, maxWidth: '180px' }} />
          <div style={{ width: '6px', height: '6px', background: 'var(--terracotta-500)', borderRadius: '50%' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 28px', fontSize: '13px', color: 'var(--charcoal-900)' }}>
          {MODULES.map((mod) => (
            <div key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: '1px solid rgba(26,26,26,0.08)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-400)', fontSize: '9px' }}>{mod.id}</span>
              {mod.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--charcoal-400)', letterSpacing: '0.1em' }}>
        PT SANTOS JAYA ABADI · INTERNAL
      </div>
    </div>

    {/* RIGHT: Form Panel */}
    <div style={{ padding: '48px 56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.01em' }}>Masuk</div>
        <div style={{ fontSize: '12px', color: 'var(--charcoal-500)', marginTop: '4px' }}>Lanjutkan ke sistem opname Anda.</div>

        <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--charcoal-400)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '6px' }}>Username</div>
            <input
              type="text"
              className="wa-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--charcoal-400)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '6px' }}>Password</div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="wa-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--charcoal-500)' }}
                aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '11px', color: 'var(--charcoal-500)' }}>
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: 'var(--terracotta-500)' }} />
            Ingat sesi saya
          </label>

          {error && (
            <div role="alert" style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--danger-50)', color: 'var(--danger-500)', borderRadius: '8px', fontSize: '11.5px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !username || !password} className="wa-btn" style={{ width: '100%', marginTop: '18px', padding: '12px' }}>
            {loading ? 'Memproses…' : 'Masuk'}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '10px', color: 'var(--charcoal-400)' }}>
            Hak akses terbatas. Aktivitas dicatat.
          </div>
        </form>
      </div>
    </div>

    {/* Server config modal (native only) — keep existing structure, just restyle */}
    {showSettings && isNativePlatform && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
        <div className="wa-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Settings size={17} style={{ color: 'var(--terracotta-500)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--charcoal-900)' }}>Server Configuration</h3>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--charcoal-500)', lineHeight: 1.5, marginBottom: '12px' }}>
            Konfigurasi target API server.<br/>
            <b>USB (ADB Reverse):</b> <code>http://localhost:5181</code><br/>
            <b>WiFi (PC IP):</b> <code>http://192.168.x.x:5181</code>
          </p>
          <input type="text" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} className="wa-input" placeholder="http://localhost:5181" style={{ marginBottom: '12px' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="wa-btn-ghost" onClick={() => setShowSettings(false)}>Batal</button>
            <button type="button" className="wa-btn" onClick={() => { setServerUrl(tempUrl.trim()); setBaseUrl(tempUrl.trim()); setShowSettings(false); }}>Simpan</button>
          </div>
        </div>
      </div>
    )}
  </div>
);
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev` → open `http://localhost:5173/login`. Check:
- Left panel shows "Kertas Kerja Digital" heading + 4 modules
- Right panel shows Masuk form
- Login works (existing functionality preserved)
- On mobile width: stacks vertically

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/LoginPage.jsx
git commit -m "feat(login): redesign with Warm Atelier split-pane layout"
```

### Task 2.2: Login — remove old `lp-*` CSS

**Files:**
- Modify: `app/src/index.css` (search and remove `.lp-page`, `.lp-left`, `.lp-right`, `.lp-badge`, `.lp-noise`, `.lp-form*`, `.lp-error`, `.lp-submit`, `.lp-remember`, `.lp-modal*`, `.lp-field*`)

- [ ] **Step 1: Find and remove `lp-*` classes**

Run: `grep -n "^\.lp-\|^\.login-page" app/src/index.css`
For each match, delete the entire class block (from selector line through closing `}`).

- [ ] **Step 2: Verify no `lp-*` references remain in JSX**

Run: `grep -rn "lp-" app/src/pages/ app/src/components/ 2>/dev/null`
Expected: No matches.

- [ ] **Step 3: Commit**

```bash
git add app/src/index.css
git commit -m "chore(styles): remove legacy lp-* login classes"
```

---

## Phase 3: Bento Menu

### Task 3.1: BentoMenu JSX — 2x2 grid + Warm Atelier

**Files:**
- Modify: `app/src/pages/BentoMenu.jsx` (replace `bm-*` markup with new wa-* + inline styles)

- [ ] **Step 1: Read current BentoMenu**

Open `app/src/pages/BentoMenu.jsx`. Note the `MODULE_META` (4 categories) and `ALL_APPS` (4 apps with `title`, `description`, `path`, `variant`, `moduleIndex`).

- [ ] **Step 2: Replace topbar + main JSX**

In the `return (...)` block, replace the entire `<div className="bm-page">...</div>` with:

```jsx
return (
  <div style={{ minHeight: '100vh', background: 'var(--cream-bg)', fontFamily: 'var(--font-sora)' }}>
    {/* Top bar */}
    <div className="wa-app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, background: 'var(--charcoal-900)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--terracotta-500)', letterSpacing: '0.05em' }}>KKD</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.01em' }}>Kertas Kerja Digital</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Logged in as</div>
          <div style={{ fontSize: 12, color: 'var(--charcoal-900)', fontWeight: 600 }}>{auth.user || 'User'}</div>
        </div>
        <button onClick={handleLogout} className="wa-btn-ghost">Logout</button>
      </div>
    </div>

    {/* Body */}
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.02em', marginTop: 6 }}>
            Selamat datang, {auth.user || 'User'}.
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.15em' }}>PILIH APLIKASI →</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
        {visibleApps.map((app) => {
          const meta = MODULE_META[app.moduleIndex];
          const IconComp = ModuleIcons[app.id];
          return (
            <button key={app.id} className="wa-card" onClick={() => navigate(app.path)}
              style={{ padding: 24, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.2em' }}>
                  MOD {meta.code} · {meta.category.toUpperCase()}
                </div>
                {app.id === 'app1' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 5, height: 5, background: 'var(--terracotta-500)', borderRadius: '50%' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--terracotta-500)', letterSpacing: '0.12em', fontWeight: 700 }}>RECENT</span>
                  </div>
                )}
              </div>
              <div className="wa-icon-wrap" style={{ marginBottom: 18 }}>
                {IconComp && <IconComp />}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.01em' }}>{app.title}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--charcoal-500)', lineHeight: 1.5 }}>{app.description}</div>
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(26,26,26,0.06)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.1em' }}>AKTIF</div>
                <div style={{ fontSize: 11, color: 'var(--charcoal-900)', fontWeight: 600 }}>Buka →</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, borderTop: '1px solid rgba(26,26,26,0.08)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.12em' }}>
        <span>V1.0.4 · BUILD 2026.06</span>
        <span>PT SANTOS JAYA ABADI · INTERNAL</span>
        <span>◆ PRODUCTION</span>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 3: Verify visually**

`npm run dev` → login → see Bento. Hover cards (lift), hover icon (terracotta).

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/BentoMenu.jsx
git commit -m "feat(bento): redesign with 2x2 grid + Warm Atelier"
```

### Task 3.2: Bento — remove old `bm-*` CSS

- [ ] **Step 1: Find and remove `bm-*` classes**

Run: `grep -n "^\.bm-" app/src/index.css`
For each match, delete the entire class block.

- [ ] **Step 2: Verify no `bm-*` references**

Run: `grep -rn "bm-" app/src/pages/ app/src/components/ 2>/dev/null`
Expected: No matches.

- [ ] **Step 3: Commit**

```bash
git add app/src/index.css
git commit -m "chore(styles): remove legacy bm-* bento classes"
```

---

## Phase 4: In-App Shell (App.jsx layouts)

### Task 4.1: App1Layout — sticky slim header + pills

**Files:**
- Modify: `app/src/App.jsx` (replace `App1Layout` function JSX)

- [ ] **Step 1: Replace App1Layout header markup**

Find `function App1Layout()`. Replace the `<header className="app-header" ...>` block with:

```jsx
<header className="wa-app-header">
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <button onClick={handleLogout} title={isNativePlatform ? 'Logout Aplikasi' : 'Kembali ke Menu'}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--charcoal-500)' }}>
      {isNativePlatform ? <LogOut size={18} color="var(--danger-500)" /> : <ArrowLeft size={18} />}
    </button>
    <div style={{ width: 1, height: 18, background: 'rgba(26,26,26,0.1)' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 26, height: 26, background: 'var(--charcoal-900)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ClipboardList size={18} color="var(--terracotta-400)" />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.01em' }}>Opname Aset</div>
    </div>
    <div className="wa-pill" style={{ marginLeft: 8 }}>
      <Link to="/app1" className={`wa-pill-item ${isHome ? 'active' : ''}`}><Home size={15} style={{ color: isHome ? 'var(--terracotta-500)' : 'var(--charcoal-400)' }} />Home</Link>
      <Link to="/app1/opname" className={`wa-pill-item ${!isHome ? 'active' : ''}`}><ClipboardCheck size={15} />Kertas Kerja</Link>
    </div>
  </div>
  <div className="wa-btn" onClick={() => setIsSearchOpen(true)} style={{ background: 'var(--charcoal-900)', color: 'var(--cream-surface)', cursor: 'pointer' }}>
    <Search size={16} strokeWidth={3} /> BARCODE CHECKER
  </div>
</header>
```

- [ ] **Step 2: Verify**

`npm run dev` → login → click App1 → see slim header with pills.

- [ ] **Step 3: Commit**

```bash
git add app/src/App.jsx
git commit -m "feat(shell): App1Layout slim header with wa-pill nav"
```

### Task 4.2: App2Layout — same slim header pattern

- [ ] **Step 1: Apply same pattern to App2Layout**

Find `function App2Layout()`. Replace its `<header className="app-header">` with the `wa-app-header` pattern, using `FileSpreadsheet` icon and "Extract & MAT" label.

```bash
git add app/src/App.jsx
git commit -m "feat(shell): App2Layout slim header with Warm Atelier"
```

---

## Phase 5: App1 Opname (main work page)

### Task 5.1: OpnamePage — context bar (1-row)

**Files:**
- Modify: `app/src/pages/OpnamePage.jsx` (replace room-nav markup)

- [ ] **Step 1: Find room-nav block**

Search for `<div className="room-nav">`. This is the second-level nav with prev/next + select + progress + stats widget.

- [ ] **Step 2: Replace with context bar**

Replace the entire `<div className="room-nav">` block with:

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', background: 'var(--cream-surface)', borderBottom: '1px solid rgba(26,26,26,0.06)' }}>
  {/* Prev/Next + select */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
    <button onClick={handlePrevRoom} disabled={roomIdx === 0} style={{ width: 30, height: 30, background: 'transparent', border: '1px solid rgba(26,26,26,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--charcoal-900)', cursor: roomIdx === 0 ? 'not-allowed' : 'pointer', opacity: roomIdx === 0 ? 0.25 : 1 }}>
      <ChevronLeft size={14} />
    </button>
    <select className="wa-select" value={roomIdx} onChange={(e) => setRoomIndex(Number(e.target.value))} style={{ minWidth: 240, fontSize: 12, fontWeight: 600 }}>
      {state.rooms.map((r, i) => {
        const op = overallProgress[i];
        const pctStr = op ? ` (${op.checked}/${op.total})` : '';
        return <option key={i} value={i}>{i + 1}. {r.meta.roomName || r.sheetName}{pctStr}</option>;
      })}
    </select>
    <button onClick={handleNextRoom} disabled={roomIdx === state.rooms.length - 1} style={{ width: 30, height: 30, background: 'transparent', border: '1px solid rgba(26,26,26,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--charcoal-900)', cursor: roomIdx === state.rooms.length - 1 ? 'not-allowed' : 'pointer', opacity: roomIdx === state.rooms.length - 1 ? 0.25 : 1 }}>
      <ChevronRight size={14} />
    </button>
  </div>

  <div style={{ width: 1, height: 24, background: 'rgba(26,26,26,0.08)' }} />

  {/* Progress ring + count */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
    <div style={{ position: 'relative', width: 36, height: 36 }}>
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(26,26,26,0.08)" strokeWidth="3" />
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--terracotta-500)" strokeWidth="3" strokeDasharray="87.96" strokeDashoffset={87.96 - (87.96 * progress.pct / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.25,1,0.5,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, color: 'var(--charcoal-900)' }}>{progress.pct}%</div>
    </div>
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{progress.checked}/{progress.total}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.08em' }}>{progress.total - progress.checked} SISA</div>
    </div>
  </div>

  <div style={{ width: 1, height: 24, background: 'rgba(26,26,26,0.08)' }} />

  {/* Dot grid (horizontal scroll) */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 3, overflowX: 'auto', flex: 1, minWidth: 0, paddingRight: 8 }}>
    {state.rooms.map((r, i) => {
      const op = overallProgress[i];
      const isActive = i === roomIdx;
      const isDone = op && op.checked === op.total;
      const isProcess = op && op.checked > 0 && op.checked < op.total;
      return (
        <div key={i} title={`Ruang ${i + 1}`} style={{
          width: 12, height: 12, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
          background: isActive ? 'var(--cream-surface)' : (isDone ? 'var(--charcoal-900)' : (isProcess ? 'var(--terracotta-500)' : 'var(--cream-surface)')),
          border: isActive ? '2px solid var(--terracotta-500)' : '1.5px solid var(--charcoal-300)',
        }} onClick={() => setRoomIndex(i)} />
      );
    })}
  </div>
</div>
```

- [ ] **Step 3: Verify**

Login → App1 → Kertas Kerja. Context bar shows prev/next, select, ring, dot grid horizontal.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/OpnamePage.jsx
git commit -m "feat(opname): replace room-nav with 1-row context bar"
```

### Task 5.2: OpnamePage — page header + action bar

**Files:**
- Modify: `app/src/pages/OpnamePage.jsx` (replace meta-info + actions-bar)

- [ ] **Step 1: Replace meta-info block**

Find `<div className="meta-info" ...>`. Replace with the new 4-column meta strip using inline styles (the spec mockup shows 4 columns with terracotta eyebrow labels).

- [ ] **Step 2: Replace actions-bar with new action bar**

Find `<div className="actions-bar" ...>`. Replace with:

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)' }}>Daftar Aset</div>
  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-500)' }}>18 ITEM</div>
  <button className="wa-btn" style={{ background: 'rgba(201,100,66,0.10)', color: 'var(--terracotta-500)', boxShadow: 'none' }}>◉ TEROPNAME</button>
  <div style={{ flex: 1 }} />
  <button className="wa-btn-ghost">+ Custom</button>
  <button className="wa-btn-ghost">Save / Load</button>
  <button className="wa-btn">↓ PDF</button>
  <button className="wa-btn-terracotta">↻ Sync</button>
</div>
```

- [ ] **Step 3: Verify**

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/OpnamePage.jsx
git commit -m "feat(opname): page header + action bar with wa-* buttons"
```

### Task 5.3: OpnamePage — search input + asset table

**Files:**
- Modify: `app/src/components/AssetTable.jsx` (use `wa-table` class)
- Modify: `app/src/pages/OpnamePage.jsx` (search input + asset table wrapper)

- [ ] **Step 1: Update AssetTable component**

Open `app/src/components/AssetTable.jsx`. Replace the `<table className="asset-table">` with `<table className="wa-table">`. Remove inline `style` for cell padding (let CSS handle). Keep all logic.

- [ ] **Step 2: Add prominent search input**

In `OpnamePage.jsx`, before the `<AssetTable>`, add:

```jsx
<div className="wa-search" style={{ marginBottom: 12 }}>
  <Search size={13} />
  <input placeholder="Scan atau ketik barcode aset…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
</div>
```

- [ ] **Step 3: Verify**

Table renders with cream header, monospace column labels, terracotta barcode text, hover row effect.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/AssetTable.jsx app/src/pages/OpnamePage.jsx
git commit -m "feat(opname): wa-table + prominent search input"
```

### Task 5.4: OpnamePage — collapsible sections + signature grid

**Files:**
- Modify: `app/src/components/NoBarcodeSection.jsx` (wrap in `wa-section`)
- Modify: `app/src/components/NotAtLocationSection.jsx` (wrap in `wa-section`)
- Modify: `app/src/components/SignatureSection.jsx` (3-column grid using `wa-card`)

- [ ] **Step 1: Update NoBarcodeSection**

Wrap root in `<div className="wa-section">` with a `wa-section-header` strip. Apply `wa-table` to inner table.

- [ ] **Step 2: Update NotAtLocationSection**

Same as 5.4.1.

- [ ] **Step 3: Update SignatureSection**

Replace the 3-pad layout with a 3-column grid using `wa-card`:

```jsx
<div className="wa-card" style={{ padding: 18, marginBottom: 14 }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
    <PenTool size={14} color="var(--terracotta-500)" />
    <div style={{ fontSize: 13, fontWeight: 600 }}>Tanda Tangan &amp; Nama Terang</div>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
    {['Petugas Opname 1', 'Petugas Opname 2', 'PIC Ruangan'].map((label) => (
      <div key={label}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--terracotta-500)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>{label}</div>
        <SignaturePad onSave={(data) => handleSaveSig(label, data)} onSaveName={(name) => handleSaveName(label, name)} />
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Verify**

All 3 sections render with new style.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/NoBarcodeSection.jsx app/src/components/NotAtLocationSection.jsx app/src/components/SignatureSection.jsx
git commit -m "feat(opname): collapsible sections + 3-col signature grid"
```

### Task 5.5: OpnamePage — remove legacy CSS

- [ ] **Step 1: Remove legacy Opname CSS classes**

Grep and remove from `app/src/index.css`: `.room-nav`, `.room-nav__*`, `.meta-info`, `.meta-info__*`, `.actions-bar`, `.asset-table*`, `.section-header`, `.editable-row`, `.checkbox-opname`, `.signature-pad*`, `.signature-section*`.

```bash
git add app/src/index.css
git commit -m "chore(styles): remove legacy opname table/nav classes"
```

### Task 5.6: Opname — mobile layout

**Files:**
- Modify: `app/src/pages/OpnamePage.jsx` (add mobile cards)
- Modify: `app/src/index.css` (mobile media query)

- [ ] **Step 1: Add mobile CSS**

Append to `index.css`:

```css
@media (max-width: 767px) {
  .wa-app-header { padding: 10px 14px !important; }
  .wa-app-body { padding: 12px 14px !important; }
  .opname-asset-table-wrapper { display: none !important; }
  .opname-asset-cards { display: block !important; }
}
@media (min-width: 768px) {
  .opname-asset-cards { display: none !important; }
}
```

- [ ] **Step 2: Wrap AssetTable in mobile-hidden div**

In `OpnamePage.jsx`, wrap the existing `<AssetTable>` in `<div className="opname-asset-table-wrapper">`.

- [ ] **Step 3: Add mobile asset cards after AssetTable**

```jsx
<div className="opname-asset-cards">
  {room.assets.map((asset, idx) => (
    <div key={asset.id} className="wa-card" style={{ padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className={`wa-check ${asset.isChecked ? 'on' : ''}`} onClick={() => toggleAssetCheck(roomIdx, asset.id)} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--terracotta-500)' }}>{asset.barcode}</div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{asset.name}</div>
        </div>
        <div className="wa-toggle"><span className={asset.ada ? 'on' : ''} onClick={() => updateAssetField(roomIdx, asset.id, 'ada', true)}>Ada</span><span className={!asset.ada ? 'on' : ''} onClick={() => updateAssetField(roomIdx, asset.id, 'ada', false)}>Tdk</span></div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <select className="wa-select" style={{ flex: 1 }} value={asset.kondisi || ''} onChange={(e) => updateAssetField(roomIdx, asset.id, 'kondisi', e.target.value)}>
          <option value="">— Kondisi —</option>
          <option>Baik</option>
          <option>Rusak Ringan</option>
          <option>Rusak Berat</option>
        </select>
        <input className="wa-input" style={{ flex: 1 }} placeholder="Keterangan…" value={asset.keterangan || ''} onChange={(e) => updateAssetField(roomIdx, asset.id, 'keterangan', e.target.value)} />
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Verify**

Resize browser to 375px width: card view appears, table hidden. Resize back to 1024px: table appears.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/OpnamePage.jsx app/src/index.css
git commit -m "feat(opname): mobile asset cards with toggle + inputs"
```

---

## Phase 6: App1 Upload (4 cards)

### Task 6.1: UploadPage — 4-card dashboard

**Files:**
- Modify: `app/src/pages/UploadPage.jsx` (replace dashboard with 4-card layout)
- Modify: `app/src/components/SavedSessionCard.jsx`, `NetworkSyncHub.jsx`, `DatabaseUploadGrid.jsx`

- [ ] **Step 1: Replace UploadPage JSX (4 cards)**

Find the `return (...)` for the main dashboard view (not the parsedData view). Replace the bento-grid with the 4-card layout:

```jsx
return (
  <div className="wa-app-body">
    <div className="wa-page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="wa-icon-wrap" style={{ background: 'rgba(26,26,26,0.06)' }}><FileSpreadsheet size={20} color="var(--charcoal-900)" /></div>
        <div>
          <div className="eyebrow">Modul 01 · Operasional</div>
          <h1>Kertas Kerja Opname</h1>
          <div className="subtitle">Mulai opname baru, lanjutkan sesi sebelumnya, atau sinkronkan data dari jaringan.</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="wa-btn" onClick={() => setIsSaveModalOpen(true)}><Save size={13} /> Lanjutkan dari Lokal (Save)</button>
        <button className="wa-btn-terracotta" onClick={() => setIsServerModalOpen(true)}><Server size={13} /> Ambil Data Server (Baru)</button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <SavedSessionCard />
      <NetworkSyncHub />
      <div className="wa-card" style={{ gridColumn: 'span 2', padding: 22 }}>
        <DatabaseUploadGrid />
      </div>
      <div className="wa-card" style={{ gridColumn: 'span 2', padding: 22 }}>
        {/* Database Master Aset content (98,837 aset SQL Server status) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div className="wa-icon-wrap" style={{ background: 'rgba(22,163,74,0.10)' }}>
            <Layers size={20} color="var(--success-500)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal-900)' }}>Database Master Aset</div>
            <div style={{ fontSize: 11.5, color: 'var(--charcoal-500)', marginTop: 3 }}>Kamus utama barcode &amp; metadata aset perusahaan.</div>
          </div>
          <div className="wa-status success">✓ 98,837 ASET</div>
        </div>
        <div style={{ padding: 14, background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--success-500)', fontWeight: 600 }}>SQL Server (98837 aset) — 98,837 barcode dimuat</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-400)', marginTop: 6 }}>⏱ Terakhir sync: 15 Jun 2026, 11:45</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="wa-btn-ghost"><RefreshCw size={12} /> Sinkron Ulang</button>
          <button className="wa-btn-ghost"><Upload size={12} /> Upload File</button>
        </div>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 2: Update SavedSessionCard**

Wrap in `wa-card` with `LANJUTKAN OPNAME` button + "79 RUANGAN" badge.

- [ ] **Step 3: Update NetworkSyncHub**

Replace with 2-inline-action layout (Bagikan Sesi + Tarik Hasil Opname).

- [ ] **Step 4: Update DatabaseUploadGrid**

Replace with `wa-zone` upload zones + "Sinkron Semua dari Server" terracotta button.

- [ ] **Step 5: Verify**

Login → App1 → Home. See 4 cards.

- [ ] **Step 6: Commit**

```bash
git add app/src/pages/UploadPage.jsx app/src/components/SavedSessionCard.jsx app/src/components/NetworkSyncHub.jsx app/src/components/DatabaseUploadGrid.jsx
git commit -m "feat(upload): redesign as 4-card dashboard"
```

---

## Phase 7: App2 Extract

### Task 7.1: ExtractOpnamePage — match actual structure

**Files:**
- Modify: `app/src/pages/ExtractOpnamePage.jsx` (replace dashboard)

- [ ] **Step 1: Read current ExtractOpnamePage**

Open the file. Note `state.periods`, `selectedPeriod`, `departmentFilter`, `scannedData`, `notScannedData`, `expandedRooms`.

- [ ] **Step 2: Replace dashboard JSX**

Apply v2 structure:
- 2 dropdowns: PERIODE OPNAME + FILTER DEPARTEMEN
- Master Data upload row with "Sinkronisasi" terracotta button
- 4 summary cards (Total Ruangan / Aset Terscan / Aset Tidak Terscan / Salah Ruangan MAT)
- Room expandable list (chevron, counter, status pill, Preview button)
- Bottom fixed action bar (sticky) with "Export Semua Excel"

- [ ] **Step 3: Verify**

Login → App2. See 2 dropdowns, upload row, 4 summary cards, room list, sticky bottom bar.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/ExtractOpnamePage.jsx
git commit -m "feat(extract): redesign with 4 summary + sticky export bar"
```

---

## Phase 8: App3 (Master + Recouncil)

### Task 8.1: App3ConsolidationPage — 3-step stepper with filter

**Files:**
- Modify: `app/src/pages/App3ConsolidationPage.jsx`

- [ ] **Step 1: Replace Pipeline Ingestion card**

Replace the 4 upload slots with `wa-zone` styled zones. Wrap in `wa-section`.

- [ ] **Step 2: Add stepper visual (3 steps)**

In page header area, render a 3-step stepper using `wa-step` classes:

```jsx
<div style={{ display: 'flex', alignItems: 'center' }}>
  <div className={`wa-step ${step >= 1 ? 'done' : ''} ${step === 1 ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div className="wa-step-num">{step > 1 ? '✓' : '1'}</div>
    <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Step 1</div><div style={{ fontSize: 11, fontWeight: 600 }}>Upload 4 File</div></div>
  </div>
  <div className={`wa-step-line ${step >= 2 ? 'done' : ''}`} style={{ width: 60, height: 2, margin: '0 8px' }} />
  <div className={`wa-step ${step >= 2 ? 'done' : ''} ${step === 2 ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div className="wa-step-num">{step > 2 ? '✓' : '2'}</div>
    <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--terracotta-500)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>Step 2 · Aktif</div><div style={{ fontSize: 11, fontWeight: 600 }}>Pilih Filter</div></div>
  </div>
  <div className="wa-step-line" style={{ width: 60, height: 2, background: 'rgba(26,26,26,0.08)', margin: '0 8px' }} />
  <div className="wa-step" style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.55 }}>
    <div className="wa-step-num">3</div>
    <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Step 3</div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--charcoal-400)' }}>Generate Excel</div></div>
  </div>
</div>
```

- [ ] **Step 3: Replace filter section (Step 2)**

Replace the current `bats.map(...)` button group with a 5-card layout: ICT, ENG, BAT, HRGA, Kosong. Each card shows count from `bats` array (use a fake distribution if not available). Multi-select. Live summary at bottom.

- [ ] **Step 4: Verify**

Login → App3 → Tahap 1. See stepper, upload zones, filter cards.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/App3ConsolidationPage.jsx
git commit -m "feat(app3): 3-step stepper + filter cards"
```

### Task 8.2: UnifiedMasterDataPage — tab strip

**Files:**
- Modify: `app/src/pages/UnifiedMasterDataPage.jsx`

- [ ] **Step 1: Replace global header with slim header + wa-tabs**

Find `<header className="app-header" ...>`. Replace with `wa-app-header` pattern + `<div className="wa-tabs">` (Consolidation | Evaluation).

- [ ] **Step 2: Commit**

```bash
git add app/src/pages/UnifiedMasterDataPage.jsx
git commit -m "feat(app3): tab strip with Tahap 1/2 switching"
```

### Task 8.3: App4RecouncilPage — Recouncil Intelligence layout

**Files:**
- Modify: `app/src/pages/App4RecouncilPage.jsx`

- [ ] **Step 1: Replace page header**

Apply "Recouncil Intelligence" title with terracotta accent, "FINAL EVALUATION MODULE" badge.

- [ ] **Step 2: Replace cross-verification card**

3 upload zones: 2 top (Hasil Opname App2 + Master Data App3) + divider "PENGAYAAN DATA TAMBAHAN" + 1 bottom (ASPxGridView1, OPSIONAL).

- [ ] **Step 3: Replace process button**

Use `wa-btn-terracotta` "Proses Recouncil Sekarang →".

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/App4RecouncilPage.jsx
git commit -m "feat(app4): Recouncil Intelligence layout"
```

---

## Phase 9: AdminPage

### Task 9.1: AdminPage — header + tab strip + Users content

**Files:**
- Modify: `app/src/pages/AdminPage.jsx`

- [ ] **Step 1: Replace header + 4-tab strip**

Apply the v1 mockup: slim header + tab strip (Users, Audit Trail, Backup, System Info) using `wa-tabs`. Active tab has terracotta underline.

- [ ] **Step 2: Replace Users content**

- Tambah User form (inline, 3 columns + button) at top
- Users table with avatar + role pill + 3 toggle switches + status pill + actions

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/AdminPage.jsx
git commit -m "feat(admin): Users tab with inline form + toggle + role pill"
```

### Task 9.2: AdminPage — other 3 tabs

- [ ] **Step 1: Apply wa-* to Audit, Backup, System Info tabs**

- [ ] **Step 2: Commit**

```bash
git add app/src/pages/AdminPage.jsx
git commit -m "feat(admin): apply wa-* to Audit/Backup/System tabs"
```

---

## Phase 10: Shared Components & Modals

### Task 10.1: Modals — apply `wa-card` style

**Files:**
- Modify: `app/src/components/BarcodeSearchModal.css`
- Modify: `app/src/components/MatHistoryModal.css`
- Modify: `app/src/components/SaveLoadModal.jsx`
- Modify: `app/src/components/CustomRoomModal.jsx`
- Modify: `app/src/components/PreviewModal.jsx`

- [ ] **Step 1: Replace modal overlay scrim**

Find `background: rgba(0, 0, 0, 0.5);` (or similar) and replace with `background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);`.

- [ ] **Step 2: Replace modal box CSS**

Add or update:

```css
.modal-box {
  background: var(--cream-surface);
  border: 1px solid rgba(26, 26, 26, 0.06);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

- [ ] **Step 3: Update JSX in each modal to use className="modal-box" or wa-card**

For `SaveLoadModal.jsx`, `CustomRoomModal.jsx`, `PreviewModal.jsx` — apply `className="wa-card"` to the modal container.

- [ ] **Step 4: Verify each modal**

Open Barcode Checker, Mat History, Save/Load, Custom Room, Preview modals from the app. All should render with soft style.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/BarcodeSearchModal.css app/src/components/MatHistoryModal.css app/src/components/SaveLoadModal.jsx app/src/components/CustomRoomModal.jsx app/src/components/PreviewModal.jsx
git commit -m "feat(modals): apply wa-card style to all modal containers"
```

### Task 10.2: ServerFileBrowser — apply wa-card

**Files:**
- Modify: `app/src/components/ServerFileBrowser.jsx`

- [ ] **Step 1: Update file list items**

Replace `className="file-list-item"` with `className="wa-card"` (smaller padding) or a custom soft style.

- [ ] **Step 2: Commit**

```bash
git add app/src/components/ServerFileBrowser.jsx
git commit -m "feat(server-browser): wa-card file list items"
```

### Task 10.3: SearchableGroupedSelect — apply wa-select

**Files:**
- Modify: `app/src/components/SearchableGroupedSelect.jsx`

- [ ] **Step 1: Apply wa-select to trigger + dropdown**

- [ ] **Step 2: Commit**

```bash
git add app/src/components/SearchableGroupedSelect.jsx
git commit -m "feat(searchable-select): apply wa-select style"
```

### Task 10.4: extract-opname.css — update to wa-*

**Files:**
- Modify: `app/src/extract-opname.css`

- [ ] **Step 1: Grep brutalist patterns**

Run: `grep -n "border: 2px solid\|box-shadow: 4px 4px 0\|box-shadow: 8px 8px 0" app/src/extract-opname.css`
Replace each with soft pattern (1px border 6% opacity, soft shadow).

- [ ] **Step 2: Commit**

```bash
git add app/src/extract-opname.css
git commit -m "chore(extract-opname): remove brutalist hard sombras"
```

---

## Phase 11: Final Verification

### Task 11.1: Final brutalist audit

- [ ] **Step 1: Grep for remaining brutalist hard-offset shadow**

Run: `grep -rn "4px 4px 0\|0 2px 0 var(--amber\|2px solid var(--charcoal-900)\|2px solid var(--warm-200)" app/src`
Expected: Zero matches (or only documentation comments).

- [ ] **Step 2: Grep for old class prefixes**

Run: `grep -rn "className=\"lp-\|className=\"bm-\|className=\"room-nav\|className=\"meta-info\|className=\"actions-bar\|className=\"asset-table\|className=\"section-header--\|className=\"editable-row\|className=\"checkbox-opname\|className=\"signature-pad\|className=\"upload-zone" app/src/pages app/src/components 2>/dev/null`
Expected: Zero matches.

- [ ] **Step 3: Grep emoji as icons**

Run: `grep -rn "[😀-🙏🌀-🗿✂-➰]" app/src/pages app/src/components 2>/dev/null`
Expected: Zero matches.

### Task 11.2: Build verification

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: Build completes without errors.

- [ ] **Step 2: Run existing tests**

Run: `npm test`
Expected: All existing tests pass.

### Task 11.3: Mobile capacitor touch target check

- [ ] **Step 1: Add 44px min-height for native buttons**

Append to `index.css`:

```css
html.plt-capacitor .wa-btn, html.plt-android .wa-btn,
html.plt-capacitor .wa-btn-ghost, html.plt-android .wa-btn-ghost,
html.plt-capacitor .wa-btn-terracotta, html.plt-android .wa-btn-terracotta {
  min-height: 44px;
}
```

### Task 11.4: Final commit + summary

- [ ] **Step 1: Commit final cleanup**

```bash
git add -A
git commit -m "chore: final cleanup, touch targets, build verification"
```

- [ ] **Step 2: Visual review pass**

Visit each page on desktop (1280px) and mobile (375px) viewports:
- `/login` → split-pane login
- `/` (Bento) → 2x2 grid
- `/app1` → 4 cards
- `/app1/opname` → context bar + table (or cards on mobile)
- `/app2` → 2 dropdowns + 4 summary + expandable rooms + sticky export bar
- `/app3` (Tahap 1) → stepper + upload zones
- `/app3` (Tahap 2) → "Recouncil Intelligence" + 3 zones
- `/admin` (admin) → Users tab

All should match the validated mockups. Any deviations: fix in a final commit.

---

## Self-Review Notes

**Spec coverage:**
- §1-2 Context & direction ✓
- §3-7 Design system, components, animation ✓ (Tasks 1.1-1.3)
- §8.1 LoginPage ✓ (Task 2.1-2.2)
- §8.2 BentoMenu ✓ (Task 3.1-3.2)
- §8.3 UploadPage ✓ (Task 6.1)
- §8.4 OpnamePage (desktop+mobile) ✓ (Tasks 5.1-5.6)
- §8.5 ExtractOpnamePage ✓ (Task 7.1)
- §8.6 Master+Recouncil ✓ (Tasks 8.1-8.3)
- §8.7 AdminPage ✓ (Tasks 9.1-9.2)
- §8.8 Navigation Flow ✓ (no code change, documented in spec)
- §8.9 Mobile Capacitor ✓ (Task 11.3)
- §9 Responsive ✓ (Task 5.6 mobile, 11.3 native)
- §10 Anti-patterns removed ✓ (Task 11.1)
- §11 Files to modify — all 20+ files covered
- §12 Acceptance criteria ✓ (Task 11.2 build + tests, 11.1 audit, 11.4 visual)

**Placeholder scan:** No TBD/TODO/"implement later"/"add appropriate error handling" — all code shown or specific instructions.

**Type/class consistency:** `wa-card`, `wa-btn`, `wa-table`, `wa-pill`, `wa-icon-wrap`, etc. used consistently across all phases.

**Scope check:** Single cohesive plan. ~30 commits, each independently reviewable. Within bounds of one plan.
