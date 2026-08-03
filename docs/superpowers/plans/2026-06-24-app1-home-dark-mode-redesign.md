# App1 Home Dark Mode Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign App1 home (`/app1`) and all App1 non-`/app1/opname` supporting UI so dark mode text contrast is readable, Sumber Data Aset is SQL-first, and operator flow is clearer.

**Architecture:** Keep business logic and routes unchanged. Add one small pure status helper for testable UI state, then restyle App1 home with scoped `.app1-home-*` CSS so changes do not bleed into `/app1/opname`, App2, App3, or App4.

**Tech Stack:** React 19, Vite, Vitest, React Router, Lucide icons, existing CSS token system in `app/src/styles/tokens.css`.

---

## File Structure

- Create: `app/src/utils/app1HomeStatus.js`
  - Pure functions for App1 home status labels and SQL readiness.
  - No React, no DOM, easy Vitest coverage.
- Create: `app/src/__tests__/app1HomeStatus.test.js`
  - Unit tests for status logic and CTA labels.
- Modify: `app/src/pages/UploadPage.jsx`
  - Replace `/app1` home layout with hero + status + action cards.
  - Replace server modal inline hardcoded colors with class-based modal shell.
  - Do not alter parsed Excel result logic except class cleanup where needed.
- Modify: `app/src/components/SavedSessionCard.jsx`
  - Make saved session a clear continue-action card.
- Modify: `app/src/components/NetworkSyncHub.jsx`
  - Keep sync logic; replace inline-heavy card UI with direction-labeled actions.
- Modify: `app/src/components/DatabaseUploadGrid.jsx`
  - Keep SQL/file parsing logic; make SQL Server sync primary, master/history status cards secondary, upload fallback explicit.
- Modify: `app/src/components/ServerFileBrowser.jsx`
  - Keep file server logic; replace hardcoded light colors and hover mutation with App1 modal classes.
- Modify: `app/src/components/SaveLoadModal.jsx`
  - Keep save/load/delete API logic; replace modal inline hardcoded colors with App1 modal classes.
- Modify: `app/src/styles/pages.css`
  - Add scoped `.app1-home-*` page and modal styles.
- Modify: `app/src/styles/components.css`
  - Only add reusable status/action micro-classes if impossible to keep page-scoped. Prefer `pages.css`.

---

### Task 1: Add App1 pure status helper with tests

**Files:**
- Create: `app/src/utils/app1HomeStatus.js`
- Create: `app/src/__tests__/app1HomeStatus.test.js`

- [ ] **Step 1: Write failing tests**

Create `app/src/__tests__/app1HomeStatus.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  getApp1HeroCta,
  getDatabaseReadiness,
  getSavedSessionSummary,
} from '../utils/app1HomeStatus';

describe('app1HomeStatus', () => {
  it('shows no saved session when rooms are empty', () => {
    expect(getSavedSessionSummary({ rooms: [], fileName: '' })).toEqual({
      hasSession: false,
      roomCount: 0,
      assetCount: 0,
      fileName: '',
      label: 'BELUM ADA SESI',
    });
  });

  it('summarizes saved session rooms and assets', () => {
    const state = {
      fileName: 'opname-juni.xlsx',
      rooms: [
        { assets: [{ BARCODE: 'A' }, { BARCODE: 'B' }] },
        { assets: [{ BARCODE: 'C' }] },
      ],
    };

    expect(getSavedSessionSummary(state)).toEqual({
      hasSession: true,
      roomCount: 2,
      assetCount: 3,
      fileName: 'opname-juni.xlsx',
      label: '2 RUANGAN',
    });
  });

  it('marks database as perlu sync when no master and no history exist', () => {
    expect(getDatabaseReadiness({ masterDb: null, historyDb: null })).toMatchObject({
      key: 'needs-sync',
      label: 'PERLU SYNC',
      masterLabel: 'MASTER PERLU SYNC',
      historyLabel: 'HISTORY PERLU SYNC',
    });
  });

  it('marks history warning when master exists but history is missing', () => {
    expect(getDatabaseReadiness({ masterDb: new Map([['A', {}]]), historyDb: null })).toMatchObject({
      key: 'partial',
      label: 'HISTORY PERLU SYNC',
      masterLabel: 'MASTER OK',
      historyLabel: 'HISTORY PERLU SYNC',
    });
  });

  it('marks sql ready when master and history exist', () => {
    expect(getDatabaseReadiness({
      masterDb: new Map([['A', {}]]),
      historyDb: new Map([['A', []]]),
    })).toMatchObject({
      key: 'ready',
      label: 'SQL READY',
      masterLabel: 'MASTER OK',
      historyLabel: 'HISTORY OK',
    });
  });

  it('shows connection failure over ready status when sync failed', () => {
    expect(getDatabaseReadiness({
      masterDb: new Map([['A', {}]]),
      historyDb: new Map([['A', []]]),
      hasSyncError: true,
    })).toMatchObject({
      key: 'error',
      label: 'GAGAL TERHUBUNG',
    });
  });

  it('uses continue CTA when a saved session exists', () => {
    expect(getApp1HeroCta({ hasSession: true })).toEqual({
      label: 'Lanjutkan Opname',
      target: 'opname',
    });
  });

  it('uses start CTA when no saved session exists', () => {
    expect(getApp1HeroCta({ hasSession: false })).toEqual({
      label: 'Mulai Opname',
      target: 'prepare',
    });
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run from `app/`:

```powershell
rtk npm test -- app/src/__tests__/app1HomeStatus.test.js
```

Expected: FAIL because `../utils/app1HomeStatus` does not exist.

- [ ] **Step 3: Implement helper**

Create `app/src/utils/app1HomeStatus.js`:

```js
const getSize = (value) => {
  if (!value) return 0;
  if (typeof value.size === 'number') return value.size;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object') return Object.keys(value).length;
  return 0;
};

