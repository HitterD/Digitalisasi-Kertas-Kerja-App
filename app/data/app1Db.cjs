/**
 * app1Db.cjs — Per-user SQLite database manager using node:sqlite built-in
 * 
 * Switched from better-sqlite3 to node:sqlite because:
 * - The Node v24 environment has ABI mismatches with prebuilt better-sqlite3 binaries
 * - node:sqlite provides the exact same synchronous API natively in Node 22.5+
 * - Simpler, no native dependencies to install!
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Cache connections to avoid reopening for the same user
const dbCache = new Map();

/**
 * Gets or creates a SQLite database connection for a specific user.
 * @param {string} username
 * @returns {DatabaseSync} The synchronous node:sqlite connection.
 */
function getDbForUser(username) {
    if (!username) {
        throw new Error('Username is required for database connection');
    }

    const safeUsername = String(username).replace(/[^a-zA-Z0-9_-]/g, '_');

    if (dbCache.has(safeUsername)) {
        return dbCache.get(safeUsername);
    }

    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, `app1_local_${safeUsername}.db`);
    const db = new DatabaseSync(dbPath);

    // Enable WAL mode for better concurrency
    db.exec('PRAGMA journal_mode = WAL');

    // Ensure table exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS APP1_OPNAME (
            id TEXT PRIMARY KEY,
            periode TEXT NOT NULL,
            roomName TEXT,
            no TEXT,
            barcode TEXT,
            namaAset TEXT,
            noPO TEXT,
            tipe TEXT,
            bulanPerolehan TEXT,
            tahunPerolehan TEXT,
            adaTidakAda TEXT,
            kondisi TEXT,
            keterangan TEXT,
            isChecked INTEGER,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    dbCache.set(safeUsername, db);
    console.log(`[SQLite - ${safeUsername}] Connected at: ${dbPath}`);

    return db;
}

/**
 * Upsert records into APP1_OPNAME for a specific user.
 * @param {string} username
 * @param {string} periode
 * @param {string} roomName
 * @param {Array} assets
 */
function syncOpnameData(username, periode, roomName, assets) {
    const db = getDbForUser(username);

    const upsert = db.prepare(`
        INSERT INTO APP1_OPNAME (
            id, periode, roomName, no, barcode, namaAset, noPO, tipe,
            bulanPerolehan, tahunPerolehan, adaTidakAda, kondisi, keterangan, isChecked, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
            roomName=excluded.roomName,
            no=excluded.no,
            barcode=excluded.barcode,
            namaAset=excluded.namaAset,
            noPO=excluded.noPO,
            tipe=excluded.tipe,
            bulanPerolehan=excluded.bulanPerolehan,
            tahunPerolehan=excluded.tahunPerolehan,
            adaTidakAda=excluded.adaTidakAda,
            kondisi=excluded.kondisi,
            keterangan=excluded.keterangan,
            isChecked=excluded.isChecked,
            updatedAt=CURRENT_TIMESTAMP
    `);

    // transaction wrap for better performance
    db.exec('BEGIN TRANSACTION');
    try {
        for (const asset of assets) {
            const recordId = asset.id || `${periode}-${roomName}-${asset.barcode || Date.now()}`;
            upsert.run(
                recordId,
                periode,
                roomName,
                asset.no || '',
                asset.barcode || '',
                asset.namaAset || '',
                asset.noPO || '',
                asset.tipe || '',
                asset.bulanPerolehan || '',
                asset.tahunPerolehan || '',
                asset.adaTidakAda || '',
                asset.kondisi || '',
                asset.keterangan || '',
                asset.isChecked ? 1 : 0
            );
        }
        db.exec('COMMIT');
    } catch (err) {
        db.exec('ROLLBACK');
        throw err;
    }

    console.log(`[SQLite - ${username}] Synced ${assets.length} assets for room "${roomName}" (periode: ${periode})`);
}

/**
 * Fetch all opname data for a specific periode and user.
 * @param {string} username
 * @param {string} periode
 * @returns {Array}
 */
function getOpnameDataByPeriode(username, periode) {
    const db = getDbForUser(username);
    const rows = db.prepare(
        "SELECT * FROM APP1_OPNAME WHERE periode LIKE '%' || ? || '%'"
    ).all(periode);
    return rows || [];
}

module.exports = {
    getDbForUser,
    syncOpnameData,
    getOpnameDataByPeriode
};
