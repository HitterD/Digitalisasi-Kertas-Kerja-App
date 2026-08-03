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
    const r702 = await sql.query("SELECT * FROM RUANGAN WHERE NOINDEX = '702' OR NOINDEX = 702");
    console.log('RUANGAN 702:', r702.recordset);
    const r95 = await sql.query("SELECT * FROM RUANGAN WHERE NOINDEX = '95' OR NOINDEX = 95");
    console.log('RUANGAN 95:', r95.recordset);
  } catch(e) { console.error(e.message); }
  sql.close();
}
main();
