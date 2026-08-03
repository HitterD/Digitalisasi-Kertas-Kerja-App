import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import stringSimilarity from 'string-similarity';

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

function extractRoomCode(val) {
    const s = normalizeForComparison(val);
    const match = s.match(/^([A-Z0-9]+)/);
    return match ? match[1] : s;
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
    
    if (extractRoomCode(opname) !== extractRoomCode(master)) return false;
    
    const cleanOpname = extractCleanRoomName(opname);
    const cleanMaster = extractCleanRoomName(master);
    if (cleanOpname === cleanMaster) return true;
    if (cleanMaster.includes(cleanOpname) || cleanOpname.includes(cleanMaster)) return true;
    if (Math.min(cleanOpname.length, cleanMaster.length) <= 22) return false;
    
    return stringSimilarity.compareTwoStrings(cleanOpname, cleanMaster) >= 0.68;
}

function isNonNumericOracleCode(val) {
    if (!val || val === '-' || val === 'nan' || val === 'None' || val === '') return false;
    return !/^\d+$/.test(val.trim());
}

function isEmptyVal(val) {
    if (!val) return true;
    const s = String(val).trim();
    return s === '' || s === '-' || s === 'nan' || s === 'None' || s === 'null';
}

async function loadAspxDict(aspxPath) {
    if (!aspxPath || !fs.existsSync(aspxPath)) return {};
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(aspxPath);
    const ws = wb.worksheets[0];
    if (!ws) return {};

    const headers = {};
    ws.getRow(1).eachCell((cell, colNum) => headers[cleanString(cell.value).toUpperCase().trim()] = colNum);

    const aspxDict = {};
    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const barcode = cleanString(row.getCell(headers['BARCODE']).value).toUpperCase();
        if (isEmptyVal(barcode)) return;

        const getValue = (colName) => {
            const raw = headers[colName] ? cleanString(row.getCell(headers[colName]).value) : '';
            return (!isEmptyVal(raw) && raw.toUpperCase() !== 'NULL') ? raw : '';
        };

        aspxDict[barcode] = {
            oracleId: getValue('ORACLE ID'),
            noPo: getValue('NO PO'),
            bln: getValue('BLN'),
            thn: getValue('THN')
        };
    });
    return aspxDict;
}

function resolveAssetOracle(masterOracleVal, barcode, aspxDict) {
    const aspxEntry = aspxDict[barcode];
    if (isEmptyVal(masterOracleVal)) return aspxEntry?.oracleId || '-';
    if (isNonNumericOracleCode(masterOracleVal)) return aspxEntry?.oracleId || masterOracleVal;
    return masterOracleVal;
}

function resolveTahunPerolehan(masterTahunVal, barcode, aspxDict) {
    if (!isEmptyVal(masterTahunVal) && masterTahunVal !== '-') return masterTahunVal;
    const aspxEntry = aspxDict[barcode];
    if (aspxEntry) {
        if (aspxEntry.thn && aspxEntry.bln) return `${String(aspxEntry.bln).padStart(2, '0')}/${aspxEntry.thn}`;
        return aspxEntry.thn || aspxEntry.bln || '-';
    }
    return '-';
}

function resolveKondisiMaster(masterKondisiVal, opnameKeterangan) {
    if (!isEmptyVal(masterKondisiVal) && masterKondisiVal !== '-') return masterKondisiVal;
    const catatan = cleanString(opnameKeterangan).trim();
    return (!catatan || catatan === '-') ? 'BAIK' : '-';
}

async function loadMasterData(masterPath) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(masterPath);
    const ws = wb.worksheets[0];

    const headers = {};
    ws.getRow(1).eachCell((cell, colNum) => headers[cleanString(cell.value)] = colNum);

    const dict = {};
    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const barcode = cleanString(row.getCell(headers['NO BARCODE']).value).toUpperCase();
        if (barcode && barcode !== '-' && barcode !== 'NONE' && barcode !== 'NAN') {
            const getVal = (key) => headers[key] ? cleanString(row.getCell(headers[key]).value) : '-';
            dict[barcode] = {
                'NO BARCODE': getVal('NO BARCODE'),
                'ASSET ORACLE': getVal('ASSET ORACLE'),
                'LOKASI': getVal('LOKASI'),
                'JENIS HARTA': getVal('JENIS HARTA'),
                'KONDISI': getVal('KONDISI'),
                'TAHUN Perolehan': getVal('TAHUN Perolehan') || getVal('Tahun Perolehan') || getVal('TAHUN PEROLEHAN') || '-'
            };
        }
    });
    return dict;
}

function formatRecouncilSheet(ws) {
    for (let i = 0; i < 7; i++) ws.getColumn(11 + i).hidden = false;
    
    const headers = ['NO BARCODE', 'ASSET ORACLE', 'LOKASI', 'JENIS HARTA', 'KONDISI MASTER', 'TAHUN Perolehan', 'HASIL RECOUNCIL'];
    headers.forEach((h, i) => {
        const cell = ws.getCell(7, 11 + i);
        cell.value = h;
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i < 6 ? 'FFD9D9D9' : 'FF00B0F0' } };
    });
}

