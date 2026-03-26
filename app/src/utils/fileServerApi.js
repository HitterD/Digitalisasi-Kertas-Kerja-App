/**
 * File Server API client — browses and downloads kertas kerja files
 * from the network share via the Vite backend middleware.
 *
 * Endpoints served by viteFileBrowserPlugin() in vite.config.js.
 */

import { apiUrl, fetchWithAuth } from './apiConfig';

function getFilesBase() {
    return apiUrl('/api/files');
}

/**
 * Fetch list of main folders from the network share.
 *
 * @returns {Promise<{ folders: Array<string> }>}
 */
export async function fetchFolders() {
    const res = await fetchWithAuth(`${getFilesBase()}/folders`, {
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

/**
 * Fetch list of period folders from a specific division folder.
 * Only returns folders that have a "Lembar Kerja Opname" subfolder.
 *
 * @param {string} folder - Division/Area folder name
 * @returns {Promise<{ periods: Array<{ name: string, modifiedDate: string, hasWorkbook: boolean }> }>}
 */
export async function fetchPeriods(folder) {
    const res = await fetchWithAuth(`${getFilesBase()}/periods/${encodeURIComponent(folder)}`, {
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

/**
 * Fetch list of Excel files in a period's "Lembar Kerja Opname" folder.
 *
 * @param {string} folder - Division/Area folder name
 * @param {string} period - Period folder name (e.g. "SJA1-01202601-ICT")
 * @returns {Promise<{ files: Array<{ name: string, size: number, modifiedDate: string }> }>}
 */
export async function fetchWorkbooks(folder, period) {
    const res = await fetchWithAuth(`${getFilesBase()}/workbooks/${encodeURIComponent(folder)}/${encodeURIComponent(period)}`, {
        signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

/**
 * Download an Excel file from the network share as ArrayBuffer.
 *
 * @param {string} folder - Division/Area folder name
 * @param {string} period - Period folder name
 * @param {string} filename - Excel file name
 * @returns {Promise<{ buffer: ArrayBuffer, filename: string }>}
 */
export async function downloadWorkbook(folder, period, filename) {
    const res = await fetchWithAuth(
        `${getFilesBase()}/download/${encodeURIComponent(folder)}/${encodeURIComponent(period)}/${encodeURIComponent(filename)}`,
        {
            signal: AbortSignal.timeout(30000)
        }
    );
    if (!res.ok) {
        // Try to parse error JSON
        const text = await res.text();
        let errMsg;
        try {
            errMsg = JSON.parse(text).error;
        } catch {
            errMsg = `HTTP ${res.status}`;
        }
        throw new Error(errMsg);
    }
    const buffer = await res.arrayBuffer();
    return { buffer, filename };
}
