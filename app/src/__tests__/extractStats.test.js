import { describe, it, expect } from 'vitest';
import { overallProgress, roomProgress, roomStatus } from '../utils/extractStats';

describe('overallProgress', () => {
  it('hitung persen terscan dari total', () => {
    const r = overallProgress(340, 58);
    expect(r.total).toBe(398);
    expect(r.scannedPct).toBeCloseTo(85.4, 1);
    expect(r.notScannedPct).toBeCloseTo(14.6, 1);
    expect(r.hasData).toBe(true);
  });

  it('total 0 -> hasData false, persen 0', () => {
    const r = overallProgress(0, 0);
    expect(r.total).toBe(0);
    expect(r.scannedPct).toBe(0);
    expect(r.hasData).toBe(false);
  });
});

describe('roomProgress', () => {
  it('persen ruangan', () => {
    expect(roomProgress(7, 3).pct).toBeCloseTo(70, 5);
  });
  it('ruangan kosong -> 0', () => {
    expect(roomProgress(0, 0).pct).toBe(0);
  });
});

describe('roomStatus', () => {
  it('0 belum terscan -> done', () => {
    expect(roomStatus(0)).toBe('done');
  });
  it('ada yang belum terscan -> partial', () => {
    expect(roomStatus(3)).toBe('partial');
  });
});
