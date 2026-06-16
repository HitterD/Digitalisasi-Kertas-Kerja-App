import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentBarcodes } from '../hooks/useRecentBarcodes';

describe('useRecentBarcodes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty list', () => {
    const { result } = renderHook(() => useRecentBarcodes(5));
    expect(result.current.recent).toEqual([]);
  });

  it('add() prepends a barcode', () => {
    const { result } = renderHook(() => useRecentBarcodes(5));
    act(() => result.current.add('BC001'));
    expect(result.current.recent).toEqual(['BC001']);
  });

  it('add() moves existing barcode to front', () => {
    const { result } = renderHook(() => useRecentBarcodes(5));
    act(() => result.current.add('BC001'));
    act(() => result.current.add('BC002'));
    act(() => result.current.add('BC001'));
    expect(result.current.recent).toEqual(['BC001', 'BC002']);
  });

  it('add() caps at max entries (FIFO)', () => {
    const { result } = renderHook(() => useRecentBarcodes(2));
    act(() => result.current.add('BC001'));
    act(() => result.current.add('BC002'));
    act(() => result.current.add('BC003'));
    expect(result.current.recent).toEqual(['BC003', 'BC002']);
  });

  it('clear() empties the list', () => {
    const { result } = renderHook(() => useRecentBarcodes(5));
    act(() => result.current.add('BC001'));
    act(() => result.current.clear());
    expect(result.current.recent).toEqual([]);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useRecentBarcodes(5));
    act(() => result.current.add('BC001'));
    expect(JSON.parse(localStorage.getItem('barcode-recent'))).toEqual(['BC001']);
  });
});
