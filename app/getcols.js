const sql = require('mssql');
require('dotenv').config();

async function getColumns() {
    try {
        const pool = await sql.connect({
            user: process.env.MSSQL_USER || 'OpsSupport',
            password: process.env.MSSQL_PASSWORD || 'Kalosi1927',
            server: '192.168.2.111',
            database: 'ASSET_MANAGEMENT',
            options: { encrypt: false, trustServerCertificate: true }
        });
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'V_REPORT_ALL_DETAIL'");
        console.log(result.recordset.map(r => r.COLUMN_NAME).join(', '));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

getColumns();
