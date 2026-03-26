const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
    server: process.env.MSSQL_HOST || 'localhost',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    options: { encrypt: false, trustServerCertificate: true },
};

async function check() {
    try {
        let pool = await sql.connect(config);
        let q1 = await pool.request().query("SELECT TOP 1 * FROM AssetData_V");
        console.log("Cols of AssetData_V:", Object.keys(q1.recordset[0]).join(', '));
        sql.close();
    } catch (err) {
        console.error(err);
    }
}

check();
