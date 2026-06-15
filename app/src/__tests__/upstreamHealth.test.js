import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, UpstreamRegistry, UpstreamOpenError, UpstreamTimeoutError, STATE } from '../server/utils/upstreamHealth';

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
