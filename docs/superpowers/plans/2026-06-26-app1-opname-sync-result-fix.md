# APP1 Opname Sync Result Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix APP1 `/app1/opname` so Android Sync result can be pulled by Web APP1 and visibly update opname data, with sync button spinner during request.

**Architecture:** Keep existing scoped file sync. Add one small client helper that resolves “which result should Web pull”: current `state.sync` first, latest server session fallback second. Keep server storage unchanged unless tests reveal missing scoped result behavior. UI only renders existing `Loader2` spinner already imported in `OpnamePage.jsx`.

**Tech Stack:** React 19, Vite, Vitest, existing `fetchWithAuth`, existing sync endpoints `/api/sync/sessions` and `/api/sync/result`.

---

## File Structure

- Create: `app/src/utils/opnameSyncPullTarget.js`
  - Pure helper for choosing current or latest sync target.
- Create: `app/src/__tests__/opnameSyncPullTarget.test.js`
  - Unit tests for target resolution.
- Modify: `app/src/components/NetworkSyncHub.jsx`
  - Web “Android ➔ PC (Tarik Hasil)” resolves target session before GET result.
  - Button shows spinner while pulling.
- Modify: `app/src/pages/OpnamePage.jsx`
  - Ensure sync button ring renders during `syncStatus === 'syncing'`.
- Test: targeted Vitest files only first, then full app test if targeted passes.

---

### Task 1: Add pure pull-target helper

**Files:**
- Create: `app/src/utils/opnameSyncPullTarget.js`
- Test: `app/src/__tests__/opnameSyncPullTarget.test.js`

- [ ] **Step 1: Write failing tests**

Create `app/src/__tests__/opnameSyncPullTarget.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { getCurrentSyncTarget, getLatestSessionTarget } from '../utils/opnameSyncPullTarget';

describe('opname sync pull target', () => {
  it('uses current state sync metadata when sessionId and period exist', () => {
    expect(getCurrentSyncTarget({
      sync: { period: '2026-06', sessionId: 'sess-web' },
    })).toEqual({ period: '2026-06', sessionId: 'sess-web' });
  });

  it('returns null when current sync metadata is missing', () => {
    expect(getCurrentSyncTarget({ rooms: [] })).toBeNull();
    expect(getCurrentSyncTarget({ sync: { period: '2026-06' } })).toBeNull();
    expect(getCurrentSyncTarget({ sync: { sessionId: 'sess-only' } })).toBeNull();
  });

  it('uses newest listed session as fallback target', () => {
    const sessions = [
      { period: '2026-06', sessionId: 'old', updatedAt: '2026-06-26T08:00:00.000Z' },
      { period: '2026-06', sessionId: 'new', updatedAt: '2026-06-26T09:00:00.000Z' },
    ];

    expect(getLatestSessionTarget(sessions)).toEqual({ period: '2026-06', sessionId: 'new' });
  });

  it('ignores sessions without period or sessionId', () => {
    const sessions = [
      { period: '2026-06', updatedAt: '2026-06-26T10:00:00.000Z' },
      { sessionId: 'missing-period', updatedAt: '2026-06-26T11:00:00.000Z' },
      { period: '2026-06', sessionId: 'valid', updatedAt: '2026-06-26T09:00:00.000Z' },
    ];

    expect(getLatestSessionTarget(sessions)).toEqual({ period: '2026-06', sessionId: 'valid' });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
rtk npm --prefix app run test -- --run src/__tests__/opnameSyncPullTarget.test.js
```

Expected: FAIL with import/module not found for `../utils/opnameSyncPullTarget`.

- [ ] **Step 3: Implement helper**

Create `app/src/utils/opnameSyncPullTarget.js`:

