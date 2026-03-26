import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

function cleanString(val) {
    if (val === null || val === undefined) return "";
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'object' && val.text) return String(val.text).trim(); // Handle rich text
    if (val instanceof Date) return val.getFullYear().toString();
    return String(val).trim().replace(/\.0$/, '');
}

function normalizeForComparison(val) {
    if (!val) return "";
    return String(val).toUpperCase().replace(/\s+/g, '').trim();
}

// Ekstrak kode ruangan pertama (numerik/alfanumerik sebelum spasi/strip pertama)
function extractRoomCode(val) {
    const s = normalizeForComparison(val);
    const match = s.match(/^([A-Z0-9]+)/);
    return match ? match[1] : s;
}

// Hitung similarity karakter (bigram-based)
function stringSimilarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const longer = a.length >= b.length ? a : b;
    const shorter = a.length >= b.length ? b : a;
    const getBigrams = str => {
        const bigrams = new Set();
        for (let i = 0; i < str.length - 1; i++) bigrams.add(str.slice(i, i + 2));
        return bigrams;
    };
    const bigramsA = getBigrams(longer);
    const bigramsB = getBigrams(shorter);
    let intersection = 0;
    for (const bg of bigramsB) { if (bigramsA.has(bg)) intersection++; }
    return (2.0 * intersection) / (bigramsA.size + bigramsB.size);
}

function extractCleanRoomName(val) {
    const norm = normalizeForComparison(val);
    return norm.replace(/-\d{7,}.*$/, '').trim();
}

function isSameRoom(opname, master) {
    const normOpname = normalizeForComparison(opname);
    const normMaster = normalizeForComparison(master);
    if (!normOpname || !normMaster) return false;
    if (normOpname === normMaster) return true;
    const codeOpname = extractRoomCode(opname);
    const codeMaster = extractRoomCode(master);
    if (codeOpname !== codeMaster) return false;
    const cleanOpname = extractCleanRoomName(opname);
    const cleanMaster = extractCleanRoomName(master);
    if (cleanOpname === cleanMaster) return true;
    if (cleanMaster.includes(cleanOpname) || cleanOpname.includes(cleanMaster)) return true;
    const minLen = Math.min(cleanOpname.length, cleanMaster.length);
    if (minLen <= 22) return false;
    const sim = stringSimilarity(cleanOpname, cleanMaster);
    return sim >= 0.68;
}

/**
 * Cek apakah nilai Oracle adalah "non-numerik" (mengandung huruf = dianggap NO PO).
 * Contoh: P131037, U123, ABC → true
 *         131037, 1800001812 → false (pure numeric = Oracle ID murni)
 */
function isNonNumericOracleCode(val) {
    if (!val || val === '-' || val === 'nan' || val === 'None' || val === '') return false;
    return !/^\d+$/.test(val.trim());
}

function isEmptyVal(val) {
    if (!val) return true;
    const s = String(val).trim();
    return s === '' || s === '-' || s === 'nan' || s === 'None' || s === 'null';
}

/**
 * Load ASPxGridView1 file dan buat lookup dict by BARCODE.
 * Returns: { barcode: { oracleId, noPo, bln, thn } }
 */
