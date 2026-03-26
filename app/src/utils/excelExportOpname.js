/**
 * Excel Export for App 2 — Extract Hasil Opname & MAT
 * 
 * Uses 'exceljs' to load exact templates from the 'public' folder
 * to perfectly preserve all borders, colors, merged cells, and complex headers.
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// ── Helper: safe string value ──
const safeVal = (v) => v === null || v === undefined ? '' : String(v).trim();

// ── Load the template as ArrayBuffer ──
async function fetchTemplate(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load template ${url}`);
    return await res.arrayBuffer();
}

const isSalahRuangan = (row) => {
    const ro = safeVal(row.Ruangan_Opname);
    const rb = safeVal(row.Ruangan_Barcode || row.NAMA_RUANGAN); // notScanned falls back to NAMA_RUANGAN
    return rb && ro && rb !== ro;
};

const isCetakUlang = (row) => safeVal(row.Keterangan).toLowerCase().includes('cetak ulang');

/**
 * Build the Action string for Salah Ruangan items.
 * Format: Kordinasikan Dengan PIC Ruangan [PIC name] [ruangan asset management (kolom G)] untuk membuat MAT ke ruangan [ruangan opname (kolom F)]
 */
function buildSalahRuanganAction(item, oracleDataMap) {
    // Resolve PIC: prefer PIC_RUANGAN from DB, fallback to oracleDataMap pic
    let pic = safeVal(item.PIC_RUANGAN || item.pic);
    if (!pic && oracleDataMap) {
        const barcodeVal = item.Barcode || item.BARCODE_ASSET;
        const oData = oracleDataMap.get(barcodeVal);
        if (oData) pic = safeVal(oData.pic);
    }
    const ruanganAM = safeVal(item.Ruangan_Barcode || item.NAMA_RUANGAN);
    const ruanganOpname = safeVal(item.Ruangan_Opname);
    return `Kordinasikan Dengan PIC Ruangan ${pic} ${ruanganAM} untuk membuat MAT ke ruangan ${ruanganOpname}`;
}

/**
 * Parse the month name (Indonesian) from a periode string.
 * Expected format: SITE-MMYYYYxx-DEPT (e.g. 'SJA1-02202601-ICT')
 * Or new dynamic format (e.g. 'PERIODE OPNAME MARET 2026')
 * Returns e.g. 'FEBRUARI', 'MARET', etc. Falls back to empty string.
 */
function getOpnameBulan(periode) {
    const BULAN_ID = [
        '', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
        'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];
    if (!periode) return '';

    // Check if periode is already string like "PERIODE OPNAME MARET 2026"
    const upperPeriod = periode.toUpperCase();
    for (let i = 1; i < BULAN_ID.length; i++) {
        if (upperPeriod.includes(BULAN_ID[i])) {
            return BULAN_ID[i];
        }
    }

    // Format fallback: SITE-MMYYYYxx-DEPT  → second segment, first two chars = MM
    const parts = periode.split('-');
    if (parts.length >= 2) {
        const dateCode = parts[1]; // e.g. '02202601'
        const mm = parseInt(dateCode.substring(0, 2), 10);
        if (mm >= 1 && mm <= 12) return BULAN_ID[mm];
    }
    return '';
}

/**
 * Resolve effective Keterangan for a scanned item.
 * Priority: Keterangan from SQLite App 1 Map -> Keterangan from current opname JSON -> fallback to master/history KETERANGAN from DB.
 */
const resolveKeterangan = (item, app1DataMap) => {
    // If the asset is in App 1 SQLite DB, explicitly use its Keterangan
    if (app1DataMap) {
        const barcodeVal = String(item.Barcode || item.BARCODE_ASSET).trim().toUpperCase();
        if (app1DataMap.has(barcodeVal)) {
            const app1Asset = app1DataMap.get(barcodeVal);
            if (safeVal(app1Asset.keterangan)) return safeVal(app1Asset.keterangan);
        }
    }
    // Fallback to opname keterangan
    if (safeVal(item.Keterangan)) return safeVal(item.Keterangan);
    // Further fallback: last known keterangan from asset management
    if (safeVal(item.KETERANGAN_MASTER)) {
        return `PERIODE OPNAME: ${safeVal(item.KETERANGAN_MASTER)}`;
    }
    return '';
};

// Also resolve Kondisi from App 1 if exists, otherwise fallback
const resolveKondisi = (item, app1DataMap) => {
    if (app1DataMap) {
        const barcodeVal = String(item.Barcode || item.BARCODE_ASSET).trim().toUpperCase();
        if (app1DataMap.has(barcodeVal)) {
            const app1Asset = app1DataMap.get(barcodeVal);
            if (safeVal(app1Asset.kondisi)) return safeVal(app1Asset.kondisi);
        }
    }
    return safeVal(item.Kondisi || item.NAMA_KONDISI);
};

// Set cell formatting explicitly when cloning row
function applyRowStyle(row, maxCol, bgColor) {
    for (let c = 1; c <= maxCol; c++) {
        const cell = row.getCell(c);
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        cell.font = { name: 'Calibri', size: 12 };
        
        // Alignment: Center Columns E(5) and F(6), others middle wrap
        if (c === 5 || c === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
            cell.alignment = { vertical: 'middle', wrapText: true };
        }

        if (bgColor) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + bgColor }
            };
        }
        if (typeof cell.value === 'string') {
            cell.value = cell.value.toUpperCase();
        }
    }
}

