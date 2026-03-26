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
          SELECT TOP 5
            BARCODE_ASSET, NAMA_ASSET, NAMA_RUANGAN, PIC_RUANGAN,
            NAMA_KONDISI, KETERANGAN_ASSET, KETERANGAN, KETERANGAN_OPNAME
          FROM [dbo].[AssetData_V]
          WHERE BARCODE_ASSET IN ('2603001048', '1700002446') OR BARCODE_ASSET IS NOT NULL
    `);
        console.log(JSON.stringify(result.recordset, null, 2));
        sql.close();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

testFetch();
