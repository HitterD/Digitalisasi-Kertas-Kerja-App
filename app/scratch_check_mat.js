import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const config = {
  user: process.env.MSSQL_USER || 'OpsSupport',
  password: process.env.MSSQL_PASSWORD || 'Kalosi1927',
  server: process.env.MSSQL_HOST || '192.168.2.111',
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 10000,
  requestTimeout: 10000,
};

async function checkDatabase() {
  console.log(`[DB Check] Connecting to ${config.server}/${config.database}...`);
  try {
    const pool = await sql.connect(config);
    console.log('[DB Check] Connected successfully!');

    // 1. List all tables & views containing MAT, MUTASI, SERAH, BAST, ASSET, TRX
    const tablesQuery = `
      SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%MAT%' 
         OR TABLE_NAME LIKE '%MUTAS%' 
         OR TABLE_NAME LIKE '%SERAH%' 
         OR TABLE_NAME LIKE '%BAST%'
         OR TABLE_NAME LIKE '%TRX%'
      ORDER BY TABLE_TYPE, TABLE_NAME
    `;
    const tablesRes = await pool.request().query(tablesQuery);
    console.log('\n--- MAT & MUTASI RELATED TABLES / VIEWS IN DATABASE ---');
    console.table(tablesRes.recordset);

    // 2. Sample records from V_TRX_MAT if available
    try {
      const matSample = await pool.request().query(`
        SELECT TOP 5 TRXID, NO_MAT, JENIS_MAT, BARCODE_ASSET, NAMA_ASSET, STATUS, CREATED_DATE, USER_MAKER
        FROM [dbo].[V_TRX_MAT]
        ORDER BY CREATED_DATE DESC
      `);
      console.log('\n--- SAMPLE RECENT DATA FROM V_TRX_MAT ---');
      console.table(matSample.recordset);
    } catch (e) {
      console.log('[DB Check] V_TRX_MAT query error:', e.message);
    }

    // 3. Total count of records in V_TRX_MAT
    try {
      const countRes = await pool.request().query(`SELECT COUNT(*) as total FROM [dbo].[V_TRX_MAT]`);
      console.log('\nTotal transaksi MAT di V_TRX_MAT:', countRes.recordset[0]?.total);
    } catch (e) {
      console.log('[DB Check] Count query error:', e.message);
    }

    await pool.close();
  } catch (err) {
    console.error('[DB Check] Database connection / query failed:', err.message);
  }
}

checkDatabase();
