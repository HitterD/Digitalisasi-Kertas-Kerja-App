import sql from 'mssql';

const config = {
    user: 'OpsSupport',
    password: 'Kalosi1927',
    database: 'ASSET_MANAGEMENT',
    server: '192.168.2.111',
    port: 1433,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: false, trustServerCertificate: true },
};

(async () => {
    try {
        const pool = await sql.connect(config);
        const periode = "SJA1-02202601-ICT";
        console.log("Starting opname-data query (optimized)...");
        console.time("opname-data");
        const res1 = await pool.request()
            .input('periode', sql.NVarChar, periode)
            .query(`
          SELECT 
            td.id, td.Periode, td.Ruangan_Opname, td.Barcode, td.Nama_Asset,
            td.Ruangan_Barcode, td.Kondisi, td.Keterangan, td.created_date,
            td.KETIDAKSESUAIAN, td.TARGET_PENYELESAIAN, td.ACTION,
            v.CREATE_USER, v.PIC_RUANGAN
          FROM [dbo].[TD_OPNAME] td
          OUTER APPLY (
              SELECT TOP 1 CREATE_USER, PIC_RUANGAN
              FROM [dbo].[V_REPORT_ALL_DETAIL] vr
              WHERE vr.BARCODE_ASSET = td.Barcode
              ORDER BY vr.TRANS_DATE DESC, vr.HIST_ID DESC
          ) v
          WHERE td.Periode LIKE '%-%' + @periode + '%' OR td.Periode = @periode
          ORDER BY td.Ruangan_Opname, td.id
        `);
        console.timeEnd("opname-data");
        console.log("opname-data rows:", res1.recordset.length);

        console.log("Starting opname-not-scanned query (optimized)...");
        console.time("opname-not-scanned");
        const roomsResult = await pool.request()
            .input('periode', sql.NVarChar, periode)
            .query(`
        SELECT DISTINCT RUANGAN_OPNAME
        FROM [dbo].[TH_OPNAME]
        WHERE PERIODE LIKE '%-%' + @periode + '%' OR PERIODE = @periode
      `);
        console.log("Rooms:", roomsResult.recordset.length);

        const res2 = await pool.request()
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
            lm.CREATE_USER
        FROM LatestMaster lm
        WHERE lm.rn = 1
          AND NOT EXISTS (
            SELECT 1 FROM [dbo].[TD_OPNAME] td
            WHERE (td.Periode LIKE '%-%' + @periode2 + '%' OR td.Periode = @periode2)
              AND td.Barcode = lm.BARCODE_ASSET
          )
      `);
        console.timeEnd("opname-not-scanned");
        console.log("opname-not-scanned rows:", res2.recordset.length);

        await pool.close();
    } catch (err) {
        console.error("Error:", err);
    }
})();
