# Upstream Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make app server (port 5181) resilient to upstream 192.168.2.111 (MSSQL + SMB) outages — request fail fast in <1s, auto-recover without app server restart.

**Architecture:** Tambah modul `upstreamHealth.js` (CircuitBreaker + UpstreamRegistry + background health probe). Refactor `sqlPlugin.js` dan `fileBrowserPlugin.js` agar wrap semua call upstream dengan `guard(name, fn)`. Tambah endpoint `GET /api/upstream/status` untuk observability.

**Tech Stack:** Vite 7 (middleware plugins), Vitest 4, mssql 12, @marsaud/smb2 0.18, Node 18+ (ESM)

**Spec:** [docs/superpowers/specs/2026-06-15-upstream-resilience-design.md](../specs/2026-06-15-upstream-resilience-design.md)

---

## File Structure

### New
- `app/src/server/utils/upstreamHealth.js` — CircuitBreaker, UpstreamRegistry, UpstreamOpenError, UpstreamTimeoutError, singleton `registry`
- `app/src/server/plugins/upstreamStatusPlugin.js` — Vite plugin untuk `GET /api/upstream/status`
- `app/src/__tests__/upstreamHealth.test.js` — unit tests (CircuitBreaker + Registry)
- `app/src/__tests__/sqlPlugin.test.js` — integration tests (mock mssql)
- `app/src/__tests__/fileBrowserPlugin.test.js` — integration tests (mock SMB2 + fs)
- `docs/superpowers/runbooks/upstream-resilience-manual-test.md` — manual test runbook

### Modified
- `app/src/server/plugins/sqlPlugin.js` — wrap calls dengan `registry.guard('sql', fn)`, tambah `connectionTimeout`/`requestTimeout` di sqlConfig
- `app/src/server/plugins/fileBrowserPlugin.js` — wrap calls dengan `registry.guard('smb', fn)`, tambah Promise.race timeout untuk SMB, reset `smb2Client = null` saat gagal
- `app/vite.config.js` — register `viteUpstreamStatusPlugin`, register SQL probe, panggil `registry.init()`
- `app/.env.example` — dokumentasi 6 env baru

### Test command
Dari `app/`: `npm test` (menjalankan `vitest run`).

---

## Task 1: CircuitBreaker class + error classes

**Files:**
- Create: `app/src/server/utils/upstreamHealth.js`
- Create: `app/src/__tests__/upstreamHealth.test.js`

- [ ] **Step 1: Tulis test file**

Buat `app/src/__tests__/upstreamHealth.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, UpstreamOpenError, UpstreamTimeoutError, STATE } from '../server/utils/upstreamHealth';

describe('STATE constants', () => {
  it('exposes CLOSED, OPEN, HALF_OPEN as frozen values', () => {
    expect(STATE.CLOSED).toBe('CLOSED');
    expect(STATE.OPEN).toBe('OPEN');
    expect(STATE.HALF_OPEN).toBe('HALF_OPEN');
    expect(Object.isFrozen(STATE)).toBe(true);
  });
});

describe('UpstreamOpenError', () => {
  it('has name, code UPSTREAM_OPEN, retryAfter, and message mentioning upstream name', () => {
    const err = new UpstreamOpenError('sql', 28);
    expect(err.name).toBe('UpstreamOpenError');
    expect(err.code).toBe('UPSTREAM_OPEN');
    expect(err.retryAfter).toBe(28);
    expect(err.message).toContain('sql');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('UpstreamTimeoutError', () => {
  it('has name, code UPSTREAM_TIMEOUT, and message with timeout value', () => {
    const err = new UpstreamTimeoutError('smb', 20000);
    expect(err.name).toBe('UpstreamTimeoutError');
    expect(err.code).toBe('UPSTREAM_TIMEOUT');
    expect(err.message).toContain('smb');
    expect(err.message).toContain('20000');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('CircuitBreaker', () => {
  let now;
  beforeEach(() => {
    now = vi.fn(() => 1000);
  });

  function newBreaker(opts = {}) {
    return new CircuitBreaker({ now, failureThreshold: 3, openDurationMs: 30000, ...opts });
  }

  describe('initial state', () => {
    it('starts in CLOSED with zero failures', () => {
      const cb = newBreaker();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.failureCount).toBe(0);
      expect(cb.openedAt).toBe(null);
    });
  });

  describe('CLOSED → CLOSED', () => {
    it('stays CLOSED when failure count is below threshold', () => {
      const cb = newBreaker();
      cb.recordFailure(new Error('a'));
      cb.recordFailure(new Error('b'));
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.failureCount).toBe(2);
    });

    it('resets failureCount to 0 after a success', () => {
      const cb = newBreaker();
      cb.recordFailure(new Error('a'));
      cb.recordFailure(new Error('b'));
      cb.recordSuccess();
      expect(cb.failureCount).toBe(0);
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('CLOSED → OPEN', () => {
    it('transitions to OPEN when failureCount reaches threshold', () => {
      const cb = newBreaker();
      cb.recordFailure(new Error('a'));
      cb.recordFailure(new Error('b'));
      cb.recordFailure(new Error('c'));
      expect(cb.getState()).toBe('OPEN');
      expect(cb.openedAt).toBe(1000);
    });
  });

  describe('OPEN → HALF_OPEN', () => {
    it('transitions to HALF_OPEN after openDurationMs elapsed', () => {
      const cb = newBreaker();
      cb.recordFailure(new Error('a'));
      cb.recordFailure(new Error('b'));
      cb.recordFailure(new Error('c'));
      expect(cb.getState()).toBe('OPEN');
      now = vi.fn(() => 1000 + 30001);
      expect(cb.getState()).toBe('HALF_OPEN');
    });

    it('stays OPEN if openDurationMs not yet elapsed', () => {
      const cb = newBreaker();
      cb.recordFailure(new Error('a'));
      cb.recordFailure(new Error('b'));
      cb.recordFailure(new Error('c'));
      now = vi.fn(() => 1000 + 29999);
      expect(cb.getState()).toBe('OPEN');
    });
  });

  describe('HALF_OPEN → CLOSED', () => {
    it('transitions to CLOSED on recordSuccess', () => {
      const cb = newBreaker();
      cb.recordFailure(new Error('a'));
      cb.recordFailure(new Error('b'));
      cb.recordFailure(new Error('c'));
      now = vi.fn(() => 1000 + 30001);
      expect(cb.getState()).toBe('HALF_OPEN');
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.failureCount).toBe(0);
      expect(cb.openedAt).toBe(null);
    });
  });

  describe('HALF_OPEN → OPEN', () => {
    it('transitions back to OPEN on recordFailure and resets openedAt', () => {
      const cb = newBreaker();
      cb.recordFailure(new Error('a'));
      cb.recordFailure(new Error('b'));
      cb.recordFailure(new Error('c'));
      now = vi.fn(() => 1000 + 30001);
      expect(cb.getState()).toBe('HALF_OPEN');
      now = vi.fn(() => 1000 + 30002);
      cb.recordFailure(new Error('d'));
      expect(cb.getState()).toBe('OPEN');
      expect(cb.openedAt).toBe(1000 + 30002);
    });
  });

  describe('getStatus', () => {
    it('returns state, failureCount, timestamps in ISO format', () => {
      const cb = newBreaker();
      cb.recordFailure(new Error('boom'));
      const status = cb.getStatus();
      expect(status.state).toBe('CLOSED');
      expect(status.failureCount).toBe(1);
      expect(status.lastFailure).toBe(new Date(1000).toISOString());
      expect(status.lastError).toBe('boom');
    });
  });
});
```

- [ ] **Step 2: Run test untuk verify fail (modul belum ada)**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- upstreamHealth
```

Expected: FAIL — module `'../server/utils/upstreamHealth'` not found.

- [ ] **Step 3: Implementasi minimal `upstreamHealth.js`**

Buat `app/src/server/utils/upstreamHealth.js`:

```js
/**
 * Upstream resilience — Circuit Breaker + Health Monitor.
 *
 * Setiap upstream ('sql', 'smb') punya CircuitBreaker sendiri dengan 3 state:
 *   CLOSED   — normal, request lewat
 *   OPEN     — gagal cepat, return UpstreamOpenError
 *   HALF_OPEN — satu probe boleh jalan, sisanya reject
 *
 * Lihat spec di docs/superpowers/specs/2026-06-15-upstream-resilience-design.md
 */

export const STATE = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

export class UpstreamOpenError extends Error {
  constructor(name, retryAfter) {
    super(`Upstream ${name} tidak tersedia, sedang dipulihkan`);
    this.name = 'UpstreamOpenError';
    this.code = 'UPSTREAM_OPEN';
    this.retryAfter = retryAfter;
  }
}

export class UpstreamTimeoutError extends Error {
  constructor(name, timeoutMs) {
    super(`Upstream ${name} timeout setelah ${timeoutMs}ms`);
    this.name = 'UpstreamTimeoutError';
    this.code = 'UPSTREAM_TIMEOUT';
  }
}

export class CircuitBreaker {
  constructor({ failureThreshold = 3, openDurationMs = 30000, now = () => Date.now() } = {}) {
    this.failureThreshold = failureThreshold;
    this.openDurationMs = openDurationMs;
    this.now = now;
    this.state = STATE.CLOSED;
    this.failureCount = 0;
    this.openedAt = null;
    this.lastSuccess = null;
    this.lastFailure = null;
    this.lastError = null;
    this.probeInFlight = false;
  }