```js
export function getCurrentSyncTarget(state) {
  const period = state?.sync?.period;
  const sessionId = state?.sync?.sessionId;
  if (!period || !sessionId) return null;
  return { period, sessionId };
}

export function getLatestSessionTarget(sessions) {
  const validSessions = (Array.isArray(sessions) ? sessions : [])
    .filter((session) => session?.period && session?.sessionId)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  const latest = validSessions[0];
  if (!latest) return null;
  return { period: latest.period, sessionId: latest.sessionId };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
rtk npm --prefix app run test -- --run src/__tests__/opnameSyncPullTarget.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit this task if committing is authorized**

```powershell
rtk git add app/src/utils/opnameSyncPullTarget.js app/src/__tests__/opnameSyncPullTarget.test.js
rtk git commit -m "fix: resolve app1 sync pull target"
```

---

### Task 2: Make Web Tarik Hasil pull latest scoped result fallback

**Files:**
- Modify: `app/src/components/NetworkSyncHub.jsx`
- Test: `app/src/__tests__/opnameSyncPullTarget.test.js`

- [ ] **Step 1: Add import**

Modify imports in `app/src/components/NetworkSyncHub.jsx`:

```js
import { getCurrentSyncTarget, getLatestSessionTarget } from '../utils/opnameSyncPullTarget';
```

- [ ] **Step 2: Replace result-pull target logic**

In `handlePullResult`, replace current `syncMeta`/`params` block with this logic:

```js
const currentTarget = getCurrentSyncTarget(state);
let target = currentTarget;

if (!target) {
    const sessionsRes = await fetchWithAuth(apiUrl('/api/sync/sessions?period=all'));
    const sessionsPayload = await sessionsRes.json();
    if (!sessionsRes.ok || !sessionsPayload.success) {
        throw new Error(sessionsPayload.error || sessionsPayload.message || 'Gagal mengambil daftar sesi.');
    }
    target = getLatestSessionTarget(sessionsPayload.sessions);
}

if (!target) {
    setSyncError('Belum ada sesi hasil opname dari Android.');
    return;
}

const params = `?period=${encodeURIComponent(target.period)}&sessionId=${encodeURIComponent(target.sessionId)}`;
const res = await fetchWithAuth(apiUrl(`/api/sync/result${params}`));
```

Keep existing `const data = await res.json();` and import behavior after it.

- [ ] **Step 3: Ensure imported data keeps sync target when result lacks sync metadata**

Before `importData(data);`, normalize payload:

```js
const importedResult = {
    ...data,
    sync: data.sync || {
        period: target.period,
        sessionId: target.sessionId,
    },
};
importData(importedResult);
```

This prevents Web from losing scoped target after pull.

- [ ] **Step 4: Run targeted tests**

Run:

```powershell
rtk npm --prefix app run test -- --run src/__tests__/opnameSyncPullTarget.test.js src/__tests__/syncScopedRoute.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit this task if committing is authorized**

```powershell
rtk git add app/src/components/NetworkSyncHub.jsx app/src/utils/opnameSyncPullTarget.js app/src/__tests__/opnameSyncPullTarget.test.js
rtk git commit -m "fix: pull latest scoped app1 opname result"
```

---

### Task 3: Show spinner on Sync/Tarik buttons

**Files:**
- Modify: `app/src/components/NetworkSyncHub.jsx`
- Modify: `app/src/pages/OpnamePage.jsx`

- [ ] **Step 1: Update NetworkSyncHub imports**

Change lucide import in `app/src/components/NetworkSyncHub.jsx` from:

```js
import { Wifi, MonitorUp, SmartphoneNfc, DownloadCloud, Settings, ArrowRight } from 'lucide-react';
```

to:

```js
import { Wifi, MonitorUp, SmartphoneNfc, DownloadCloud, Settings, ArrowRight, Loader2 } from 'lucide-react';
```

- [ ] **Step 2: Add tiny inline spinner helper**

Inside `NetworkSyncHub`, after state declarations:

```js
const renderTrailingIcon = () => (
    isSyncing || isFetchingSessions
        ? <Loader2 size={14} className="spin" />
        : <ArrowRight size={14} />
);
```