async function runRecouncil(opnames, masterPath, outputPath, aspxPath) {
    try {
        if (!fs.existsSync(masterPath)) return { status: 'error', message: 'File Master Data tidak ditemukan.' };

        const masterDict = await loadMasterData(masterPath);
        const aspxDict = await loadAspxDict(aspxPath);
        const processedFiles = [];
        let firstSuggestedName = null;

        for (const opname of opnames) {
            const wb = new ExcelJS.Workbook();
            await wb.xlsx.readFile(opname.path);
            const ws = wb.getWorksheet('Recouncil') || wb.worksheets[0];

            let roomNameFromSheet = "";
            const row2CellA = ws.getCell('A2').value;
            const textVal = (typeof row2CellA === 'object' && row2CellA?.richText)
                ? row2CellA.richText.map(rt => rt.text).join('') : String(row2CellA || '');

            if (textVal.toUpperCase().includes('RUANGAN')) {
                roomNameFromSheet = textVal.replace(/RUANGAN\s*:\s*/i, '').trim().replace(/[\\/:*?"<>|]/g, '-');
            }

            const finalFileName = roomNameFromSheet ? `${roomNameFromSheet}.xlsx` : `${opname.original.replace(/\.[^/.]+$/, "")}.xlsx`;
            if (!firstSuggestedName) firstSuggestedName = finalFileName;

            let lastDataRow = Math.max(ws.rowCount, 8);
            for (let r = ws.rowCount; r > 7; r--) {
                if ([1,2,3,4,5,6,7,8,9,10].some(c => cleanString(ws.getCell(r, c).value) !== "")) {
                    lastDataRow = r; break;
                }
            }

            formatRecouncilSheet(ws);

            for (let r = 8; r <= lastDataRow; r++) {
                const rawBarcode = cleanString(ws.getCell(r, 3).value).toUpperCase();
                const ruanganOpname = cleanString(ws.getCell(r, 6).value);
                const kolomI = ws.getCell(r, 9).value;

                let statusRecouncil = "Barcode Kosong di Opname";
                let outMaster = { 'NO BARCODE': '-', 'ASSET ORACLE': '-', 'LOKASI': '-', 'JENIS HARTA': '-', 'KONDISI MASTER': '-', 'TAHUN Perolehan': '-' };

                if (rawBarcode && rawBarcode !== 'nan' && rawBarcode !== '-') {
                    if (!masterDict[rawBarcode]) {
                        statusRecouncil = "Barcode Belum Sesuai, Asset di Oracle tidak ada";
                        outMaster['NO BARCODE'] = rawBarcode;
                        outMaster['ASSET ORACLE'] = resolveAssetOracle('-', rawBarcode, aspxDict);
                    } else {
                        const mData = masterDict[rawBarcode];
                        outMaster = {
                            'NO BARCODE': rawBarcode,
                            'ASSET ORACLE': resolveAssetOracle(mData['ASSET ORACLE'], rawBarcode, aspxDict),
                            'LOKASI': mData['LOKASI'],
                            'JENIS HARTA': mData['JENIS HARTA'],
                            'KONDISI MASTER': resolveKondisiMaster(mData['KONDISI'], kolomI),
                            'TAHUN Perolehan': resolveTahunPerolehan(mData['TAHUN Perolehan'], rawBarcode, aspxDict)
                        };

                        if (isEmptyVal(outMaster['JENIS HARTA']) || outMaster['JENIS HARTA'] === '-') {
                            statusRecouncil = "Data Ditemukan Tidak Lengkap";
                        } else if (ruanganOpname && !isSameRoom(ruanganOpname, outMaster['LOKASI'])) {
                            statusRecouncil = `Salah Ruangan, hasil ruangan opname berada di: ${ruanganOpname}`;
                        } else {
                            statusRecouncil = "Sudah Sesuai";
                            outMaster['LOKASI'] = ruanganOpname;
                        }
                    }
                }

                [outMaster['NO BARCODE'], outMaster['ASSET ORACLE'], outMaster['LOKASI'], outMaster['JENIS HARTA'], outMaster['KONDISI MASTER'], outMaster['TAHUN Perolehan'], statusRecouncil].forEach((val, i) => {
                    const cell = ws.getCell(r, 11 + i);
                    cell.value = val;
                    cell.font = { name: 'Calibri', size: 11 };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                });
            }

            // Fixed auto-width formatting
            for (let col = 1; col <= 17; col++) {
                ws.getColumn(col).width = [3, 11, 11, 12, 13, 14].includes(col) ? 20 : 15;
            }

            if (opnames.length === 1) {
                await wb.xlsx.writeFile(outputPath);
                processedFiles.push(outputPath);
            } else {
                const tempOut = path.join(path.dirname(outputPath), `Temp_${Date.now()}_${path.basename(opname.path)}`);
                await wb.xlsx.writeFile(tempOut);
                processedFiles.push({ path: tempOut, finalName: finalFileName });
            }
        }

        if (opnames.length > 1) {
            const zip = new JSZip();
            for (const pf of processedFiles) {
                zip.file(pf.finalName, fs.readFileSync(pf.path));
                fs.unlinkSync(pf.path);
            }
            fs.writeFileSync(outputPath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
        }

        return { status: "success", message: "Proses berhasil", output: outputPath, files_processed: opnames.length, suggested_filename: opnames.length === 1 ? firstSuggestedName : `Recouncil_Result_${Date.now()}.zip` };
    } catch (err) {
        console.error("Error in recouncil processing:", err);
        return { status: "error", message: err.message, traceback: err.stack };
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) process.exit(1);
    if (args[0] === "process") {
        try {
            const data = JSON.parse(fs.readFileSync(args[1], 'utf8'));
            console.log(JSON.stringify(await runRecouncil(data.opnames, data.master, data.output_path, data.aspx || null)));
        } catch (e) {
            console.log(JSON.stringify({ status: "error", message: String(e) }));
        }
    }
}

main();
