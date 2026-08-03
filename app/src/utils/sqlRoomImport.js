/**
 * Pure utility functions for SQL Room Import.
 */

export const OWNER_CATEGORIES = ['ICT', 'HRGA', 'ENG'];
export const AMBIGUOUS_KEYWORDS = ['MONITOR', 'UPS', 'STABILIZER', 'DISPLAY', 'PANEL CONTROL'];

export function normalizeCreateUser(createUser) {
  return String(createUser || '').trim().toUpperCase();
}

export function getOwnerFromCreateUser(createUser) {
  const normalized = normalizeCreateUser(createUser);
  if (!normalized) return null;

  if (normalized.includes('ICT') || normalized.startsWith('IT')) return 'ICT';
  if (normalized.includes('ENG')) return 'ENG';
  if (normalized.includes('HRD') || normalized.includes('HRGA')) return 'HRGA';

  return null;
}

export function hasAmbiguousOwnerKeyword(asset) {
  const searchableText = [
    asset?.NAMA_ASSET,
    asset?.KODE_TYPE_ASSET,
    asset?.KODE_KATEGORI_ASSET,
  ]
    .map((value) => String(value || '').toUpperCase())
    .join(' ');

  return AMBIGUOUS_KEYWORDS.some((keyword) => searchableText.includes(keyword));
}

export function dedupeSqlAssetsByBarcode(assets) {
  const seen = new Set();

  return (Array.isArray(assets) ? assets : []).filter((asset) => {
    const barcode = String(asset?.BARCODE_ASSET || '').trim();
    if (!barcode || seen.has(barcode)) return false;
    seen.add(barcode);
    return true;
  });
}

export function classifyAssetForCategory(asset, selectedCategory, manualDecision = null) {
  const ownerCategory = getOwnerFromCreateUser(asset?.CREATE_USER);
  const isAmbiguous = hasAmbiguousOwnerKeyword(asset);
  const warning = isAmbiguous ? 'Cek ulang: aset bisa lintas kategori (ICT/ENG/HRGA).' : null;

  if (manualDecision === 'include' || manualDecision === 'exclude') {
    return {
      ...asset,
      _classification: {
        ownerCategory,
        ownerSource: 'manual',
        ownerConfidence: 'review',
        warning,
        importDecision: manualDecision,
        importCategory: selectedCategory,
      },
    };
  }

  if (ownerCategory === selectedCategory) {
    return {
      ...asset,
      _classification: {
        ownerCategory,
        ownerSource: 'create_user',
        ownerConfidence: warning ? 'review' : 'high',
        warning,
        importDecision: 'include',
        importCategory: selectedCategory,
      },
    };
  }

  if (ownerCategory) {
    return {
      ...asset,
      _classification: {
        ownerCategory,
        ownerSource: 'create_user',
        ownerConfidence: 'high',
        warning,
        importDecision: 'exclude',
        importCategory: selectedCategory,
      },
    };
  }

  return {
    ...asset,
    _classification: {
      ownerCategory: null,
      ownerSource: 'unknown',
      ownerConfidence: 'review',
      warning,
      importDecision: 'review',
      importCategory: selectedCategory,
    },
  };
}

export function buildImportPreview(assets, selectedCategory, manualDecisions = {}) {
  const classified = dedupeSqlAssetsByBarcode(assets).map((asset) => {
    const barcode = String(asset.BARCODE_ASSET || '').trim();
    return classifyAssetForCategory(asset, selectedCategory, manualDecisions[barcode]);
  });

  return {
    includeList: classified.filter((asset) => asset._classification.importDecision === 'include'),
    reviewList: classified.filter((asset) => asset._classification.importDecision === 'review'),
    excludeList: classified.filter((asset) => asset._classification.importDecision === 'exclude'),
    totalCount: classified.length,
  };
}

export function mapSqlAssetToOpnameAsset(asset, categoryMeta) {
  const classification = asset?._classification || {};

  return {
    barcode: String(asset?.BARCODE_ASSET || '').trim(),
    namaAset: String(asset?.NAMA_ASSET || '').trim(),
    noPO: String(asset?.NO_PO || '').trim(),
    tipe: String(asset?.KODE_TYPE_ASSET || '').trim(),
    bulanPerolehan: String(asset?.BULAN || '').trim(),
    tahunPerolehan: String(asset?.TAHUN || '').trim(),
    adaTidakAda: 'Ada',
    kondisi: String(asset?.NAMA_KONDISI || 'Baik').trim(),
    keterangan: String(asset?.KETERANGAN_OPNAME || asset?.KETERANGAN || '').trim(),
    isChecked: false,
    ownerCategory: categoryMeta.category,
    ownerSource: classification.ownerSource || 'unknown',
    ownerConfidence: classification.ownerConfidence || 'review',
    ownerWarning: classification.warning || null,
    source: 'sql-room-import',
    sourceCreateUser: String(asset?.CREATE_USER || '').trim(),
    sourceRoomName: String(asset?.NAMA_RUANGAN || '').trim(),
    sourceRoomId: asset?.RUANGAN_ID || null,
  };
}