- [ ] **Step 3: Replace trailing arrows in sync action buttons**

Replace `<ArrowRight size={14} />` in the three main sync buttons with:

```jsx
{renderTrailingIcon()}
```

Buttons affected:
- PC ➔ Android (Push Sesi)
- Android ➔ PC (Tarik Hasil)
- PC ➔ Android (Tarik Sesi)

- [ ] **Step 4: Verify OpnamePage spinner already renders**

Confirm `app/src/pages/OpnamePage.jsx` has this sync button body:

```jsx
{syncStatus === 'syncing'
  ? <Loader2 size={13} className="wa-spin" />
  : '↻'
}
{' '}
{syncStatus === 'paused' ? 'Sync dijeda'
  : syncStatus === 'syncing' ? 'Sinkron...'
  : syncStatus === 'offline' ? 'Offline'
  : syncStatus === 'error' ? 'Gagal sync'
  : 'Sync'
}
```

If `wa-spin` is not animated in CSS, change class to existing `.spin`:

```jsx
? <Loader2 size={13} className="spin" />
```

- [ ] **Step 5: Run targeted tests**

Run:

```powershell
rtk npm --prefix app run test -- --run src/__tests__/opnameSyncPullTarget.test.js src/__tests__/syncScopedRoute.test.js src/__tests__/useOpnameAutoSync.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit this task if committing is authorized**

```powershell
rtk git add app/src/components/NetworkSyncHub.jsx app/src/pages/OpnamePage.jsx
rtk git commit -m "fix: show app1 sync loading indicators"
```

---

### Task 4: Manual smoke test APP1 Web/Android result flow

**Files:**
- No code changes unless smoke fails.

- [ ] **Step 1: Start app**

Run:

```powershell
rtk npm --prefix app run dev
```

Expected: server and Vite start without fatal errors.

- [ ] **Step 2: Prepare Web session**

In Web:
1. Open `/app1`.
2. Load opname data.
3. Use Sync Hub `PC ➔ Android (Push Sesi)`.
4. Confirm no error alert.

- [ ] **Step 3: Pull session on Android**

On Android:
1. Open APP1 home.
2. Set IP PC if needed.
3. Tap `PC ➔ Android (Tarik Sesi)`.
4. Choose latest session if picker appears.
5. Open `/app1/opname`.

- [ ] **Step 4: Change Android opname result**

On Android:
1. Toggle one asset checkbox.
2. Tap `Sync` in `/app1/opname`.
3. Confirm spinner appears and no error toast.

- [ ] **Step 5: Pull result on Web**

In Web APP1 home:
1. Click `Android ➔ PC (Tarik Hasil)`.
2. Confirm button spinner appears.
3. Confirm browser navigates to `/app1/opname`.
4. Confirm toggled asset matches Android state.

- [ ] **Step 6: Run final targeted tests**

Run:

```powershell
rtk npm --prefix app run test -- --run src/__tests__/opnameSyncPullTarget.test.js src/__tests__/syncScopedRoute.test.js src/__tests__/useOpnameAutoSync.test.js src/__tests__/opnameAutoSyncIntegration.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit smoke-tested fix if committing is authorized**

```powershell
rtk git add app/src/components/NetworkSyncHub.jsx app/src/pages/OpnamePage.jsx app/src/utils/opnameSyncPullTarget.js app/src/__tests__/opnameSyncPullTarget.test.js
rtk git commit -m "fix: sync app1 android result into web opname"
```

---

## Self-Review

**Spec coverage:** This plan covers approved minimal scope: Web pulls latest scoped Android result, import updates `/app1/opname`, spinner on sync buttons. Full auto-sync conflict merge and SQLite/App2 propagation are out of this minimal APP1 bug scope.

**Placeholder scan:** No TBD/TODO/fill-later language remains. Every code step includes exact snippets.

**Type consistency:** Helper returns `{ period, sessionId }`; NetworkSyncHub uses same names; endpoint query uses existing `period` and `sessionId` params.
