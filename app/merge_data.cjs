const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.resolve('f:/Program Bagas/SynologyDrive/Digitalisasi Kertas Kerja APP/backup');
const NEW_DATA_DIR = path.resolve('f:/Program Bagas/SynologyDrive/Digitalisasi Kertas Kerja APP/app/data');

console.log('--- Starting Data Merge For ALL Backups ---');

// Get all backup folders sorted by date (name)
const folders = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('data_')).sort();
// Add the extracted 20260326 zip backup as well if it exists
folders.unshift('../app/data/backups/extracted_20260326');

folders.forEach(folder => {
    let OLD_DATA_DIR;
    if (folder.includes('extracted_')) {
        OLD_DATA_DIR = path.resolve('f:/Program Bagas/SynologyDrive/Digitalisasi Kertas Kerja APP/app/data/backups/extracted_20260326');
    } else {
        OLD_DATA_DIR = path.join(BACKUP_DIR, folder, 'data');
    }

    if (!fs.existsSync(OLD_DATA_DIR)) return;

    console.log(`\nMerging from: ${folder}`);

    // Merge app1_saves.db
    try {
        const newSavesDbPath = path.join(NEW_DATA_DIR, 'app1_saves.db');
        const oldSavesDbPath = path.join(OLD_DATA_DIR, 'app1_saves.db');
        if (fs.existsSync(newSavesDbPath) && fs.existsSync(oldSavesDbPath)) {
            const db = new DatabaseSync(newSavesDbPath);
            db.exec(`ATTACH DATABASE '${oldSavesDbPath}' AS old_db;`);
            const beforeCount = db.prepare(`SELECT count(*) as c FROM main.APP1_SAVES;`).get().c;
            db.exec(`INSERT OR IGNORE INTO main.APP1_SAVES SELECT * FROM old_db.APP1_SAVES;`);
            const afterCount = db.prepare(`SELECT count(*) as c FROM main.APP1_SAVES;`).get().c;
            if (afterCount > beforeCount) {
                console.log(`- app1_saves.db: Added ${afterCount - beforeCount} rows.`);
            }
            db.close();
        }
    } catch (e) { }

    // Merge app1_local_defaultUser.db
    try {
        const newLocalDbPath = path.join(NEW_DATA_DIR, 'app1_local_defaultUser.db');
        const oldLocalDbPath = path.join(OLD_DATA_DIR, 'app1_local_defaultUser.db');
        if (fs.existsSync(newLocalDbPath) && fs.existsSync(oldLocalDbPath)) {
            const db = new DatabaseSync(newLocalDbPath);
            db.exec(`ATTACH DATABASE '${oldLocalDbPath}' AS old_db;`);
            const beforeCount = db.prepare(`SELECT count(*) as c FROM main.APP1_OPNAME;`).get().c;
            db.exec(`INSERT OR IGNORE INTO main.APP1_OPNAME SELECT * FROM old_db.APP1_OPNAME;`);
            const afterCount = db.prepare(`SELECT count(*) as c FROM main.APP1_OPNAME;`).get().c;
            if (afterCount > beforeCount) {
                console.log(`- app1_local_defaultUser.db: Added ${afterCount - beforeCount} rows.`);
            }
            db.close();
        }
    } catch (e) { }

    // Merge JSON
    const filesToMerge = [
        { name: 'audit.json', type: 'array', idKey: 'timestamp' },
        { name: 'users.json', type: 'array', idKey: 'username' },
        { name: 'pc_session.json', type: 'object' },
        { name: 'synced_opname.json', type: 'object' },
        { name: 'tablet_result.json', type: 'object' }
    ];

    filesToMerge.forEach(file => {
        try {
            const oldPath = path.join(OLD_DATA_DIR, file.name);
            const newPath = path.join(NEW_DATA_DIR, file.name);
            
            if (!fs.existsSync(oldPath)) return;
            if (!fs.existsSync(newPath)) {
                fs.copyFileSync(oldPath, newPath);
                return;
            }

            const oldData = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
            const newData = JSON.parse(fs.readFileSync(newPath, 'utf8'));

            if (file.type === 'array') {
                const map = new Map();
                oldData.forEach(item => {
                    const key = file.idKey ? item[file.idKey] : JSON.stringify(item);
                    map.set(key, item);
                });
                newData.forEach(item => {
                    const key = file.idKey ? item[file.idKey] : JSON.stringify(item);
                    map.set(key, item);
                });
                const mergedArray = Array.from(map.values());
                fs.writeFileSync(newPath, JSON.stringify(mergedArray, null, 2), 'utf8');
            } else if (file.type === 'object') {
                const mergedObject = Object.assign({}, oldData, newData);
                fs.writeFileSync(newPath, JSON.stringify(mergedObject, null, 2), 'utf8');
            }
        } catch (e) { }
    });
});

console.log('\n--- Data Merge Complete ---');
