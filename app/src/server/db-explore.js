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
  try {
    await sql.connect(config);
    const result = await sql.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%MAT%' OR TABLE_NAME LIKE '%APP%' OR TABLE_NAME LIKE '%VERIF%'");
    console.log('Tables:', result.recordset.map(r => r.TABLE_NAME));
    
    const r2 = await sql.query("SELECT TOP 1 * FROM V_TRX_MAT");
    console.log('V_TRX_MAT cols:', Object.keys(r2.recordset[0] || {}));
    
    sql.close();
  } catch(e) { console.error(e.message); }
}

main();
