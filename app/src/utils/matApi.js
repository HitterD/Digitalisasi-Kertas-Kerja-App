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