export function getSavedSessionSummary(state) {
  const rooms = Array.isArray(state?.rooms) ? state.rooms : [];
  const assetCount = rooms.reduce((total, room) => total + (Array.isArray(room.assets) ? room.assets.length : 0), 0);
  const roomCount = rooms.length;

  return {
    hasSession: roomCount > 0,
    roomCount,
    assetCount,
    fileName: state?.fileName || '',
    label: roomCount > 0 ? `${roomCount} RUANGAN` : 'BELUM ADA SESI',
  };
}

export function getDatabaseReadiness({ masterDb, historyDb, hasSyncError = false } = {}) {
  const masterCount = getSize(masterDb);
  const historyCount = getSize(historyDb);
  const hasMaster = masterCount > 0;
  const hasHistory = historyCount > 0;

  if (hasSyncError) {
    return {
      key: 'error',
      label: 'GAGAL TERHUBUNG',
      tone: 'danger',
      masterCount,
      historyCount,
      masterLabel: hasMaster ? 'MASTER OK' : 'MASTER PERLU SYNC',
      historyLabel: hasHistory ? 'HISTORY OK' : 'HISTORY PERLU SYNC',
    };
  }

  if (hasMaster && hasHistory) {
    return {
      key: 'ready',
      label: 'SQL READY',
      tone: 'success',
      masterCount,
      historyCount,
      masterLabel: 'MASTER OK',
      historyLabel: 'HISTORY OK',
    };
  }

  if (hasMaster || hasHistory) {
    return {
      key: 'partial',
      label: hasMaster ? 'HISTORY PERLU SYNC' : 'MASTER PERLU SYNC',
      tone: 'warning',
      masterCount,
      historyCount,
      masterLabel: hasMaster ? 'MASTER OK' : 'MASTER PERLU SYNC',
      historyLabel: hasHistory ? 'HISTORY OK' : 'HISTORY PERLU SYNC',
    };
  }

  return {
    key: 'needs-sync',
    label: 'PERLU SYNC',
    tone: 'warning',
    masterCount,
    historyCount,
    masterLabel: 'MASTER PERLU SYNC',
    historyLabel: 'HISTORY PERLU SYNC',
  };
}

export function getApp1HeroCta({ hasSession }) {
  return hasSession
    ? { label: 'Lanjutkan Opname', target: 'opname' }
    : { label: 'Mulai Opname', target: 'prepare' };
}
```

- [ ] **Step 4: Run helper tests and verify pass**

Run from `app/`:

```powershell
rtk npm test -- app/src/__tests__/app1HomeStatus.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit helper and tests only if user asked for commits**

If commit authorized:

```powershell
rtk git add app/src/utils/app1HomeStatus.js app/src/__tests__/app1HomeStatus.test.js
rtk git commit -m @'
test: add app1 home status helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

### Task 2: Add scoped App1 home CSS foundation

**Files:**
- Modify: `app/src/styles/pages.css`

- [ ] **Step 1: Append scoped App1 CSS**

Append this block near the upload/dashboard area in `app/src/styles/pages.css`:

```css
/* ===== APP1 HOME REDESIGN ===== */
.app1-home {
  min-height: calc(100vh - 62px);
  padding: 22px 24px 28px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.app1-home__shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1440px;
  margin: 0 auto;
}

.app1-home__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: 16px;
}

.app1-home__hero-main,
.app1-home__panel,
.app1-home__section,
.app1-home__status-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
}

.app1-home__hero-main {
  padding: 24px;
  background:
    linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-input) 100%);
  border-color: var(--border-strong);
}

.app1-home__eyebrow {
  margin: 0 0 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}

.app1-home__title {
  margin: 0;
  font-size: clamp(26px, 4vw, 42px);
  line-height: 1.08;
  letter-spacing: -0.04em;
  color: var(--text-primary);
}

.app1-home__subtitle {
  margin: 12px 0 0;
  max-width: 620px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.app1-home__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.app1-home__button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  font-family: var(--font-sora);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 160ms var(--ease-out), background 160ms var(--ease-out), border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}

.app1-home__button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.app1-home__button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.app1-home__button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none;
  box-shadow: none;
}

.app1-home__button--primary {
  background: var(--accent);
  color: var(--bg-surface);
}

:root[data-theme="dark"] .app1-home__button--primary {
  color: var(--bg-primary);
}

