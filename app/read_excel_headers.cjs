const xlsx = require('xlsx');
const fs = require('fs');

function readHeaders(filepath, outpath) {
    try {
        const workbook = xlsx.readFile(filepath);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        if (data.length > 0) {
            const result = {
                headers: data[0],
                sample: data.length > 1 ? data[1] : []
            };
            fs.writeFileSync(outpath, JSON.stringify(result, null, 2));
            console.log(`Saved to ${outpath}`);
        } else {
            console.log(`No data in ${filepath}`);
        }
    } catch (err) {
        console.error(`Error reading ${filepath}:`, err.message);
    }
}

readHeaders('d:\\Digitalisasi Kertas Kerja APP\\ASPxGridView1.xlsx', 'd:\\Digitalisasi Kertas Kerja APP\\app\\ASPxGridView1_headers.json');
readHeaders('d:\\Digitalisasi Kertas Kerja APP\\gvReportAllDetail.xlsx', 'd:\\Digitalisasi Kertas Kerja APP\\app\\gvReportAllDetail_headers.json');
