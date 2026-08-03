const fs = require('fs');
const path = require('path');

function hydrateDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.lstatSync(fullPath);
        if (stat.isDirectory()) {
            hydrateDir(fullPath);
        } else if (stat.isFile()) {
            try {
                // Read and rewrite to strip cloud placeholder attributes
                const content = fs.readFileSync(fullPath);
                fs.writeFileSync(fullPath, content);
            } catch (e) {
                console.error(`Failed to hydrate ${fullPath}:`, e.message);
            }
        }
    }
}

const assetsDir = path.join(__dirname, 'android/app/src/main/assets/public');
console.log('Hydrating assets in ' + assetsDir);
hydrateDir(assetsDir);
console.log('Hydration complete.');
