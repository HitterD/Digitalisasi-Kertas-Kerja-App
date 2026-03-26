const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '.');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database file for User Saves
const SAVE_DB_PATH = path.join(DATA_DIR, 'app1_saves.db');
let saveDb = null;

function getSaveDb() {
    if (!saveDb) {
        saveDb = new DatabaseSync(SAVE_DB_PATH, {
            // open: true
        });

        // Initialize schema
        saveDb.exec(`
            CREATE TABLE IF NOT EXISTS APP1_SAVES (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                name TEXT NOT NULL,
                periode TEXT,
                roomCount INTEGER DEFAULT 0,
                assetCount INTEGER DEFAULT 0,
                stateJson TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_saves_username ON APP1_SAVES(username);
        `);
    }
    return saveDb;
}

/**
 * List all saves for a user (without the heavy stateJson)
 * @param {string} username
 */
function getUserSaves(username) {
    const db = getSaveDb();
    const stmt = db.prepare(`
        SELECT id, username, name, periode, roomCount, assetCount, createdAt, updatedAt 
        FROM APP1_SAVES 
        WHERE username = ? 
        ORDER BY updatedAt DESC
    `);
    return stmt.all(username);
}

/**
 * Get full save data by ID
 */
function getSaveById(id, username) {
    const db = getSaveDb();
    const stmt = db.prepare(`SELECT * FROM APP1_SAVES WHERE id = ? AND username = ?`);
    return stmt.get(id, username);
}

/**
 * Insert new save (Save As)
 */
function createSave(id, username, name, periode, roomCount, assetCount, stateJson) {
    const db = getSaveDb();
    const stmt = db.prepare(`
        INSERT INTO APP1_SAVES (id, username, name, periode, roomCount, assetCount, stateJson, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `);
    stmt.run(id, username, name, periode, roomCount, assetCount, stateJson);
}

/**
 * Update existing save (Save)
 */
function updateSave(id, username, name, periode, roomCount, assetCount, stateJson) {
    const db = getSaveDb();
    const stmt = db.prepare(`
        UPDATE APP1_SAVES 
        SET name = ?, periode = ?, roomCount = ?, assetCount = ?, stateJson = ?, updatedAt = datetime('now', 'localtime')
        WHERE id = ? AND username = ?
    `);
    const info = stmt.run(name, periode, roomCount, assetCount, stateJson, id, username);
    return info.changes > 0;
}

/**
 * Delete a save
 */
function deleteSave(id, username) {
    const db = getSaveDb();
    const stmt = db.prepare(`DELETE FROM APP1_SAVES WHERE id = ? AND username = ?`);
    const info = stmt.run(id, username);
    return info.changes > 0;
}

module.exports = {
    getUserSaves,
    getSaveById,
    createSave,
    updateSave,
    deleteSave
};
