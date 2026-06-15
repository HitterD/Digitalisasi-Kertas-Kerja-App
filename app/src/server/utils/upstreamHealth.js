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
    this.probes = new Map();
    this.probeHandle = null;
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

  getStatus() {
    const result = {};
    for (const [name, breaker] of this.breakers.entries()) {
      result[name] = breaker.getStatus();
    }
    return result;
  }
}

export const registry = new UpstreamRegistry();