// ── Color constants untuk highlighting baris Excel ──
const ROW_COLORS = {
    SALAH_RUANGAN: 'BBD5FE',   // Blue — aset salah ruangan
    CETAK_ULANG: 'E9D8FD',     // Purple — cetak ulang barcode
    TIDAK_TERSCAN: 'FFFF00',   // Yellow — data tidak terscan
    NO_BARCODE: 'FFD700',      // Gold — aset tanpa barcode
    RUSAK: 'FF6B6B',           // Red — aset rusak
};

// ── Helper functions for App 1 data ──
const getApp1NoBarcodeForRoom = (app1DataMap, roomName) => {
    if (!app1DataMap) return [];
    return Array.from(app1DataMap.values()).filter(item => 
        String(item.barcode).trim() === '(NO BARCODE)' && 
        item.roomName === roomName
    );
};

const getApp1RusakForRoom = (app1DataMap, roomName) => {
    if (!app1DataMap) return [];
    return Array.from(app1DataMap.values()).filter(item => 
        String(item.barcode).trim() !== '(NO BARCODE)' && 
        safeVal(item.kondisi).toLowerCase() === 'rusak' && 
        item.roomName === roomName
    );
};

const getApp1CetakUlangForRoom = (app1DataMap, roomName) => {
    if (!app1DataMap) return [];
    return Array.from(app1DataMap.values()).filter(item => 
        String(item.barcode).trim() !== '(NO BARCODE)' && 
        safeVal(item.kondisi).toLowerCase() === 'cetak ulang' && 
        item.roomName === roomName
    );
};

/**
 * Cari PIC pertama yang tersedia dari sekumpulan items.
 */
function getPicForRoom(items, oracleDataMap) {
    for (const item of items) {
        const barcodeVal = item.Barcode || item.BARCODE_ASSET;
        const pic = item.pic || item.PIC_RUANGAN || (oracleDataMap && oracleDataMap.has(barcodeVal) ? oracleDataMap.get(barcodeVal).pic : '');
        if (pic) return pic;
    }
    return '';
}

/**
 * Parse tanggal opname dari array scanned items.
 */
function parseTglOpname(scanned) {
    if (scanned.length > 0 && scanned[0].TRANS_DATE) {
        const dateObj = new Date(scanned[0].TRANS_DATE);
        if (!isNaN(dateObj)) {
            return dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    }
    return '';
}

/**
 * Hapus sisa dummy rows dari template Excel.
 */
function cleanupRows(ws, fromRow) {
    const maxRows = ws.rowCount;
    for (let r = fromRow; r <= maxRows; r++) {
        const row = ws.getRow(r);
        row.values = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.value = null;
            cell.style = {};
        });
        row.commit();
    }
}

/**
 * Isi cell-cell metadata pada sheet PERSIAPAN dan KERTAS KERJA OPNAME.
 */
function fillMetaSheets(wb, room, pic, periode) {
    const wsPersiapan = wb.getWorksheet('PERSIAPAN');
    if (wsPersiapan) {
        wsPersiapan.getCell('A2').value = `AREA ${room}`;
        wsPersiapan.getCell('A4').value = `PIC RUANGAN  ${pic}`;
        wsPersiapan.getCell('A3').value = `PERIODE (${periode})`;
    }

    const wsKerja = wb.getWorksheet('KERTAS KERJA OPNAME');
    if (wsKerja) {
        wsKerja.getCell('A2').value = `AREA ${room}`;
        wsKerja.getCell('G3').value = `PIC RUANGAN  ${pic}`;
        wsKerja.getCell('A3').value = `PERIODE (${periode})`;
    }
}

// ══════════════════════════════════════════════
// Helpers for Data Sorting and Formatting
// ══════════════════════════════════════════════
const sortAlphaNum = (aStr, bStr) => {
    const a = String(aStr || '');
    const b = String(bStr || '');
    if (a === b) return 0;
    if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
        if (a.length !== b.length) return a.length - b.length;
        return a < b ? -1 : 1;
    }
    return a.localeCompare(b, undefined, { numeric: true });
};
const sortScanned = (items) => [...items].sort((a, b) => sortAlphaNum(a.Barcode, b.Barcode));
const sortNotScanned = (items) => [...items].sort((a, b) => sortAlphaNum(a.BARCODE_ASSET, b.BARCODE_ASSET));

