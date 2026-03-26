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

async function testQuery() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
          SELECT TOP 20000 
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
        console.log(`Success! Found ${result.recordset.length} rows.`);
        sql.close();
    } catch (e) {
        console.error("SQL Error:", e.message);
    }
}

testQuery();