async function loadAspxDict(aspxPath) {
    if (!aspxPath || !fs.existsSync(aspxPath)) return {};

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(aspxPath);
    const ws = wb.worksheets[0];
    if (!ws) return {};

    // Baca header row pertama
    const headers = {};
    const row1 = ws.getRow(1);
    row1.eachCell((cell, colNum) => {
        const h = cleanString(cell.value).toUpperCase().trim();
        headers[h] = colNum;
    });

    const colBarcode = headers['BARCODE'];
    const colOracleId = headers['ORACLE ID'];
    const colNoPo = headers['NO PO'];
    const colBln = headers['BLN'];
    const colThn = headers['THN'];

    if (!colBarcode) {
        console.error('[ASPx] Kolom BARCODE tidak ditemukan di ASPxGridView1');
        return {};
    }

    const aspxDict = {};
    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const barcode = cleanString(row.getCell(colBarcode).value);
        if (!barcode || isEmptyVal(barcode)) return;

        const oracleIdRaw = colOracleId ? cleanString(row.getCell(colOracleId).value) : '';
        const noPoRaw = colNoPo ? cleanString(row.getCell(colNoPo).value) : '';
        const blnRaw = colBln ? cleanString(row.getCell(colBln).value) : '';
        const thnRaw = colThn ? cleanString(row.getCell(colThn).value) : '';

        // Normalisasi NULL/kosong
        const oracleId = (oracleIdRaw && oracleIdRaw.toUpperCase() !== 'NULL' && !isEmptyVal(oracleIdRaw)) ? oracleIdRaw : '';
        const noPo = (noPoRaw && noPoRaw.toUpperCase() !== 'NULL' && !isEmptyVal(noPoRaw)) ? noPoRaw : '';
        const bln = (blnRaw && blnRaw.toUpperCase() !== 'NULL' && !isEmptyVal(blnRaw)) ? blnRaw : '';
        const thn = (thnRaw && thnRaw.toUpperCase() !== 'NULL' && !isEmptyVal(thnRaw)) ? thnRaw : '';

        aspxDict[barcode] = { oracleId, noPo, bln, thn };
    });

    console.log(`[ASPx] Loaded ${Object.keys(aspxDict).length} records from ASPxGridView1`);
    return aspxDict;
}

/**
 * Kolom L — Tentukan nilai ASSET ORACLE terbaik.
 *
 * 1. Jika masterOracleVal murni numerik → gunakan apa adanya
 * 2. Jika masterOracleVal mengandung huruf (NO PO / non-numerik):
 *    - Cari ORACLE ID di ASPxDict by barcode
 *    - Jika ada → gunakan Oracle ID dari ASPx
 *    - Jika tidak → gunakan nilai App3 (NO PO boleh ditampilkan)
 * 3. Jika masterOracleVal kosong:
 *    - Cari ORACLE ID dari ASPx
 *    - Jika tidak ada → "-"
 */
function resolveAssetOracle(masterOracleVal, barcode, aspxDict) {
    const aspxEntry = aspxDict[barcode];

    if (isEmptyVal(masterOracleVal)) {
        // App3 kosong → cari dari ASPx
        if (aspxEntry && aspxEntry.oracleId) {
            return aspxEntry.oracleId;
        }
        return '-';
    }

    if (isNonNumericOracleCode(masterOracleVal)) {
        // Non-numeric = NO PO → cari Oracle ID di ASPx
        if (aspxEntry && aspxEntry.oracleId) {
            return aspxEntry.oracleId;
        }
        // Tidak ada di ASPx → tampilkan NO PO dari App3
        return masterOracleVal;
    }

    // Pure numeric → gunakan apa adanya
    return masterOracleVal;
}

/**
 * Kolom P — Tentukan nilai TAHUN Perolehan.
 *
 * - Jika dari App3 ada → gunakan
 * - Jika kosong → cari di ASPxGridView1 (BLN/THN)
 * - Jika keduanya kosong → "-"
 */
function resolveTahunPerolehan(masterTahunVal, barcode, aspxDict) {
    if (!isEmptyVal(masterTahunVal) && masterTahunVal !== '-') {
        return masterTahunVal;
    }

    const aspxEntry = aspxDict[barcode];
    if (aspxEntry) {
        const { bln, thn } = aspxEntry;
        if (thn && bln) {
            const m = String(bln).padStart(2, '0');
            return `${m}/${thn}`;
        } else if (thn) {
            return thn;
        } else if (bln) {
            return bln;
        }
    }

    return '-';
}