  getState() {
    if (this.state === STATE.OPEN && this.openedAt !== null) {
      const elapsed = this.now() - this.openedAt;
      if (elapsed >= this.openDurationMs) {
        const prev = this.state;
        this.state = STATE.HALF_OPEN;
        this.probeInFlight = false;
        if (prev !== STATE.HALF_OPEN) {
          console.log(`[UpstreamHealth] circuit: OPEN → HALF_OPEN (after ${elapsed}ms)`);
        }
      }
    }
    return this.state;
  }

  recordSuccess() {
    const wasHalfOpen = this.state === STATE.HALF_OPEN;
    this.state = STATE.CLOSED;
    this.failureCount = 0;
    this.openedAt = null;
    this.probeInFlight = false;
    this.lastSuccess = this.now();
    if (wasHalfOpen) {
      console.log('[UpstreamHealth] circuit: HALF_OPEN → CLOSED (probe success)');
    }
  }

  recordFailure(err) {
    this.lastFailure = this.now();
    this.lastError = (err && err.message) || String(err);
    if (this.state === STATE.HALF_OPEN) {
      this.state = STATE.OPEN;
      this.openedAt = this.now();
      this.probeInFlight = false;
      console.log(`[UpstreamHealth] circuit: HALF_OPEN → OPEN (probe fail: ${this.lastError})`);
      return;
    }
    this.failureCount++;
    if (this.state === STATE.CLOSED && this.failureCount >= this.failureThreshold) {
      this.state = STATE.OPEN;
      this.openedAt = this.now();
      console.log(`[UpstreamHealth] circuit: CLOSED → OPEN (${this.failureCount} failures)`);
    }
  }

  getStatus() {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : null,
      lastSuccess: this.lastSuccess ? new Date(this.lastSuccess).toISOString() : null,
      lastFailure: this.lastFailure ? new Date(this.lastFailure).toISOString() : null,
      lastError: this.lastError,
    };
  }
}
```

- [ ] **Step 4: Run test untuk verify pass**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- upstreamHealth
```

Expected: PASS — semua test hijau.

- [ ] **Step 5: Commit**

```bash
git add app/src/server/utils/upstreamHealth.js app/src/__tests__/upstreamHealth.test.js
git commit -m "feat(upstreamHealth): add CircuitBreaker state machine and error classes"
```

---

## Task 2: UpstreamRegistry — `guard()` dengan timeout

**Files:**
- Modify: `app/src/server/utils/upstreamHealth.js`
- Modify: `app/src/__tests__/upstreamHealth.test.js`

- [ ] **Step 1: Update import + tambah test untuk `UpstreamRegistry.guard()`**

Edit baris pertama `app/src/__tests__/upstreamHealth.test.js`:

```js
import { CircuitBreaker, UpstreamRegistry, UpstreamOpenError, UpstreamTimeoutError, STATE } from '../server/utils/upstreamHealth';
```

Append di akhir file:

```js
describe('UpstreamRegistry', () => {
  describe('getBreaker', () => {
    it('returns the same breaker instance for the same name', () => {
      const reg = new UpstreamRegistry({});
      const a = reg.getBreaker('sql');
      const b = reg.getBreaker('sql');
      expect(a).toBe(b);
    });

    it('returns different breakers for different names', () => {
      const reg = new UpstreamRegistry({});
      expect(reg.getBreaker('sql')).not.toBe(reg.getBreaker('smb'));
    });
  });

  describe('guard — CLOSED state', () => {
    it('runs fn and returns result on success', async () => {
      const reg = new UpstreamRegistry({ requestTimeoutMs: 1000 });
      const fn = vi.fn().mockResolvedValue('result');
      await expect(reg.guard('sql', fn)).resolves.toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws UpstreamTimeoutError if fn exceeds timeoutMs', async () => {
      const reg = new UpstreamRegistry({ requestTimeoutMs: 50 });
      const fn = vi.fn().mockImplementation(() => new Promise((r) => setTimeout(r, 200)));
      await expect(reg.guard('sql', fn)).rejects.toBeInstanceOf(UpstreamTimeoutError);
      await expect(reg.guard('sql', fn)).rejects.toMatchObject({ code: 'UPSTREAM_TIMEOUT' });
    });

    it('records failure to circuit on fn rejection', async () => {
      const reg = new UpstreamRegistry({ requestTimeoutMs: 1000, failureThreshold: 2 });
      const fn = vi.fn().mockRejectedValue(new Error('boom'));
      await expect(reg.guard('sql', fn)).rejects.toThrow('boom');
      await expect(reg.guard('sql', fn)).rejects.toThrow('boom');
      expect(reg.getBreaker('sql').getState()).toBe('OPEN');
    });

    it('records success and resets failureCount after success', async () => {
      const reg = new UpstreamRegistry({ requestTimeoutMs: 1000, failureThreshold: 3 });
      const failingFn = vi.fn().mockRejectedValue(new Error('a'));
      const okFn = vi.fn().mockResolvedValue('ok');
      await expect(reg.guard('sql', failingFn)).rejects.toThrow();
      await expect(reg.guard('sql', failingFn)).rejects.toThrow();
      await reg.guard('sql', okFn);
      expect(reg.getBreaker('sql').failureCount).toBe(0);
    });
  });

  describe('guard — OPEN state', () => {
    it('throws UpstreamOpenError with retryAfter when circuit is OPEN', async () => {
      const reg = new UpstreamRegistry({ requestTimeoutMs: 1000, failureThreshold: 1, openDurationMs: 30000 });
      const fn = vi.fn().mockRejectedValue(new Error('boom'));
      await expect(reg.guard('sql', fn)).rejects.toThrow();
      const okFn = vi.fn().mockResolvedValue('ok');
      await expect(reg.guard('sql', okFn)).rejects.toBeInstanceOf(UpstreamOpenError);
      await expect(reg.guard('sql', okFn)).rejects.toMatchObject({
        code: 'UPSTREAM_OPEN',
        retryAfter: expect.any(Number),
      });
      expect(okFn).not.toHaveBeenCalled();
    });

    it('retryAfter decreases as time passes (but stays >= 1)', async () => {
      const reg = new UpstreamRegistry({ requestTimeoutMs: 1000, failureThreshold: 1, openDurationMs: 10000 });
      const fn = vi.fn().mockRejectedValue(new Error('boom'));
      await expect(reg.guard('sql', fn)).rejects.toThrow();
      const err1 = await reg.guard('sql', () => Promise.resolve()).catch((e) => e);
      const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 9000);
      const err2 = await reg.guard('sql', () => Promise.resolve()).catch((e) => e);
      expect(err2.retryAfter).toBeLessThan(err1.retryAfter);
      expect(err2.retryAfter).toBeGreaterThanOrEqual(1);
      dateSpy.mockRestore();
    });
  });

  describe('guard — HALF_OPEN state', () => {
    it('only runs one probe at a time, others reject with UpstreamOpenError', async () => {
      const reg = new UpstreamRegistry({ requestTimeoutMs: 1000, failureThreshold: 1, openDurationMs: 0 });
      await expect(reg.guard('sql', () => Promise.reject(new Error('boom')))).rejects.toThrow();
      let resolveProbe;
      const slowProbe = () => new Promise((r) => { resolveProbe = r; });
      const probePromise = reg.guard('sql', slowProbe);
      await expect(reg.guard('sql', () => Promise.resolve('second'))).rejects.toBeInstanceOf(UpstreamOpenError);
      resolveProbe('done');
      await expect(probePromise).resolves.toBe('done');
      expect(reg.getBreaker('sql').getState()).toBe('CLOSED');
    });
  });

  describe('getStatus', () => {
    it('returns status for all registered upstreams', () => {
      const reg = new UpstreamRegistry({});
      reg.getBreaker('sql');
      reg.getBreaker('smb');
      const status = reg.getStatus();
      expect(status).toHaveProperty('sql');
      expect(status).toHaveProperty('smb');
      expect(status.sql.state).toBe('CLOSED');
      expect(status.smb.state).toBe('CLOSED');
    });
  });
});
```

- [ ] **Step 2: Run test untuk verify fail (Registry belum ada)**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- upstreamHealth
```

Expected: FAIL — `UpstreamRegistry` is not exported.

- [ ] **Step 3: Implementasi `UpstreamRegistry` di `upstreamHealth.js`**

Append ke `app/src/server/utils/upstreamHealth.js` (di bawah class `CircuitBreaker`):

```js
function readConfig(overrides = {}) {
  const num = (v, d) => {
    const n = parseInt(v);
    return Number.isFinite(n) ? n : d;
  };
  return {
    requestTimeoutMs: overrides.requestTimeoutMs ?? num(process.env.UPSTREAM_REQUEST_TIMEOUT_MS, 15000),
    smbTimeoutMs: overrides.smbTimeoutMs ?? num(process.env.UPSTREAM_SMB_TIMEOUT_MS, 20000),
    probeTimeoutMs: overrides.probeTimeoutMs ?? num(process.env.UPSTREAM_PROBE_TIMEOUT_MS, 5000),
    failureThreshold: overrides.failureThreshold ?? num(process.env.CB_FAILURE_THRESHOLD, 3),
    openDurationMs: overrides.openDurationMs ?? num(process.env.CB_OPEN_DURATION_MS, 30000),
    probeIntervalMs: overrides.probeIntervalMs ?? num(process.env.CB_HALF_OPEN_PROBE_INTERVAL_MS, 30000),
  };
}

