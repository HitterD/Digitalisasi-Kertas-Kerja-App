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
      SELECT TOP 5 *
      FROM [dbo].[T_VERIFIED_STEP]
      ORDER BY CREATED_DATE DESC
    `);
    console.log('T_VERIFIED_STEP:', result.recordset);
  } catch(e) { console.error(e.message); }
  sql.close();
}
main();
