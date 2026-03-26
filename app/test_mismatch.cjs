const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
    server: process.env.MSSQL_HOST || '192.168.2.111',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    options: { encrypt: false, trustServerCertificate: true },
};

async function testFetch() {
    try {
        const pool = await sql.connect(config);
        console.log("Checking total unique barcodes...");

        // Total unique barcodes
        const q1 = await pool.request().query(`
      SELECT COUNT(DISTINCT BARCODE_ASSET) as unique_total 
      FROM [dbo].[V_REPORT_ALL_DETAIL]
      WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
    `);
        console.log("Total Unique Barcodes:", q1.recordset[0].unique_total);

        // Total master barcodes
        const q2 = await pool.request().query(`
      SELECT COUNT(DISTINCT BARCODE_ASSET) as unique_master 
      FROM [dbo].[V_REPORT_ALL_DETAIL]
      WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
        AND LAST_TRANS = 'Y'
    `);
        console.log("Total Master Barcodes (LAST_TRANS='Y'):", q2.recordset[0].unique_master);

        // Why the difference? Are there barcodes with NO LAST_TRANS='Y'?
        const q3 = await pool.request().query(`
      SELECT TOP 5 BARCODE_ASSET, COUNT(*) as history_records
      FROM [dbo].[V_REPORT_ALL_DETAIL]
      WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
      GROUP BY BARCODE_ASSET
      HAVING MAX(CASE WHEN LAST_TRANS = 'Y' THEN 1 ELSE 0 END) = 0
    `);

        console.log("Sample Barcodes with NO LAST_TRANS='Y':", q3.recordset);

        if (q3.recordset.length > 0) {
            const sampleBarcode = q3.recordset[0].BARCODE_ASSET;
            const q4 = await pool.request().query(`
        SELECT NAMA_ASSET, NAMA_KONDISI, LAST_TRANS, TRANS_DATE
        FROM [dbo].[V_REPORT_ALL_DETAIL]
        WHERE BARCODE_ASSET = '${sampleBarcode}'
      `);
            console.log(`History for missing barcode ${sampleBarcode}:`, q4.recordset);
        }

        sql.close();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

testFetch();