/**
 * Kolom O — Tentukan nilai KONDISI MASTER.
 *
 * - Jika dari App3 ada datanya → gunakan
 * - Jika kosong (App3 tidak punya kondisi):
 *   - Item sudah teropname (berarti sudah dicek di lokasi)
 *   - Cek kolom keterangan/catatan opname (kolom I):
 *     - Jika kosong / tidak ada catatan → otomatis isi "BAIK"
 *     - Jika ada catatan → biarkan "-" (tidak bisa auto-fill)
 */
function resolveKondisiMaster(masterKondisiVal, opnameKeterangan) {
    // Jika App3 punya data kondisi → gunakan langsung
    if (!isEmptyVal(masterKondisiVal) && masterKondisiVal !== '-') {
        return masterKondisiVal;
    }

    // App3 kosong → cek apakah ada catatan di kolom keterangan opname
    const catatan = cleanString(opnameKeterangan).trim();
    if (!catatan || catatan === '-') {
        // Tidak ada catatan → item teropname dalam kondisi normal → otomatis BAIK
        return 'BAIK';
    }

    // Ada catatan → tidak bisa auto-fill
    return '-';
}

async function runRecouncil(opnames, masterPath, outputPath, aspxPath) {
    try {
        if (!fs.existsSync(masterPath)) {
            return { status: 'error', message: 'File Master Data tidak ditemukan.' };
        }

        // 1. Load Master Data
        const masterWb = new ExcelJS.Workbook();
        await masterWb.xlsx.readFile(masterPath);
        const masterWs = masterWb.worksheets[0];

        const masterDict = {};
        const masterHeaders = {};
        masterWs.getRow(1).eachCell((cell, colNumber) => {
            masterHeaders[cleanString(cell.value)] = colNumber;
        });

        const colBarcode = masterHeaders['NO BARCODE'];
        const colAsset = masterHeaders['ASSET ORACLE'];
        const colLokasi = masterHeaders['LOKASI'];
        const colJenis = masterHeaders['JENIS HARTA'];
        const colKondisi = masterHeaders['KONDISI'];
        const colTahun = masterHeaders['TAHUN Perolehan'] || masterHeaders['Tahun Perolehan'] || masterHeaders['TAHUN PEROLEHAN'];

        masterWs.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const barcodeVal = row.getCell(colBarcode).value;
            const barcode = cleanString(barcodeVal);
            if (barcode && barcode !== '-' && barcode !== 'None' && barcode !== 'nan') {
                masterDict[barcode] = {
                    'NO BARCODE': colBarcode ? cleanString(row.getCell(colBarcode).value) : '-',
                    'ASSET ORACLE': colAsset ? cleanString(row.getCell(colAsset).value) : '-',
                    'LOKASI': colLokasi ? cleanString(row.getCell(colLokasi).value) : '-',
                    'JENIS HARTA': colJenis ? cleanString(row.getCell(colJenis).value) : '-',
                    'KONDISI': colKondisi ? cleanString(row.getCell(colKondisi).value) : '-',
                    'TAHUN Perolehan': colTahun ? cleanString(row.getCell(colTahun).value) : '-'
                };
            }
        });

        // 1b. Load ASPxGridView1 (opsional — boleh null)
        const aspxDict = await loadAspxDict(aspxPath);

        // 2. Process Opname files
        const processedFiles = [];
        let firstSuggestedName = null;

        for (const opname of opnames) {
            const opnamePath = opname.path;
            const originalFilename = opname.original;

            const wb = new ExcelJS.Workbook();
            await wb.xlsx.readFile(opnamePath);

            const ws = wb.getWorksheet('Recouncil') || wb.worksheets[0];

            // Extract Ruangan Name from Row 2
            let roomNameFromSheet = "";
            const row2CellA = ws.getCell('A2').value;
            const textVal = (typeof row2CellA === 'object' && row2CellA !== null && row2CellA.richText)
                ? row2CellA.richText.map(rt => rt.text).join('')
                : String(row2CellA || '');

            if (textVal.toUpperCase().includes('RUANGAN')) {
                roomNameFromSheet = textVal.replace(/RUANGAN\s*:\s*/i, '').trim();
                roomNameFromSheet = roomNameFromSheet.replace(/[\\/:*?"<>|]/g, '-');
            }

            let baseName = originalFilename.replace(/\.[^/.]+$/, "");
            let finalFileName = roomNameFromSheet ? `${roomNameFromSheet}.xlsx` : `${baseName}.xlsx`;

            if (!firstSuggestedName) {
                firstSuggestedName = finalFileName;
            }

            // Find last data row
            let lastDataRow = 7;
            for (let r = ws.rowCount; r > 7; r--) {
                let hasData = false;
                for (let c = 1; c <= 10; c++) {
                    const cVal = cleanString(ws.getCell(r, c).value);
                    if (cVal !== "") { hasData = true; break; }
                }
                if (hasData) { lastDataRow = r; break; }
            }
            if (lastDataRow < 8) {
                lastDataRow = Math.max(ws.rowCount, 8);
            }

            // Unhide columns K to Q
            for (let i = 0; i < 7; i++) {
                ws.getColumn(11 + i).hidden = false;
            }

            // Write Headers for Recouncil (K-Q)
            const newHeaders = ['NO BARCODE', 'ASSET ORACLE', 'LOKASI', 'JENIS HARTA', 'KONDISI MASTER', 'TAHUN Perolehan', 'HASIL RECOUNCIL'];
            newHeaders.forEach((h, i) => {
                const cell = ws.getCell(7, 11 + i);
                cell.value = h;
                cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: i < 6 ? 'FFD9D9D9' : 'FF00B0F0' }
                };
            });

            // Write Data rows
            for (let r = 8; r <= lastDataRow; r++) {
                const rawBarcode = cleanString(ws.getCell(r, 3).value);  // Kolom C
                const ruanganOpname = cleanString(ws.getCell(r, 6).value); // Kolom F
                const kolomH = ws.getCell(r, 8).value;                    // Kolom H — Kondisi hasil scan
                const kolomI = ws.getCell(r, 9).value;                    // Kolom I — Keterangan/catatan opname

                let statusRecouncil = "";
                let outMaster = {
                    'NO BARCODE': '-', 'ASSET ORACLE': '-', 'LOKASI': '-',
                    'JENIS HARTA': '-', 'KONDISI MASTER': '-', 'TAHUN Perolehan': '-'
                };

                if (!rawBarcode || rawBarcode === 'nan' || rawBarcode === '-') {
                    statusRecouncil = "Barcode Kosong di Opname";

                } else if (!masterDict[rawBarcode]) {
                    statusRecouncil = "Barcode Belum Sesuai, Asset di Oracle tidak ada";
                    outMaster['NO BARCODE'] = rawBarcode;
                    // Coba isi ASSET ORACLE dari ASPx meski tidak ada di master
                    outMaster['ASSET ORACLE'] = resolveAssetOracle('-', rawBarcode, aspxDict);

                } else {
                    const mData = masterDict[rawBarcode];

                    // Kolom L — ASSET ORACLE
                    const resolvedOracle = resolveAssetOracle(mData['ASSET ORACLE'], rawBarcode, aspxDict);
                    // Kolom O — KONDISI MASTER
                    // Gunakan keterangan (kolom I) sebagai indikator: ada catatan = tidak auto-fill BAIK
                    const resolvedKondisi = resolveKondisiMaster(mData['KONDISI'], kolomI);
                    // Kolom P — TAHUN Perolehan
                    const resolvedTahun = resolveTahunPerolehan(mData['TAHUN Perolehan'], rawBarcode, aspxDict);

                    outMaster = {
                        'NO BARCODE': rawBarcode,
                        'ASSET ORACLE': resolvedOracle,
                        'LOKASI': mData['LOKASI'],
                        'JENIS HARTA': mData['JENIS HARTA'],
                        'KONDISI MASTER': resolvedKondisi,
                        'TAHUN Perolehan': resolvedTahun
                    };

                    if (outMaster['JENIS HARTA'] === '-' || isEmptyVal(outMaster['JENIS HARTA'])) {
                        statusRecouncil = "Data Ditemukan Tidak Lengkap";
                    } else if (ruanganOpname && !isSameRoom(ruanganOpname, outMaster['LOKASI'])) {
                        statusRecouncil = `Salah Ruangan, hasil ruangan opname berada di: ${ruanganOpname}`;
                    } else {
                        statusRecouncil = "Sudah Sesuai";
                        outMaster['LOKASI'] = ruanganOpname;
                    }
                }

                const masterVals = [
                    outMaster['NO BARCODE'], outMaster['ASSET ORACLE'], outMaster['LOKASI'],
                    outMaster['JENIS HARTA'], outMaster['KONDISI MASTER'], outMaster['TAHUN Perolehan'],
                    statusRecouncil
                ];

                masterVals.forEach((val, i) => {
                    const cell = ws.getCell(r, 11 + i);
                    cell.value = val;
                    cell.font = { name: 'Calibri', size: 11 };
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' }
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                });
            }

            // AUTO-WIDTH: scan semua kolom A-Q dari baris 6 hingga lastDataRow
            const totalCols = 17; // A(1) sampai Q(17)
            for (let col = 1; col <= totalCols; col++) {
                let maxLen = 8;
                for (let row = 6; row <= lastDataRow; row++) {
                    const cell = ws.getCell(row, col);
                    if (cell.value === null || cell.value === undefined) continue;
                    let raw = cell.value;
                    if (typeof raw === 'object' && raw !== null) {
                        raw = raw.richText ? raw.richText.map(rt => rt.text).join('') : String(raw);
                    } else if (raw instanceof Date) {
                        raw = raw.toLocaleDateString();
                    } else {
                        raw = String(raw);
                    }
                    const longest = raw.split(/\n/).reduce((max, line) => Math.max(max, line.length), 0);
                    if (longest > maxLen) maxLen = longest;
                }
                ws.getColumn(col).width = Math.min(Math.max(maxLen + 3, 10), 65);
            }

            if (opnames.length === 1) {
                await wb.xlsx.writeFile(outputPath);
                processedFiles.push(outputPath);
            } else {
                const tempOut = path.join(path.dirname(outputPath), `Temp_${Date.now()}_${path.basename(opnamePath)}`);
                await wb.xlsx.writeFile(tempOut);
                processedFiles.push({ path: tempOut, finalName: finalFileName });
            }
        }

        // 3. ZIP if multiple files
        if (opnames.length > 1) {
            const zip = new JSZip();
            for (const pf of processedFiles) {
                const fileData = fs.readFileSync(pf.path);
                zip.file(pf.finalName, fileData);
                fs.unlinkSync(pf.path);
            }
            const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
            fs.writeFileSync(outputPath, zipBuffer);
        }

        return {
            status: "success",
            message: "Proses berhasil",
            output: outputPath,
            files_processed: opnames.length,
            suggested_filename: opnames.length === 1 ? firstSuggestedName : `Recouncil_Result_${Date.now()}.zip`
        };

    } catch (err) {
        console.error("Error in recouncil processing:", err);
        return { status: "error", message: err.message, traceback: err.stack };
    }
}

// CLI Execution
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log(JSON.stringify({ status: "error", message: "Missing arguments" }));
        process.exit(1);
    }

    const cmd = args[0];
    if (cmd === "process") {
        try {
            const dataJsonPath = args[1];
            const dataStr = fs.readFileSync(dataJsonPath, 'utf8');
            const data = JSON.parse(dataStr);

            const opnames = data.opnames;
            const masterPath = data.master;
            const outputPath = data.output_path;
            const aspxPath = data.aspx || null; // opsional

            const result = await runRecouncil(opnames, masterPath, outputPath, aspxPath);
            console.log(JSON.stringify(result));
        } catch (e) {
            console.log(JSON.stringify({ status: "error", message: String(e) }));
        }
    }
}

main();
