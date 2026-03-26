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

async function testFetchAll() {
    try {
        const pool = await sql.connect(config);
        console.log("Fetching all master assets...");
        const masterQuery = await pool.request().query(`
          SELECT 
            BARCODE_ASSET, NAMA_ASSET, KODE_TYPE_ASSET,
            BULAN, TAHUN, NAMA_KONDISI, KETERANGAN,
            NO_PO, LOCATION_CODE, PIC_RUANGAN
          FROM (
            SELECT *,
              ROW_NUMBER() OVER (
                PARTITION BY BARCODE_ASSET 
                ORDER BY TRANS_DATE DESC, HIST_ID DESC
              ) AS rn
            FROM [dbo].[V_REPORT_ALL_DETAIL]
            WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
          ) sub
          WHERE rn = 1
    `);
        const masterStr = JSON.stringify(masterQuery.recordset);
        console.log(`Master: ${masterQuery.recordset.length} rows, Size: ${(masterStr.length / 1024 / 1024).toFixed(2)} MB`);

        console.log("Fetching all history assets...");
        const historyQuery = await pool.request().query(`
          SELECT 
            BARCODE_ASSET, NAMA_RUANGAN, KETERANGAN,
            NAMA_KONDISI, TRANS_DATE, KETERANGAN_OPNAME, SITE_ID
          FROM [dbo].[V_REPORT_ALL_DETAIL]
          WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
          ORDER BY TRANS_DATE DESC, HIST_ID DESC
    `);
        const historyStr = JSON.stringify(historyQuery.recordset);
        console.log(`History: ${historyQuery.recordset.length} rows, Size: ${(historyStr.length / 1024 / 1024).toFixed(2)} MB`);

        sql.close();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

testFetchAll();
