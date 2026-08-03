import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOpnameSseSync } from '../hooks/useOpnameSseSync';

vi.mock('../utils/apiConfig', () => ({
  apiUrl: (path) => path,
}));

class FakeEventSource {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onerror = null;
    this.close = vi.fn();
    FakeEventSource.instances.push(this);
  }
}

describe('useOpnameSseSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    global.EventSource = FakeEventSource;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete global.EventSource;
  });

  it('keeps one SSE connection while using the latest sync callback', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ onSyncEvent }) => useOpnameSseSync({ isEnabled: true, onSyncEvent }),
      { initialProps: { onSyncEvent: first } },
    );

    rerender({ onSyncEvent: second });

    expect(FakeEventSource.instances).toHaveLength(1);
    FakeEventSource.instances[0].onmessage({ data: '{}' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('passes the event session target to the sync callback', () => {
    const onSyncEvent = vi.fn();

    renderHook(() => useOpnameSseSync({ isEnabled: true, onSyncEvent }));
    FakeEventSource.instances[0].onmessage({
      data: JSON.stringify({ period: '2026-06', sessionId: 'android-session' }),
    });

    expect(onSyncEvent).toHaveBeenCalledWith({
      period: '2026-06',
      sessionId: 'android-session',
    });
  });

  it('polls as a fallback when SSE messages are not received', () => {
    const onSyncEvent = vi.fn();

    renderHook(() => useOpnameSseSync({ isEnabled: true, onSyncEvent }));
    vi.advanceTimersByTime(5000);

    expect(onSyncEvent).toHaveBeenCalledTimes(1);
  });
});