function adjustColumnWidths(ws, sheetType) {
    if (!ws) return;
    if (sheetType === 'temuan') {
        ws.getColumn(1).width = 5;
        ws.getColumn(1).alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getColumn(2).width = 18;
        ws.getColumn(2).alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getColumn(3).width = 35;
        ws.getColumn(9).width = 45; // Keterangan
        ws.getColumn(10).width = 25; // Target
        ws.getColumn(11).width = 45; // Action
        ws.getColumn(12).width = 25; // Verifikasi
    } else if (sheetType === 'recouncil') {
        ws.getColumn(1).width = 5;
        ws.getColumn(1).alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getColumn(2).width = 18;
        ws.getColumn(2).alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getColumn(3).width = 18;
        ws.getColumn(3).alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getColumn(4).width = 20;
        ws.getColumn(5).width = 40;
        ws.getColumn(6).width = 40;
        ws.getColumn(7).width = 40;
        ws.getColumn(8).width = 15;
        ws.getColumn(8).alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getColumn(9).width = 45; // Keterangan
        ws.getColumn(10).width = 40; // Action
    } else if (sheetType === 'mat') {
        ws.getColumn(1).width = 20;
        ws.getColumn(1).alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getColumn(3).width = 40;
        ws.getColumn(4).width = 40;
        ws.getColumn(5).width = 40;
        ws.getColumn(7).width = 40;
        ws.getColumn(8).width = 45;
    }
}

