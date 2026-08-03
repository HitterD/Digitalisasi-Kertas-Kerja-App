# App3 Guided Upload Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/app3` into a user-friendly guided upload flow aligned with App1/App2, while keeping Consolidation/Evaluation behavior unchanged.

**Architecture:** Keep `/app3` as one unified shell (`UnifiedMasterDataPage`) with two tabs. Extract only small pure helpers for App3 category/source readiness so logic is testable; keep UI in existing page files and move repeated styling into CSS classes. No backend/API changes, no new dependencies.

**Tech Stack:** React 19, React Router, Vitest + Testing Library, Lucide React, Vite, CSS custom properties from `tokens.css`.

---

## File Structure

- Create: `app/src/utils/app3ConsolidationUi.js`
  - Pure helper functions for source readiness, category classification, counts, and effective BAT expansion.
- Create: `app/src/__tests__/app3ConsolidationUi.test.js`
  - Unit tests for helper logic.
- Create: `app/src/__tests__/UnifiedMasterDataPage.test.jsx`
  - Component tests for App3 unified topbar, tabs, and theme toggle presence.
- Modify: `app/src/pages/UnifiedMasterDataPage.jsx`
  - Replace inline-heavy header with App1/App2-aligned topbar, tab pill, `ThemeToggle`, and normal flow tab panels.
- Modify: `app/src/pages/App3ConsolidationPage.jsx`
  - Use helper functions, guided upload UI, category cards, clearer generate states, and CSS classes.
- Modify: `app/src/pages/App4RecouncilPage.jsx`
  - Light alignment only: copy, token class usage, alert/header style consistency. Keep flow/API unchanged.
- Modify: `app/src/styles/pages.css`
  - Add `.umd-*` shell styles and `.app3-*` guided upload styles. Reuse existing token variables.

---

## Task 1: Add App3 Pure UI Helpers

**Files:**
- Create: `app/src/utils/app3ConsolidationUi.js`
- Create: `app/src/__tests__/app3ConsolidationUi.test.js`

- [ ] **Step 1: Write failing unit tests**

Create `app/src/__tests__/app3ConsolidationUi.test.js`:

```javascript
import { describe, expect, it } from 'vitest';
import {
  FILTER_CATEGORIES,
  SOURCE_FILE_TYPES,
  canExtractFilters,
  classifyBat,
  countBatsByCategory,
  getEffectiveBats,
  getSourceFileCount,
  selectedBatsForCategory,
} from '../utils/app3ConsolidationUi';

describe('app3ConsolidationUi helpers', () => {
  it('defines the source file types that unlock filter extraction', () => {
    expect(SOURCE_FILE_TYPES).toEqual(['exa', 'add', 'inv']);
    expect(FILTER_CATEGORIES).toEqual(['ICT', 'ENG', 'BAT', 'HRGA', 'Kosong']);
  });

  it('counts only EXA/ADD/INV as source files', () => {
    const files = {
      master: new File(['old'], 'master.xlsx'),
      exa: null,
      add: new File(['add'], 'add.xlsx'),
      inv: new File(['inv'], 'inv.xlsx'),
    };

    expect(getSourceFileCount(files)).toBe(2);
    expect(canExtractFilters(files)).toBe(true);
  });

  it('does not allow extraction when only optional master file exists', () => {
    const files = {
      master: new File(['old'], 'master.xlsx'),
      exa: null,
      add: null,
      inv: null,
    };

    expect(getSourceFileCount(files)).toBe(0);
    expect(canExtractFilters(files)).toBe(false);
  });

  it('classifies BAT values by known prefixes and empty values', () => {
    expect(classifyBat('ICT-001')).toBe('ICT');
    expect(classifyBat('ENG-001')).toBe('ENG');
    expect(classifyBat('HRGA-001')).toBe('HRGA');
    expect(classifyBat('BAT-001')).toBe('BAT');
    expect(classifyBat('')).toBe('Kosong');
    expect(classifyBat('nan')).toBe('Kosong');
    expect(classifyBat('unknown')).toBe('BAT');
  });

  it('counts BAT values by category', () => {
    expect(countBatsByCategory(['ICT-1', 'ICT-2', 'ENG-1', '', 'nan', 'OTHER'])).toEqual({
      ICT: 2,
      ENG: 1,
      BAT: 1,
      HRGA: 0,
      Kosong: 2,
    });
  });

  it('expands selected categories into effective BAT records', () => {
    const bats = ['ICT-1', 'ICT-2', 'ENG-1', 'HRGA-1', ''];

    expect(selectedBatsForCategory(bats, 'ICT')).toEqual(['ICT-1', 'ICT-2']);
    expect(getEffectiveBats(bats, ['ICT', 'Kosong'])).toEqual(['ICT-1', 'ICT-2', '']);
    expect(getEffectiveBats(bats, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`:

```powershell
rtk npx vitest run src/__tests__/app3ConsolidationUi.test.js
```

Expected: FAIL because `../utils/app3ConsolidationUi` does not exist.

- [ ] **Step 3: Add helper implementation**

Create `app/src/utils/app3ConsolidationUi.js`:

```javascript
export const SOURCE_FILE_TYPES = ['exa', 'add', 'inv'];
export const FILTER_CATEGORIES = ['ICT', 'ENG', 'BAT', 'HRGA', 'Kosong'];

export function getSourceFileCount(files) {
  return SOURCE_FILE_TYPES.filter((type) => Boolean(files?.[type])).length;
}

export function canExtractFilters(files) {
  return getSourceFileCount(files) > 0;
}

export function classifyBat(value) {
  const raw = String(value ?? '').trim();
  const upper = raw.toUpperCase();

  if (!raw || upper === 'NAN' || upper === 'NONE') return 'Kosong';
  if (upper.startsWith('ICT')) return 'ICT';
  if (upper.startsWith('ENG')) return 'ENG';
  if (upper.startsWith('HRGA')) return 'HRGA';
  if (upper.startsWith('BAT')) return 'BAT';

  return 'BAT';
}

export function countBatsByCategory(bats) {
  return FILTER_CATEGORIES.reduce((counts, category) => {
    const count = bats.filter((bat) => classifyBat(bat) === category).length;
    return { ...counts, [category]: count };
  }, {});
}

export function selectedBatsForCategory(bats, category) {
  return bats.filter((bat) => classifyBat(bat) === category);
}

export function getEffectiveBats(bats, selectedCategories) {
  if (!selectedCategories.length) return [];

  return selectedCategories.flatMap((category) => selectedBatsForCategory(bats, category));
}
```

- [ ] **Step 4: Run helper tests to verify pass**

Run from `app/`:

```powershell
rtk npx vitest run src/__tests__/app3ConsolidationUi.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit helper task**

```powershell
rtk git add app/src/utils/app3ConsolidationUi.js app/src/__tests__/app3ConsolidationUi.test.js
rtk git commit -m @'
test: add app3 consolidation ui helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Task 2: Align Unified App3 Topbar and Tabs

**Files:**
- Create: `app/src/__tests__/UnifiedMasterDataPage.test.jsx`
- Modify: `app/src/pages/UnifiedMasterDataPage.jsx`
- Modify: `app/src/styles/pages.css`

- [ ] **Step 1: Write failing component tests**

Create `app/src/__tests__/UnifiedMasterDataPage.test.jsx`:

```jsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UnifiedMasterDataPage from '../pages/UnifiedMasterDataPage';

vi.mock('../pages/App3ConsolidationPage', () => ({
  default: () => <div>Consolidation content</div>,
}));

vi.mock('../pages/App4RecouncilPage', () => ({
  default: () => <div>Evaluation content</div>,
}));

vi.mock('../components/ThemeToggle', () => ({
  default: () => <button type="button">Theme toggle</button>,
}));

describe('UnifiedMasterDataPage', () => {
  it('renders App1/App2-style topbar controls', () => {
    render(
      <MemoryRouter>
        <UnifiedMasterDataPage />
      </MemoryRouter>
    );

    const backLink = screen.getByRole('link', { name: /kembali ke menu/i });
    expect(backLink).toHaveAttribute('href', '/');
    expect(backLink.className).toMatch(/umd-back-button/);

    expect(screen.getByText('Master Data')).toBeInTheDocument();
    expect(screen.getByText('Theme toggle')).toBeInTheDocument();
  });

  it('starts on Consolidation tab and switches to Evaluation tab', () => {
    render(
      <MemoryRouter>
        <UnifiedMasterDataPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Consolidation content')).toBeInTheDocument();
    expect(screen.queryByText('Evaluation content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /evaluation/i }));

    expect(screen.getByText('Evaluation content')).toBeInTheDocument();
    expect(screen.queryByText('Consolidation content')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `app/`:

```powershell
rtk npx vitest run src/__tests__/UnifiedMasterDataPage.test.jsx
```

Expected: FAIL because current topbar has no `aria-label="Kembali ke menu"`, no `umd-back-button`, no `ThemeToggle`, and tab roles are missing.

- [ ] **Step 3: Replace UnifiedMasterDataPage implementation**

Replace `app/src/pages/UnifiedMasterDataPage.jsx` with:

```jsx
import { useState } from 'react';
import { ArrowLeft, ClipboardCheck, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import App3ConsolidationPage from './App3ConsolidationPage';
import App4RecouncilPage from './App4RecouncilPage';

export default function UnifiedMasterDataPage() {
  const [activeTab, setActiveTab] = useState('master');
  const isMaster = activeTab === 'master';

  return (
    <div className="umd-shell">
      <header className="wa-app-header umd-header">
        <div className="umd-header-left">
          <Link to="/" aria-label="Kembali ke menu" className="umd-back-button">
            <ArrowLeft size={18} />
          </Link>
          <div className="umd-header-divider" />
          <div className="umd-brand">
            <div className="umd-brand-icon">
              <Database size={18} />
            </div>
            <div className="umd-brand-title">Master Data</div>
          </div>
        </div>

        <div className="umd-header-actions">
          <div className="umd-tabs" role="tablist" aria-label="Master data modules">
            <button
              type="button"
              role="tab"
              aria-selected={isMaster}
              className={`umd-tab ${isMaster ? 'active' : ''}`}
              onClick={() => setActiveTab('master')}
            >
              <Database size={14} />
              <span>Consolidation</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isMaster}
              className={`umd-tab ${!isMaster ? 'active' : ''}`}
              onClick={() => setActiveTab('recouncil')}
            >
              <ClipboardCheck size={14} />
              <span>Evaluation</span>
            </button>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="umd-main">
        {isMaster ? <App3ConsolidationPage /> : <App4RecouncilPage />}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Add unified shell CSS**

Append to `app/src/styles/pages.css`:

```css
/* App3/App4 Unified Master Data shell */
.umd-shell {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.umd-header {
  gap: var(--space-4);
}

.umd-header-left,
.umd-header-actions,
.umd-brand,
.umd-tabs,
.umd-tab {
  display: flex;
  align-items: center;
}

.umd-header-left {
  gap: 14px;
}

.umd-header-actions {
  gap: var(--space-3);
}

.umd-back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;
  padding: 4px;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  text-decoration: none;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}

.umd-back-button:hover,
.umd-back-button:focus-visible {
  color: var(--text-primary);
  background: var(--bg-input);
  outline: none;
}

.umd-back-button:focus-visible {
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.umd-header-divider {
  width: 1px;
  height: 18px;
  background: var(--border);
}

.umd-brand {
  gap: var(--space-2);
}

.umd-brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--accent);
  background: var(--bg-input);
  border-radius: 6px;
}

.umd-brand-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.umd-tabs {
  gap: 4px;
  padding: 4px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 999px;
}

.umd-tab {
  gap: 7px;
  min-height: 34px;
  padding: 0 13px;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  border-radius: 999px;
  font-family: var(--font-sora);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}

.umd-tab.active {
  color: var(--bg-primary);
  background: var(--text-primary);
}

.umd-tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.umd-main {
  min-height: calc(100vh - 58px);
}

@media (max-width: 720px) {
  .umd-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .umd-header-actions,
  .umd-tabs {
    width: 100%;
  }

  .umd-tab {
    flex: 1;
    justify-content: center;
  }
}
```

- [ ] **Step 5: Run topbar test**

Run from `app/`:

```powershell
rtk npx vitest run src/__tests__/UnifiedMasterDataPage.test.jsx
```

Expected: PASS.

- [ ] **Step 6: Commit topbar task**

```powershell
rtk git add app/src/__tests__/UnifiedMasterDataPage.test.jsx app/src/pages/UnifiedMasterDataPage.jsx app/src/styles/pages.css
rtk git commit -m @'
feat: align app3 unified topbar

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Task 3: Convert App3 Consolidation to Guided Upload UI

**Files:**
- Modify: `app/src/pages/App3ConsolidationPage.jsx`
- Modify: `app/src/styles/pages.css`
- Test: `app/src/__tests__/app3ConsolidationUi.test.js`

- [ ] **Step 1: Import helpers and remove duplicate local constants/functions**

In `app/src/pages/App3ConsolidationPage.jsx`, replace current helper constants/functions:

```jsx
const FILTER_CATEGORIES = ['ICT', 'ENG', 'BAT', 'HRGA', 'Kosong'];

const classifyBat = (b) => {
  if (!b || String(b).trim() === '' || String(b).toLowerCase() === 'nan' || String(b).toLowerCase() === 'none') return 'Kosong';
  const upper = String(b).toUpperCase();
  if (upper.startsWith('ICT')) return 'ICT';
  if (upper.startsWith('ENG')) return 'ENG';
  if (upper.startsWith('HRGA')) return 'HRGA';
  if (upper.startsWith('BAT')) return 'BAT';
  return 'BAT';
};

const countByCat = bats.reduce((acc, b) => {
  const cat = classifyBat(b);
  acc[cat] = (acc[cat] || 0) + 1;
  return acc;
}, {});

const selectedBatsForCategory = (cat) => bats.filter(b => classifyBat(b) === cat);

const getEffectiveBats = () => {
  if (selectedBats.length === 0) return [];
  return selectedBats.flatMap(cat => selectedBatsForCategory(cat));
};
```

with imports plus memoized values:

```jsx
import {
  FILTER_CATEGORIES,
  canExtractFilters,
  countBatsByCategory,
  getEffectiveBats as getEffectiveBatsForSelection,
  getSourceFileCount,
} from '../utils/app3ConsolidationUi';
```

Inside the component after state declarations:

```jsx
const sourceFileCount = getSourceFileCount(files);
const canContinueUpload = canExtractFilters(files);
const countByCat = countBatsByCategory(bats);
const effectiveBats = getEffectiveBatsForSelection(bats, selectedBats);
```

Change `processConsolidation`:

```jsx
const effectiveBats = getEffectiveBatsForSelection(bats, selectedBats);
if (effectiveBats.length === 0) { setErrorMsg('Harap pilih minimal satu filter target.'); return; }
```

Change `formData.append`:

```jsx
formData.append('selected_bats', JSON.stringify(effectiveBats));
```

Change download filename:

```jsx
a.download = `Master_Konsolidasi_${selectedBats.join('-')}_${Date.now()}.xlsx`;
```

- [ ] **Step 2: Replace UploadSlot inner markup**

Inside `UploadSlot`, replace the returned visible `div` content with:

```jsx
<div className="app3-upload-slot__content">
  <span className={`app3-upload-slot__badge ${isSet ? 'valid' : type === 'master' ? 'optional' : 'source'}`}>
    {isSet ? 'VALID' : type === 'master' ? 'OPSIONAL' : 'SOURCE'}
  </span>
  <div className="app3-upload-slot__icon">
    {isSet ? <CheckCircle2 size={24} /> : <Icon size={24} />}
  </div>
  <h3 className="app3-upload-slot__title">{title}</h3>
  <p className={isSet ? 'app3-upload-slot__file' : 'app3-upload-slot__hint'}>
    {isSet ? files[type].name : subtitle}
  </p>
  <div className="app3-upload-slot__action">{isSet ? 'Ganti file' : 'Pilih / drop file'}</div>
</div>
```

Change wrapper class from:

```jsx
className={`wa-zone ${isSet ? 'loaded' : ''}`}
style={{ padding: 24, textAlign: 'center' }}
```

to:

```jsx
className={`app3-upload-slot ${isSet ? 'is-loaded' : ''} ${isDrag ? 'is-dragging' : ''} ${type === 'master' ? 'is-optional' : 'is-source'}`}
```

Keep the existing hidden `<input>` unchanged except remove inline style if present.

- [ ] **Step 3: Replace page return structure**

Replace the current return block in `App3ConsolidationPage.jsx` with this structure, preserving existing handler names:

```jsx
return (
  <div className="app3-page">
    <div className="app3-container">
      <section className="app3-hero">
        <div>
          <div className="app3-eyebrow"><Sparkles size={14} /> APP3 · GUIDED UPLOAD</div>
          <h1 className="app3-title">Upload benar dulu, baru generate Excel.</h1>
          <p className="app3-copy">
            Upload minimal satu source dari EXA, ADD, atau INV. Master lama opsional untuk arsip.
            Setelah source valid, pilih kategori filter dan generate Excel.
          </p>
        </div>
        <div className="app3-hero-status" aria-label="Status upload">
          <div><span>Step aktif</span><strong>{step === 1 ? 'Upload' : step === 2 ? 'Filter' : 'Generate'}</strong></div>
          <div><span>Source valid</span><strong>{sourceFileCount}/3</strong></div>
          <div><span>Master lama</span><strong>Opsional</strong></div>
        </div>
      </section>

      <nav className="app3-stepper" aria-label="Langkah konsolidasi">
        {[['1', 'Upload'], ['2', 'Filter'], ['3', 'Generate Excel']].map(([value, label]) => {
          const valueNum = Number(value);
          const stateClass = step === valueNum ? 'active' : step > valueNum ? 'done' : 'inactive';
          return (
            <div key={value} className={`app3-step ${stateClass}`}>
              <div className="app3-step__num">{step > valueNum ? '✓' : value}</div>
              <div>
                <div className="app3-step__label">Step {value}</div>
                <div className="app3-step__title">{label}</div>
              </div>
            </div>
          );
        })}
      </nav>

      {successMsg && (
        <div className="app3-alert app3-alert--success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="app3-alert app3-alert--danger" role="alert">
          <FileWarning size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <section className={`app3-panel ${step !== 1 ? 'is-muted' : ''}`}>
        <div className="app3-panel__header">
          <div className="app3-panel__num">1</div>
          <div>
            <h2>Upload File</h2>
            <p>Masukkan file sumber sebelum ekstrak filter.</p>
          </div>
        </div>
        <div className="app3-panel__body">
          <div className="app3-rule-strip">
            <span><strong>Aturan lanjut:</strong> minimal satu source valid dari EXA / ADD / INV.</span>
            <strong>ANTI-SALAH UPLOAD</strong>
          </div>
          <div className="app3-upload-grid">
            <UploadSlot type="master" icon={Database} title="Master Lama" subtitle="Opsional: kamus master existing untuk arsip" />
            <UploadSlot type="exa" icon={LayoutTemplate} title="EXA" subtitle="Source document Excel" />
            <UploadSlot type="add" icon={Box} title="ADD" subtitle="Source document Excel" />
            <UploadSlot type="inv" icon={FileSpreadsheet} title="INV" subtitle="Source document Excel" />
          </div>
          <div className="app3-action-row">
            <div className="app3-readiness">
              <span className={sourceFileCount > 0 ? 'ok' : ''}>{sourceFileCount} SOURCE VALID</span>
              <span>.XLSX / .XLS SAJA</span>
              <span>MASTER OPSIONAL</span>
            </div>
            <button
              type="button"
              onClick={extractBats}
              disabled={loadingBats || !canContinueUpload}
              className="wa-btn-terracotta app3-primary-action"
            >
              {loadingBats ? <><Loader2 size={16} className="spin" /> MENGANALISA...</> : <><Filter size={16} /> EKSTRAK FILTER <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </section>

      {step === 2 && (
        <section className="app3-panel">
          <div className="app3-panel__header">
            <div className="app3-panel__num">2</div>
            <div>
              <h2>Filter Kategori</h2>
              <p>Pilih kategori yang akan masuk output Excel.</p>
            </div>
          </div>
          <div className="app3-panel__body">
            <div className="app3-summary-chips">
              <span>TOTAL BAT: <strong>{bats.length}</strong></span>
              <span>SELECTED: <strong>{selectedBats.length}</strong></span>
              <span>EFFECTIVE RECORDS: <strong>{effectiveBats.length}</strong></span>
            </div>

            {bats.length === 0 ? (
              <div className="app3-empty-state">Tidak ada referensi BAT di source file.</div>
            ) : (
              <div className="app3-category-grid">
                {FILTER_CATEGORIES.map((cat) => {
                  const isSelected = selectedBats.includes(cat);
                  const count = countByCat[cat] || 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`app3-category-card ${isSelected ? 'selected' : ''}`}
                    >
                      <span className="app3-category-card__title">
                        {cat}
                        <strong>{count}</strong>
                      </span>
                      <span className="app3-category-card__hint">
                        {isSelected ? 'Masuk hasil Excel' : cat === 'Kosong' ? 'Data tanpa prefix kategori' : 'Klik untuk tambah filter'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="app3-action-row">
              <button type="button" onClick={() => setStep(1)} disabled={processing} className="wa-btn-ghost">
                ← KEMBALI
              </button>
              <button
                type="button"
                onClick={processConsolidation}
                disabled={processing || selectedBats.length === 0}
                className="wa-btn-terracotta app3-primary-action"
              >
                {processing ? <><Loader2 size={18} className="spin" /> MENYUSUN DATA MASTER...</> : <><Download size={18} /> GENERATE EXCEL</>}
              </button>
            </div>

            {processing && (
              <div className="app3-processing" role="status">
                <div><span /></div>
                <p>Menyusun data master… tunggu sampai file otomatis terunduh.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  </div>
);
```

- [ ] **Step 4: Add App3 guided upload CSS**

Append to `app/src/styles/pages.css`:

```css
/* App3 Guided Upload */
.app3-page {
  min-height: calc(100vh - 58px);
  padding: var(--space-6) var(--space-4) var(--space-8);
  background: var(--bg-primary);
}

.app3-container {
  width: min(1400px, 100%);
  margin: 0 auto;
}

.app3-hero,
.app3-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-md);
}

.app3-hero {
  display: flex;
  justify-content: space-between;
  gap: var(--space-5);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.app3-eyebrow,
.app3-summary-chips,
.app3-readiness,
.app3-upload-slot__badge {
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.app3-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--accent);
  font-size: 10px;
  font-weight: 800;
}

.app3-title {
  margin: var(--space-2) 0 0;
  color: var(--text-primary);
  font-size: var(--fs-3xl);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.app3-copy {
  max-width: 680px;
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
  font-size: var(--fs-base);
  line-height: 1.6;
}

.app3-hero-status {
  min-width: 230px;
  padding: var(--space-3);
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.app3-hero-status > div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 7px 0;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  font-size: var(--fs-xs);
}

.app3-hero-status > div:last-child {
  border-bottom: 0;
}

.app3-hero-status strong {
  color: var(--text-primary);
}

.app3-stepper {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.app3-step {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.app3-step.inactive {
  opacity: 0.62;
}

.app3-step__num,
.app3-panel__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--bg-primary);
  background: var(--text-primary);
  border-radius: 9px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 800;
}

.app3-step.done .app3-step__num {
  background: var(--success-600);
}

.app3-step__label {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.app3-step__title {
  color: var(--text-primary);
  font-size: var(--fs-sm);
  font-weight: 700;
}

.app3-alert {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--fs-sm);
  font-weight: 700;
}

.app3-alert--success {
  color: var(--success-800);
  background: var(--success-50);
  border: 1px solid var(--success-200);
}

.app3-alert--danger {
  color: var(--danger-800);
  background: var(--danger-50);
  border: 1px solid var(--danger-200);
}

.app3-panel {
  margin-bottom: var(--space-5);
  overflow: hidden;
}

.app3-panel.is-muted {
  opacity: 0.56;
}

.app3-panel__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-input);
  border-bottom: 1px solid var(--border);
}

.app3-panel__header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--fs-lg);
  font-weight: 800;
}

.app3-panel__header p {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: var(--fs-xs);
}

.app3-panel__body {
  padding: var(--space-5);
}

.app3-rule-strip {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  color: var(--text-secondary);
  background: var(--accent-soft);
  border: 1px solid var(--accent-ring);
  border-radius: var(--radius-lg);
  font-size: var(--fs-sm);
}

.app3-rule-strip strong {
  color: var(--text-primary);
}

.app3-upload-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.app3-upload-slot {
  position: relative;
  min-height: 150px;
  padding: var(--space-4);
  text-align: left;
  background: var(--bg-surface);
  border: 1.5px dashed var(--border-strong);
  border-radius: 16px;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.app3-upload-slot:hover,
.app3-upload-slot.is-dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.app3-upload-slot.is-loaded {
  border-style: solid;
  border-color: var(--success-500);
  background: var(--success-50);
}

.app3-upload-slot__content {
  min-height: 118px;
  display: flex;
  flex-direction: column;
}

.app3-upload-slot__badge {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  padding: 4px 7px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--bg-input);
  font-size: 8px;
  font-weight: 800;
}

.app3-upload-slot__badge.source {
  color: var(--accent-hover);
  background: var(--accent-soft);
}

.app3-upload-slot__badge.valid {
  color: var(--success-800);
  background: var(--success-100);
}

.app3-upload-slot__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-bottom: var(--space-3);
  color: var(--accent);
  background: var(--bg-input);
  border-radius: var(--radius-md);
}

.app3-upload-slot.is-loaded .app3-upload-slot__icon {
  color: var(--success-700);
}

.app3-upload-slot__title {
  padding-right: 62px;
  margin: 0;
  color: var(--text-primary);
  font-size: var(--fs-base);
  font-weight: 800;
}

.app3-upload-slot__hint,
.app3-upload-slot__file {
  margin: var(--space-2) 0 0;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.45;
}

.app3-upload-slot__hint {
  color: var(--text-tertiary);
}

.app3-upload-slot__file {
  color: var(--success-800);
  font-weight: 700;
  word-break: break-word;
}

.app3-upload-slot__action {
  margin-top: auto;
  padding-top: var(--space-3);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.app3-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-top: var(--space-4);
  margin-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.app3-readiness,
.app3-summary-chips {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.app3-readiness span,
.app3-summary-chips span {
  padding: 6px 9px;
  color: var(--text-secondary);
  background: var(--bg-input);
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
}

.app3-readiness span.ok,
.app3-summary-chips span strong {
  color: var(--accent-hover);
}

.app3-primary-action {
  min-height: 40px;
  white-space: nowrap;
}

.app3-empty-state {
  padding: var(--space-4);
  color: var(--text-secondary);
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
}

.app3-category-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.app3-category-card {
  min-height: 92px;
  padding: var(--space-4);
  text-align: left;
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.app3-category-card:hover,
.app3-category-card:focus-visible {
  border-color: var(--accent);
  transform: translateY(-1px);
  outline: none;
}

.app3-category-card.selected {
  color: var(--bg-primary);
  background: var(--text-primary);
  border-color: var(--text-primary);
}

.app3-category-card__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--fs-base);
  font-weight: 800;
}

.app3-category-card__title strong {
  padding: 4px 8px;
  color: var(--text-secondary);
  background: var(--bg-input);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 10px;
}

.app3-category-card.selected .app3-category-card__title strong {
  color: #ffffff;
  background: var(--accent);
}

.app3-category-card__hint {
  display: block;
  margin-top: var(--space-3);
  color: var(--text-tertiary);
  font-size: var(--fs-xs);
  line-height: 1.4;
}

.app3-category-card.selected .app3-category-card__hint {
  color: color-mix(in srgb, var(--bg-primary) 72%, transparent);
}

.app3-processing {
  margin-top: var(--space-4);
}

.app3-processing > div {
  height: 8px;
  overflow: hidden;
  background: var(--bg-input);
  border-radius: 999px;
}

.app3-processing span {
  display: block;
  width: 66%;
  height: 100%;
  background: var(--accent);
  border-radius: inherit;
}

.app3-processing p {
  margin: var(--space-2) 0 0;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
}

@media (max-width: 1100px) {
  .app3-upload-grid,
  .app3-category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .app3-hero,
  .app3-rule-strip,
  .app3-action-row {
    align-items: stretch;
    flex-direction: column;
  }

  .app3-hero-status {
    min-width: 0;
  }

  .app3-stepper,
  .app3-upload-grid,
  .app3-category-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Run helper tests**

Run from `app/`:

```powershell
rtk npx vitest run src/__tests__/app3ConsolidationUi.test.js
```

Expected: PASS.

- [ ] **Step 6: Run build to catch JSX/CSS errors**

Run from `app/`:

```powershell
rtk npm run build
```

Expected: PASS. If it fails on CSS `color-mix`, replace that declaration with `color: var(--text-secondary);` for simpler compatibility.

- [ ] **Step 7: Commit App3 guided upload task**

```powershell
rtk git add app/src/pages/App3ConsolidationPage.jsx app/src/styles/pages.css app/src/utils/app3ConsolidationUi.js app/src/__tests__/app3ConsolidationUi.test.js
rtk git commit -m @'
feat: redesign app3 consolidation upload flow

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Task 4: Light Align Evaluation Tab

**Files:**
- Modify: `app/src/pages/App4RecouncilPage.jsx`
- Modify: `app/src/styles/pages.css`

- [ ] **Step 1: Update visible Evaluation copy**

In `App4RecouncilPage.jsx`, change hero eyebrow/title/body text from:

```jsx
Final Evaluation Module
Recouncil Intelligence
Modul mitigasi otomatis menyilangkan (Left-Join) data Lapangan (Opname) dengan Master Data Oracle.
```

to:

```jsx
APP4 · EVALUATION
Evaluation Recouncil
Bandingkan hasil opname dengan master data terbaru. Upload file wajib, tambahkan ASPxGridView bila ada, lalu generate hasil evaluasi.
```

- [ ] **Step 2: Replace hero wrapper classes**

Replace the current hero header wrapper:

```jsx
<div className="bento-header" style={{ marginBottom: '16px', flexDirection: 'column', alignItems: 'flex-start', borderBottom: '3px solid var(--charcoal-900)', paddingBottom: '24px' }}>
```

with:

```jsx
<div className="app3-hero app4-hero-lite">
  <div>
    <div className="app3-eyebrow"><Activity size={14} /> APP4 · EVALUATION</div>
    <h1 className="app3-title">Evaluation Recouncil</h1>
    <p className="app3-copy">
      Bandingkan hasil opname dengan master data terbaru. Upload file wajib, tambahkan ASPxGridView bila ada, lalu generate hasil evaluasi.
    </p>
  </div>
</div>
```

Remove the old nested eyebrow/title/body block that this replaces.

- [ ] **Step 3: Align page container class**

Change the outer container from:

```jsx
<div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
```

to:

```jsx
<div className="app3-page app4-page-lite">
  <div className="app3-container">
```

Close the extra `div` before the return's final close.

- [ ] **Step 4: Align alerts**

Replace success alert wrapper class/style with:

```jsx
<div className="app3-alert app3-alert--success" role="status">
  <CheckCircle2 size={18} />
  <span>{successMsg}</span>
</div>
```

Replace error alert wrapper class/style with:

```jsx
<div className="app3-alert app3-alert--danger" role="alert">
  <FileWarning size={18} />
  <span>{errorMsg}</span>
</div>
```

- [ ] **Step 5: Add light alignment CSS**

Append to `app/src/styles/pages.css`:

```css
.app4-page-lite {
  padding-top: var(--space-6);
}

.app4-hero-lite {
  margin-bottom: var(--space-4);
}
```

- [ ] **Step 6: Run build**

Run from `app/`:

```powershell
rtk npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit Evaluation alignment task**

```powershell
rtk git add app/src/pages/App4RecouncilPage.jsx app/src/styles/pages.css
rtk git commit -m @'
feat: align app4 evaluation styling

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Task 5: Full Verification and Cleanup

**Files:**
- Modify only if verification finds a specific failure.

- [ ] **Step 1: Run targeted tests**

Run from `app/`:

```powershell
rtk npx vitest run src/__tests__/app3ConsolidationUi.test.js src/__tests__/UnifiedMasterDataPage.test.jsx
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run from `app/`:

```powershell
rtk npm test
```

Expected: PASS or only known unrelated failures. If failures are unrelated, capture exact failing test names and output in final report.

- [ ] **Step 3: Run lint**

Run from `app/`:

```powershell
rtk npm run lint
```

Expected: PASS or only pre-existing unrelated lint warnings. Fix lint errors in changed files.

- [ ] **Step 4: Run production build**

Run from `app/`:

```powershell
rtk npm run build
```

Expected: PASS.

- [ ] **Step 5: Manual browser verification**

Start app from `app/`:

```powershell
rtk npm run dev
```

Open `/app3` and verify:

- Topbar back button visually matches App1/App2 transparent arrow style.
- Theme toggle appears on App3 topbar.
- Consolidation tab visible by default.
- Evaluation tab switches without broken scroll.
- Upload CTA disabled when only Master Lama is uploaded.
- Upload CTA enabled when EXA, ADD, or INV is uploaded.
- File badges show `OPSIONAL`, `SOURCE`, and `VALID`.
- Filter cards show counts and selected state after extraction.
- Generate button disabled until category selected.
- Processing text says “Menyusun data master…” and no regex jargon appears.
- Dark mode keeps text and badges readable.

- [ ] **Step 6: Commit verification fixes if any**

Only if Step 1–5 required fixes:

```powershell
rtk git add app/src/pages/UnifiedMasterDataPage.jsx app/src/pages/App3ConsolidationPage.jsx app/src/pages/App4RecouncilPage.jsx app/src/styles/pages.css app/src/utils/app3ConsolidationUi.js app/src/__tests__/app3ConsolidationUi.test.js app/src/__tests__/UnifiedMasterDataPage.test.jsx
rtk git commit -m @'
fix: polish app3 guided upload verification issues

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
'@
```

---

## Self-Review

**Spec coverage:**
- Unified topbar/back button/theme toggle: Task 2.
- Guided upload and anti-salah upload rule: Task 3.
- Filter cards and live summary: Task 3.
- Processing/success/error wording: Task 3.
- Evaluation light alignment: Task 4.
- No API/backend/dependency changes: all tasks are frontend-only.
- Verification: Task 5.

**Placeholder scan:** No placeholder markers or fill-later instructions. Every code change step includes concrete code or exact replacement text.

**Type/name consistency:** Helper names are consistent across tests and implementation: `SOURCE_FILE_TYPES`, `FILTER_CATEGORIES`, `getSourceFileCount`, `canExtractFilters`, `classifyBat`, `countBatsByCategory`, `selectedBatsForCategory`, `getEffectiveBats`.
