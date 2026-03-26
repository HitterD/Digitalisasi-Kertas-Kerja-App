import * as XLSX from 'xlsx';

/**
 * Parse history database Excel file (gvReportAllDetail.xlsx format)
 * Builds a lookup map: barcode → array of history records
 * 
 * @param {ArrayBuffer} buffer
 * @returns {Map<string, Array<Object>>} barcode → array of history records
 */
export function parseHistoryDatabase(buffer) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const ws = workbook.Sheets[workbook.SheetNames[0]];

    // raw: false helps with formatted dates in Excel
    const rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });

    const historyMap = new Map();

    for (const row of rows) {
        const barcode = String(row['BARCODE'] || '').trim();
        if (!barcode) continue;

        const record = {
            ruangan: String(row['RUANGAN'] || '').trim(),
            keterangan: String(row['KETERANGAN'] || '').trim(),
            kondisi: String(row['KONDISI'] || '').trim(),
            tanggal: String(row['TRANS_DATE'] || '').trim(),
            ketOpname: String(row['KET OPNAME'] || '').trim(),
            site: String(row['SITE'] || '').trim()
        };

        if (!historyMap.has(barcode)) {
            historyMap.set(barcode, []);
        }
        historyMap.get(barcode).push(record);
    }

    return historyMap;
}

/**
 * Look up history data by barcode
 * @param {Map} historyMap
 * @param {string} barcode
 * @returns {Array<Object>}
 */
export function lookupBarcodeHistory(historyMap, barcode) {
    if (!historyMap || !barcode) return [];
    return historyMap.get(barcode.trim()) || [];
}
