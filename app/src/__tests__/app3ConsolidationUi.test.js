import { describe, expect, it } from 'vitest';
import {
  FILTER_CATEGORIES,
  SOURCE_FILE_TYPES,
  canExtractFilters,
  classifyBat,
  countBatsByCategory,
  getEffectiveBats,
  getSourceFileCount,
  selectedBatsForCategory,
} from '../utils/app3ConsolidationUi';

describe('app3ConsolidationUi helpers', () => {
  it('defines the source file types that unlock filter extraction', () => {
    expect(SOURCE_FILE_TYPES).toEqual(['exa', 'add', 'inv']);
    expect(FILTER_CATEGORIES).toEqual(['ICT', 'ENG', 'BAT', 'HRGA', 'Kosong']);
  });

  it('counts only EXA/ADD/INV as source files', () => {
    const files = {
      master: new File(['old'], 'master.xlsx'),
      exa: null,
      add: new File(['add'], 'add.xlsx'),
      inv: new File(['inv'], 'inv.xlsx'),
    };

    expect(getSourceFileCount(files)).toBe(2);
    expect(canExtractFilters(files)).toBe(true);
  });

  it('does not allow extraction when only optional master file exists', () => {
    const files = {
      master: new File(['old'], 'master.xlsx'),
      exa: null,
      add: null,
      inv: null,
    };

    expect(getSourceFileCount(files)).toBe(0);
    expect(canExtractFilters(files)).toBe(false);
  });

  it('classifies BAT values by known prefixes and empty values', () => {
    expect(classifyBat('ICT-001')).toBe('ICT');
    expect(classifyBat('ENG-001')).toBe('ENG');
    expect(classifyBat('HRGA-001')).toBe('HRGA');
    expect(classifyBat('BAT-001')).toBe('BAT');
    expect(classifyBat('')).toBe('Kosong');
    expect(classifyBat('nan')).toBe('Kosong');
    expect(classifyBat('unknown')).toBe('BAT');
  });

  it('counts BAT values by category', () => {
    expect(countBatsByCategory(['ICT-1', 'ICT-2', 'ENG-1', '', 'nan', 'OTHER'])).toEqual({
      ICT: 2,
      ENG: 1,
      BAT: 1,
      HRGA: 0,
      Kosong: 2,
    });
  });

  it('expands selected categories into effective BAT records', () => {
    const bats = ['ICT-1', 'ICT-2', 'ENG-1', 'HRGA-1', ''];

    expect(selectedBatsForCategory(bats, 'ICT')).toEqual(['ICT-1', 'ICT-2']);
    expect(getEffectiveBats(bats, ['ICT', 'Kosong'])).toEqual(['ICT-1', 'ICT-2', '']);
    expect(getEffectiveBats(bats, [])).toEqual([]);
  });
});