// ══════════════════════════════════════════════
// Main export function — generates ZIP with all files
// ══════════════════════════════════════════════
export async function generateAllExports({ periode, scannedByRoom, notScannedData, allRooms, oracleDataMap, app1DataMap }) {
    const zip = new JSZip();

    // Pre-load file buffers from public dir
    const opnameTemplateBuf = await fetchTemplate('/Template_Opname.xlsx');
    const matTemplateBuf = await fetchTemplate('/Template_MAT.xlsx');

    const allScanned = [];

    for (const room of allRooms) {
        const scanned = scannedByRoom[room] || [];
        const notScanned = notScannedData[room] || [];

        if (scanned.length === 0 && notScanned.length === 0) continue;

        allScanned.push(...scanned);

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(opnameTemplateBuf);

        const pic = getPicForRoom([...scanned, ...notScanned], oracleDataMap);
        const tglOpname = parseTglOpname(scanned);

        // 1. FORM TEMUAN HASIL OPNAME
        const wsTemuan = wb.getWorksheet('FORM TEMUAN HASIL OPNAME');
        if (wsTemuan) {
            adjustColumnWidths(wsTemuan, 'temuan');
            wsTemuan.getCell('A2').value = `AREA ${room}`;
            if (tglOpname) wsTemuan.getCell('A3').value = `TGL OPNAME ASET TETAP : ${tglOpname}`;

            // Filter AND SORT data: ONLY Salah Ruangan, Cetak Ulang
            let temuanItems = scanned.filter(item => isSalahRuangan(item) || isCetakUlang(item));
            temuanItems = sortScanned(temuanItems);

            const sortedNotScanned = sortNotScanned(notScanned);

            let rowIdx = 7;
            let no = 1;

            for (const item of temuanItems) {
                const isBlue = isSalahRuangan(item);
                const bgColor = isBlue ? ROW_COLORS.SALAH_RUANGAN : ROW_COLORS.CETAK_ULANG;
                let ket = resolveKeterangan(item, app1DataMap);
                if (isBlue && !ket) ket = 'Salah Ruangan';

                const actionStr = ''; // Dikosongkan sesuai request
                const targetStr = 'Maksimal konfirmasi ke EPop H+7 Hari Kerja'; // Sesuai request

                const row = wsTemuan.getRow(rowIdx);
                row.values = [
                    no++,
                    item.Barcode || '',
                    item.Nama_Asset || '',
                    (!isBlue && safeVal(item.Kondisi).toLowerCase() === 'cetak ulang') ? '✓' : '', // Kolom D (TIDAK BERLABEL / LABEL RUSAK)
                    '', isBlue ? '✓' : '', '', '',
                    ket,
                    targetStr,
                    actionStr,
                    '' // VERIFIKASI
                ];
                applyRowStyle(row, 12, bgColor);
                row.commit();
                rowIdx++;
            }

            // Yellow rows for DATA TIDAK TERSCAN
            for (const item of sortedNotScanned) {
                const actionStr = ''; // Dikosongkan sesuai request
                const targetStr = 'Maksimal konfirmasi ke EPop H+7 Hari Kerja'; // Sesuai request

                const row = wsTemuan.getRow(rowIdx);
                row.values = [
                    no++,
                    item.BARCODE_ASSET || '',
                    item.NAMA_ASSET || '',
                    '', '✓', '', '', '', // Kolom E (TIDAK DITEMUKAN) dicentang
                    'DATA TIDAK TERSCAN',
                    targetStr, actionStr, ''
                ];
                applyRowStyle(row, 12, ROW_COLORS.TIDAK_TERSCAN); // brighter yellow
                row.commit();
                rowIdx++;
            }

            // Asset Tanpa Barcode dari App1
            const app1NoBarcodeItems = getApp1NoBarcodeForRoom(app1DataMap, room);
            for (const item of app1NoBarcodeItems) {
                const isRusakItem = safeVal(item.kondisi).toLowerCase() === 'rusak';
                const isCetakItem = safeVal(item.kondisi).toLowerCase() === 'cetak ulang';
                
                let ketStr = item.keterangan || '';
                if (isCetakItem) ketStr = 'Cetak Ulang Barcode';

                const row = wsTemuan.getRow(rowIdx);
                row.values = [
                    no++,
                    item.barcode || '(NO BARCODE)',
                    item.namaAset || '',
                    '✓', // Kolom D: TIDAK BERLABEL/LABEL RUSAK
                    '', '', 
                    isRusakItem ? '✓' : '', // Kolom G: DITEMUKAN ASET RUSAK
                    '', 
                    ketStr,
                    'Maksimal konfirmasi ke EPop H+7 Hari Kerja', // Kolom J
                    '', // Kolom K: dikosongkan
                    '' // Kolom L
                ];
                applyRowStyle(row, 12, ROW_COLORS.NO_BARCODE); // Gold
                row.commit();
                rowIdx++;
            }

            // Asset Rusak dari App1
            const app1RusakItems = getApp1RusakForRoom(app1DataMap, room);
            for (const item of app1RusakItems) {
                const row = wsTemuan.getRow(rowIdx);
                row.values = [
                    no++,
                    item.barcode || '',
                    item.namaAset || '',
                    '', // Kolom D
                    '', '', 
                    '✓', // Kolom G: DITEMUKAN ASET RUSAK
                    '', 
                    item.keterangan || 'Rusak',
                    'Maksimal konfirmasi ke EPop H+7 Hari Kerja', // Kolom J
                    '', // Kolom K: dikosongkan
                    '' // Kolom L
                ];
                applyRowStyle(row, 12, ROW_COLORS.RUSAK); // Red
                row.commit();
                rowIdx++;
            }

            // Asset Cetak Ulang dari App1 (yang tidak ada di scanned items temuanItems di atas)
            // Filter out items that are already in temuanItems to avoid duplicates
            const temuanBarcodes = new Set(temuanItems.map(t => String(t.Barcode).trim().toUpperCase()));
            const app1CetakItems = getApp1CetakUlangForRoom(app1DataMap, room)
                                    .filter(item => !temuanBarcodes.has(String(item.barcode).trim().toUpperCase()));
            
            for (const item of app1CetakItems) {
                const row = wsTemuan.getRow(rowIdx);
                row.values = [
                    no++,
                    item.barcode || '',
                    item.namaAset || '',
                    '✓', // Kolom D: TIDAK BERLABEL/LABEL RUSAK
                    '', '', '', '', 
                    'Cetak Ulang Barcode',
                    'Maksimal konfirmasi ke EPop H+7 Hari Kerja', // Kolom J
                    '', // Kolom K: dikosongkan
                    '' // Kolom L
                ];
                applyRowStyle(row, 12, ROW_COLORS.CETAK_ULANG); // Purple
                row.commit();
                rowIdx++;
            }

            // Aggressive cleanup for remaining dummy rows
            cleanupRows(wsTemuan, rowIdx);
        }

        // 2. Recouncil
        const wsRec = wb.getWorksheet('Recouncil');
        if (wsRec) {
            adjustColumnWidths(wsRec, 'recouncil');
            const opnameBulan = getOpnameBulan(periode);
            wsRec.getCell('A1').value = opnameBulan ? `OPNAME ${opnameBulan}` : 'OPNAME';
            wsRec.getCell('A2').value = `RUANGAN : ${room}`;
            wsRec.getCell('A3').value = `PIC : ${pic}`;
            wsRec.getCell('A4').value = `PERIODE : ${periode}`;

            let rowIdx = 8;
            let no = 1;

            const sortedScanned = sortScanned(scanned);
            const sortedNotScanned = sortNotScanned(notScanned);

            for (const item of sortedScanned) {
                let bgColor = null;
                if (isSalahRuangan(item)) bgColor = ROW_COLORS.SALAH_RUANGAN;
                else if (isCetakUlang(item)) bgColor = ROW_COLORS.CETAK_ULANG;

                const oData = oracleDataMap ? oracleDataMap.get(item.Barcode) : null;

                const row = wsRec.getRow(rowIdx);
                row.values = [
                    no++,
                    oData?.oracleId || '',
                    item.Barcode || '',
                    oData?.noPO || '',
                    item.Nama_Asset || '',
                    item.Ruangan_Opname || '',
                    item.Ruangan_Barcode || '',
                    resolveKondisi(item, app1DataMap),
                    resolveKeterangan(item, app1DataMap),
                    isSalahRuangan(item) ? buildSalahRuanganAction(item, oracleDataMap) : (item.ACTION || '')
                ];
                applyRowStyle(row, 17, bgColor);
                row.commit();
                rowIdx++;
            }

            if (sortedNotScanned.length > 0) {
                for (const item of sortedNotScanned) {
                    const oData = oracleDataMap ? oracleDataMap.get(item.BARCODE_ASSET) : null;
                    const row = wsRec.getRow(rowIdx);
                    row.values = [
                        no++,
                        oData?.oracleId || '',
                        item.BARCODE_ASSET || '',
                        oData?.noPO || item.NO_PO || '',
                        item.NAMA_ASSET || '',
                        item.NAMA_RUANGAN || '',
                        item.NAMA_RUANGAN || '',
                        item.NAMA_KONDISI || '',
                        'ASSET TIDAK DITEMUKAN, TOLONG SEGERA MENCARI DAN BERKOORDINASI DENGAN BAT',
                        safeVal(item.KETERANGAN_MASTER) || ''
                    ];
                    applyRowStyle(row, 17, ROW_COLORS.TIDAK_TERSCAN);
                    row.commit();
                    rowIdx++;
                }
            }

            // Aggressive cleanup for remaining dummy rows
            cleanupRows(wsRec, rowIdx);
        }

        // Fix other templated sheets
        fillMetaSheets(wb, room, pic, periode);

        const xlsxBuf = await wb.xlsx.writeBuffer();
        zip.file(`${room}.XLSX`, xlsxBuf);
    }

    // ══════════════════════════════════════════════
    // HASIL_MAT.xlsx
    // ══════════════════════════════════════════════
    const matItems = [];
    for (const item of allScanned) {
        if (isSalahRuangan(item)) {
            const barcodeVal = item.Barcode || item.BARCODE_ASSET;
            item._picResolved = item.pic || item.PIC_RUANGAN || (oracleDataMap && oracleDataMap.has(barcodeVal) ? oracleDataMap.get(barcodeVal).pic : '');
            matItems.push(item);
        }
    }

    if (matItems.length > 0) {
        const matWb = new ExcelJS.Workbook();
        await matWb.xlsx.load(matTemplateBuf);
        const wsMat = matWb.getWorksheet(1); // the first sheet
        adjustColumnWidths(wsMat, 'mat');

        const PIC_COLORS = ['FFB6C1', 'FFDEAD', 'E0FFFF', 'D8BFD8', 'F5DEB3', 'ADD8E6', '90EE90', 'FAFAD2', 'FFC0CB', '87CEFA'];
        const picColorMap = new Map();
        let colorIdx = 0;

        let rowIdx = 3; // Typically headers are on 1 & 2

        for (const item of matItems) {
            const pic = item._picResolved || '';
            if (!picColorMap.has(pic)) {
                picColorMap.set(pic, PIC_COLORS[colorIdx % PIC_COLORS.length]);
                colorIdx++;
            }
            const bgColor = picColorMap.get(pic);

            const row = wsMat.getRow(rowIdx);
            row.values = [
                item.Barcode || '',
                pic,
                item.Nama_Asset || '',
                item.Ruangan_Barcode || '',
                item.Ruangan_Opname || '',
                item.Kondisi || 'BAIK',
                'Salah Ruangan',
                buildSalahRuanganAction(item, oracleDataMap)
            ];
            applyRowStyle(row, 8, bgColor);
            row.commit();
            rowIdx++;
        }

        // Aggressive cleanup for remaining dummy rows
        cleanupRows(wsMat, rowIdx);

        const matBuf = await matWb.xlsx.writeBuffer();
        zip.file('HASIL_MAT.xlsx', matBuf);
    }

    // Download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `Recouncil_${periode}.zip`);
}

