import { describe, expect, it } from 'vitest';
import {
  buildImportPreview,
  classifyAssetForCategory,
  dedupeSqlAssetsByBarcode,
  getOwnerFromCreateUser,
  hasAmbiguousOwnerKeyword,
  mapSqlAssetToOpnameAsset,
} from '../utils/sqlRoomImport';

const baseAsset = {
  BARCODE_ASSET: ' 1300000001 ',
  NAMA_ASSET: 'MONITOR 24 INCH',
  CN_ASSET: 'CN-1',
  KODE_KATEGORI_ASSET: 'ELEKTRONIK',
  KODE_TYPE_ASSET: 'DISPLAY',
  LOCATION_CODE: 'RSV',
  NAMA_RUANGAN: 'RUANG SERVER',
  PIC_RUANGAN: 'BUDI',
  NAMA_KONDISI: 'Baik',
  KETERANGAN: 'Master note',
  KETERANGAN_OPNAME: '',
  TRANS_DATE: '2026-06-24',
  BULAN: '06',
  TAHUN: '2026',
  CREATE_USER: 'ICT_ADMIN',
  CREATE_DATE: '2026-06-01',
  NO_PO: 'PO-1',
  SITE_ID: 'SITE-1',
  RUANGAN_ID: 99,
  KONDISI_BARANG_ID: 1,
};

describe('sqlRoomImport owner mapping', () => {
  it('maps ICT, ENG, HRD, and HRGA create users', () => {
    expect(getOwnerFromCreateUser('ICT_ADMIN')).toBe('ICT');
    expect(getOwnerFromCreateUser('ENG_USER')).toBe('ENG');
    expect(getOwnerFromCreateUser('HRD01')).toBe('HRGA');
    expect(getOwnerFromCreateUser('HRGA_USER')).toBe('HRGA');
  });

  it('returns null for empty or unknown create user', () => {
    expect(getOwnerFromCreateUser(null)).toBeNull();
    expect(getOwnerFromCreateUser('')).toBeNull();
    expect(getOwnerFromCreateUser('FINANCE')).toBeNull();
  });

  it('detects ambiguous keyword from asset name, type, or category', () => {
    expect(hasAmbiguousOwnerKeyword(baseAsset)).toBe(true);
    expect(hasAmbiguousOwnerKeyword({ ...baseAsset, NAMA_ASSET: 'KURSI', KODE_TYPE_ASSET: 'FURNITURE' })).toBe(false);
    expect(hasAmbiguousOwnerKeyword({ ...baseAsset, NAMA_ASSET: 'KURSI', KODE_TYPE_ASSET: '', KODE_KATEGORI_ASSET: 'UPS' })).toBe(true);
  });
});

describe('sqlRoomImport classification', () => {
  it('includes selected category rows and keeps ambiguous warning as helper only', () => {
    const result = classifyAssetForCategory(baseAsset, 'ICT');

    expect(result._classification).toMatchObject({
      ownerCategory: 'ICT',
      ownerSource: 'create_user',
      ownerConfidence: 'review',
      importDecision: 'include',
      importCategory: 'ICT',
    });
    expect(result._classification.warning).toContain('aset bisa lintas kategori');
  });

  it('excludes rows owned by another known category', () => {
    const result = classifyAssetForCategory({ ...baseAsset, CREATE_USER: 'ENG_USER' }, 'ICT');

    expect(result._classification).toMatchObject({
      ownerCategory: 'ENG',
      ownerSource: 'create_user',
      importDecision: 'exclude',
      importCategory: 'ICT',
    });
  });

  it('puts unknown create user rows into review', () => {
    const result = classifyAssetForCategory({ ...baseAsset, CREATE_USER: '' }, 'ICT');

    expect(result._classification).toMatchObject({
      ownerCategory: null,
      ownerSource: 'unknown',
      ownerConfidence: 'review',
      importDecision: 'review',
      importCategory: 'ICT',
    });
  });

  it('applies manual decisions over classification defaults', () => {
    const preview = buildImportPreview(
      [{ ...baseAsset, BARCODE_ASSET: '1300000001', CREATE_USER: '' }],
      'ICT',
      { '1300000001': 'include' }
    );

    expect(preview.includeList).toHaveLength(1);
    expect(preview.reviewList).toHaveLength(0);
    expect(preview.includeList[0]._classification).toMatchObject({
      ownerSource: 'manual',
      importDecision: 'include',
    });
  });
});

describe('sqlRoomImport import mapping', () => {
  it('dedupes SQL assets by trimmed barcode and keeps first row', () => {
    const result = dedupeSqlAssetsByBarcode([
      { ...baseAsset, BARCODE_ASSET: ' 1300000001 ', NAMA_ASSET: 'First' },
      { ...baseAsset, BARCODE_ASSET: '1300000001', NAMA_ASSET: 'Second' },
      { ...baseAsset, BARCODE_ASSET: '1300000002', NAMA_ASSET: 'Third' },
      { ...baseAsset, BARCODE_ASSET: '' },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].NAMA_ASSET).toBe('First');
    expect(result[1].BARCODE_ASSET).toBe('1300000002');
  });

  it('builds include/review/exclude preview from deduped assets', () => {
    const preview = buildImportPreview([
      { ...baseAsset, BARCODE_ASSET: '1', CREATE_USER: 'ICT_ADMIN' },
      { ...baseAsset, BARCODE_ASSET: '2', CREATE_USER: 'ENG_USER' },
      { ...baseAsset, BARCODE_ASSET: '3', CREATE_USER: '' },
    ], 'ICT');

    expect(preview.includeList).toHaveLength(1);
    expect(preview.excludeList).toHaveLength(1);
    expect(preview.reviewList).toHaveLength(1);
    expect(preview.totalCount).toBe(3);
  });

  it('maps SQL asset to unchecked opname asset with source metadata', () => {
    const classified = classifyAssetForCategory(baseAsset, 'ICT');
    const result = mapSqlAssetToOpnameAsset(classified, { category: 'ICT' });

    expect(result).toMatchObject({
      barcode: '1300000001',
      namaAset: 'MONITOR 24 INCH',
      noPO: 'PO-1',
      tipe: 'DISPLAY',
      bulanPerolehan: '06',
      tahunPerolehan: '2026',
      adaTidakAda: 'Ada',
      kondisi: 'Baik',
      keterangan: 'Master note',
      isChecked: false,
      ownerCategory: 'ICT',
      ownerSource: 'create_user',
      source: 'sql-room-import',
      sourceCreateUser: 'ICT_ADMIN',
      sourceRoomName: 'RUANG SERVER',
      sourceRoomId: 99,
    });
    expect(result.ownerWarning).toContain('aset bisa lintas kategori');
  });
});
