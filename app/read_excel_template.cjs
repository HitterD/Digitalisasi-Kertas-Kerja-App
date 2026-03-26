const XLSX = require('xlsx');
const fs = require('fs');

function analyze(filePath) {
    let out = '=== FILE: ' + filePath + ' ===\n';
    const workbook = XLSX.readFile(filePath, { cellStyles: true });

    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        out += '\n--- SHEET: ' + sheetName + ' ---\n';

        if (worksheet['!merges']) {
            out += 'Merges: ' + worksheet['!merges'].map(m => XLSX.utils.encode_range(m)).join(', ') + '\n';
        }

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) {
            const rowData = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellAddr = XLSX.utils.encode_cell({ r, c });
                const cell = worksheet[cellAddr];
                if (cell) {
                    rowData.push(`${c}:${cell.v}`);
                }
            }
            if (rowData.length) {
                out += `Row ${r + 1} -> ${rowData.join(' | ')}\n`;
            }
        }
    });
    return out;
}

const dir = 'd:/Digitalisasi Kertas Kerja APP/Recouncil/Hasil yang dimau/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.XLSX') || f.endsWith('.xlsx') && !f.startsWith('~'));
let res = '';
if (files.length > 0) {
    res += analyze(dir + files[0]);
    const matFile = files.find(f => f.includes('MAT'));
    if (matFile && matFile !== files[0]) {
        res += analyze(dir + matFile);
    }
}
fs.writeFileSync('d:/Digitalisasi Kertas Kerja APP/app/template_analysis.txt', res);
