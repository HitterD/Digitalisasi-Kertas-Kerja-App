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
        // Find views that might be the master asset source
        let result = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME LIKE '%MASTER%'");
        console.log("VIEWS with MASTER:", result.recordset);

        // Find tables that might be the master asset source
        let result2 = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%MASTER%'");
        console.log("TABLES with MASTER:", result2.recordset);

        // Check columns of V_REPORT_ALL_DETAIL just to be sure
        let colResult = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'V_REPORT_ALL_DETAIL'");
        console.log("Cols of V_REPORT_ALL_DETAIL:", colResult.recordset.map(r => r.COLUMN_NAME));

        sql.close();
    } catch (err) {
        console.error(err);
    }
}

check();
