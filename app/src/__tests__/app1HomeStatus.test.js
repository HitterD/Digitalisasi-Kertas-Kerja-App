import { describe, expect, it } from 'vitest';
import {
  getApp1HeroCta,
  getDatabaseReadiness,
  getSavedSessionSummary,
} from '../utils/app1HomeStatus';

describe('app1HomeStatus', () => {
  it('shows no saved session when rooms are empty', () => {
    expect(getSavedSessionSummary({ rooms: [], fileName: '' })).toEqual({
      hasSession: false,
      roomCount: 0,
      assetCount: 0,
      fileName: '',
      label: 'BELUM ADA SESI',
    });
  });

  it('summarizes saved session rooms and assets', () => {
    const state = {
      fileName: 'opname-juni.xlsx',
      rooms: [
        { assets: [{ BARCODE: 'A' }, { BARCODE: 'B' }] },
        { assets: [{ BARCODE: 'C' }] },
      ],
    };

    expect(getSavedSessionSummary(state)).toEqual({
      hasSession: true,
      roomCount: 2,
      assetCount: 3,
      fileName: 'opname-juni.xlsx',
      label: '2 RUANGAN',
    });
  });

  it('marks database as perlu sync when no master and no history exist', () => {
    expect(getDatabaseReadiness({ masterDb: null, historyDb: null })).toMatchObject({
      key: 'needs-sync',
      label: 'PERLU SYNC',
      masterLabel: 'MASTER PERLU SYNC',
      historyLabel: 'HISTORY PERLU SYNC',
    });
  });

  it('marks history warning when master exists but history is missing', () => {
    expect(getDatabaseReadiness({ masterDb: new Map([['A', {}]]), historyDb: null })).toMatchObject({
      key: 'partial',
      label: 'HISTORY PERLU SYNC',
      masterLabel: 'MASTER OK',
      historyLabel: 'HISTORY PERLU SYNC',
    });
  });

  it('marks sql ready when master and history exist', () => {
    expect(getDatabaseReadiness({
      masterDb: new Map([['A', {}]]),
      historyDb: new Map([['A', []]]),
    })).toMatchObject({
      key: 'ready',
      label: 'SQL READY',
      masterLabel: 'MASTER OK',
      historyLabel: 'HISTORY OK',
    });
  });

  it('shows connection failure over ready status when sync failed', () => {
    expect(getDatabaseReadiness({
      masterDb: new Map([['A', {}]]),
      historyDb: new Map([['A', []]]),
      hasSyncError: true,
    })).toMatchObject({
      key: 'error',
      label: 'GAGAL TERHUBUNG',
    });
  });

  it('uses continue CTA when a saved session exists', () => {
    expect(getApp1HeroCta({ hasSession: true })).toEqual({
      label: 'Lanjutkan Opname',
      target: 'opname',
    });
  });

  it('uses start CTA when no saved session exists', () => {
    expect(getApp1HeroCta({ hasSession: false })).toEqual({
      label: 'Mulai Opname',
      target: 'prepare',
    });
  });
});
