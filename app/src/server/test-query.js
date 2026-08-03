import dotenv from 'dotenv';
import sql from 'mssql';
dotenv.config({path: '../../.env'});
const config = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_HOST || 'localhost',
  database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
  options: { encrypt: false, trustServerCertificate: true }
};
async function main() {
  await sql.connect(config);
  try {
    const result = await sql.query(`
      SELECT TOP 5
        t.TRXID, t.ASAL_RUANGAN_ID, t.TUJUAN_RUANGAN_ID,
        (SELECT TOP 1 NAMA_RUANGAN FROM [dbo].[V_REPORT_ALL_DETAIL] WHERE RUANGAN_ID = t.ASAL_RUANGAN_ID) AS ASAL_RUANGAN_NAME,
        (SELECT TOP 1 NAMA_RUANGAN FROM [dbo].[V_REPORT_ALL_DETAIL] WHERE RUANGAN_ID = t.TUJUAN_RUANGAN_ID) AS TUJUAN_RUANGAN_NAME
      FROM [dbo].[V_TRX_MAT] t
    `);
    console.log(result.recordset);
  } catch(e) { console.error(e.message); }
  sql.close();
}
main();
