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
        const result = await pool.request().query(`
          SELECT COUNT(*) as master_count
          FROM [dbo].[V_REPORT_ALL_DETAIL]
          WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
          AND LAST_TRANS = 'Y'
    `);
        console.log(result.recordset[0]);

        const result2 = await pool.request().query(`
          SELECT TOP 2 BARCODE_ASSET, NAMA_ASSET, NAMA_RUANGAN, LAST_TRANS
          FROM [dbo].[V_REPORT_ALL_DETAIL]
          WHERE LAST_TRANS = 'Y'
    `);
        console.log(result2.recordset);

        sql.close();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

testFetch();
