const xlsx = require('xlsx');
const fs = require('fs');

const filePath = process.argv[2];
if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
}

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Get headers
    const range = xlsx.utils.decode_range(sheet['!ref']);
    const headers = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = sheet[xlsx.utils.encode_cell({ c: C, r: range.s.r })];
        headers.push(cell ? cell.v : undefined);
    }

    // Get first 5 rows
    const data = xlsx.utils.sheet_to_json(sheet).slice(0, 5);

    fs.writeFileSync('excel_output.json', JSON.stringify({ headers, data }, null, 2));
    console.log("Done writing to excel_output.json");
} catch (e) {
    console.error(e);
}
