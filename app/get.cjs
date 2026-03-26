const sql = require('mssql');
require('dotenv').config();

async function q() {
    try {
        const pool = await sql.connect({
            user: process.env.MSSQL_USER || 'OpsSupport',
            password: process.env.MSSQL_PASSWORD || 'Kalosi1927',
            server: '192.168.2.111',
            database: 'ASSET_MANAGEMENT',
            options: { encrypt: false, trustServerCertificate: true }
        });
        const res2 = await pool.request().query("SELECT ASSET_ORACLE FROM T_LIBRARY_DAFT WHERE BARCODE_ASSET = '1400000536'");
        console.log('T_LIBRARY_DAFT:', res2.recordset);
    } catch (e) { console.error(e) }
    process.exit(0);
}
q();
