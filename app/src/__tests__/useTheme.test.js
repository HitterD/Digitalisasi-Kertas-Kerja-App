import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../hooks/useTheme';

describe('useTheme (2-state)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to "light" when no localStorage entry', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('defaults to "light" when localStorage has invalid value', () => {
    localStorage.setItem('kkd-theme', 'system');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    localStorage.setItem('kkd-theme', 'purple');
    const { result: r2 } = renderHook(() => useTheme());
    expect(r2.current.theme).toBe('light');
  });

  it('reads "dark" from localStorage', () => {
    localStorage.setItem('kkd-theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('reads "light" from localStorage', () => {
    localStorage.setItem('kkd-theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('applies data-theme="light" to <html> on mount', () => {
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applies data-theme="dark" to <html> on mount', () => {
    localStorage.setItem('kkd-theme', 'dark');
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('setTheme("dark") updates state, attr, and localStorage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('kkd-theme')).toBe('dark');
  });

  it('toggle() flips "light" to "dark"', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggle() flips "dark" to "light"', () => {
    localStorage.setItem('kkd-theme', 'dark');
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('survives localStorage write failure (no unhandled error)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useTheme());
    expect(() => {
      act(() => result.current.setTheme('dark'));
    }).not.toThrow();
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    setItemSpy.mockRestore();
  });
});
