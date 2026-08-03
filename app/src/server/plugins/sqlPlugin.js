import sql from 'mssql';
import { getAllowedOrigin, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { registry, UpstreamOpenError, UpstreamTimeoutError } from '../utils/upstreamHealth.js';

const SQL_REQUEST_TIMEOUT_MS = parseInt(process.env.UPSTREAM_REQUEST_TIMEOUT_MS || '15000');
const SQL_CONNECTION_TIMEOUT_MS = 10000;

const sqlConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
  server: process.env.MSSQL_HOST || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  connectionTimeout: SQL_CONNECTION_TIMEOUT_MS,
  requestTimeout: SQL_REQUEST_TIMEOUT_MS,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(sqlConfig).catch((err) => {
      console.error('[SQL Server] Connection failed:', err.message);
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

function handleGuardError(err, sendJson, res) {
  if (err instanceof UpstreamOpenError) {
    res.setHeader('Retry-After', String(err.retryAfter));
    sendJson(503, {
      success: false,
      error: err.message,
      code: err.code,
      retryAfter: err.retryAfter,
    });
    return true;
  }
  if (err instanceof UpstreamTimeoutError) {
    sendJson(504, {
      success: false,
      error: err.message,
      code: err.code,
    });
    return true;
  }
  return false;
}

function sqlServerMiddleware(req, res, next) {
  const sendJson = createJsonSender(req, res);

  if (handleCorsIfPreflight(req, res, '/api/db/', 'GET, OPTIONS')) return;

  // GET /api/db/status
  if (req.url === '/api/db/status' && req.method === 'GET') {
    (async () => {
      try {
        const result = await registry.guard('sql', async () => {
          const pool = await getPool();
          await pool.request().query('SELECT 1 AS ok');
          return {
            connected: true,
            server: sqlConfig.server,
            database: sqlConfig.database,
            timestamp: new Date().toISOString(),
          };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });
        sendJson(200, result);
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        sendJson(500, {
          connected: false,
          error: err.message,
          server: sqlConfig.server,
        });
      }
    })();
    return;
  }

  // GET /api/db/master-assets
  if (req.url?.startsWith('/api/db/master-assets') && req.method === 'GET') {
    (async () => {
      try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 0;

        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const countResult = await pool.request().query(`
            SELECT COUNT(DISTINCT BARCODE_ASSET) as total
            FROM [dbo].[V_REPORT_ALL_DETAIL]
            WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
          `);
          const total = countResult.recordset[0].total;

          let query = `
            SELECT
              LTRIM(RTRIM(BARCODE_ASSET)) AS BARCODE_ASSET,
              LTRIM(RTRIM(NAMA_ASSET)) AS NAMA_ASSET,
              LTRIM(RTRIM(KODE_TYPE_ASSET)) AS KODE_TYPE_ASSET,
              BULAN, TAHUN,
              LTRIM(RTRIM(NAMA_KONDISI)) AS NAMA_KONDISI,
              LTRIM(RTRIM(KETERANGAN)) AS KETERANGAN,
              LTRIM(RTRIM(NO_PO)) AS NO_PO,
              LTRIM(RTRIM(NAMA_RUANGAN)) AS LOCATION_CODE,
              LTRIM(RTRIM(PIC_RUANGAN)) AS PIC_RUANGAN
            FROM (
              SELECT *,
                ROW_NUMBER() OVER (
                  PARTITION BY BARCODE_ASSET
                  ORDER BY TRANS_DATE DESC, HIST_ID DESC
                ) AS rn
              FROM [dbo].[V_REPORT_ALL_DETAIL]
              WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
            ) sub
            WHERE rn = 1
            ORDER BY BARCODE_ASSET
          `;

          const request = pool.request();
          if (limit > 0) {
            query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
            request.input('offset', sql.Int, (page - 1) * limit);
            request.input('limit', sql.Int, limit);
          }

          const result = await request.query(query);
          return { total, page, limit, count: result.recordset.length, data: result.recordset, timestamp: new Date().toISOString() };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });

        console.log(`[SQL Server] Master assets fetched: ${data.count} rows`);
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error('[SQL Server] Master assets query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/history-assets
  if (req.url?.startsWith('/api/db/history-assets') && req.method === 'GET') {
    (async () => {
      try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 0;

        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const countResult = await pool.request().query(`
            SELECT COUNT(*) as total
            FROM [dbo].[V_REPORT_ALL_DETAIL]
            WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
          `);
          const total = countResult.recordset[0].total;

          let query = `
            SELECT
              BARCODE_ASSET, NAMA_RUANGAN, KETERANGAN,
              NAMA_KONDISI, TRANS_DATE, KETERANGAN_OPNAME, SITE_ID
            FROM [dbo].[V_REPORT_ALL_DETAIL]
            WHERE BARCODE_ASSET IS NOT NULL AND LTRIM(RTRIM(BARCODE_ASSET)) <> ''
            ORDER BY TRANS_DATE DESC, HIST_ID DESC
          `;

          const request = pool.request();
          if (limit > 0) {
            query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
            request.input('offset', sql.Int, (page - 1) * limit);
            request.input('limit', sql.Int, limit);
          }

          const result = await request.query(query);
          return { total, page, limit, count: result.recordset.length, data: result.recordset, timestamp: new Date().toISOString() };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });

        console.log(`[SQL Server] History assets fetched: ${data.count} rows`);
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error('[SQL Server] History assets query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/opname-periods
  if (req.url === '/api/db/opname-periods' && req.method === 'GET') {
    (async () => {
      try {
        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const result = await pool.request().query(`
            SELECT DISTINCT Periode
            FROM [dbo].[TD_OPNAME]
            ORDER BY Periode DESC
          `);
          return { data: result.recordset.map(r => r.Periode), timestamp: new Date().toISOString() };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error('[SQL Server] Opname periods query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/opname-data/:periode
  const opnameDataMatch = req.url?.match(/^\/api\/db\/opname-data\/([^/?]+)/);
  if (opnameDataMatch && req.method === 'GET') {
    const periode = decodeURIComponent(opnameDataMatch[1]);
    (async () => {
      try {
        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const result = await pool.request()
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
          return { count: result.recordset.length, data: result.recordset, timestamp: new Date().toISOString() };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error(`[SQL Server] Opname data query failed:`, err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/opname-not-scanned/:periode
  const notScannedMatch = req.url?.match(/^\/api\/db\/opname-not-scanned\/([^/?]+)/);
  if (notScannedMatch && req.method === 'GET') {
    const periode = decodeURIComponent(notScannedMatch[1]);
    (async () => {
      try {
        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const roomsResult = await pool.request()
            .input('periode', sql.NVarChar, periode)
            .query(`
              SELECT DISTINCT RUANGAN_OPNAME
              FROM [dbo].[TH_OPNAME]
              WHERE PERIODE LIKE '%-%' + @periode + '%' OR PERIODE = @periode
            `);
          const rooms = roomsResult.recordset.map(r => r.RUANGAN_OPNAME);

          const result = await pool.request()
            .input('periode2', sql.NVarChar, periode)
            .query(`
              WITH LatestMaster AS (
                  SELECT
                      M.BARCODE_ASSET, M.NAMA_ASSET, M.NAMA_RUANGAN,
                      M.NO_PO, M.KODE_TYPE_ASSET, M.NAMA_KONDISI,
                      M.PIC_RUANGAN, M.CREATE_USER, M.KETERANGAN,
                      ROW_NUMBER() OVER (
                          PARTITION BY M.BARCODE_ASSET
                          ORDER BY M.TRANS_DATE DESC, M.HIST_ID DESC
                      ) as rn
                  FROM [dbo].[V_REPORT_ALL_DETAIL] M
                  WHERE M.BARCODE_ASSET IS NOT NULL AND M.BARCODE_ASSET <> ''
              )
              SELECT
                  lm.BARCODE_ASSET,
                  lm.NAMA_ASSET,
                  lm.NAMA_RUANGAN,
                  lm.NO_PO,
                  lm.KODE_TYPE_ASSET,
                  lm.NAMA_KONDISI,
                  lm.PIC_RUANGAN,
                  lm.CREATE_USER,
                  LTRIM(RTRIM(lm.KETERANGAN)) AS KETERANGAN_MASTER
              FROM LatestMaster lm
              WHERE lm.rn = 1
                AND NOT EXISTS (
                  SELECT 1 FROM [dbo].[TD_OPNAME] td
                  WHERE (td.Periode LIKE '%-%' + @periode2 + '%' OR td.Periode = @periode2)
                    AND td.Barcode = lm.BARCODE_ASSET
                )
            `);

          const byRoom = {};
          for (const row of result.recordset) {
            const room = row.NAMA_RUANGAN || 'UNKNOWN';
            if (!byRoom[room]) byRoom[room] = [];
            byRoom[room].push(row);
          }

          const filteredByRoom = {};
          for (const room of rooms) {
            if (byRoom[room]) {
              filteredByRoom[room] = byRoom[room];
            }
          }

          const totalNotScanned = Object.values(filteredByRoom).reduce((s, arr) => s + arr.length, 0);
          return { rooms, data: filteredByRoom, totalNotScanned, timestamp: new Date().toISOString() };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error(`[SQL Server] Not-scanned query failed:`, err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/mat-history/:barcode
  const matHistoryMatch = req.url?.match(/^\/api\/db\/mat-history\/([^/?]+)/);
  if (matHistoryMatch && req.method === 'GET') {
    const barcode = decodeURIComponent(matHistoryMatch[1]);
    (async () => {
      if (!barcode.trim()) {
        sendJson(400, { success: false, error: 'Barcode tidak boleh kosong' });
        return;
      }
      try {
        const data = await registry.guard('sql', async () => {
          const pool = await getPool();
          const result = await pool.request()
            .input('barcode', sql.NVarChar, barcode.trim())
            .query(`
              SELECT
                TRXID, NO_MAT, JENIS_MAT,
                ASAL_RUANGAN_ID, TUJUAN_RUANGAN_ID,
                (SELECT TOP 1 NAMA_RUANGAN FROM [dbo].[RUANGAN] WHERE CAST(NOINDEX AS VARCHAR(50)) = LTRIM(RTRIM(CAST(V_TRX_MAT.ASAL_RUANGAN_ID AS VARCHAR(50))))) AS ASAL_RUANGAN_NAME,
                (SELECT TOP 1 NAMA_RUANGAN FROM [dbo].[RUANGAN] WHERE CAST(NOINDEX AS VARCHAR(50)) = LTRIM(RTRIM(CAST(V_TRX_MAT.TUJUAN_RUANGAN_ID AS VARCHAR(50))))) AS TUJUAN_RUANGAN_NAME,
                LPB, KONDISI_ID, CREATED_DATE,
                USER_MAKER, NAME_MAKER,
                STATUS, PENJELASAN,
                COUNTER_NUM, STEP_APPROVAL,
                DEPT, BARCODE_ASSET, NAMA_ASSET,
                NEXT_VERIFICATOR, NEXT_ROLE_VERIFICATOR
              FROM [dbo].[V_TRX_MAT]
              WHERE LTRIM(RTRIM(BARCODE_ASSET)) = @barcode
              ORDER BY CREATED_DATE DESC
            `);

          const stepsResult = await pool.request()
            .input('barcode', sql.NVarChar, barcode.trim())
            .query(`
              SELECT
                ID, TRXID, VERIFIED_BY, NEXT_VERIFICATOR, STATUS, NOTE, VERIFIED_DATE, CREATED_DATE, NEXT_ROLE
              FROM [dbo].[T_VERIFIED_STEP]
              WHERE TRXID IN (
                SELECT TRXID FROM [dbo].[V_TRX_MAT]
                WHERE LTRIM(RTRIM(BARCODE_ASSET)) = @barcode
              )
              ORDER BY TRXID, ID ASC
            `);

          // Group steps by TRXID
          const stepsByTrx = {};
          for (const step of stepsResult.recordset) {
            if (!stepsByTrx[step.TRXID]) stepsByTrx[step.TRXID] = [];
            stepsByTrx[step.TRXID].push(step);
          }

          // Attach steps to MAT records
          const dataWithSteps = result.recordset.map(r => ({
            ...r,
            approvalSteps: stepsByTrx[r.TRXID] || []
          }));

          const apprResult = await pool.request().query(`
            SELECT JENIS_MAT, ROLE, STEP_APPROVAL, DEPT 
            FROM [dbo].[T_APPROVAL]
            ORDER BY JENIS_MAT, DEPT, STEP_APPROVAL ASC
          `);
          const approvalTemplates = apprResult.recordset;

          const INACTIVE_STATUSES = ['COMPLETED', 'REJECTED'];
          const hasActiveMAT = result.recordset.some(
            (r) => !INACTIVE_STATUSES.includes((r.STATUS || '').toUpperCase())
          );

          return {
            barcode: barcode.trim(),
            hasActiveMAT,
            count: dataWithSteps.length,
            data: dataWithSteps,
            approvalTemplates,
            timestamp: new Date().toISOString(),
          };
        }, { timeoutMs: SQL_REQUEST_TIMEOUT_MS });
        console.log(`[SQL Server] MAT history for ${barcode}: ${data.count} records, hasActiveMAT=${data.hasActiveMAT}`);
        sendJson(200, { success: true, ...data });
      } catch (err) {
        if (handleGuardError(err, sendJson, res)) return;
        console.error('[SQL Server] MAT history query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  next();
}

export default function viteSqlServerPlugin() {
  return {
    name: 'vite-plugin-sql-server',
    configureServer(server) {
      server.middlewares.use(sqlServerMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(sqlServerMiddleware);
    },
  };
}
