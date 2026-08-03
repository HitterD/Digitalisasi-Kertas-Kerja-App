// Statistik murni untuk tampilan Extract MAT (app2). Tanpa side-effect.

/**
 * @param {number} scanned
 * @param {number} notScanned
 * @returns {{ total: number, scannedPct: number, notScannedPct: number, hasData: boolean }}
 */
export function overallProgress(scanned, notScanned) {
  const total = scanned + notScanned;
  if (total === 0) {
    return { total: 0, scannedPct: 0, notScannedPct: 0, hasData: false };
  }
  return {
    total,
    scannedPct: (scanned / total) * 100,
    notScannedPct: (notScanned / total) * 100,
    hasData: true,
  };
}

/**
 * @param {number} scanned
 * @param {number} notScanned
 * @returns {{ pct: number }}
 */
export function roomProgress(scanned, notScanned) {
  const total = scanned + notScanned;
  return { pct: total === 0 ? 0 : (scanned / total) * 100 };
}

/**
 * @param {number} notScannedCount
 * @returns {'done' | 'partial'}
 */
export function roomStatus(notScannedCount) {
  return notScannedCount > 0 ? 'partial' : 'done';
}
