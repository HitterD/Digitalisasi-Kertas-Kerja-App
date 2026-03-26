import { openDB } from 'idb';

const DB_NAME = 'opname-kertas-kerja';
const DB_VERSION = 1;
const STORE_NAME = 'opname-data';

/**
 * Helper to get the current username as a prefix for IndexedDB keys.
 * This ensures data isolation between different users sharing the same device.
 */
export function getUserPrefix() {
    try {
        const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
        const auth = authStr ? JSON.parse(authStr) : {};
        return auth.user ? `${auth.user}_` : 'guest_';
    } catch {
        return 'guest_';
    }
}

async function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        },
    });
}

export async function saveOpnameData(key, data) {
    const db = await getDB();
    await db.put(STORE_NAME, data, `${getUserPrefix()}${key}`);
}

export async function loadOpnameData(key) {
    const db = await getDB();
    return db.get(STORE_NAME, `${getUserPrefix()}${key}`);
}

export async function deleteOpnameData(key) {
    const db = await getDB();
    await db.delete(STORE_NAME, `${getUserPrefix()}${key}`);
}

export async function getAllKeys() {
    const db = await getDB();
    const prefix = getUserPrefix();
    const all = await db.getAllKeys(STORE_NAME);
    return all.filter(k => k.startsWith(prefix)).map(k => k.replace(prefix, ''));
}

export async function clearAllData() {
    const db = await getDB();
    const prefix = getUserPrefix();
    const keys = await db.getAllKeys(STORE_NAME);
    const userKeys = keys.filter(k => k.startsWith(prefix));

    if (userKeys.length > 0) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        for (const key of userKeys) {
            tx.store.delete(key);
        }
        await tx.done;
    }
}

// ============================================================
// Master DB — Excel Buffer storage (legacy/file upload)
// ============================================================
const MASTER_DB_KEY = 'master-db';

export async function saveMasterDb(buffer, fileName) {
    const db = await getDB();
    await db.put(STORE_NAME, { buffer, fileName }, `${getUserPrefix()}${MASTER_DB_KEY}`);
}

export async function loadMasterDb() {
    const db = await getDB();
    return db.get(STORE_NAME, `${getUserPrefix()}${MASTER_DB_KEY}`);
}

// ============================================================
// History DB — Excel Buffer storage (legacy/file upload)
// ============================================================
const HISTORY_DB_KEY = 'history-db';

export async function saveHistoryDb(buffer, fileName) {
    const db = await getDB();
    await db.put(STORE_NAME, { buffer, fileName }, `${getUserPrefix()}${HISTORY_DB_KEY}`);
}

export async function loadHistoryDb() {
    const db = await getDB();
    return db.get(STORE_NAME, `${getUserPrefix()}${HISTORY_DB_KEY}`);
}

// ============================================================
// Master DB — JSON Map data (SQL Server / any source)
// Stores the Map as a plain object so it survives refresh.
// ============================================================
const MASTER_DATA_KEY = 'master-data-json';

/**
 * Save master DB Map data as JSON to IndexedDB.
 * @param {Map} mapData - The master lookup Map
 * @param {string} fileName - Display name (e.g. "SQL Server (97313 aset)")
 * @param {string} source - 'server' or 'file'
 * @param {string|null} syncTime - ISO timestamp
 */
export async function saveMasterData(mapData, fileName, source, syncTime) {
    const db = await getDB();
    // Convert Map to plain object for JSON-safe storage
    const entries = Object.fromEntries(mapData);
    await db.put(STORE_NAME, { entries, fileName, source, syncTime }, `${getUserPrefix()}${MASTER_DATA_KEY}`);
}

/**
 * Load master DB Map data from IndexedDB.
 * @returns {Promise<{entries: object, fileName: string, source: string, syncTime: string}|undefined>}
 */
export async function loadMasterData() {
    const db = await getDB();
    return db.get(STORE_NAME, `${getUserPrefix()}${MASTER_DATA_KEY}`);
}

// ============================================================
// History DB — JSON Map data (SQL Server / any source)
// ============================================================
const HISTORY_DATA_KEY = 'history-data-json';

/**
 * Save history DB Map data as JSON to IndexedDB.
 * @param {Map} mapData - The history lookup Map (barcode -> array of records)
 * @param {string} fileName
 * @param {string} source
 * @param {string|null} syncTime
 */
export async function saveHistoryData(mapData, fileName, source, syncTime) {
    const db = await getDB();
    // Convert Map of arrays to plain object
    const entries = {};
    for (const [key, value] of mapData) {
        entries[key] = value;
    }
    await db.put(STORE_NAME, { entries, fileName, source, syncTime }, `${getUserPrefix()}${HISTORY_DATA_KEY}`);
}

/**
 * Load history DB Map data from IndexedDB.
 * @returns {Promise<{entries: object, fileName: string, source: string, syncTime: string}|undefined>}
 */
export async function loadHistoryData() {
    const db = await getDB();
    return db.get(STORE_NAME, `${getUserPrefix()}${HISTORY_DATA_KEY}`);
}

// ============================================================
// Extract Opname DB — JSON data (state persistence)
// ============================================================
const EXTRACT_DATA_KEY = 'extract-opname-state';

export async function saveExtractOpnameState(payload) {
    const db = await getDB();
    const serializablePayload = {
        ...payload,
        app1DataMapEntries: payload.app1DataMap ? Array.from(payload.app1DataMap.entries()) : null,
        oracleDataMapEntries: payload.oracleDataMap ? Array.from(payload.oracleDataMap.entries()) : null,
    };
    delete serializablePayload.app1DataMap;
    delete serializablePayload.oracleDataMap;
    
    await db.put(STORE_NAME, serializablePayload, `${getUserPrefix()}${EXTRACT_DATA_KEY}`);
}

export async function loadExtractOpnameState() {
    const db = await getDB();
    const data = await db.get(STORE_NAME, `${getUserPrefix()}${EXTRACT_DATA_KEY}`);
    if (data) {
        if (data.app1DataMapEntries) {
            data.app1DataMap = new Map(data.app1DataMapEntries);
        }
        if (data.oracleDataMapEntries) {
            data.oracleDataMap = new Map(data.oracleDataMapEntries);
        }
    }
    return data;
}
