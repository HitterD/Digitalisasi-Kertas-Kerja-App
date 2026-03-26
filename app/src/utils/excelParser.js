import * as XLSX from 'xlsx';
import JSZip from 'jszip';

/** Column index mapping (1-indexed untuk utilitas helper) */
export const EXCEL_COL = {
    BARCODE: 1,
    NAMA_ASET: 2,
    NO_PO: 3,
    TIPE: 4,
    BULAN: 5,
    TAHUN: 6,
    KETERANGAN: 7,
};
export const DATA_START_ROW_INDEX = 8;

/**
 * Parse Excel file buffer and extract all sheets' data
 * @param {ArrayBuffer} buffer - Excel file buffer
 * @returns {{ fileName: string, sheets: SheetData[] }}
 */
export function parseExcelFile(buffer, fileName = '') {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheets = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = parseSheet(worksheet, sheetName, fileName);
    if (sheetData) {
      sheets.push(sheetData);
    }
  }

  return { fileName, sheets };
}

/**
 * Parse a single worksheet
 * Row structure:
 *  1: Title (B1)
 *  2: Area (B2)
 *  3: Room name (B3)
 *  4: Period (B4)
 *  5: PIC name (B5) + Date (L5)
 *  6: Empty
 *  7: Column headers
 *  8: Sub-headers (BULAN, TAHUN)
 *  9+: Data rows
 *  Footer: Signature area (PETUGAS OPNAME, PIC RUANGAN)
 */
