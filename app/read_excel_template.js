const ExcelJS = require('exceljs');
const fs = require('fs');

async function analyze(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    console.log('=== FILE:', filePath, '===');

    workbook.eachSheet((worksheet) => {
        console.log('\n--- SHEET:', worksheet.name, '---');
        console.log('Merge Cells:', worksheet._merges);

        let headerRow = null;
        if (worksheet.name.includes('FORM TEMUAN')) headerRow = Math.max(4, 5); // Let's check row 5
        if (worksheet.name.includes('Recouncil')) headerRow = 6;
        if (worksheet.name === 'MAT') headerRow = 1;

        for (let r = 1; r <= 8; r++) {
            const row = worksheet.getRow(r);
            const cols = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                let val = cell.value;
                if (val && typeof val === 'object' && val.richText) val = val.richText.map(t => t.text).join('');
                if (val) cols.push(`${colNumber}: ${val}`);
            });
            if (cols.length) console.log(`Row ${r} ->`, cols.join(' | '));

            if (r === headerRow) {
                const widths = [];
                for (let i = 1; i <= Math.max(row.cellCount, 17); i++) {
                    widths.push(`${i}: ${worksheet.getColumn(i).width}`);
                }
                console.log('Column Widths ->', widths.join(' | '));
            }
        }

        console.log('Styling samples:');
        for (let i = 1; i <= 20; i++) {
            const row = worksheet.getRow(i);
            const rData = [];
            row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                if (cell.fill && cell.fill.fgColor) {
                    rData.push(`[C${colNum} bg:${cell.fill.fgColor.argb || cell.fill.fgColor.theme}]`);
                }
            });
            if (rData.length > 0) console.log(`Row ${i} fills:`, rData.join(' '));
        }
    });
}

async function run() {
    const dir = 'd:/Digitalisasi Kertas Kerja APP/Recouncil/Hasil yang dimau/';
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.XLSX') || f.endsWith('.xlsx') && !f.startsWith('~'));
    if (files.length > 0) {
        await analyze(dir + files[0]);
        const matFile = files.find(f => f.includes('MAT'));
        if (matFile && matFile !== files[0]) {
            await analyze(dir + matFile);
        }
    }
}

run().catch(console.error);