export class UpstreamRegistry {
  constructor(overrides = {}) {
    this.config = readConfig(overrides);
    this.breakers = new Map();
  }

  getBreaker(name) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({
        failureThreshold: this.config.failureThreshold,
        openDurationMs: this.config.openDurationMs,
      }));
    }
    return this.breakers.get(name);
  }

  async guard(name, fn, opts = {}) {
    const breaker = this.getBreaker(name);
    const state = breaker.getState();
    const timeoutMs = opts.timeoutMs ?? this.config.requestTimeoutMs;
    const nowMs = Date.now();

    if (state === STATE.OPEN) {
      const retryAfter = Math.max(1, Math.ceil((breaker.openedAt + breaker.openDurationMs - nowMs) / 1000));
      throw new UpstreamOpenError(name, retryAfter);
    }

    if (state === STATE.HALF_OPEN) {
      if (breaker.probeInFlight) {
        const retryAfter = Math.max(1, Math.ceil(breaker.openDurationMs / 1000));
        throw new UpstreamOpenError(name, retryAfter);
      }
      breaker.probeInFlight = true;
    }

    let timeoutHandle = null;
    try {
      const result = await new Promise((resolve, reject) => {
        timeoutHandle = setTimeout(() => reject(new UpstreamTimeoutError(name, timeoutMs)), timeoutMs);
        Promise.resolve()
          .then(() => fn())
          .then(resolve, reject);
      });
      breaker.recordSuccess();
      return result;
    } catch (err) {
      breaker.recordFailure(err);
      throw err;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  getStatus() {
    const result = {};
    for (const [name, breaker] of this.breakers.entries()) {
      result[name] = breaker.getStatus();
    }
    return result;
  }
}

export const registry = new UpstreamRegistry();
```

- [ ] **Step 4: Run test untuk verify pass**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- upstreamHealth
```

Expected: PASS — semua test hijau.

- [ ] **Step 5: Commit**

```bash
git add app/src/server/utils/upstreamHealth.js app/src/__tests__/upstreamHealth.test.js
git commit -m "feat(upstreamHealth): add UpstreamRegistry.guard with timeout and state enforcement"
```

---

## Task 3: Background probe + auto-register

**Files:**
- Modify: `app/src/server/utils/upstreamHealth.js`
- Modify: `app/src/__tests__/upstreamHealth.test.js`

- [ ] **Step 1: Tambah test untuk probe loop**

Append ke `app/src/__tests__/upstreamHealth.test.js`:

```js
describe('UpstreamRegistry — background probe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs registered probe immediately on init()', async () => {
    const probe = vi.fn().mockResolvedValue('ok');
    const reg = new UpstreamRegistry({ probeIntervalMs: 1000 });
    reg.registerProbe('sql', probe);
    reg.init();
    await vi.advanceTimersByTimeAsync(0);
    expect(probe).toHaveBeenCalledTimes(1);
    reg.stop();
  });

  it('runs probe at configured interval', async () => {
    const probe = vi.fn().mockResolvedValue('ok');
    const reg = new UpstreamRegistry({ probeIntervalMs: 1000 });
    reg.registerProbe('sql', probe);
    reg.init();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(probe).toHaveBeenCalledTimes(3);
    reg.stop();
  });

  it('probe success after failure transitions circuit to CLOSED', async () => {
    let fail = true;
    const probe = vi.fn().mockImplementation(() => fail ? Promise.reject(new Error('down')) : Promise.resolve('ok'));
    const reg = new UpstreamRegistry({ probeIntervalMs: 1000, failureThreshold: 1 });
    reg.registerProbe('sql', probe);
    reg.init();
    await vi.advanceTimersByTimeAsync(0);
    expect(reg.getBreaker('sql').getState()).toBe('OPEN');
    fail = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(reg.getBreaker('sql').getState()).toBe('CLOSED');
    reg.stop();
  });

  it('stop() halts the probe loop', async () => {
    const probe = vi.fn().mockResolvedValue('ok');
    const reg = new UpstreamRegistry({ probeIntervalMs: 1000 });
    reg.registerProbe('sql', probe);
    reg.init();
    await vi.advanceTimersByTimeAsync(0);
    reg.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('init() is idempotent (does not start duplicate intervals)', async () => {
    const probe = vi.fn().mockResolvedValue('ok');
    const reg = new UpstreamRegistry({ probeIntervalMs: 1000 });
    reg.registerProbe('sql', probe);
    reg.init();
    reg.init();
    reg.init();
    await vi.advanceTimersByTimeAsync(0);
    expect(probe).toHaveBeenCalledTimes(1);
    reg.stop();
  });
});
```

- [ ] **Step 2: Run test untuk verify fail**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- upstreamHealth
```

Expected: FAIL — `registerProbe`, `init`, `stop` not functions.

- [ ] **Step 3: Tambah probe methods ke `UpstreamRegistry`**

Edit constructor `UpstreamRegistry` di `app/src/server/utils/upstreamHealth.js` (ganti yang ada):

```js
  constructor(overrides = {}) {
    this.config = readConfig(overrides);
    this.breakers = new Map();
    this.probes = new Map();
    this.probeHandle = null;
  }
```

Tambah method-method berikut ke class `UpstreamRegistry` (sebelum `getStatus()`):

```js
  registerProbe(name, fn) {
    this.probes.set(name, fn);
  }

  init() {
    if (this.probeHandle) return;
    this.probeHandle = setInterval(() => {
      this._runProbes().catch((err) => {
        console.error('[UpstreamHealth] probe loop error:', err.message);
      });
    }, this.config.probeIntervalMs);
    this._runProbes().catch((err) => {
      console.error('[UpstreamHealth] initial probe error:', err.message);
    });
  }

  stop() {
    if (this.probeHandle) {
      clearInterval(this.probeHandle);
      this.probeHandle = null;
    }
  }

  async _runProbes() {
    for (const [name, fn] of this.probes.entries()) {
      try {
        await this.guard(name, fn, { timeoutMs: this.config.probeTimeoutMs });
        console.log(`[UpstreamHealth] ${name} probe OK`);
      } catch (err) {
        console.log(`[UpstreamHealth] ${name} probe FAIL: ${err.message}`);
      }
    }
  }
```

- [ ] **Step 4: Run test untuk verify pass**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- upstreamHealth
```

Expected: PASS — semua test hijau.

- [ ] **Step 5: Commit**

```bash
git add app/src/server/utils/upstreamHealth.js app/src/__tests__/upstreamHealth.test.js
git commit -m "feat(upstreamHealth): add background probe loop with registerProbe/init/stop"
```

---

## Task 4: Refactor `sqlPlugin.js` — wrap calls dengan guard + mssql timeouts

**Files:**
- Modify: `app/src/server/plugins/sqlPlugin.js`
- Create: `app/src/__tests__/sqlPlugin.test.js`

- [ ] **Step 1: Tulis integration test (mock mssql)**

Buat `app/src/__tests__/sqlPlugin.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('mssql', () => ({
  default: {
    connect: vi.fn(() => Promise.resolve({ request: () => ({ query: () => Promise.resolve({ recordset: [] }) }) })),
    Int: 0,
    NVarChar: 1,
  },
}));

const mockGuard = vi.fn();
vi.mock('../server/utils/upstreamHealth', () => ({
  registry: { guard: (...args) => mockGuard(...args) },
  UpstreamOpenError: class extends Error {
    constructor(n, ra) { super(`Upstream ${n} tidak tersedia`); this.code = 'UPSTREAM_OPEN'; this.retryAfter = ra; }
  },
  UpstreamTimeoutError: class extends Error {
    constructor(n, t) { super(`Upstream ${n} timeout`); this.code = 'UPSTREAM_TIMEOUT'; }
  },
}));

import sqlPlugin from '../server/plugins/sqlPlugin.js';
import { UpstreamOpenError, UpstreamTimeoutError } from '../server/utils/upstreamHealth.js';

function makeReqRes(url, method = 'GET') {
  const headersOut = {};
  let status = null;
  let body = null;
  const sendJson = (s, b) => { status = s; body = b; };
  return {
    req: { url, method, headers: { host: 'localhost' } },
    res: { setHeader: (k, v) => { headersOut[k.toLowerCase()] = v; }, statusCode: 0, end: () => {} },
    headersOut, sendJson,
    getStatus: () => status,
    getBody: () => body,
  };
}

function extractMiddleware(plugin) {
  let mw;
  plugin.configureServer({ middlewares: { use: (fn) => { mw = fn; } } });
  return mw;
}

describe('sqlPlugin — /api/db/status', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with connected=true when guard returns ok', async () => {
    mockGuard.mockResolvedValue({ connected: true, server: '192.168.2.111' });
    const mw = extractMiddleware(sqlPlugin());
    const { req, res, sendJson, getStatus, getBody } = makeReqRes('/api/db/status');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(getStatus()).toBe(200);
    expect(getBody()).toMatchObject({ success: true, connected: true, server: '192.168.2.111' });
  });

  it('returns 503 with Retry-After when guard throws UpstreamOpenError', async () => {
    mockGuard.mockRejectedValue(new UpstreamOpenError('sql', 28));
    const mw = extractMiddleware(sqlPlugin());
    const { req, res, sendJson, getStatus, getBody, headersOut } = makeReqRes('/api/db/status');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(getStatus()).toBe(503);
    expect(headersOut['retry-after']).toBe('28');
    expect(getBody()).toMatchObject({ success: false, code: 'UPSTREAM_OPEN', retryAfter: 28 });
  });

  it('returns 504 when guard throws UpstreamTimeoutError', async () => {
    mockGuard.mockRejectedValue(new UpstreamTimeoutError('sql', 15000));
    const mw = extractMiddleware(sqlPlugin());
    const { req, res, sendJson, getStatus, getBody } = makeReqRes('/api/db/status');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(getStatus()).toBe(504);
    expect(getBody()).toMatchObject({ success: false, code: 'UPSTREAM_TIMEOUT' });
  });
});
```

- [ ] **Step 2: Run test untuk verify fail**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- sqlPlugin
```

Expected: FAIL — endpoint returns 500 (not 503/504), atau import error.

- [ ] **Step 3: Refactor `sqlPlugin.js`**

Replace seluruh isi `app/src/server/plugins/sqlPlugin.js` dengan:

```js
import sql from 'mssql';
import { getAllowedOrigin, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { registry, UpstreamOpenError, UpstreamTimeoutError } from '../utils/upstreamHealth.js';

const SQL_REQUEST_TIMEOUT_MS = parseInt(process.env.UPSTREAM_REQUEST_TIMEOUT_MS || '15000');
const SQL_CONNECTION_TIMEOUT_MS = 10000;

const sqlConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
  server: process.env.MSSQL_HOST || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  connectionTimeout: SQL_CONNECTION_TIMEOUT_MS,
  requestTimeout: SQL_REQUEST_TIMEOUT_MS,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(sqlConfig).catch((err) => {
      console.error('[SQL Server] Connection failed:', err.message);
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

function handleGuardError(err, sendJson, res) {
  if (err instanceof UpstreamOpenError) {
    res.setHeader('Retry-After', String(err.retryAfter));
    sendJson(503, {
      success: false,
      error: err.message,
      code: err.code,
      retryAfter: err.retryAfter,
    });
    return true;
  }
  if (err instanceof UpstreamTimeoutError) {
    sendJson(504, {
      success: false,
      error: err.message,
      code: err.code,
    });
    return true;
  }
  return false;
}

function sqlServerMiddleware(req, res, next) {
  const sendJson = createJsonSender(req, res);

  if (handleCorsIfPreflight(req, res, '/api/db/', 'GET, OPTIONS')) return;

  // GET /api/db/status
  if (req.url === '/api/db/status' && req.method === 'GET') {
    (async () => {
      try {
        const result = await registry.guard('sql', async () => {
          const pool = await getPool();
          await pool.request().query('SELECT 1 AS ok');
          return {
            connected: true,
            server: sqlConfig.server,
            database: sqlConfig.database,
            timestamp: new Date().toISOString(),
          };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });
        sendJson(200, result);
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        sendJson(500, {
          connected: false,
          error: err.message,
          server: sqlConfig.server,
        });
      }
    })();
    return;
  }

  // GET /api/db/master-assets
  if (req.url?.startsWith('/api/db/master-assets') && req.method === 'GET') {
    (async () => {
      try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 0;

        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const countResult = await pool.request().query(`
            SELECT COUNT(DISTINCT BARCODE_ASSET) as total
            FROM [dbo].[V_REPORT_ALL_DETAIL]
            WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
          `);
          const total = countResult.recordset[0].total;

          let query = `
            SELECT
              LTRIM(RTRIM(BARCODE_ASSET)) AS BARCODE_ASSET,
              LTRIM(RTRIM(NAMA_ASSET)) AS NAMA_ASSET,
              LTRIM(RTRIM(KODE_TYPE_ASSET)) AS KODE_TYPE_ASSET,
              BULAN, TAHUN,
              LTRIM(RTRIM(NAMA_KONDISI)) AS NAMA_KONDISI,
              LTRIM(RTRIM(KETERANGAN)) AS KETERANGAN,
              LTRIM(RTRIM(NO_PO)) AS NO_PO,
              LTRIM(RTRIM(NAMA_RUANGAN)) AS LOCATION_CODE,
              LTRIM(RTRIM(PIC_RUANGAN)) AS PIC_RUANGAN
            FROM (
              SELECT *,
                ROW_NUMBER() OVER (
                  PARTITION BY BARCODE_ASSET
                  ORDER BY TRANS_DATE DESC, HIST_ID DESC
                ) AS rn
              FROM [dbo].[V_REPORT_ALL_DETAIL]
              WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
            ) sub
            WHERE rn = 1
            ORDER BY BARCODE_ASSET
          `;

          const request = pool.request();
          if (limit > 0) {
            query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
            request.input('offset', sql.Int, (page - 1) * limit);
            request.input('limit', sql.Int, limit);
          }

          const result = await request.query(query);
          return { total, page, limit, count: result.recordset.length, data: result.recordset, timestamp: new Date().toISOString() };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });

        console.log(`[SQL Server] Master assets fetched: ${data.count} rows`);
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error('[SQL Server] Master assets query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/history-assets
  if (req.url?.startsWith('/api/db/history-assets') && req.method === 'GET') {
    (async () => {
      try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 0;

        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const countResult = await pool.request().query(`
            SELECT COUNT(*) as total
            FROM [dbo].[V_REPORT_ALL_DETAIL]
            WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
          `);
          const total = countResult.recordset[0].total;

          let query = `
            SELECT
              BARCODE_ASSET, NAMA_RUANGAN, KETERANGAN,
              NAMA_KONDISI, TRANS_DATE, KETERANGAN_OPNAME, SITE_ID
            FROM [dbo].[V_REPORT_ALL_DETAIL]
            WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
            ORDER BY TRANS_DATE DESC, HIST_ID DESC
          `;

          const request = pool.request();
          if (limit > 0) {
            query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
            request.input('offset', sql.Int, (page - 1) * limit);
            request.input('limit', sql.Int, limit);
          }

          const result = await request.query(query);
          return { total, page, limit, count: result.recordset.length, data: result.recordset, timestamp: new Date().toISOString() };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });

        console.log(`[SQL Server] History assets fetched: ${data.count} rows`);
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error('[SQL Server] History assets query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/opname-periods
  if (req.url === '/api/db/opname-periods' && req.method === 'GET') {
    (async () => {
      try {
        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const result = await pool.request().query(`
            SELECT DISTINCT Periode
            FROM [dbo].[TD_OPNAME]
            ORDER BY Periode DESC
          `);
          return { data: result.recordset.map(r => r.Periode), timestamp: new Date().toISOString() };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error('[SQL Server] Opname periods query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/opname-data/:periode
  const opnameDataMatch = req.url?.match(/^\/api\/db\/opname-data\/([^/?]+)/);
  if (opnameDataMatch && req.method === 'GET') {
    const periode = decodeURIComponent(opnameDataMatch[1]);
    (async () => {
      try {
        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const result = await pool.request()
            .input('periode', sql.NVarChar, periode)
            .query(`
              SELECT
                td.id, td.Periode, td.Ruangan_Opname, td.Barcode, td.Nama_Asset,
                td.Ruangan_Barcode, td.Kondisi, td.Keterangan, td.created_date,
                td.KETIDAKSESUAIAN, td.TARGET_PENYELESAIAN, td.ACTION,
                v.CREATE_USER, v.PIC_RUANGAN,
                LTRIM(RTRIM(v.KETERANGAN)) AS KETERANGAN_MASTER
              FROM [dbo].[TD_OPNAME] td
              OUTER APPLY (
                  SELECT TOP 1 CREATE_USER, PIC_RUANGAN, KETERANGAN
                  FROM [dbo].[V_REPORT_ALL_DETAIL] vr
                  WHERE vr.BARCODE_ASSET = td.Barcode
                  ORDER BY vr.TRANS_DATE DESC, vr.HIST_ID DESC
              ) v
              WHERE td.Periode LIKE '%-%' + @periode + '%' OR td.Periode = @periode
              ORDER BY td.Ruangan_Opname, td.id
            `);
          return { count: result.recordset.length, data: result.recordset, timestamp: new Date().toISOString() };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error(`[SQL Server] Opname data query failed:`, err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/opname-not-scanned/:periode
  const notScannedMatch = req.url?.match(/^\/api\/db\/opname-not-scanned\/([^/?]+)/);
  if (notScannedMatch && req.method === 'GET') {
    const periode = decodeURIComponent(notScannedMatch[1]);
    (async () => {
      try {
        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const roomsResult = await pool.request()
            .input('periode', sql.NVarChar, periode)
            .query(`
              SELECT DISTINCT RUANGAN_OPNAME
              FROM [dbo].[TH_OPNAME]
              WHERE PERIODE LIKE '%-%' + @periode + '%' OR PERIODE = @periode
            `);
          const rooms = roomsResult.recordset.map(r => r.RUANGAN_OPNAME);

          const result = await pool.request()
            .input('periode2', sql.NVarChar, periode)
            .query(`
              WITH LatestMaster AS (
                  SELECT
                      M.BARCODE_ASSET, M.NAMA_ASSET, M.NAMA_RUANGAN,
                      M.NO_PO, M.KODE_TYPE_ASSET, M.NAMA_KONDISI,
                      M.PIC_RUANGAN, M.CREATE_USER,
                      ROW_NUMBER() OVER (
                          PARTITION BY M.BARCODE_ASSET
                          ORDER BY M.TRANS_DATE DESC, M.HIST_ID DESC
                      ) as rn
                  FROM [dbo].[V_REPORT_ALL_DETAIL] M
                  WHERE M.BARCODE_ASSET IS NOT NULL AND M.BARCODE_ASSET <> ''
              )
              SELECT
                  lm.BARCODE_ASSET,
                  lm.NAMA_ASSET,
                  lm.NAMA_RUANGAN,
                  lm.NO_PO,
                  lm.KODE_TYPE_ASSET,
                  lm.NAMA_KONDISI,
                  lm.PIC_RUANGAN,
                  lm.CREATE_USER,
                  LTRIM(RTRIM(vr.KETERANGAN)) AS KETERANGAN_MASTER
              FROM LatestMaster lm
              OUTER APPLY (
                  SELECT TOP 1 KETERANGAN
                  FROM [dbo].[V_REPORT_ALL_DETAIL] vr
                  WHERE vr.BARCODE_ASSET = lm.BARCODE_ASSET
                  ORDER BY vr.TRANS_DATE DESC, vr.HIST_ID DESC
              ) vr
              WHERE lm.rn = 1
                AND NOT EXISTS (
                  SELECT 1 FROM [dbo].[TD_OPNAME] td
                  WHERE (td.Periode LIKE '%-%' + @periode2 + '%' OR td.Periode = @periode2)
                    AND td.Barcode = lm.BARCODE_ASSET
                )
            `);

          const byRoom = {};
          for (const row of result.recordset) {
            const room = row.NAMA_RUANGAN || 'UNKNOWN';
            if (!byRoom[room]) byRoom[room] = [];
            byRoom[room].push(row);
          }

          const filteredByRoom = {};
          for (const room of rooms) {
            if (byRoom[room]) {
              filteredByRoom[room] = byRoom[room];
            }
          }

          const totalNotScanned = Object.values(filteredByRoom).reduce((s, arr) => s + arr.length, 0);
          return { rooms, data: filteredByRoom, totalNotScanned, timestamp: new Date().toISOString() };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error(`[SQL Server] Not-scanned query failed:`, err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/mat-history/:barcode
  const matHistoryMatch = req.url?.match(/^\/api\/db\/mat-history\/([^/?]+)/);
  if (matHistoryMatch && req.method === 'GET') {
    const barcode = decodeURIComponent(matHistoryMatch[1]);
    (async () => {
      if (!barcode.trim()) {
        sendJson(400, { success: false, error: 'Barcode tidak boleh kosong' });
        return;
      }
      try {
        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const result = await pool.request()
            .input('barcode', sql.NVarChar, barcode.trim())
            .query(`
              SELECT
                TRXID, NO_MAT, JENIS_MAT,
                ASAL_RUANGAN_ID, TUJUAN_RUANGAN_ID,
                LPB, KONDISI_ID, CREATED_DATE,
                USER_MAKER, NAME_MAKER,
                STATUS, PENJELASAN,
                COUNTER_NUM, STEP_APPROVAL,
                DEPT, BARCODE_ASSET, NAMA_ASSET,
                NEXT_VERIFICATOR, NEXT_ROLE_VERIFICATOR
              FROM [dbo].[V_TRX_MAT]
              WHERE LTRIM(RTRIM(BARCODE_ASSET)) = @barcode
              ORDER BY CREATED_DATE DESC
            `);

          const INACTIVE_STATUSES = ['COMPLETED', 'REJECTED'];
          const hasActiveMAT = result.recordset.some(
            (r) => !INACTIVE_STATUSES.includes((r.STATUS || '').toUpperCase())
          );

          return {
            barcode: barcode.trim(),
            hasActiveMAT,
            count: result.recordset.length,
            data: result.recordset,
            timestamp: new Date().toISOString(),
          };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });
        console.log(`[SQL Server] MAT history for ${barcode}: ${data.count} records, hasActiveMAT=${data.hasActiveMAT}`);
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error('[SQL Server] MAT history query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  next();
}

export default function viteSqlServerPlugin() {
  return {
    name: 'vite-plugin-sql-server',
    configureServer(server) {
      server.middlewares.use(sqlServerMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(sqlServerMiddleware);
    },
  };
}
```

- [ ] **Step 4: Run test untuk verify pass**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- sqlPlugin
```

Expected: PASS — semua 3 test hijau.

- [ ] **Step 5: Commit**

```bash
git add app/src/server/plugins/sqlPlugin.js app/src/__tests__/sqlPlugin.test.js
git commit -m "feat(sqlPlugin): wrap upstream calls with registry.guard and add mssql timeouts"
```

---

## Task 5: Refactor `fileBrowserPlugin.js` — wrap dengan guard + SMB timeout + reset client

**Files:**
- Modify: `app/src/server/plugins/fileBrowserPlugin.js`
- Create: `app/src/__tests__/fileBrowserPlugin.test.js`

- [ ] **Step 1: Tulis integration test (mock SMB2 + fs)**

Buat `app/src/__tests__/fileBrowserPlugin.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSmb2Client = {
  readdir: vi.fn(),
  exists: vi.fn(),
  stat: vi.fn(),
  createReadStream: vi.fn(),
};
vi.mock('@marsaud/smb2', () => ({
  default: vi.fn(() => mockSmb2Client),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ isDirectory: () => true, size: 0 })),
    createReadStream: vi.fn(() => ({ on: vi.fn(), pipe: vi.fn() })),
  },
}));

const mockGuard = vi.fn();
vi.mock('../server/utils/upstreamHealth', () => ({
  registry: { guard: (...args) => mockGuard(...args) },
  UpstreamOpenError: class extends Error {
    constructor(n, ra) { super(`Upstream ${n} tidak tersedia`); this.code = 'UPSTREAM_OPEN'; this.retryAfter = ra; }
  },
  UpstreamTimeoutError: class extends Error {
    constructor(n, t) { super(`Upstream ${n} timeout`); this.code = 'UPSTREAM_TIMEOUT'; }
  },
}));

import fileBrowserPlugin from '../server/plugins/fileBrowserPlugin.js';
import { UpstreamOpenError, UpstreamTimeoutError } from '../server/utils/upstreamHealth.js';

function makeReqRes(url, method = 'GET') {
  const headersOut = {};
  let status = null;
  let body = null;
  const sendJson = (s, b) => { status = s; body = b; };
  return {
    req: { url, method, headers: { host: 'localhost' } },
    res: { setHeader: (k, v) => { headersOut[k.toLowerCase()] = v; }, statusCode: 0, end: () => {} },
    headersOut, sendJson,
    getStatus: () => status,
    getBody: () => body,
  };
}

function extractMiddleware(plugin) {
  let mw;
  plugin.configureServer({ middlewares: { use: (fn) => { mw = fn; } } });
  return mw;
}

describe('fileBrowserPlugin — /api/files/folders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHARE_ACCESS_MODE = 'smb';
    process.env.SHARE_BASE_PATH = '\\\\test-host\\test-share';
    process.env.SHARE_USER = 'test-user';
    process.env.SHARE_PASSWORD = 'test-pass';
  });

  it('returns 200 with folder list on success', async () => {
    mockGuard.mockImplementation(async (name, fn) => fn());
    mockSmb2Client.readdir.mockResolvedValue([
      { name: 'SJA1', isDirectory: true, mtime: new Date(), size: 0 },
      { name: 'SJA2', isDirectory: true, mtime: new Date(), size: 0 },
    ]);
    const mw = extractMiddleware(fileBrowserPlugin());
    const { req, res, sendJson } = makeReqRes('/api/files/folders');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(sendJson.status).toBe(200);
    expect(sendJson.body.folders).toEqual(['SJA1', 'SJA2']);
  });

  it('returns 503 with Retry-After when guard throws UpstreamOpenError', async () => {
    mockGuard.mockRejectedValue(new UpstreamOpenError('smb', 25));
    const mw = extractMiddleware(fileBrowserPlugin());
    const { req, res, sendJson, headersOut } = makeReqRes('/api/files/folders');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(sendJson.status).toBe(503);
    expect(headersOut['retry-after']).toBe('25');
    expect(sendJson.body).toMatchObject({ success: false, code: 'UPSTREAM_OPEN' });
  });

  it('returns 504 when guard throws UpstreamTimeoutError', async () => {
    mockGuard.mockRejectedValue(new UpstreamTimeoutError('smb', 20000));
    const mw = extractMiddleware(fileBrowserPlugin());
    const { req, res, sendJson } = makeReqRes('/api/files/folders');
    mw(req, res, () => {});
    await new Promise((r) => setImmediate(r));
    expect(sendJson.status).toBe(504);
    expect(sendJson.body).toMatchObject({ success: false, code: 'UPSTREAM_TIMEOUT' });
  });
});
```

- [ ] **Step 2: Run test untuk verify fail**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- fileBrowserPlugin
```

Expected: FAIL — endpoint tidak return 503/504.

- [ ] **Step 3: Refactor `fileBrowserPlugin.js`**

Replace seluruh isi `app/src/server/plugins/fileBrowserPlugin.js` dengan:

```js
import fs from 'fs';
import path from 'path';
import SMB2 from '@marsaud/smb2';
import { getAllowedOrigin, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { registry, UpstreamOpenError, UpstreamTimeoutError } from '../utils/upstreamHealth.js';

const SHARE_ACCESS_MODE = (process.env.SHARE_ACCESS_MODE || 'native').toLowerCase();
const rawSharePath = process.env.SHARE_BASE_PATH;
const SMB_REQUEST_TIMEOUT_MS = parseInt(process.env.UPSTREAM_SMB_TIMEOUT_MS || '20000');

if (!rawSharePath) {
  console.warn('[FileBrowser] ⚠️ SHARE_BASE_PATH belum diatur di .env. File browser akan nonaktif.');
}

let smb2Client = null;
let smbSubPath = '';
let shareConnected = false; // declared before resetSmbClient to avoid TDZ

function parseSmbPath(uncPath) {
  const clean = uncPath.replace(/^[/\\]+/, '');
  const segments = clean.split(/[/\\]+/).filter(Boolean);
  if (segments.length < 2) {
    throw new Error(`[FileBrowser] UNC path tidak valid: "${uncPath}". Minimal butuh \\\\host\\share`);
  }
  const host = segments[0];
  const shareName = segments[1];
  const subPath = segments.slice(2).join('/');
  return { share: `\\\\${host}\\${shareName}`, subPath };
}

function getSmbClient() {
  if (smb2Client) return smb2Client;
  const parsed = parseSmbPath(rawSharePath);
  smbSubPath = parsed.subPath;
  smb2Client = new SMB2({
    share: parsed.share,
    domain: process.env.SHARE_DOMAIN || '',
    username: process.env.SHARE_USER || 'Guest',
    password: process.env.SHARE_PASSWORD || '',
    autoCloseTimeout: 0,
  });
  console.log(`[FileBrowser] 🔌 SMB2 client created for: ${parsed.share} (subPath: ${smbSubPath})`);
  return smb2Client;
}

function smbPath(...segments) {
  const joined = [smbSubPath, ...segments].filter(Boolean).join('\\');
  return joined.replace(/\//g, '\\');
}

function resetSmbClient() {
  if (smb2Client) {
    console.log('[FileBrowser] 🔄 Resetting SMB2 client');
  }
  smb2Client = null;
  shareConnected = false;
}

function normalizeSharePath(rawPath) {
  if (!rawPath) return rawPath;
  if (/^[A-Za-z]:/.test(rawPath)) return rawPath;
  if (rawPath.startsWith('/')) return rawPath;
  let normalized = rawPath.replace(/\\{2,}/g, '\\');
  if (normalized.startsWith('\\') && !normalized.startsWith('\\\\')) {
    normalized = '\\' + normalized;
  }
  return normalized;
}

const nativeBasePath = normalizeSharePath(rawSharePath);

function withTimeout(promise, timeoutMs, name = 'smb') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new UpstreamTimeoutError(name, timeoutMs)), timeoutMs);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

const fileAccess = {
  async connect() {
    if (shareConnected) return;
    if (!rawSharePath) {
      throw new Error('[FileBrowser] SHARE_BASE_PATH belum dikonfigurasi di .env');
    }
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      try {
        await withTimeout(client.readdir(smbSubPath || '.'), SMB_REQUEST_TIMEOUT_MS, 'smb');
        console.log(`[FileBrowser] ✅ SMB2 connected to share`);
      } catch (err) {
        resetSmbClient();
        if (err instanceof UpstreamTimeoutError) throw err;
        throw new Error(
          `[FileBrowser] Gagal koneksi SMB2 ke "${rawSharePath}": ${err.message}. ` +
          'Pastikan SHARE_USER, SHARE_PASSWORD, dan SHARE_BASE_PATH sudah benar.'
        );
      }
    } else {
      if (!fs.existsSync(nativeBasePath)) {
        const hint = nativeBasePath.startsWith('/')
          ? 'Pastikan path sudah di-mount.'
          : 'Pastikan network share sudah terkoneksi atau drive sudah di-map.';
        throw new Error(
          `[FileBrowser] Folder share tidak dapat diakses: "${nativeBasePath}". ${hint}`
        );
      }
      console.log(`[FileBrowser] ✅ Native FS connected: ${nativeBasePath}`);
    }
    shareConnected = true;
  },

  async readdir(relativePath) {
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      const fullPath = smbPath(relativePath);
      try {
        const entries = await withTimeout(
          client.readdir(fullPath, { stats: true }),
          SMB_REQUEST_TIMEOUT_MS,
          'smb'
        );
        return entries.map((e) => {
          let name, isDir, isF, mtime = null, size = 0;
          if (typeof e === 'object' && e.name !== undefined) {
            name = e.name;
            isDir = !!e.isDirectory;
            isF = !e.isDirectory;
            mtime = e.mtime ? new Date(e.mtime) : null;
            size = e.size || 0;
          } else if (typeof e === 'object' && e.Filename) {
            name = e.Filename;
            isDir = !!e.isDirectory;
            isF = !e.isDirectory;
            mtime = e.LastWriteTime ? new Date(e.LastWriteTime) : null;
            size = e.EndofFile || 0;
          } else {
            name = e;
            const hasExt = /\.[a-zA-Z0-9]+$/.test(name);
            isDir = !hasExt;
            isF = hasExt;
          }
          return { name, isDirectory: () => isDir, isFile: () => isF, mtime, size };
        });
      } catch (err) {
        if (err instanceof UpstreamTimeoutError) {
          resetSmbClient();
          throw err;
        }
        throw new Error(`Gagal membaca direktori: ${err.message}`);
      }
    } else {
      const fullPath = path.join(nativeBasePath, relativePath || '');
      return fs.readdirSync(fullPath, { withFileTypes: true }).map(e => ({
        name: e.name,
        isDirectory: () => e.isDirectory(),
        isFile: () => e.isFile(),
      }));
    }
  },

  async exists(relativePath) {
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      try {
        await withTimeout(client.exists(smbPath(relativePath)), SMB_REQUEST_TIMEOUT_MS, 'smb');
        return true;
      } catch (err) {
        if (err instanceof UpstreamTimeoutError) {
          resetSmbClient();
          throw err;
        }
        return false;
      }
    } else {
      return fs.existsSync(path.join(nativeBasePath, relativePath || ''));
    }
  },

  async stat(relativePath) {
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      try {
        const stats = await withTimeout(client.stat(smbPath(relativePath)), SMB_REQUEST_TIMEOUT_MS, 'smb');
        return {
          size: stats.size || 0,
          mtime: stats.mtime ? new Date(stats.mtime) : new Date(),
          isDirectory: () => !!stats.isDirectory,
          isFile: () => !stats.isDirectory,
        };
      } catch (err) {
        if (err instanceof UpstreamTimeoutError) {
          resetSmbClient();
          throw err;
        }
        throw err;
      }
    } else {
      return fs.statSync(path.join(nativeBasePath, relativePath || ''));
    }
  },

  async createReadStream(relativePath) {
    if (SHARE_ACCESS_MODE === 'smb') {
      const client = getSmbClient();
      return await withTimeout(client.createReadStream(smbPath(relativePath)), SMB_REQUEST_TIMEOUT_MS, 'smb');
    } else {
      return fs.createReadStream(path.join(nativeBasePath, relativePath || ''));
    }
  },
};

function isValidPathSegment(segment) {
  return /^[a-zA-Z0-9\-_. ()]+$/.test(segment) && !segment.includes('..');
}

function handleGuardError(err, sendJson, res) {
  if (err instanceof UpstreamOpenError) {
    res.setHeader('Retry-After', String(err.retryAfter));
    sendJson(503, {
      success: false,
      error: err.message,
      code: err.code,
      retryAfter: err.retryAfter,
    });
    return true;
  }
  if (err instanceof UpstreamTimeoutError) {
    sendJson(504, {
      success: false,
      error: err.message,
      code: err.code,
    });
    return true;
  }
  return false;
}

function fileBrowserMiddleware(req, res, next) {
  const sendJson = createJsonSender(req, res);
  if (handleCorsIfPreflight(req, res, '/api/files/', 'GET, OPTIONS')) return;

  // GET /api/files/folders
  if (req.url === '/api/files/folders' && req.method === 'GET') {
    (async () => {
      try {
        const folders = await registry.guard('smb', async () => {
          await fileAccess.connect();
          const entries = await fileAccess.readdir('');
          return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
        }, { timeoutMs: SMB_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, folders });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error('[FileBrowser] Error listing folders:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/files/periods/:folder
  const periodsMatch = req.url?.match(/^\/api\/files\/periods\/([^/?]+)/);
  if (periodsMatch && req.method === 'GET') {
    const folder = decodeURIComponent(periodsMatch[1]);
    (async () => {
      try {
        if (!isValidPathSegment(folder)) return sendJson(400, { success: false, error: 'Nama folder tidak valid' });
        const allFiles = await registry.guard('smb', async () => {
          await fileAccess.connect();
          const folderPath = folder;
          let entries;
          try {
            entries = await fileAccess.readdir(folderPath);
          } catch (e) {
            const err = new Error(`Folder tidak ditemukan atau tidak dapat diakses: ${folderPath}`);
            err.statusCode = 404;
            throw err;
          }
          const subDirs = entries.filter(e => e.isDirectory());
          if (subDirs.length === 0) {
            const err = new Error(`Belum ada subfolder periode di dalam ${folderPath}`);
            err.statusCode = 404;
            throw err;
          }
          const all = [];
          for (const dir of subDirs) {
            const periodName = dir.name;
            const lkoRelPath = `${folder}/${periodName}/Lembar Kerja Opname`;
            let subEntries = null;
            try { subEntries = await fileAccess.readdir(lkoRelPath); } catch (e) { continue; }
            if (subEntries) {
              const excelFiles = subEntries.filter(se => /\.(xlsx|xls)$/i.test(se.name));
              for (const fe of excelFiles) {
                const fileRelPath = `${lkoRelPath}/${fe.name}`;
                let modifiedDate = null;
                if (fe.mtime) {
                  modifiedDate = fe.mtime.toISOString();
                } else {
                  try {
                    const stat = await fileAccess.stat(fileRelPath);
                    modifiedDate = stat.mtime.toISOString();
                  } catch { }
                }
                all.push({ filename: fe.name, periodName, modifiedDate, sortKey: fe.name });
              }
            }
          }
          all.sort((a, b) => (a.modifiedDate || a.sortKey).localeCompare(b.modifiedDate || b.sortKey));
          return all;
        }, { timeoutMs: SMB_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, files: allFiles, timestamp: new Date().toISOString() });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        if (err.statusCode === 404) {
          return sendJson(404, { success: false, error: err.message });
        }
        console.error('[FileBrowser] Error listing periods:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/files/workbooks/:folder/:period
  const workbooksMatch = req.url?.match(/^\/api\/files\/workbooks\/([^/]+)\/([^/?]+)/);
  if (workbooksMatch && req.method === 'GET') {
    const folder = decodeURIComponent(workbooksMatch[1]);
    const period = decodeURIComponent(workbooksMatch[2]);
    (async () => {
      try {
        if (!isValidPathSegment(folder) || !isValidPathSegment(period)) {
          return sendJson(400, { success: false, error: 'Parameter tidak valid' });
        }
        const files = await registry.guard('smb', async () => {
          await fileAccess.connect();
          const lkoRelPath = `${folder}/${period}/Lembar Kerja Opname`;
          if (!(await fileAccess.exists(lkoRelPath))) {
            const err = new Error('Folder Lembar Kerja Opname tidak ditemukan');
            err.statusCode = 404;
            throw err;
          }
          const entries = await fileAccess.readdir(lkoRelPath);
          const out = [];
          for (const e of entries.filter(e => /\.(xlsx|xls)$/i.test(e.name))) {
            out.push({ name: e.name, size: e.size || 0, modifiedDate: e.mtime ? e.mtime.toISOString() : null });
          }
          out.sort((a, b) => (b.modifiedDate || '').localeCompare(a.modifiedDate || ''));
          return out;
        }, { timeoutMs: SMB_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, files });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        if (err.statusCode === 404) {
          return sendJson(404, { success: false, error: err.message });
        }
        console.error('[FileBrowser] Error listing workbooks:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/files/download/:folder/:period/:filename
  const downloadMatch = req.url?.match(/^\/api\/files\/download\/([^/]+)\/([^/]+)\/([^/?]+)/);
  if (downloadMatch && req.method === 'GET') {
    const folder = decodeURIComponent(downloadMatch[1]);
    const period = decodeURIComponent(downloadMatch[2]);
    const filename = decodeURIComponent(downloadMatch[3]);
    (async () => {
      try {
        if (!isValidPathSegment(folder) || !isValidPathSegment(period) || !isValidPathSegment(filename)) {
          return sendJson(400, { success: false, error: 'Parameter tidak valid' });
        }
        const { readStream, size } = await registry.guard('smb', async () => {
          await fileAccess.connect();
          const fileRelPath = `${folder}/${period}/Lembar Kerja Opname/${filename}`;
          if (!(await fileAccess.exists(fileRelPath))) {
            const err = new Error('File tidak ditemukan');
            err.statusCode = 404;
            throw err;
          }
          const stream = await fileAccess.createReadStream(fileRelPath);
          let streamSize = 0;
          try {
            const stats = await fileAccess.stat(fileRelPath);
            streamSize = stats.size || 0;
          } catch (e) { }
          return { readStream: stream, size: streamSize };
        }, { timeoutMs: SMB_REQUEST_TIMEOUT_MS });

        res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (size) res.setHeader('Content-Length', size);
        res.statusCode = 200;
        readStream.pipe(res);
        readStream.on('error', (err) => {
          console.error('[FileBrowser] Download stream error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: 'Download failed' }));
          }
        });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        if (err.statusCode === 404) {
          return sendJson(404, { success: false, error: err.message });
        }
        console.error('[FileBrowser] Error downloading file:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  next();
}

export default function viteFileBrowserPlugin() {
  return {
    name: 'vite-plugin-file-browser',
    configureServer(server) {
      server.middlewares.use(fileBrowserMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(fileBrowserMiddleware);
    },
  };
}

if (process.env.SHARE_ACCESS_MODE === 'smb') {
  registry.registerProbe('smb', async () => {
    await fileAccess.connect();
    await fileAccess.readdir('');
  });
}
```

- [ ] **Step 4: Run test untuk verify pass**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- fileBrowserPlugin
```

Expected: PASS — semua 3 test hijau.

- [ ] **Step 5: Commit**

```bash
git add app/src/server/plugins/fileBrowserPlugin.js app/src/__tests__/fileBrowserPlugin.test.js
git commit -m "feat(fileBrowserPlugin): wrap upstream calls with registry.guard, add SMB timeout, reset client on failure"
```

---

## Task 6: Add `upstreamStatusPlugin.js` endpoint

**Files:**
- Create: `app/src/server/plugins/upstreamStatusPlugin.js`
- Create: `app/src/__tests__/upstreamStatusPlugin.test.js`

- [ ] **Step 1: Tulis test**

Buat `app/src/__tests__/upstreamStatusPlugin.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetStatus = vi.fn(() => ({ sql: { state: 'CLOSED' }, smb: { state: 'OPEN' } }));
vi.mock('../server/utils/upstreamHealth', () => ({
  registry: { getStatus: () => mockGetStatus() },
}));

import upstreamStatusPlugin from '../server/plugins/upstreamStatusPlugin.js';

function makeReqRes(url, method = 'GET') {
  let status = null;
  let body = null;
  const sendJson = (s, b) => { status = s; body = b; };
  return {
    req: { url, method, headers: { host: 'localhost' } },
    res: { setHeader: () => {}, statusCode: 0, end: () => {} },
    sendJson,
    getStatus: () => status,
    getBody: () => body,
  };
}

function extractMiddleware(plugin) {
  let mw;
  plugin.configureServer({ middlewares: { use: (fn) => { mw = fn; } } });
  return mw;
}

describe('upstreamStatusPlugin — /api/upstream/status', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with status from registry', () => {
    const mw = extractMiddleware(upstreamStatusPlugin());
    const { req, res, sendJson } = makeReqRes('/api/upstream/status');
    mw(req, res, () => {});
    expect(sendJson.status).toBe(200);
    expect(sendJson.body).toEqual({ sql: { state: 'CLOSED' }, smb: { state: 'OPEN' } });
  });

  it('handles OPTIONS preflight', () => {
    const mw = extractMiddleware(upstreamStatusPlugin());
    const req = { url: '/api/upstream/status', method: 'OPTIONS', headers: {} };
    let nextCalled = false;
    const res = { setHeader: vi.fn(), statusCode: 0, end: vi.fn() };
    mw(req, res, () => { nextCalled = true; });
    expect(res.end).toHaveBeenCalled();
    expect(nextCalled).toBe(false);
  });

  it('passes through to next middleware for other URLs', () => {
    const mw = extractMiddleware(upstreamStatusPlugin());
    const req = { url: '/api/other', method: 'GET', headers: {} };
    let nextCalled = false;
    const res = { setHeader: vi.fn(), statusCode: 0, end: vi.fn() };
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test untuk verify fail**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- upstreamStatusPlugin
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implementasi `upstreamStatusPlugin.js`**

Buat `app/src/server/plugins/upstreamStatusPlugin.js`:

```js
import { createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { registry } from '../utils/upstreamHealth.js';

function upstreamStatusMiddleware(req, res, next) {
  const sendJson = createJsonSender(req, res);

  if (handleCorsIfPreflight(req, res, '/api/upstream/', 'GET, OPTIONS')) return;

  if (req.url === '/api/upstream/status' && req.method === 'GET') {
    sendJson(200, registry.getStatus());
    return;
  }

  next();
}

export default function viteUpstreamStatusPlugin() {
  return {
    name: 'vite-plugin-upstream-status',
    configureServer(server) {
      server.middlewares.use(upstreamStatusMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(upstreamStatusMiddleware);
    },
  };
}
```

- [ ] **Step 4: Run test untuk verify pass**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test -- upstreamStatusPlugin
```

Expected: PASS — semua 3 test hijau.

- [ ] **Step 5: Commit**

```bash
git add app/src/server/plugins/upstreamStatusPlugin.js app/src/__tests__/upstreamStatusPlugin.test.js
git commit -m "feat(upstreamStatusPlugin): add GET /api/upstream/status endpoint"
```

---

## Task 7: Mount plugin di `vite.config.js` + register SQL probe + update `.env.example`

**Files:**
- Modify: `app/vite.config.js`
- Modify: `app/.env.example`

- [ ] **Step 1: Edit `vite.config.js`**

Replace seluruh isi `app/vite.config.js` dengan:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import viteJwtAuthPlugin from './src/server/plugins/jwtAuthPlugin.js';
import viteSqlServerPlugin from './src/server/plugins/sqlPlugin.js';
import viteSyncPlugin from './src/server/plugins/syncPlugin.js';
import viteFileBrowserPlugin from './src/server/plugins/fileBrowserPlugin.js';
import viteUserManagementPlugin from './src/server/plugins/userManagementPlugin.js';
import viteApp3Plugin from './src/server/plugins/app3Plugin.js';
import viteApp4Plugin from './src/server/plugins/app4Plugin.js';
import viteApp1SavePlugin from './src/server/plugins/app1SavePlugin.js';
import viteAdminPlugin from './src/server/plugins/adminPlugin.js';
import viteUpstreamStatusPlugin from './src/server/plugins/upstreamStatusPlugin.js';
import { registry } from './src/server/utils/upstreamHealth.js';

import dotenv from 'dotenv';
import sql from 'mssql';
dotenv.config();

const APP_PORT = parseInt(process.env.PORT || '5181');

const config = defineConfig({
  plugins: [
    react(),
    viteJwtAuthPlugin(),
    viteSqlServerPlugin(),
    viteSyncPlugin(),
    viteFileBrowserPlugin(),
    viteUserManagementPlugin(),
    viteApp3Plugin(),
    viteApp4Plugin(),
    viteApp1SavePlugin(),
    viteAdminPlugin(),
    viteUpstreamStatusPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Opname Aset - Kertas Kerja',
        short_name: 'Opname Aset',
        description: 'Digitalisasi Kertas Kerja Opname Aset Tetap',
        theme_color: '#1e3a8a',
        background_color: '#f0f4f8',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10485760,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
          },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  server: { host: '0.0.0.0', port: APP_PORT },
  preview: { host: '0.0.0.0', port: APP_PORT },
});

// Register SQL probe (SMB probe registered inside fileBrowserPlugin.js)
registry.registerProbe('sql', async () => {
  const pool = await sql.connect({
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
    server: process.env.MSSQL_HOST || 'localhost',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    connectionTimeout: 10000,
    requestTimeout: parseInt(process.env.UPSTREAM_PROBE_TIMEOUT_MS || '5000'),
  });
  try {
    await pool.request().query('SELECT 1');
  } finally {
    await pool.close();
  }
});

// Start background health probe loop
registry.init();

export default config;
```

- [ ] **Step 2: Verify syntax OK dengan build**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npx vite build 2>&1 | tail -20
```

Expected: build sukses tanpa error.

- [ ] **Step 3: Update `.env.example` — tambah 6 env baru**

Replace seluruh isi `app/.env.example` dengan:

```
# === Application ===
PORT=5181
NODE_ENV=production

# === MSSQL Server ===
MSSQL_HOST=192.168.x.x
MSSQL_USER=your_db_user
MSSQL_PASSWORD=your_db_password
MSSQL_DATABASE=ASSET_MANAGEMENT
MSSQL_PORT=1433

# === Network Share ===
# Development (Windows native): SHARE_ACCESS_MODE=native (default)
# Docker (Production): SHARE_ACCESS_MODE=smb (di-override oleh .env.production)
SHARE_ACCESS_MODE=native
SHARE_BASE_PATH=\\192.168.x.x\share_name\folder
SHARE_USER=your_share_user
SHARE_PASSWORD=your_share_password

# === Upstream Resilience ===
# Circuit breaker & timeout untuk upstream 192.168.x.x (MSSQL + SMB).
# Default sudah cukup untuk sebagian besar kasus. Override hanya jika perlu.
UPSTREAM_REQUEST_TIMEOUT_MS=15000    # Per-request timeout untuk SQL Server (ms)
UPSTREAM_SMB_TIMEOUT_MS=20000        # Per-request timeout untuk SMB share (ms)
UPSTREAM_PROBE_TIMEOUT_MS=5000       # Timeout per background probe (ms)
CB_FAILURE_THRESHOLD=3               # Jumlah failure berturut-turut sebelum circuit OPEN
CB_OPEN_DURATION_MS=30000            # Durasi stay OPEN sebelum coba HALF_OPEN (ms)
CB_HALF_OPEN_PROBE_INTERVAL_MS=30000 # Interval background health probe (ms)

# === Security ===
JWT_SECRET=generate-a-strong-random-string-here
PASSWORD_SALT=generate-a-salt-string-here
```

- [ ] **Step 4: Commit**

```bash
git add app/vite.config.js app/.env.example
git commit -m "feat(vite): register upstreamStatusPlugin, start probe registry, document new env vars"
```

---

## Task 8: Manual test runbook

**Files:**
- Create: `docs/superpowers/runbooks/upstream-resilience-manual-test.md`

- [ ] **Step 1: Buat runbook document**

Buat `docs/superpowers/runbooks/upstream-resilience-manual-test.md`:

```markdown
# Manual Test Runbook: Upstream Resilience

**Tujuan:** Verifikasi app server (port 5181) tetap responsif dan auto-recover saat 192.168.2.111 mati/restart/hang.

**Lingkungan:** Production atau staging dengan MSSQL + SMB share di 192.168.2.111.

---

## Prasyarat

1. App server berjalan di port 5181.
2. Environment file `.env` sudah ada kredensial MSSQL + SMB yang valid.
3. Client (browser atau `curl`) bisa akses ke `http://<server-ip>:5181/`.

---

## Test 1: SQL Server mati

**Langkah:**

1. Catat waktu mulai.
2. Matikan service MSSQL di 192.168.2.111 (atau block port 1433 via firewall).
3. Tunggu 5 detik.
4. Hit endpoint status:
   ```bash
   curl -i http://<server-ip>:5181/api/db/status
   ```
5. Hit endpoint master-assets:
   ```bash
   curl -i http://<server-ip>:5181/api/db/master-assets | head -5
   ```
6. Nyalakan lagi MSSQL.
7. Tunggu 35 detik (1 probe cycle).
8. Hit lagi `curl -i http://<server-ip>:5181/api/db/status`.

**Expected:**

- Step 4: HTTP 503 dengan body `{"success":false,"code":"UPSTREAM_OPEN","retryAfter":N}`. Response time <1 detik.
- Step 5: HTTP 503 sama. Response time <1 detik.
- Step 8: HTTP 200 dengan `connected: true`.

---

## Test 2: SMB share mati

**Langkah:**

1. Matikan network share di 192.168.2.111 (atau block port 445).
2. Tunggu 5 detik.
3. Hit endpoint folders:
   ```bash
   curl -i http://<server-ip>:5181/api/files/folders
   ```
4. Nyalakan lagi share.
5. Tunggu 35 detik.
6. Hit lagi.

**Expected:**

- Step 3: HTTP 503. Response time <1 detik.
- Step 6: HTTP 200 dengan list folders.

---

## Test 3: App server responsiveness saat upstream down

**Langkah:**

1. Matikan MSSQL.
2. Dari terminal lain, hit endpoint unrelated:
   ```bash
   time curl -i http://<server-ip>:5181/
   ```
3. Ulangi beberapa kali.

**Expected:**

- Response time konsisten. App server tidak hang atau crash.

---

## Test 4: Inspek circuit state

**Langkah:**

```bash
curl http://<server-ip>:5181/api/upstream/status | python -m json.tool
```

**Expected saat MSSQL up:**

```json
{
  "sql": { "state": "CLOSED", "failureCount": 0, ... },
  "smb": { "state": "CLOSED", "failureCount": 0, ... }
}
```

**Expected saat MSSQL down >30 detik:**

```json
{
  "sql": { "state": "OPEN", "failureCount": 3, "openedAt": "..." },
  "smb": { "state": "CLOSED", ... }
}
```

---

## Catatan

- Jika response time >1 detik di step 4/5, cek log server untuk error.
- Jika step 8 masih 503 setelah >60 detik, restart app server (bug — laporkan).
- Probe loop jalan tiap 30 detik. Tunggu minimal 35 detik untuk konfirmasi recovery.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/runbooks/upstream-resilience-manual-test.md
git commit -m "docs: add manual test runbook for upstream resilience"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full test suite**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npm test
```

Expected: semua test pass. Coverage `upstreamHealth.js` ≥80% (verify via `npx vitest run --coverage`).

- [ ] **Step 2: Verify `vite build` sukses**

Run dari `app/`:
```bash
cd "d:/Digitalisasi Kertas Kerja APP/app" && npx vite build 2>&1 | tail -10
```

Expected: build sukses.

- [ ] **Step 3: Verifikasi end-to-end (jika akses ke 192.168.2.111 tersedia)**

Ikuti runbook di [docs/superpowers/runbooks/upstream-resilience-manual-test.md](../../runbooks/upstream-resilience-manual-test.md).

---

## Self-Review Checklist (sudah dijalankan)

- ✅ Setiap task TDD: failing test → impl → passing test → commit
- ✅ Tidak ada placeholder/TODO/"implement later"
- ✅ Tipe/method signature konsisten:
  - `CircuitBreaker`, `UpstreamRegistry`, `UpstreamOpenError`, `UpstreamTimeoutError`, `STATE`
  - `registry.guard(name, fn, { timeoutMs })` sama di Task 2/4/5
  - Error codes `UPSTREAM_OPEN`/`UPSTREAM_TIMEOUT` konsisten
- ✅ Spec coverage:
  - Goals → Task 1-5 (timeouts, circuit breaker, auto-recovery)
  - Komponen → Task 1-3 (upstreamHealth.js), Task 6 (upstreamStatusPlugin)
  - Refactor → Task 4 (sqlPlugin), Task 5 (fileBrowserPlugin)
  - Endpoint → Task 6
  - Vite mount + env → Task 7
  - Runbook → Task 8
  - Verification → Task 9
- ✅ File paths exact
- ✅ Test command `npm test` dari `app/` (sesuai `package.json`)