function parseSheet(worksheet, sheetName, fileName = '') {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  const getCellValue = (row, col) => {
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = worksheet[addr];
    if (!cell) return '';
    if (cell.t === 'd') {
      // Date cell
      const d = new Date(cell.v);
      return formatDate(d);
    }
    return String(cell.v ?? '').trim();
  };

  // Helper untuk mengekstrak string PERIODE OPNAME dinamis dari filename kertas kerja
  const parsePeriodFromFileName = (name) => {
    if (!name) return '';
    const match = name.match(/SJA\d?-(\d{2})(\d{4})/);
    if (!match) return '';
    const monthNum = parseInt(match[1], 10);
    const year = match[2];
    const months = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
        'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    return months[monthNum] ? `PERIODE OPNAME ${months[monthNum]} ${year}` : '';
  };

  // Extract metadata from header rows (0-indexed)
  const title = getCellValue(0, 1);      // B1
  const area = getCellValue(1, 1);       // B2
  const roomName = getCellValue(2, 1);   // B3
  const rawPeriod = getCellValue(3, 1);  // B4
  const picInfo = getCellValue(4, 1);    // B5
  const dateStr = getCellValue(4, 11);   // L5

  let periodFromDateObj = '';
  const dateCell = worksheet[XLSX.utils.encode_cell({ r: 4, c: 11 })];
  if (dateCell) {
    let d = null;
    if (dateCell.t === 'd') {
      d = new Date(dateCell.v);
    } else if (typeof dateCell.v === 'string') {
      const parsed = new Date(dateCell.v);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
    if (d && !isNaN(d.getTime())) {
      const monthsIndo = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
          'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
      periodFromDateObj = `PERIODE OPNAME ${monthsIndo[d.getMonth()]} ${d.getFullYear()}`;
    }
  }

  const periodFromFilename = parsePeriodFromFileName(fileName);
  const period = periodFromFilename || periodFromDateObj || rawPeriod;

  // Extract PIC name from "PIC RUANGAN XXXXX"
  const picMatch = picInfo.match(/PIC\s+RUANGAN\s+(.*)/i);
  const picName = picMatch ? picMatch[1].trim() : picInfo;

  // Parse data rows starting from row 9 (index 8)
  const assets = [];
  for (let r = 8; r <= range.e.r; r++) {
    const no = getCellValue(r, 1);       // B - NO
    const barcode = getCellValue(r, 2);  // C - BARCODE ASET
    const namaAset = getCellValue(r, 3); // D - NAMA ASET

    // Skip empty rows and footer rows
    if (!no && !barcode && !namaAset) continue;
    // Skip signature/footer text
    if (no === 'PETUGAS OPNAME' || no === 'PIC RUANGAN') break;
    if (namaAset && namaAset.includes('(....')) break;

    assets.push({
      id: `${sheetName}-${r}`,
      no: no,
      barcode: barcode,
      namaAset: namaAset,
      noPO: getCellValue(r, 4),          // E - No. PO
      tipe: getCellValue(r, 5),          // F - TIPE
      bulanPerolehan: getCellValue(r, 6), // G - BULAN
      tahunPerolehan: getCellValue(r, 7), // H - TAHUN
      // User-fillable fields (initialized empty)
      adaTidakAda: '',
      kondisi: '',
      keterangan: '',
      isChecked: false,
    });
  }

  return {
    sheetName,
    meta: {
      title: title || 'KERTAS KERJA OPNAME ASET TETAP - ICT',
      area: area || '',
      roomName: roomName || sheetName,
      period: period || '',
      picName: picName || '',
      date: dateStr || '',
    },
    assets,
    noBarcodeAssets: [],
    notAtLocationAssets: [],
    signatures: {
      petugasOpname1: null,
      petugasOpname1Name: '',
      petugasOpname2: null,
      petugasOpname2Name: '',
      picRuangan: null,
      picRuanganName: '',
    },
  };
}

function formatDate(date) {
  if (!date || isNaN(date.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = date.getDate().toString().padStart(2, '0');
  const m = months[date.getMonth()];
  const y = date.getFullYear().toString().slice(-2);
  return `${d}-${m}-${y}`;
}

/**
 * Split a workbook into separate workbooks (one per sheet)
 * Uses JSZip to work at the raw ZIP level, preserving ALL original formatting
 * (styles, fonts, colors, borders, merged cells, column widths, row heights)
 *
 * SheetJS free edition cannot write cell styles — this approach clones the
 * original xlsx zip and modifies only the workbook structure XMLs,
 * keeping all sheet XML and styles intact.
 *
 * @param {ArrayBuffer} buffer
 * @returns {Promise<{ name: string, blob: Blob }[]>}
 */
export async function splitExcelBySheets(buffer) {
  // First use XLSX just to get sheet names and room names
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  // Get room name for each sheet from B3
  const sheetInfo = sheetNames.map((name, idx) => {
    const ws = workbook.Sheets[name];
    const addr = XLSX.utils.encode_cell({ r: 2, c: 1 });
    const cell = ws[addr];
    let roomName = cell ? String(cell.v ?? '').trim() : name;
    roomName = roomName.replace(/[\\/:*?"<>|]/g, '-').trim();
    return { sheetName: name, roomName, index: idx };
  });

  // Read the original zip
  const originalZip = await JSZip.loadAsync(buffer);

  const results = [];

  for (const info of sheetInfo) {
    // Clone the entire zip
    const newZip = await JSZip.loadAsync(await originalZip.generateAsync({ type: 'arraybuffer' }));

    // Parse workbook.xml to find sheet references
    const wbXml = await newZip.file('xl/workbook.xml').async('string');

    // Parse workbook.xml.rels to get sheet → file mappings
    const relsXml = await newZip.file('xl/_rels/workbook.xml.rels').async('string');

    // Find all sheet entries in workbook.xml: <sheet name="..." sheetId="..." r:id="..."/>
    const sheetRegex = /<sheet\s[^>]*?name="([^"]*)"[^>]*?r:id="([^"]*)"[^>]*?\/>/g;
    const sheetEntries = [];
    let match;
    while ((match = sheetRegex.exec(wbXml)) !== null) {
      sheetEntries.push({ full: match[0], name: match[1], rId: match[2] });
    }

    // Find all relationship entries: <Relationship Id="..." Type="..." Target="..."/>
    const relRegex = /<Relationship\s[^>]*?Id="([^"]*)"[^>]*?Target="([^"]*)"[^>]*?\/>/g;
    const relEntries = [];
    while ((match = relRegex.exec(relsXml)) !== null) {
      relEntries.push({ full: match[0], id: match[1], target: match[2] });
    }

    // Identify sheets to REMOVE (all except the target)
    const sheetsToRemove = sheetEntries.filter(s => s.name !== info.sheetName);
    const targetSheet = sheetEntries.find(s => s.name === info.sheetName);

    if (!targetSheet) continue;

    // Remove other sheets' XML files and their relationships
    let updatedWbXml = wbXml;
    let updatedRelsXml = relsXml;

    for (const sheet of sheetsToRemove) {
      // Remove from workbook.xml
      updatedWbXml = updatedWbXml.replace(sheet.full, '');

      // Find the relationship for this sheet
      const rel = relEntries.find(r => r.id === sheet.rId);
      if (rel) {
        // Remove the relationship entry
        updatedRelsXml = updatedRelsXml.replace(rel.full, '');
        // Remove the sheet XML file
        const sheetPath = 'xl/' + rel.target.replace(/^\//, '');
        if (newZip.file(sheetPath)) {
          newZip.remove(sheetPath);
        }
      }
    }

    // Update [Content_Types].xml - remove references to deleted sheet files
    const ctXml = await newZip.file('[Content_Types].xml').async('string');
    let updatedCtXml = ctXml;
    for (const sheet of sheetsToRemove) {
      const rel = relEntries.find(r => r.id === sheet.rId);
      if (rel) {
        const partName = '/' + ('xl/' + rel.target.replace(/^\//, ''));
        // Remove <Override PartName="/xl/worksheets/sheetX.xml" .../>
        const overrideRegex = new RegExp(
          `<Override\\s+PartName="${partName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*?/>`,
          'g'
        );
        updatedCtXml = updatedCtXml.replace(overrideRegex, '');
      }
    }

    // Write updated XMLs back into the zip
    newZip.file('xl/workbook.xml', updatedWbXml);
    newZip.file('xl/_rels/workbook.xml.rels', updatedRelsXml);
    newZip.file('[Content_Types].xml', updatedCtXml);

    // Generate the output file
    const outBuffer = await newZip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    results.push({ name: `${info.roomName}.xlsx`, blob: outBuffer });
  }

  return results;
}