// ══════════════════════════════════════════════
// Preview Data function — outputs JSON for web preview popup
// ══════════════════════════════════════════════
export function buildPreviewData({ room, scanned = [], notScanned = [], oracleDataMap, app1DataMap }) {
    const sortedScanned = sortScanned(scanned);
    const sortedNotScanned = sortNotScanned(notScanned);

    const pic = getPicForRoom([...scanned, ...notScanned], oracleDataMap);
    const tglOpname = parseTglOpname(scanned);

    const preview = {
        room,
        pic,
        tglOpname,
        sheets: {
            temuan: [],
            recouncil: [],
            mat: []
        }
    };

    // 1. FORM TEMUAN HASIL OPNAME
    const temuanItems = sortedScanned.filter(item => isSalahRuangan(item) || isCetakUlang(item));
    let noTemuan = 1;
    for (const item of temuanItems) {
        const isBlue = isSalahRuangan(item);
        const bgColor = isBlue ? '#' + ROW_COLORS.SALAH_RUANGAN : '#' + ROW_COLORS.CETAK_ULANG;
        let ket = resolveKeterangan(item, app1DataMap);
        if (isBlue && !ket) ket = 'Salah Ruangan';

        preview.sheets.temuan.push({
            no: noTemuan++,
            barcode: item.Barcode || '',
            namaAsset: item.Nama_Asset || '',
            ketidaksesuaian: (!isBlue && safeVal(item.Kondisi).toLowerCase() === 'cetak ulang') ? '✓ Kolom D (TIDAK BERLABEL / LABEL RUSAK)' : (item.KETIDAKSESUAIAN || ''),
            keterangan: ket,
            target: 'Maksimal konfirmasi ke EPop H+7 Hari Kerja',
            action: '', // Dikosongkan sesuai request
            bgColor
        });
    }

    for (const item of sortedNotScanned) {
        preview.sheets.temuan.push({
            no: noTemuan++,
            barcode: item.BARCODE_ASSET || '',
            namaAsset: item.NAMA_ASSET || '',
            ketidaksesuaian: '✓ Kolom E',
            keterangan: 'DATA TIDAK TERSCAN',
            target: 'Maksimal konfirmasi ke EPop H+7 Hari Kerja',
            action: '', // Dikosongkan
            bgColor: '#' + ROW_COLORS.TIDAK_TERSCAN
        });
    }

    // Asset Tanpa Barcode dari App1
    const app1NoBarcodeItems = getApp1NoBarcodeForRoom(app1DataMap, room);
    for (const item of app1NoBarcodeItems) {
        let ketStr = item.keterangan || '';
        if (safeVal(item.kondisi).toLowerCase() === 'cetak ulang') ketStr = 'Cetak Ulang Barcode';
        const isRusakItem = safeVal(item.kondisi).toLowerCase() === 'rusak';

        preview.sheets.temuan.push({
            no: noTemuan++,
            barcode: item.barcode || '(NO BARCODE)',
            namaAsset: item.namaAset || '',
            ketidaksesuaian: '✓ Kolom D' + (isRusakItem ? ', ✓ Kolom G' : ''),
            keterangan: ketStr,
            target: 'Maksimal konfirmasi ke EPop H+7 Hari Kerja',
            action: '',
            bgColor: '#' + ROW_COLORS.NO_BARCODE
        });
    }

    // Asset Rusak dari App1
    const app1RusakItems = getApp1RusakForRoom(app1DataMap, room);
    for (const item of app1RusakItems) {
        preview.sheets.temuan.push({
            no: noTemuan++,
            barcode: item.barcode || '',
            namaAsset: item.namaAset || '',
            ketidaksesuaian: '✓ Kolom G',
            keterangan: item.keterangan || 'Rusak',
            target: 'Maksimal konfirmasi ke EPop H+7 Hari Kerja',
            action: '',
            bgColor: '#' + ROW_COLORS.RUSAK
        });
    }

    // Asset Cetak Ulang dari App1 (yang tidak ada di scanned items temuanItems di atas)
    const temuanBarcodesPreview = new Set(temuanItems.map(t => String(t.Barcode).trim().toUpperCase()));
    const app1CetakItems = getApp1CetakUlangForRoom(app1DataMap, room)
                            .filter(item => !temuanBarcodesPreview.has(String(item.barcode).trim().toUpperCase()));
    
    for (const item of app1CetakItems) {
        preview.sheets.temuan.push({
            no: noTemuan++,
            barcode: item.barcode || '',
            namaAsset: item.namaAset || '',
            ketidaksesuaian: '✓ Kolom D',
            keterangan: 'Cetak Ulang Barcode',
            target: 'Maksimal konfirmasi ke EPop H+7 Hari Kerja',
            action: '',
            bgColor: '#' + ROW_COLORS.CETAK_ULANG
        });
    }

    // 2. RECOUNCIL
    let noRec = 1;
    for (const item of sortedScanned) {
        let bgColor = null;
        if (isSalahRuangan(item)) bgColor = '#' + ROW_COLORS.SALAH_RUANGAN;
        else if (isCetakUlang(item)) bgColor = '#' + ROW_COLORS.CETAK_ULANG;

        const oData = oracleDataMap ? oracleDataMap.get(item.Barcode) : null;
        preview.sheets.recouncil.push({
            no: noRec++,
            oracleId: oData?.oracleId || '',
            barcode: item.Barcode || '',
            noPo: oData?.noPO || '',
            namaAsset: item.Nama_Asset || '',
            ruanganOpname: item.Ruangan_Opname || '',
            ruanganMaster: item.Ruangan_Barcode || '',
            kondisi: resolveKondisi(item, app1DataMap),
            keterangan: resolveKeterangan(item, app1DataMap),
            action: isSalahRuangan(item) ? buildSalahRuanganAction(item, oracleDataMap) : (item.ACTION || ''),
            bgColor
        });
    }

    for (const item of sortedNotScanned) {
        const oData = oracleDataMap ? oracleDataMap.get(item.BARCODE_ASSET) : null;
        preview.sheets.recouncil.push({
            no: noRec++,
            oracleId: oData?.oracleId || '',
            barcode: item.BARCODE_ASSET || '',
            noPo: oData?.noPO || item.NO_PO || '',
            namaAsset: item.NAMA_ASSET || '',
            ruanganOpname: item.NAMA_RUANGAN || '',
            ruanganMaster: item.NAMA_RUANGAN || '',
            kondisi: item.NAMA_KONDISI || '',
            keterangan: 'ASSET TIDAK DITEMUKAN, TOLONG SEGERA MENCARI DAN BERKOORDINASI DENGAN BAT',
            action: safeVal(item.KETERANGAN_MASTER),
            bgColor: '#FFFF00'
        });
    }

    // 3. MAT
    const matItems = sortedScanned.filter(item => isSalahRuangan(item));
    let noMat = 1;
    for (const item of matItems) {
        preview.sheets.mat.push({
            no: noMat++,
            barcode: item.Barcode || '',
            pic: pic,
            namaAsset: item.Nama_Asset || '',
            ruanganMaster: item.Ruangan_Barcode || '',
            ruanganOpname: item.Ruangan_Opname || '',
            kondisi: item.Kondisi || 'BAIK',
            keterangan: 'Salah Ruangan',
            saran: buildSalahRuanganAction(item, oracleDataMap),
            bgColor: '#D8BFD8' // default placeholder for web preview MAT
        });
    }

    return preview;
}

