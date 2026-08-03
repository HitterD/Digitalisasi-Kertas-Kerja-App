/**
 * Diagnostic test — test actual MSSQL connection to 192.168.2.111:1433
 * dengan kredensial dari .env. Jalankan dengan:
 *
 *   cd app && npm test -- mssqlConnectionDiagnostic
 *
 * Output akan menunjukkan error PERSIS dari MSSQL — bukan "Upstream tidak tersedia"
 * yang misleading. Ini diagnostic only, bukan untuk CI.
 */

import { describe, it, expect } from 'vitest';
import sql from 'mssql';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env manually (vitest tidak otomatis load dotenv untuk test ini)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  });
} catch {
  // .env not found, use process.env
}

const MSSQL_CONFIG = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
  server: process.env.MSSQL_HOST || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  connectionTimeout: 10000,
  requestTimeout: 5000,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

describe('MSSQL Connection Diagnostic', () => {
  it('connects to MSSQL with .env credentials', async () => {
    console.log('\n=== MSSQL Connection Diagnostic ===');
    console.log('Host:', MSSQL_CONFIG.server);
    console.log('Port:', MSSQL_CONFIG.port);
    console.log('User:', MSSQL_CONFIG.user);
    console.log('Database:', MSSQL_CONFIG.database);
    console.log('==================================\n');

    const start = Date.now();
    let pool;
    try {
      pool = await sql.connect(MSSQL_CONFIG);
      const connectMs = Date.now() - start;
      console.log(`✓ Connected in ${connectMs}ms`);

      const queryStart = Date.now();
      const result = await pool.request().query('SELECT 1 AS ok, GETDATE() AS server_time');
      const queryMs = Date.now() - queryStart;
      console.log(`✓ Query OK in ${queryMs}ms:`, result.recordset[0]);

      await pool.close();
      console.log('\n✅ MSSQL connection SUCCESS — sync harusnya jalan.');
    } catch (err) {
      const elapsed = Date.now() - start;
      console.error(`\n❌ MSSQL connection FAILED after ${elapsed}ms`);
      console.error('Error name:', err.name);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('\n--- Diagnosis ---');

      const msg = (err.message || '').toLowerCase();
      if (msg.includes('econnrefused') || err.code === 'ECONNREFUSED') {
        console.error('→ Port 1433 refused. SQL Server service kemungkinan tidak jalan di', MSSQL_CONFIG.server);
        console.error('→ Cek: Get-Service MSSQLSERVER di', MSSQL_CONFIG.server);
      } else if (msg.includes('etimedout') || err.code === 'ETIMEDOUT') {
        console.error('→ Connection timeout. Firewall mungkin block port 1433.');
        console.error('→ Cek: Test-NetConnection -ComputerName', MSSQL_CONFIG.server, '-Port 1433');
      } else if (msg.includes('enotfound') || err.code === 'ENOTFOUND') {
        console.error('→ Host tidak ditemukan di DNS/network.');
      } else if (msg.includes('login failed') || err.code === 'ELOGIN') {
        console.error('→ SQL Server reject kredensial. Cek MSSQL_USER / MSSQL_PASSWORD di .env');
        console.error('→ SQL Server mungkin pakai Windows Authentication only.');
      } else if (msg.includes('certificate') || err.code === 'ESOCKET') {
        console.error('→ TLS/SSL issue. Cek encrypt / trustServerCertificate option.');
      } else {
        console.error('→ Unknown error. Lihat message di atas.');
      }

      if (pool) await pool.close().catch(() => {});

      // FAIL the test dengan info error supaya visible di output
      throw new Error(`MSSQL connection failed: ${err.message}`);
    }
  }, 30000);
});