.app1-home__button--secondary {
  background: var(--bg-input);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.app1-home__button--ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border);
}

.app1-home__side-stack,
.app1-home__grid {
  display: grid;
  gap: 14px;
}

.app1-home__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.app1-home__panel,
.app1-home__status-card {
  padding: 18px;
}

.app1-home__panel-header,
.app1-home__section-header,
.app1-home__status-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.app1-home__label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.app1-home__panel-title,
.app1-home__section-title,
.app1-home__status-title {
  margin: 5px 0 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.app1-home__section-title {
  font-size: 22px;
}

.app1-home__text {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.app1-home__meta {
  margin-top: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.45;
  word-break: break-word;
}

.app1-home__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text-secondary);
  white-space: nowrap;
}

.app1-home__badge--success {
  background: var(--success-50);
  border-color: var(--success-500);
  color: var(--success-700);
}

.app1-home__badge--warning {
  background: var(--warning-50);
  border-color: var(--warning-500);
  color: var(--warning-700);
}

.app1-home__badge--danger {
  background: var(--danger-50);
  border-color: var(--danger-500);
  color: var(--danger-700);
}

.app1-home__section {
  overflow: hidden;
}

.app1-home__section-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.app1-home__section-cta {
  padding: 18px 20px;
  background: var(--bg-input);
  border-bottom: 1px solid var(--border);
}

.app1-home__status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px 20px;
}

.app1-home__status-box {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-input);
}

.app1-home__status-box--success {
  background: var(--success-50);
  border-color: var(--success-500);
}

.app1-home__status-box--warning {
  background: var(--warning-50);
  border-color: var(--warning-500);
}

.app1-home__status-box--danger {
  background: var(--danger-50);
  border-color: var(--danger-500);
}

.app1-home__status-line {
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 800;
}

.app1-home__status-hint {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.app1-home__file-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.app1-home__alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 20px 18px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--danger-500);
  background: var(--danger-50);
  color: var(--danger-700);
  font-size: 13px;
  line-height: 1.45;
}

.app1-home__modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.app1-home__modal {
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  box-shadow: var(--shadow-xl);
  color: var(--text-primary);
}

.app1-home__modal--md {
  max-width: 640px;
}

.app1-home__modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}

.app1-home__modal-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.app1-home__icon-box {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
}

.app1-home__icon-box--sm {
  width: 34px;
  height: 34px;
}

.app1-home__modal-close {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
}

.app1-home__modal-close:hover,
.app1-home__modal-close:focus-visible {
  outline: none;
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--text-primary);
}

.app1-home__modal-body {
  overflow-y: auto;
  min-height: 0;
}

.app1-home__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app1-home__field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}

.app1-home__select,
.app1-home__input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-input);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  padding: 11px 14px;
}

.app1-home__select:focus,
.app1-home__input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.app1-home__empty,
.app1-home__file-row {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text-primary);
}

.app1-home__empty {
  margin: 0 24px 24px;
  padding: 36px 24px;
  text-align: center;
}

.app1-home__file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 24px 24px;
}

.app1-home__file-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.app1-home__file-row:hover:not(:disabled),
.app1-home__file-row:focus-visible {
  outline: none;
  border-color: var(--accent);
  background: var(--accent-soft);
}