// ══════════════════════════════════════════════
// Preview Export function — generates ONE file for ONE room
// ══════════════════════════════════════════════
export async function generateSingleExport({ periode, room, scanned, notScanned, oracleDataMap, app1DataMap }) {
    if (!scanned.length && !notScanned.length) return;

    // Pre-load file buffers from public dir
    const opnameTemplateBuf = await fetchTemplate('/Template_Opname.xlsx');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(opnameTemplateBuf);

    const pic = getPicForRoom([...scanned, ...notScanned], oracleDataMap);
    const tglOpname = parseTglOpname(scanned);

    // 1. FORM TEMUAN HASIL OPNAME
    const wsTemuan = wb.getWorksheet('FORM TEMUAN HASIL OPNAME');
    if (wsTemuan) {
        adjustColumnWidths(wsTemuan, 'temuan');
        wsTemuan.getCell('A2').value = `AREA ${room}`;
        if (tglOpname) wsTemuan.getCell('A3').value = `TGL OPNAME ASET TETAP : ${tglOpname}`;

        // Filter data: ONLY Salah Ruangan, Cetak Ulang
        let temuanItems = scanned.filter(item => isSalahRuangan(item) || isCetakUlang(item));
        temuanItems = sortScanned(temuanItems);
        const sortedNotScanned = sortNotScanned(notScanned);

        let rowIdx = 7;
        let no = 1;

        for (const item of temuanItems) {
            const isBlue = isSalahRuangan(item);
            const bgColor = isBlue ? ROW_COLORS.SALAH_RUANGAN : ROW_COLORS.CETAK_ULANG;
            let ket = resolveKeterangan(item, app1DataMap);
            if (isBlue && !ket) ket = 'Salah Ruangan';

            const actionStr = ''; // Dikosongkan sesuai request
            const targetStr = 'Maksimal konfirmasi ke EPop H+7 Hari Kerja'; // Sesuai request

            const row = wsTemuan.getRow(rowIdx);
            row.values = [
                no++,
                item.Barcode || '',
                item.Nama_Asset || '',
                (!isBlue && safeVal(item.Kondisi).toLowerCase() === 'cetak ulang') ? '✓' : '', // Kolom D (TIDAK BERLABEL / LABEL RUSAK)
                '', isBlue ? '✓' : '', '', '',
                ket,
                targetStr,
                actionStr,
                '' // VERIFIKASI
            ];
            applyRowStyle(row, 12, bgColor);
            row.commit();
            rowIdx++;
        }

        // Yellow rows for DATA TIDAK TERSCAN
        for (const item of sortedNotScanned) {
            const actionStr = ''; // Dikosongkan sesuai request
            const targetStr = 'Maksimal konfirmasi ke EPop H+7 Hari Kerja'; // Sesuai request

            const row = wsTemuan.getRow(rowIdx);
            row.values = [
                no++,
                item.BARCODE_ASSET || '',
                item.NAMA_ASSET || '',
                '', '✓', '', '', '', // Kolom E (TIDAK DITEMUKAN)
                'DATA TIDAK TERSCAN',
                targetStr, actionStr, ''
            ];
            applyRowStyle(row, 12, ROW_COLORS.TIDAK_TERSCAN); // brighter yellow
            row.commit();
            rowIdx++;
        }

        // Asset Tanpa Barcode dari App1
        const app1NoBarcodeItems = getApp1NoBarcodeForRoom(app1DataMap, room);
        for (const item of app1NoBarcodeItems) {
            const isRusakItem = safeVal(item.kondisi).toLowerCase() === 'rusak';
            const isCetakItem = safeVal(item.kondisi).toLowerCase() === 'cetak ulang';
            
            let ketStr = item.keterangan || '';
            if (isCetakItem) ketStr = 'Cetak Ulang Barcode';

            const row = wsTemuan.getRow(rowIdx);
            row.values = [
                no++,
                item.barcode || '(NO BARCODE)',
                item.namaAset || '',
                '✓', // Kolom D: TIDAK BERLABEL/LABEL RUSAK
                '', '', 
                isRusakItem ? '✓' : '', // Kolom G: DITEMUKAN ASET RUSAK
                '', 
                ketStr,
                'Maksimal konfirmasi ke EPop H+7 Hari Kerja', // Kolom J
                '', // Kolom K: dikosongkan
                '' // Kolom L
            ];
            applyRowStyle(row, 12, ROW_COLORS.NO_BARCODE); // Gold
            row.commit();
            rowIdx++;
        }

        // Asset Rusak dari App1
        const app1RusakItems = getApp1RusakForRoom(app1DataMap, room);
        for (const item of app1RusakItems) {
            const row = wsTemuan.getRow(rowIdx);
            row.values = [
                no++,
                item.barcode || '',
                item.namaAset || '',
                '', // Kolom D
                '', '', 
                '✓', // Kolom G: DITEMUKAN ASET RUSAK
                '', 
                item.keterangan || 'Rusak',
                'Maksimal konfirmasi ke EPop H+7 Hari Kerja', // Kolom J
                '', // Kolom K: dikosongkan
                '' // Kolom L
            ];
            applyRowStyle(row, 12, ROW_COLORS.RUSAK); // Red
            row.commit();
            rowIdx++;
        }

        // Asset Cetak Ulang dari App1 (yang tidak ada di scanned items temuanItems di atas)
        const temuanBarcodes = new Set(temuanItems.map(t => String(t.Barcode).trim().toUpperCase()));
        const app1CetakItems = getApp1CetakUlangForRoom(app1DataMap, room)
                                .filter(item => !temuanBarcodes.has(String(item.barcode).trim().toUpperCase()));
        
        for (const item of app1CetakItems) {
            const row = wsTemuan.getRow(rowIdx);
            row.values = [
                no++,
                item.barcode || '',
                item.namaAset || '',
                '✓', // Kolom D: TIDAK BERLABEL/LABEL RUSAK
                '', '', '', '', 
                'Cetak Ulang Barcode',
                'Maksimal konfirmasi ke EPop H+7 Hari Kerja', // Kolom J
                '', // Kolom K: dikosongkan
                '' // Kolom L
            ];
            applyRowStyle(row, 12, ROW_COLORS.CETAK_ULANG); // Purple
            row.commit();
            rowIdx++;
        }

        // Aggressive cleanup for remaining dummy rows
        cleanupRows(wsTemuan, rowIdx);
    }

    // 2. Recouncil
    const wsRec = wb.getWorksheet('Recouncil');
    if (wsRec) {
        adjustColumnWidths(wsRec, 'recouncil');
        const opnameBulan = getOpnameBulan(periode);
        wsRec.getCell('A1').value = opnameBulan ? `OPNAME ${opnameBulan}` : 'OPNAME';
        wsRec.getCell('A2').value = `RUANGAN : ${room}`;
        wsRec.getCell('A3').value = `PIC : ${pic}`;
        wsRec.getCell('A4').value = `PERIODE : ${periode}`;

        let rowIdx = 8;
        let no = 1;

        const sortedScanned = sortScanned(scanned);
        const sortedNotScanned = sortNotScanned(notScanned);

        for (const item of sortedScanned) {
            let bgColor = null;
            if (isSalahRuangan(item)) bgColor = ROW_COLORS.SALAH_RUANGAN;
            else if (isCetakUlang(item)) bgColor = ROW_COLORS.CETAK_ULANG;

            const oData = oracleDataMap ? oracleDataMap.get(item.Barcode) : null;

            const row = wsRec.getRow(rowIdx);
            row.values = [
                no++, oData?.oracleId || '', // NO, Oracle Asset
                item.Barcode || '', oData?.noPO || '', // Barcode, No PO
                item.Nama_Asset || '',
                item.Ruangan_Opname || '',
                item.Ruangan_Barcode || '',
                resolveKondisi(item, app1DataMap),
                resolveKeterangan(item, app1DataMap),
                isSalahRuangan(item) ? buildSalahRuanganAction(item, oracleDataMap) : (item.ACTION || ''),
                '', '', '', '', '', '', '' // Col K-Q
            ];
            applyRowStyle(row, 17, bgColor);
            row.commit();
            rowIdx++;
        }

        if (sortedNotScanned.length > 0) {
            for (const item of sortedNotScanned) {
                const oData = oracleDataMap ? oracleDataMap.get(item.BARCODE_ASSET) : null;
                const row = wsRec.getRow(rowIdx);
                row.values = [
                    no++, oData?.oracleId || '',
                    item.BARCODE_ASSET || '', oData?.noPO || item.NO_PO || '',
                    item.NAMA_ASSET || '',
                    item.NAMA_RUANGAN || '', item.NAMA_RUANGAN || '',
                    item.NAMA_KONDISI || '',
                    'ASSET TIDAK DITEMUKAN, TOLONG SEGERA MENCARI DAN BERKOORDINASI DENGAN BAT', 
                    safeVal(item.KETERANGAN_MASTER),
                    '', '', '', '', '', '', ''
                ];
                applyRowStyle(row, 17, ROW_COLORS.TIDAK_TERSCAN);
                row.commit();
                rowIdx++;
            }
        }

        // Aggressive cleanup for remaining dummy rows
        cleanupRows(wsRec, rowIdx);
    }

    // Fix other templated sheets
    fillMetaSheets(wb, room, pic, periode);

    const xlsxBuf = await wb.xlsx.writeBuffer();
    const blob = new Blob([xlsxBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${room}.XLSX`);
}
