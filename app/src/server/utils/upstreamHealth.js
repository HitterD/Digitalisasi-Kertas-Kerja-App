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
