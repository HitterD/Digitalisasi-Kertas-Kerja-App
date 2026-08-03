/**
 * Upstream API client — diagnostic & control untuk circuit breaker.
 *
 * Endpoint:
 * - GET  /api/upstream/status    → status semua breakers
 * - POST /api/upstream/reset     → reset semua breakers ke CLOSED
 * - GET  /api/db/diagnostic      → BYPASS breaker, test koneksi MSSQL asli
 */

import { fetchWithAuth } from './apiConfig';

/**
 * Get status semua circuit breakers.
 * @returns {Promise<{sql?: BreakerStatus, smb?: BreakerStatus}>}
 */
export async function getUpstreamStatus() {
  const res = await fetchWithAuth('/api/upstream/status');
  return res.json();
}

/**
 * Reset semua circuit breakers ke CLOSED state.
 * @returns {Promise<{success: boolean, message: string, status: object}>}
 */
export async function resetUpstreamBreakers() {
  const res = await fetchWithAuth('/api/upstream/reset', { method: 'POST' });
  return res.json();
}

/**
 * Test koneksi MSSQL langsung, BYPASS circuit breaker.
 * Returns real error dari MSSQL kalau ada.
 * @returns {Promise<{
 *   connected: boolean,
 *   host: string, port: number, user: string, database: string,
 *   totalElapsedMs: number, steps: Array,
 *   error?: string, errorCode?: string
 * }>}
 */
export async function runDbDiagnostic() {
  const res = await fetchWithAuth('/api/db/diagnostic');
  return res.json();
}