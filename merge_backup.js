const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const BASE_DIR = process.cwd();
// Menerima argumen dari command line (deploy.bat)
const newBackupName = process.argv[2];
const oldBackupName = process.argv[3];

if (!newBackupName || !oldBackupName) {
    console.error('[ERROR] Penggunaan: node merge_backup.js <FOLDER_BASIS_BARU> <FOLDER_SUMBER_LAMA>');
    process.exit(1);
}

const NEW_BACKUP = path.join(BASE_DIR, 'backup', newBackupName);
const OLD_BACKUP = path.join(BASE_DIR, 'backup', oldBackupName);
const MERGED_BACKUP = path.join(BASE_DIR, 'backup', newBackupName + '_merged');

console.log('=== Mulai Proses Merge Backup ===');
console.log('Server Baru (Basis):', NEW_BACKUP);
console.log('Server Lama (Sumber):', OLD_BACKUP);
console.log('Output Dir:', MERGED_BACKUP);

if (!fs.existsSync(NEW_BACKUP) || !fs.existsSync(OLD_BACKUP)) {
    console.error('[ERROR] Folder backup tidak ditemukan. Pastikan path benar.');
    process.exit(1);
}

// 1. Copy basis (New Server)
console.log('\n[1/4] Menyalin data server BARU sebagai basis merge...');
if (fs.existsSync(MERGED_BACKUP)) {
    fs.rmSync(MERGED_BACKUP, { recursive: true, force: true });
}
fs.cpSync(NEW_BACKUP, MERGED_BACKUP, { recursive: true });

const mergedDataPath = path.join(MERGED_BACKUP, 'data');
const oldDataPath = path.join(OLD_BACKUP, 'data');

// 2. Helper to merge SQLite
function mergeSQLite(dbName, tableName) {
    const oldDbPath = path.join(oldDataPath, dbName);
    const mergedDbPath = path.join(mergedDataPath, dbName);

    if (!fs.existsSync(oldDbPath)) return;
    if (!fs.existsSync(mergedDbPath)) {
        fs.copyFileSync(oldDbPath, mergedDbPath);
        return;
    }

    console.log(`\n[2/4] Merging SQLite DB: ${dbName} (Table: ${tableName})`);
    
    // Connect to merged DB
    const mergedDb = new DatabaseSync(mergedDbPath);
    // Attach old DB
    mergedDb.exec(`ATTACH DATABASE '${oldDbPath.replace(/'/g, "''")}' AS old_db`);
    
    try {
        mergedDb.exec('BEGIN TRANSACTION');
        const cols = mergedDb.prepare(`PRAGMA table_info(${tableName})`).all().map(c => c.name);
        const colString = cols.join(', ');

        // Gunakan INSERT OR IGNORE karena prioritasnya: "Hanya tambahkan data yang belum ada"
        mergedDb.exec(`
            INSERT OR IGNORE INTO main.${tableName} (${colString})
            SELECT ${colString} FROM old_db.${tableName}
        `);
        
        const countOld = mergedDb.prepare(`SELECT count(*) as c FROM old_db.${tableName}`).get().c;
        const countMain = mergedDb.prepare(`SELECT count(*) as c FROM main.${tableName}`).get().c;
        console.log(`      - Berhasil! (Data Lama: ${countOld} baris, Total Merged: ${countMain} baris)`);
        
        mergedDb.exec('COMMIT');
    } catch (e) {
        console.error(`      - Error:`, e);
        mergedDb.exec('ROLLBACK');
    } finally {
        mergedDb.exec('DETACH DATABASE old_db');
        mergedDb.close();
    }
}

mergeSQLite('app1_local_defaultUser.db', 'APP1_OPNAME');
mergeSQLite('app1_saves.db', 'APP1_SAVES');

// 3. Helper to merge JSON arrays (audit, users)
function mergeJsonArray(fileName, dedupKey) {
    const oldJsonPath = path.join(oldDataPath, fileName);
    const mergedJsonPath = path.join(mergedDataPath, fileName);

    if (!fs.existsSync(oldJsonPath)) return;
    
    console.log(`\n[3/4] Merging JSON file: ${fileName}`);
    let oldData = [];
    let mergedData = [];
    
    try { oldData = JSON.parse(fs.readFileSync(oldJsonPath, 'utf8')); } catch(e){}
    try { mergedData = JSON.parse(fs.readFileSync(mergedJsonPath, 'utf8')); } catch(e){}
    
    if (!Array.isArray(oldData)) oldData = [oldData];
    if (!Array.isArray(mergedData)) mergedData = [mergedData];
    
    const dedupSet = new Set(mergedData.map(item => item[dedupKey]));
    
    let added = 0;
    for (const item of oldData) {
        if (item[dedupKey] && !dedupSet.has(item[dedupKey])) {
            mergedData.push(item);
            dedupSet.add(item[dedupKey]);
            added++;
        }
    }
    
    fs.writeFileSync(mergedJsonPath, JSON.stringify(mergedData, null, 2));
    console.log(`      - ${added} entri baru ditambahkan dari server lama.`);
}

mergeJsonArray('audit.json', 'id');
mergeJsonArray('users.json', 'username');

console.log('\n[INFO] File state UI seperti pc_session.json, synced_opname.json, tablet_result.json tidak di-merge dalam karena format bersarang (nested state). Sistem menggunakan versi terbaru dari Server Baru.');

console.log('\n[4/4] Proses Merge Selesai. Hasil tersimpan di: backup/data_merged');