.app1-home__file-row:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 960px) {
  .app1-home__hero,
  .app1-home__grid,
  .app1-home__status-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .app1-home {
    padding: 14px;
  }

  .app1-home__hero-main,
  .app1-home__panel,
  .app1-home__status-card {
    padding: 16px;
  }

  .app1-home__section-header,
  .app1-home__section-cta,
  .app1-home__status-grid {
    padding: 16px;
  }
}
```

- [ ] **Step 2: Run lint after CSS append**

Run from `app/`:

```powershell
rtk npm run lint
```

Expected: CSS not linted by ESLint; existing JS lint result unchanged.

---

### Task 3: Redesign UploadPage home shell and server modal

**Files:**
- Modify: `app/src/pages/UploadPage.jsx`

- [ ] **Step 1: Update imports**

Add helper import near existing imports:

```js
import { getDatabaseReadiness, getSavedSessionSummary } from '../utils/app1HomeStatus';
```

Keep existing imports unless ESLint flags unused icons after the JSX rewrite.

- [ ] **Step 2: Add derived summaries inside `UploadPage` before `if (parsedData)`**

Insert after state declarations:

```js
const sessionSummary = getSavedSessionSummary(state);
const databaseReadiness = getDatabaseReadiness({ masterDb, historyDb });
```

If `masterDb` and `historyDb` are not currently destructured from `useOpname()`, change the hook line to:

```js
const { state, masterDb, historyDb, setData, resetData, mergeRooms, importData } = useOpname();
```

- [ ] **Step 3: Replace main dashboard return wrapper**

Replace the current `return (` branch for the main dashboard view with this structure, preserving existing modal rendering below it:

```jsx
return (
  <div className="app1-home">
    <div className="app1-home__shell">
      <section className="app1-home__hero" aria-labelledby="app1-home-title">
        <div className="app1-home__hero-main">
          <p className="app1-home__eyebrow">Modul 01 · Operasional</p>
          <h1 id="app1-home-title" className="app1-home__title">Mulai opname tanpa bingung.</h1>
          <p className="app1-home__subtitle">
            Siapkan data aset, sinkron dari SQL Server, lalu lanjutkan ke kertas kerja opname.
            Upload file tetap tersedia sebagai fallback saat jaringan tidak siap.
          </p>
          <div className="app1-home__actions">
            {sessionSummary.hasSession ? (
              <button className="app1-home__button app1-home__button--primary" onClick={() => navigate('/app1/opname')}>
                <ChevronRight size={17} /> Lanjutkan Opname
              </button>
            ) : (
              <button className="app1-home__button app1-home__button--primary" onClick={() => setIsServerModalOpen(true)}>
                <Server size={17} /> Ambil Data Server
              </button>
            )}
            <button className="app1-home__button app1-home__button--secondary" onClick={() => setIsSaveModalOpen(true)}>
              <Save size={16} /> Lanjutkan dari Lokal
            </button>
          </div>
        </div>

        <div className="app1-home__side-stack">
          <div className="app1-home__panel">
            <p className="app1-home__label">Status Sesi</p>
            <h2 className="app1-home__panel-title">{sessionSummary.label}</h2>
            <p className="app1-home__text">
              {sessionSummary.hasSession
                ? `${sessionSummary.assetCount.toLocaleString('id-ID')} aset tersimpan dari sesi lokal.`
                : 'Belum ada sesi opname lokal yang aktif.'}
            </p>
          </div>
          <div className="app1-home__panel">
            <p className="app1-home__label">Kesiapan Data</p>
            <h2 className="app1-home__panel-title">{databaseReadiness.label}</h2>
            <div className="app1-home__actions" style={{ marginTop: 12 }}>
              <span className={`app1-home__badge app1-home__badge--${masterDb ? 'success' : 'warning'}`}>
                {databaseReadiness.masterLabel}
              </span>
              <span className={`app1-home__badge app1-home__badge--${historyDb ? 'success' : 'warning'}`}>
                {databaseReadiness.historyLabel}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="app1-home__grid">
        <SavedSessionCard />
        <NetworkSyncHub />
      </div>

      <DatabaseUploadGrid />
    </div>

    {isServerModalOpen && (
      <div className="app1-home__modal-overlay" onClick={() => setIsServerModalOpen(false)}>
        <div className="app1-home__modal" role="dialog" aria-modal="true" aria-labelledby="server-browser-title" onClick={e => e.stopPropagation()}>
          <div className="app1-home__modal-header">
            <h2 id="server-browser-title" className="app1-home__modal-title">
              <span className="app1-home__icon-box"><FileSpreadsheet size={18} strokeWidth={3} /></span>
              Browse File Server
            </h2>
            <button className="app1-home__modal-close" onClick={() => setIsServerModalOpen(false)} aria-label="Tutup browse file server">
              &times;
            </button>
          </div>
          <div className="app1-home__modal-body">
            <ServerFileBrowser onFileLoaded={handleServerFile} />
          </div>
        </div>
      </div>
    )}

    <SaveLoadModal
      isOpen={isSaveModalOpen}
      onClose={() => setIsSaveModalOpen(false)}
      currentFileName={state.fileName}
      onSaveState={async () => state}
      onLoadState={async (loadedState) => {
        importData(loadedState);
        navigate('/app1/opname');
      }}
    />
  </div>
);
```

- [ ] **Step 4: Remove now-unused import symbols**

Run lint. If ESLint flags unused `Layers`, `RefreshCw`, or `Upload` from `UploadPage.jsx`, remove them from the lucide import.

Run from `app/`:

```powershell
rtk npm run lint
```

Expected: no new unused import errors from `UploadPage.jsx`.

---

### Task 4: Redesign SavedSessionCard as clear CTA

**Files:**
- Modify: `app/src/components/SavedSessionCard.jsx`

- [ ] **Step 1: Replace JSX return**

Keep imports and `handleContinue`. Replace the `return (` block with:

```jsx
return (
  <div className="app1-home__panel">
    <div className="app1-home__panel-header">
      <div>
        <p className="app1-home__label">Lanjutkan</p>
        <h2 className="app1-home__panel-title">Opname Tersimpan</h2>
      </div>
      <span className="app1-home__badge app1-home__badge--success">{state.rooms.length} RUANGAN</span>
    </div>
    <p className="app1-home__text">Buka lagi sesi terakhir tanpa mencari file ulang.</p>
    <p className="app1-home__meta">File: <strong>{state.fileName || 'Sesi lokal'}</strong></p>
    <button className="app1-home__button app1-home__button--primary" onClick={handleContinue} style={{ width: '100%', marginTop: 14 }}>
      <ArrowRight size={16} /> Lanjutkan Opname
    </button>
  </div>
);
```

- [ ] **Step 2: Run lint**

Run from `app/`:

```powershell
rtk npm run lint
```

Expected: no unused `Package` import if removed. If `Package` becomes unused, remove it from `lucide-react` import.

---

### Task 5: Redesign NetworkSyncHub with explicit direction labels

**Files:**
- Modify: `app/src/components/NetworkSyncHub.jsx`

- [ ] **Step 1: Keep logic, replace top-level UI shell**

Replace only JSX from `return (` through the closing component div. Keep handlers unchanged.

Use this layout pattern:

```jsx
return (
  <div className="app1-home__panel">
    <div className="app1-home__panel-header">
      <div>
        <p className="app1-home__label">Sinkron Jaringan</p>
        <h2 className="app1-home__panel-title">PC ↔ Tablet</h2>
      </div>
      <span className={`app1-home__badge ${isSyncing ? 'app1-home__badge--warning' : ''}`}>
        {isSyncing ? 'SINKRON' : 'LOKAL'}
      </span>
    </div>

    <p className="app1-home__text">Arah transfer dibuat eksplisit agar tidak salah tekan.</p>

    {syncError && (
      <div className="app1-home__status-box app1-home__status-box--danger">
        <p className="app1-home__status-line">Gagal sinkron</p>
        <p className="app1-home__status-hint">{syncError}</p>
      </div>
    )}

    {syncSuccess && (
      <div className="app1-home__status-box app1-home__status-box--success">
        <p className="app1-home__status-line">Sinkron berhasil</p>
        <p className="app1-home__status-hint">{syncSuccess}</p>
      </div>
    )}

    <div className="app1-home__side-stack" style={{ marginTop: 12 }}>
      {!isNativePlatform && (
        <button
          className="app1-home__button app1-home__button--secondary"
          onClick={handlePushSession}
          disabled={isSyncing || (!masterDb && !historyDb && state.rooms.length === 0)}
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <MonitorUp size={17} /> Bagikan Sesi
          </span>
          <span className="app1-home__label">PC → JARINGAN</span>
        </button>
      )}

      {isNativePlatform && (
        <button
          className="app1-home__button app1-home__button--secondary"
          onClick={handlePullSession}
          disabled={isSyncing}
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <SmartphoneNfc size={17} /> Tarik Sesi
          </span>
          <span className="app1-home__label">JARINGAN → TABLET</span>
        </button>
      )}

      {!isNativePlatform && (
        <button
          className="app1-home__button app1-home__button--secondary"
          onClick={handlePullResult}
          disabled={isSyncing}
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <DownloadCloud size={17} /> Tarik Hasil Opname
          </span>
          <span className="app1-home__label">TABLET → PC</span>
        </button>
      )}

      {isNativePlatform && (
        <button
          type="button"
          onClick={() => { setTempUrl(getServerUrl()); setShowConfig(!showConfig); }}
          className="app1-home__button app1-home__button--ghost"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Settings size={14} /> Konfigurasi IP PC
          </span>
        </button>
      )}
    </div>

    {showConfig && isNativePlatform && (
      <div className="app1-home__status-box" style={{ marginTop: 12 }}>
        <label className="app1-home__field">
          <span className="app1-home__field-label">Alamat Server PC</span>
          <input
            className="app1-home__input"
            value={tempUrl}
            onChange={e => setTempUrl(e.target.value)}
            placeholder="http://192.168.1.10:3001"
          />
        </label>
        <button
          type="button"
          className="app1-home__button app1-home__button--primary"
          style={{ marginTop: 10 }}
          onClick={() => {
            if (!isValidUrl(tempUrl)) {
              setSyncError('URL server tidak valid. Contoh: http://192.168.1.10:3001');
              return;
            }
            setServerUrl(tempUrl);
            setShowConfig(false);
            setSyncSuccess('Alamat server PC disimpan.');
          }}
        >
          Simpan IP PC
        </button>
      </div>
    )}
  </div>
);
```

- [ ] **Step 2: Remove unused imports**

After replacing UI, remove unused icons such as `Wifi` or `ArrowRight` if ESLint flags them.

Run:

```powershell
rtk npm run lint
```

Expected: no new unused import errors.

---

### Task 6: Redesign DatabaseUploadGrid as SQL-first source data section

**Files:**
- Modify: `app/src/components/DatabaseUploadGrid.jsx`

- [ ] **Step 1: Import readiness helper**

Add:

```js
import { getDatabaseReadiness } from '../utils/app1HomeStatus';
```

- [ ] **Step 2: Add derived readiness inside component before `return`**

Insert after `const isSyncing = masterSyncing || historySyncing;`:

```js
const readiness = getDatabaseReadiness({
  masterDb,
  historyDb,
  hasSyncError: Boolean(masterSyncError || historySyncError || lastSyncSuccess === false),
});
```

- [ ] **Step 3: Replace render JSX with SQL-first structure**

Keep handlers unchanged. Replace the JSX return with this structure:

```jsx
return (
  <section className="app1-home__section" aria-labelledby="app1-source-title">
    <div className="app1-home__section-header">
      <div>
        <p className="app1-home__label">Sumber Data Aset</p>
        <h2 id="app1-source-title" className="app1-home__section-title">Sinkron SQL Server dulu, upload kalau offline.</h2>
        <p className="app1-home__text">Master Aset dan History diambil dari SQL Server. Upload file tetap tersedia sebagai fallback.</p>
      </div>
      <span className={`app1-home__badge app1-home__badge--${readiness.tone}`}>{readiness.label}</span>
    </div>

    <div className="app1-home__section-cta">
      <button
        className="app1-home__button app1-home__button--primary"
        onClick={handleSyncAll}
        disabled={isSyncing}
        style={{ width: '100%' }}
      >
        {isSyncing ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16 }} />
            Menyinkronkan dari SQL Server...
          </>
        ) : (
          <>
            <RefreshCw size={16} /> Sinkron Semua dari SQL Server
          </>
        )}
      </button>
      <p className="app1-home__status-hint" style={{ textAlign: 'center', marginTop: 10 }}>
        Mengambil Master Aset + History sekaligus. Data tersimpan offline setelah sinkron.
      </p>
    </div>

    <div className="app1-home__status-grid">
      <div className="app1-home__status-card">
        <div className="app1-home__status-header">
          <div>
            <p className="app1-home__label">Master Aset</p>
            <h3 className="app1-home__status-title">Database utama</h3>
          </div>
          <span className={`app1-home__badge app1-home__badge--${masterDb ? 'success' : 'warning'}`}>
            {masterDb ? `${masterDb.size.toLocaleString('id-ID')} ASET` : 'MASTER PERLU SYNC'}
          </span>
        </div>

        <div className={`app1-home__status-box app1-home__status-box--${masterSyncError ? 'danger' : masterDb ? 'success' : 'warning'}`}>
          <p className="app1-home__status-line">{masterSyncError ? 'Gagal sinkron Master' : masterDb ? 'SQL Server tersinkron' : 'Belum ada Master Aset'}</p>
          <p className="app1-home__status-hint">
            {masterSyncError || (masterDb
              ? `${masterDbFileName || 'Master Aset'}${masterDbSyncTime ? ` • Terakhir sync: ${formatTimestamp(masterDbSyncTime)}` : ''}`
              : 'Tekan sinkron semua untuk mengambil data master dari SQL Server.')}
          </p>
        </div>

        <div className="app1-home__file-actions">
          <button className="app1-home__button app1-home__button--secondary" onClick={handleSyncMaster} disabled={masterSyncing}>
            <RefreshCw size={14} className={masterSyncing ? 'spin' : ''} /> Sinkron Ulang
          </button>
          <label className="app1-home__button app1-home__button--ghost">
            <Upload size={14} /> Upload File Fallback
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleDbInputChange} />
          </label>
        </div>
      </div>

      <div className="app1-home__status-card">
        <div className="app1-home__status-header">
          <div>
            <p className="app1-home__label">History Aset</p>
            <h3 className="app1-home__status-title">Riwayat transaksi</h3>
          </div>
          <span className={`app1-home__badge app1-home__badge--${historyDb ? 'success' : 'warning'}`}>
            {historyDb ? `${historyDb.size.toLocaleString('id-ID')} BARCODE` : 'HISTORY PERLU SYNC'}
          </span>
        </div>

        <div className={`app1-home__status-box app1-home__status-box--${historySyncError ? 'danger' : historyDb ? 'success' : 'warning'}`}>
          <p className="app1-home__status-line">{historySyncError ? 'Gagal sinkron History' : historyDb ? 'History tersinkron' : 'Belum ada History Aset'}</p>
          <p className="app1-home__status-hint">
            {historySyncError || (historyDb
              ? `${historyDbFileName || 'History Aset'}${historyDbSyncTime ? ` • Terakhir sync: ${formatTimestamp(historyDbSyncTime)}` : ''}`
              : 'Tekan sinkron semua untuk mengambil riwayat aset dari SQL Server.')}
          </p>
        </div>

        <div className="app1-home__file-actions">
          <button className="app1-home__button app1-home__button--secondary" onClick={handleSyncHistory} disabled={historySyncing}>
            <RefreshCw size={14} className={historySyncing ? 'spin' : ''} /> Sinkron History
          </button>
          <label className="app1-home__button app1-home__button--ghost">
            <Upload size={14} /> Upload File Fallback
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleHistoryDbInputChange} />
          </label>
        </div>
      </div>
    </div>

    {(dbError || historyDbError || masterSyncError || historySyncError) && (
      <div className="app1-home__alert" role="alert">
        <AlertCircle size={18} />
        <div>
          <strong>Gagal memuat data.</strong>
          <div>{dbError || historyDbError || masterSyncError || historySyncError}</div>
          <div>Pastikan jaringan tersedia atau gunakan upload file fallback.</div>
        </div>
      </div>
    )}
  </section>
);
```

- [ ] **Step 4: Run tests and lint**

Run:

```powershell
rtk npm test -- app/src/__tests__/app1HomeStatus.test.js
rtk npm run lint
```

Expected: tests pass; lint shows no new errors in `DatabaseUploadGrid.jsx`.

---

### Task 7: Tokenize ServerFileBrowser for dark mode

**Files:**
- Modify: `app/src/components/ServerFileBrowser.jsx`

- [ ] **Step 1: Replace top-level wrapper class**

Change root wrapper from inline flex style to:

```jsx
<div className="app1-home__modal-body" style={{ width: '100%' }}>
```

- [ ] **Step 2: Replace select area with App1 classes**

Replace folder selection block inner structure with:

```jsx
<div style={{ padding: 24 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
    <label className="app1-home__field-label">
      <Folder size={16} /> Pilih divisi / lokasi server
    </label>
    <button
      className="app1-home__modal-close"
      onClick={handleLoadFolders}
      title="Refresh daftar folder"
      disabled={loading || loadingFolders}
      style={{ width: 34, height: 34 }}
    >
      <RefreshCw size={14} className={loadingFolders ? 'animate-spin' : ''} />
    </button>
  </div>
  <select
    className="app1-home__select"
    value={selectedFolder}
    onChange={handleSelectFolder}
    disabled={loading}
  >
    <option value="">— Silakan pilih folder —</option>
    {folders.map(f => (
      <option key={f} value={f}>{f}</option>
    ))}
  </select>
</div>
```

- [ ] **Step 3: Replace empty state colors**

Use:

```jsx
<div className="app1-home__empty">
  <div className="app1-home__icon-box" style={{ margin: '0 auto 16px' }}>
    <FolderOpen size={28} />
  </div>
  <p className="app1-home__status-line">Belum ada folder terpilih</p>
  <p className="app1-home__status-hint">Pilih folder di atas untuk melihat daftar kertas kerja opname.</p>
</div>
```

- [ ] **Step 4: Replace file rows with App1 classes**

In `availableFiles.map`, replace button class/style with:

```jsx
<button
  key={dlId}
  onClick={() => handleDownloadFile(file.periodName, file.filename)}
  disabled={downloading !== null}
  className="app1-home__file-row"
>
```

Inside file text, use token classes:

```jsx
<span className="app1-home__status-line" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
  {file.filename}
</span>
<span className="app1-home__status-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
  <span className="app1-home__badge">
    <Calendar size={11} /> {parsePeriodLabel(file.periodName)}
  </span>
  {file.modifiedDate && <span>Modif: {formatDate(file.modifiedDate)}</span>}
</span>
```

- [ ] **Step 5: Replace error card with App1 alert**

Use:

```jsx
{error && (
  <div className="app1-home__alert" role="alert">
    <AlertCircle size={20} />
    <div>
      <strong>Gagal memuat data server</strong>
      <div>{error}</div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Run lint**

Run:

```powershell
rtk npm run lint
```

Expected: no new inline mouse handler or unused import errors.

---

### Task 8: Tokenize SaveLoadModal for App1 dark mode

**Files:**
- Modify: `app/src/components/SaveLoadModal.jsx`

- [ ] **Step 1: Replace modal shell classes**

Change root modal return from inline overlay/card to:

```jsx
<div className="app1-home__modal-overlay">
  <div className="app1-home__modal app1-home__modal--md" role="dialog" aria-modal="true" aria-labelledby="save-load-title">
```

- [ ] **Step 2: Replace header and close button**

Use:

```jsx
<div className="app1-home__modal-header">
  <h2 id="save-load-title" className="app1-home__modal-title">
    <span className="app1-home__icon-box app1-home__icon-box--sm">
      <Save size={18} strokeWidth={2.5} />
    </span>
    Data Opname
  </h2>
  <button onClick={onClose} aria-label="Tutup data opname" className="app1-home__modal-close">
    <X size={20} strokeWidth={2.5} />
  </button>
</div>
```

- [ ] **Step 3: Replace tab colors with classes**

Keep inline `flex: 1` only if faster. Use token styles:

```jsx
<button
  className={`app1-home__button ${activeTab === 'save' ? 'app1-home__button--primary' : 'app1-home__button--ghost'}`}
  style={{ flex: 1, borderRadius: 0 }}
  onClick={() => setActiveTab('save')}
>
  Simpan (Save)
</button>
<button
  className={`app1-home__button ${activeTab === 'load' ? 'app1-home__button--primary' : 'app1-home__button--ghost'}`}
  style={{ flex: 1, borderRadius: 0 }}
  onClick={() => setActiveTab('load')}
>
  Muat Ulang (Load)
</button>
```

- [ ] **Step 4: Replace input and primary button classes**

Use:

```jsx
<input
  className="app1-home__input"
  type="text"
  value={saveName}
  onChange={e => setSaveName(e.target.value)}
  placeholder="Ketik nama untuk di-save..."
  disabled={loading}
/>
<button
  onClick={handleSaveNew}
  disabled={loading || !saveName.trim()}
  className="app1-home__button app1-home__button--primary"
>
  Save
</button>
```

- [ ] **Step 5: Replace error and empty state styles**

For `error`, use:

```jsx
{error && (
  <div className="app1-home__alert" role="alert" style={{ margin: '0 0 20px' }}>
    <AlertCircle size={18} />
    <span>{error}</span>
  </div>
)}
```

For empty save/load states, use `.app1-home__empty` and `.app1-home__status-line`/`__status-hint`.

- [ ] **Step 6: Run lint**

Run:

```powershell
rtk npm run lint
```

Expected: no new lint errors in `SaveLoadModal.jsx`.

---

### Task 9: Add minimal render/smoke test for App1 source data section

**Files:**
- Create: `app/src/__tests__/App1HomeSmoke.test.jsx`

- [ ] **Step 1: Write smoke render test with mocks**

Create:

```jsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UploadPage from '../pages/UploadPage';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

vi.mock('../store/OpnameContext', () => ({
  useOpname: () => ({
    state: { rooms: [], fileName: '' },
    masterDb: null,
    historyDb: null,
    masterDbFileName: '',
    historyDbFileName: '',
    masterDbSource: null,
    historyDbSource: null,
    masterDbSyncTime: null,
    historyDbSyncTime: null,
    setData: vi.fn(),
    resetData: vi.fn(),
    mergeRooms: vi.fn(),
    importData: vi.fn(),
    setMasterDb: vi.fn(),
    setMasterDbFileName: vi.fn(),
    setHistoryDb: vi.fn(),
    setHistoryDbFileName: vi.fn(),
    setMasterDbSource: vi.fn(),
    setHistoryDbSource: vi.fn(),
    setMasterDbSyncTime: vi.fn(),
    setHistoryDbSyncTime: vi.fn(),
    exportSession: vi.fn(() => ({})),
    importSession: vi.fn(),
  }),
}));

vi.mock('../utils/sqlServerApi', () => ({
  fetchMasterAssets: vi.fn(),
  fetchHistoryAssets: vi.fn(),
}));

vi.mock('../utils/apiConfig', () => ({
  apiUrl: path => path,
  fetchWithAuth: vi.fn(),
  getServerUrl: () => 'http://localhost:3001',
  setServerUrl: vi.fn(),
}));

describe('UploadPage App1 home', () => {
  it('renders App1 landing and SQL-first source data section', () => {
    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Mulai opname tanpa bingung.')).toBeInTheDocument();
    expect(screen.getByText('Sumber Data Aset')).toBeInTheDocument();
    expect(screen.getByText('Sinkron SQL Server dulu, upload kalau offline.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sinkron semua dari sql server/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run smoke test**

Run:

```powershell
rtk npm test -- app/src/__tests__/App1HomeSmoke.test.jsx
```

Expected: PASS. If it fails because an unmocked child reads browser-only API, mock that child minimally rather than changing production logic.

---

### Task 10: Final verification

**Files:**
- No planned source changes unless verification finds issues.

- [ ] **Step 1: Run targeted tests**

Run from `app/`:

```powershell
rtk npm test -- app/src/__tests__/app1HomeStatus.test.js app/src/__tests__/App1HomeSmoke.test.jsx
```

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run:

```powershell
rtk npm test
```

Expected: PASS or report existing unrelated failures with exact output.

- [ ] **Step 3: Run lint**

Run:

```powershell
rtk npm run lint
```

Expected: PASS or report existing unrelated failures with exact output.

- [ ] **Step 4: Run build**

Run:

```powershell
rtk npm run build
```

Expected: PASS.

- [ ] **Step 5: Manual dark mode verification**

Start app if needed:

```powershell
rtk npm run dev
```

Manual checklist:

- Open `/app1`.
- Toggle dark mode.
- Confirm header title, Home/Kertas Kerja pill, Barcode Checker, hero, saved session card, network sync card, and Sumber Data Aset text are readable.
- Click `Ambil Data Server`; confirm Browse File Server modal surface/header/select/file rows/error state are readable.
- Click `Lanjutkan dari Lokal`; confirm Save/Load modal tabs/input/list/error/empty state are readable.
- Open `/app1/opname`; confirm kertas kerja layout is not redesigned by App1 home styles.

- [ ] **Step 6: Commit only if user explicitly asked for commits**

If commit authorized:

```powershell
rtk git add app/src/utils/app1HomeStatus.js app/src/__tests__/app1HomeStatus.test.js app/src/__tests__/App1HomeSmoke.test.jsx app/src/pages/UploadPage.jsx app/src/components/SavedSessionCard.jsx app/src/components/NetworkSyncHub.jsx app/src/components/DatabaseUploadGrid.jsx app/src/components/ServerFileBrowser.jsx app/src/components/SaveLoadModal.jsx app/src/styles/pages.css docs/superpowers/specs/2026-06-24-app1-home-dark-mode-redesign-design.md docs/superpowers/plans/2026-06-24-app1-home-dark-mode-redesign.md
rtk git commit -m @'
feat: redesign app1 home dark mode

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Self-Review

- Spec coverage:
  - App1 home hero/status/action flow: Task 3.
  - SQL-first Sumber Data Aset: Task 6.
  - SavedSessionCard CTA: Task 4.
  - NetworkSyncHub explicit transfer direction: Task 5.
  - Server file modal dark mode: Task 3 and Task 7.
  - Save/Load modal dark mode: Task 8.
  - Scoped CSS and no global bleed: Task 2.
  - Tests/smoke/manual verify: Task 1, Task 9, Task 10.
- Placeholder scan: no TBD/TODO/fill-later instructions.
- Type consistency: helper functions named in tests match exported functions in Task 1; status keys/tone strings match CSS badge variants.

---

Plan complete. Execution should use subagent-driven development or executing-plans, not ad hoc edits.
