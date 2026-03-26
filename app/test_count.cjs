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

async function check() {
    try {
        let pool = await sql.connect(config);
        let q1 = await pool.request().query("SELECT COUNT(*) as total_history, COUNT(DISTINCT BARCODE_ASSET) as unique_barcodes FROM V_REPORT_ALL_DETAIL WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''");
        console.log("V_REPORT_ALL_DETAIL stats:", q1.recordset[0]);
        sql.close();
    } catch (err) {
        console.error(err);
    }
}

check();
