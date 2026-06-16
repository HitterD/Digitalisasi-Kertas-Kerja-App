import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let handler;

  beforeEach(() => {
    handler = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers handler on Cmd+K (Mac)', () => {
    renderHook(() => useKeyboardShortcuts({ 'mod+k': handler }));
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('triggers handler on Ctrl+K (Windows)', () => {
    renderHook(() => useKeyboardShortcuts({ 'mod+k': handler }));
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not trigger on plain K (no modifier)', () => {
    renderHook(() => useKeyboardShortcuts({ 'mod+k': handler }));
    fireEvent.keyDown(document, { key: 'k' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('prevents default on match', () => {
    renderHook(() => useKeyboardShortcuts({ 'mod+k': handler }));
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('supports Esc shortcut', () => {
    renderHook(() => useKeyboardShortcuts({ 'escape': handler }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('unregisters on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts({ 'mod+k': handler }));
    unmount();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });
});
