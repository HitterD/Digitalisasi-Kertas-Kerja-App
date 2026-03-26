import * as XLSX from 'xlsx';

/**
 * Parse master database Excel file (ASPxGridView1.xlsx format)
 * Builds a lookup map: barcode → asset info
 * 
 * Database columns:
 *  A: INFO, B: BARCODE, C: NAMA ASSET, D: CN, E: LOKASI, F: PIC,
 *  G: BLN, H: THN, I: KONDISI, J: KAT, K: TIPE, L: KETERANGAN,
 *  M: KET OPNAME, N: TRX ID, O: NO PO, ...
 * 
 * @param {ArrayBuffer} buffer
 * @returns {Map<string, Object>} barcode → asset data
 */
export function parseMasterDatabase(buffer) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    const getCellValue = (row, col) => {
        const addr = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[addr];
        if (!cell) return '';
        return String(cell.v ?? '').trim();
    };

    const lookup = new Map();

    // Start from row 2 (skip header at row 1, 0-indexed: row 0)
    for (let r = 1; r <= range.e.r; r++) {
        const barcode = getCellValue(r, 1);  // B: BARCODE
        if (!barcode) continue;

        lookup.set(barcode, {
            namaAset: getCellValue(r, 2),       // C: NAMA ASSET
            noPO: getCellValue(r, 14),          // O: NO PO
            oracleId: getCellValue(r, 16),      // Q: ORACLE ID
            tipe: getCellValue(r, 10),          // K: TIPE
            bulanPerolehan: getCellValue(r, 6), // G: BLN
            tahunPerolehan: getCellValue(r, 7), // H: THN
            keterangan: getCellValue(r, 11),    // L: KETERANGAN
            kondisi: getCellValue(r, 8),        // I: KONDISI
            lokasi: getCellValue(r, 4),         // E: LOKASI
            pic: getCellValue(r, 5),            // F: PIC
        });
    }

    return lookup;
}

/**
 * Look up asset data by barcode
 * @param {Map} lookup
 * @param {string} barcode
 * @returns {Object|null}
 */
export function lookupBarcode(lookup, barcode) {
    if (!lookup || !barcode) return null;
    return lookup.get(barcode.trim()) || null;
}
