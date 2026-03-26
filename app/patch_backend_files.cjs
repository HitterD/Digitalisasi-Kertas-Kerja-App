const fs = require('fs');
const path = require('path');

const configPath = 'vite.config.js';
let content = fs.readFileSync(configPath, 'utf8');

// New implementation for listing files (flat list)
const newPeriodsBlock = `
  // GET /api/files/periods/:folder — List ALL workbooks in a division folder (flat list)
  const periodsMatch = req.url?.match(/^\\/api\\/files\\/periods\\/([^/?]+)/);
  if (periodsMatch && req.method === 'GET') {
    const folder = decodeURIComponent(periodsMatch[1]);
    (async () => {
      try {
        if (!isValidPathSegment(folder)) return sendJson(400, { success: false, error: 'Nama folder tidak valid' });
        ensureShareConnection();
        const folderPath = path.join(shareConfig.basePath, folder);
        if (!fs.existsSync(folderPath)) return sendJson(404, { success: false, error: \`Folder tidak ditemukan: \${folderPath}\` });

        const entries = fs.readdirSync(folderPath, { withFileTypes: true });
        const allFiles = [];

        entries.filter(e => e.isDirectory()).forEach(e => {
            const periodName = e.name;
            const lkoPath = path.join(folderPath, periodName, 'Lembar Kerja Opname');
            
            if (fs.existsSync(lkoPath)) {
                const subEntries = fs.readdirSync(lkoPath, { withFileTypes: true });
                const excelFiles = subEntries.filter(se => se.isFile() && /\\.(xlsx|xls)$/i.test(se.name));
                
                excelFiles.forEach(fe => {
                    const filePath = path.join(lkoPath, fe.name);
                    let modifiedDate = null;
                    try { modifiedDate = fs.statSync(filePath).mtime.toISOString(); } catch { }

                    // Extract MMYYYY from period name for smart sort
                    const match = periodName.match(/(\\d{2})(\\d{4})/);
                    const sortKey = (match ? match[2] + match[1] : '000000') + fe.name;

                    allFiles.push({
                        filename: fe.name,
                        periodName: periodName,
                        modifiedDate,
                        sortKey
                    });
                });
            }
        });

        // Sort by smart sort key (YYYYMM + filename) descending
        allFiles.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

        console.log(\`[File Browser] Found \${allFiles.length} workbooks in \${folder}\`);
        sendJson(200, {
          success: true,
          files: allFiles,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[File Browser] Error listing files:', err.message);
        sendJson(500, { success: false, error: err.message });
      }
    })();
    return;
  }
`;

// Find and replace the old periods endpoint
const oldBlockRegex = /\/\/ GET \/api\/files\/periods\/[^]*?\}\)\(\);\s+return;\s+\}/;
content = content.replace(oldBlockRegex, newPeriodsBlock.trim());

fs.writeFileSync(configPath, content);
console.log('Successfully updated vite.config.js to return flat file list.');
