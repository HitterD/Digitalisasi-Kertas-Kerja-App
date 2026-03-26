/**
 * SQL Server API client — fetches master & history asset data from
 * the Vite dev server backend, which queries ASSET_MANAGEMENT.dbo.V_REPORT_ALL_DETAIL.
 * 
 * Returns data in the SAME Map format as masterDbParser / historyDbParser,
 * so the rest of the app (search, autofill) works without changes.
 */

import { apiUrl, fetchWithAuth } from './apiConfig';

// Lazy-evaluate so Capacitor bridge is ready when first API call happens
function getApiBase() {
    return apiUrl('/api/db');
}

/**
 * Format SQL Server date to readable string (DD-MMM-YYYY)
 * Input can be ISO string like "2025-09-15T15:01:08.770Z" or null
 */
function formatSqlDate(value) {
    if (!value) return '';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value).trim();
        const day = d.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch {
        return String(value).trim();
    }
}

/**
 * Format BULAN value — SQL Server might return a number (e.g. 5) instead of string
 */
function formatBulan(value) {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    if (!isNaN(num) && num >= 1 && num <= 12) {
        return num.toString();
    }
    return String(value).trim();
}

/**
 * Format TAHUN value — SQL Server might return a number
 */
function formatTahun(value) {
    if (value === null || value === undefined || value === '') return '';
    return String(value).trim();
}

/**
 * Check SQL Server connection status
 * @returns {Promise<{connected: boolean, server?: string, database?: string, error?: string}>}
 */
export async function checkDbStatus() {
    try {
        const res = await fetchWithAuth(`${getApiBase()}/status`, {
            signal: AbortSignal.timeout(5000)
        });
        return await res.json();
    } catch (err) {
        return { connected: false, error: err.message };
    }
}

/**
 * Fetch master assets from SQL Server and build a lookup Map.
 * Output format is identical to parseMasterDatabase() from masterDbParser.js:
 *   Map<barcode, { namaAset, noPO, tipe, bulanPerolehan, tahunPerolehan, keterangan, kondisi, lokasi, pic }>
 * 
 * @returns {Promise<{lookup: Map, count: number, timestamp: string}>}
 */
export async function fetchMasterAssets() {
    const res = await fetchWithAuth(`${getApiBase()}/master-assets`);
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
    }
    const json = await res.json();

    // Build Map with exact same structure as parseMasterDatabase()
    const lookup = new Map();
    for (const row of json.data) {
        const barcode = String(row.BARCODE_ASSET || '').trim();
        if (!barcode) continue;

        lookup.set(barcode, {
            namaAset: String(row.NAMA_ASSET || '').trim(),
            noPO: String(row.NO_PO || '').trim(),
            tipe: String(row.KODE_TYPE_ASSET || '').trim(),
            bulanPerolehan: formatBulan(row.BULAN),
            tahunPerolehan: formatTahun(row.TAHUN),
            keterangan: String(row.KETERANGAN || '').trim(),
            kondisi: String(row.NAMA_KONDISI || '').trim(),
            lokasi: String(row.LOCATION_CODE || '').trim(),
            pic: String(row.PIC_RUANGAN || '').trim(),
        });
    }

    return { lookup, count: lookup.size, timestamp: json.timestamp };
}

/**
 * Fetch history assets from SQL Server and build a lookup Map.
 * Output format is identical to parseHistoryDatabase() from historyDbParser.js:
 *   Map<barcode, Array<{ ruangan, keterangan, kondisi, tanggal, ketOpname, site }>>
 * 
 * @returns {Promise<{historyMap: Map, count: number, timestamp: string}>}
 */
export async function fetchHistoryAssets() {
    const res = await fetchWithAuth(`${getApiBase()}/history-assets`);
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
    }
    const json = await res.json();

    // Build Map with exact same structure as parseHistoryDatabase()
    const historyMap = new Map();
    for (const row of json.data) {
        const barcode = String(row.BARCODE_ASSET || '').trim();
        if (!barcode) continue;

        const record = {
            ruangan: String(row.NAMA_RUANGAN || '').trim(),
            keterangan: String(row.KETERANGAN || '').trim(),
            kondisi: String(row.NAMA_KONDISI || '').trim(),
            tanggal: formatSqlDate(row.TRANS_DATE),
            ketOpname: String(row.KETERANGAN_OPNAME || '').trim(),
            site: String(row.SITE_ID || '').trim(),
        };

        if (!historyMap.has(barcode)) {
            historyMap.set(barcode, []);
        }
        historyMap.get(barcode).push(record);
    }

    return { historyMap, count: historyMap.size, timestamp: json.timestamp };
}
