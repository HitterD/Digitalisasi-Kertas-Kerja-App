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
    const result = await sql.query("SELECT TOP 1 JENIS_MAT, DEPT, ASAL_RUANGAN_ID FROM V_TRX_MAT WHERE LTRIM(RTRIM(BARCODE_ASSET)) = '1700003715'");
    console.log('MAT records:', result.recordset);
  } catch(e) { console.error(e.message); }
  sql.close();
}
main();
