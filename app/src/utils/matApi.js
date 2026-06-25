import { apiUrl, fetchWithAuth } from './apiConfig';

function getApiBase() {
  return apiUrl('/api/db');
}

/**
 * Fetch MAT transaction history for a specific barcode from V_TRX_MAT.
 * @param {string} barcode
 * @returns {Promise<{success: boolean, barcode: string, hasActiveMAT: boolean, count: number, data: Array, timestamp: string}>}
 */
export async function fetchMatHistory(barcode) {
  const res = await fetchWithAuth(
    `${getApiBase()}/mat-history/${encodeURIComponent(barcode)}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch active MAT transaction summaries for multiple barcodes.
 * @param {Array<string | number | null | undefined>} barcodes
 * @returns {Promise<{success: boolean, count: number, data: Record<string, object>, timestamp: string}>}
 */
export async function fetchActiveMatByBarcodes(barcodes) {
  const uniqueBarcodes = Array.from(new Set(
    (barcodes || [])
      .map((barcode) => String(barcode || '').trim())
      .filter(Boolean)
  ));

  if (uniqueBarcodes.length === 0) {
    return { success: true, count: 0, data: {}, timestamp: '' };
  }

  const query = encodeURIComponent(uniqueBarcodes.join(','));
  const res = await fetchWithAuth(
    `${getApiBase()}/mat-active?barcodes=${query}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }
  return res.json();
}