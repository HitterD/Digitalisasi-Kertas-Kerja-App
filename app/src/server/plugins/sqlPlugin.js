import sql from 'mssql';
import { getAllowedOrigin, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';

// SQL Server connection config (credentials from .env ONLY)
const sqlConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
  server: process.env.MSSQL_HOST || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false,           // Not using Azure
    trustServerCertificate: true,
  },
};

// Lazy-init connection pool
let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(sqlConfig).catch((err) => {
      console.error('[SQL Server] Connection failed:', err.message);
      poolPromise = null; // Reset so next call retries
      throw err;
    });
  }
  return poolPromise;
}

function sqlServerMiddleware(req, res, next) {
  const sendJson = createJsonSender(req, res);

  // CORS preflight
  if (handleCorsIfPreflight(req, res, '/api/db/', 'GET, OPTIONS')) return;

  // GET /api/db/status — Connection health check
  if (req.url === '/api/db/status' && req.method === 'GET') {
    (async () => {
      try {
        const pool = await getPool();
        await pool.request().query('SELECT 1 AS ok');
        sendJson(200, {
          connected: true,
          server: sqlConfig.server,
          database: sqlConfig.database,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        sendJson(500, {
          connected: false,
          error: err.message,
          server: sqlConfig.server,
        });
      }
    })();
    return;
  }

  // GET /api/db/master-assets — Fetch master asset data (one record per barcode)
  if (req.url?.startsWith('/api/db/master-assets') && req.method === 'GET') {
    (async () => {
      try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 0; // 0 means all

        const pool = await getPool();
        
        // Count total for pagination
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

        console.log(`[SQL Server] Master assets fetched: ${result.recordset.length} rows (Page ${page}, Limit ${limit}, Total ${total})`);
        sendJson(200, {
          success: true,
          total,
          page,
          limit,
          count: result.recordset.length,
          data: result.recordset,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[SQL Server] Master assets query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/history-assets — Fetch all history records
  if (req.url?.startsWith('/api/db/history-assets') && req.method === 'GET') {
    (async () => {
      try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 0; // 0 means all

        const pool = await getPool();

        // Count total for pagination
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

        console.log(`[SQL Server] History assets fetched: ${result.recordset.length} rows (Page ${page}, Limit ${limit}, Total ${total})`);
        sendJson(200, {
          success: true,
          total,
          page,
          limit,
          count: result.recordset.length,
          data: result.recordset,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[SQL Server] History assets query failed:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }

  // GET /api/db/opname-periods — Distinct periods from TD_OPNAME
  if (req.url === '/api/db/opname-periods' && req.method === 'GET') {
    (async () => {
      try {
        const pool = await getPool();
        const result = await pool.request().query(`
          SELECT DISTINCT Periode
          FROM [dbo].[TD_OPNAME]
          ORDER BY Periode DESC
        `);
        sendJson(200, {
          success: true,
          data: result.recordset.map(r => r.Periode),
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
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
        sendJson(200, {
          success: true,
          count: result.recordset.length,
          data: result.recordset,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
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
                    M.PIC_RUANGAN, M.CREATE_USER,
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
                LTRIM(RTRIM(vr.KETERANGAN)) AS KETERANGAN_MASTER
            FROM LatestMaster lm
            OUTER APPLY (
                SELECT TOP 1 KETERANGAN
                FROM [dbo].[V_REPORT_ALL_DETAIL] vr
                WHERE vr.BARCODE_ASSET = lm.BARCODE_ASSET
                ORDER BY vr.TRANS_DATE DESC, vr.HIST_ID DESC
            ) vr
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

        sendJson(200, {
          success: true,
          rooms,
          data: filteredByRoom,
          totalNotScanned,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`[SQL Server] Not-scanned query failed:`, err.message);
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
