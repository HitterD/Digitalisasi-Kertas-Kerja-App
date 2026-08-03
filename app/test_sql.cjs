const sql = require('mssql');
require('dotenv').config({ path: '.\.env' });

const sqlConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
  server: process.env.MSSQL_HOST || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  connectionTimeout: 10000,
  requestTimeout: 15000,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

(async () => {
    try {
        console.log("Connecting...");
        const pool = await sql.connect(sqlConfig);
        console.log("Connected.");
        
        const periode = "06202601"; // Extracted from "Jun 2026 — SJA1-06202601-ICT"
        
        console.log("Running Opname data query...");
        const res = await pool.request()
            .input('periode', sql.NVarChar, periode)
            .query(`
              SELECT
                td.id, td.Periode, td.Ruangan_Opname, td.Barcode, td.Nama_Asset,
                td.Ruangan_Barcode, td.Kondisi, td.Keterangan, td.created_date,
                td.KETIDAKSESUAIAN, td.TARGET_PENYELESAIAN, td.ACTION,
                v.CREATE_USER, v.PIC_RUANGAN,
                LTRIM(RTRIM(v.KETERANGAN)) AS KETERANGAN_MASTER
              FROM [dbo].[TD_OPNAME] td
              OUTER APPLY (
                  SELECT TOP 1 CREATE_USER, PIC_RUANGAN, KETERANGAN
                  FROM [dbo].[V_REPORT_ALL_DETAIL] vr
                  WHERE vr.BARCODE_ASSET = td.Barcode
                  ORDER BY vr.TRANS_DATE DESC, vr.HIST_ID DESC
              ) v
              WHERE td.Periode LIKE '%-%' + @periode + '%' OR td.Periode = @periode
              ORDER BY td.Ruangan_Opname, td.id
            `);
        console.log("Query 1 success. Rows:", res.recordset.length);
        
        pool.close();
    } catch(err) {
        console.error("Error:", err);
    }
})();
