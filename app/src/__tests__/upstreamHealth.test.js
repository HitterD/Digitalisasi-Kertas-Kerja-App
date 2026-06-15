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
