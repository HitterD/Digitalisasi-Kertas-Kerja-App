const fs = require('fs');
const eslintReport = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));

eslintReport.forEach(fileReport => {
    let content = fs.readFileSync(fileReport.filePath, 'utf8');
    let lines = content.split('\n');
    let modified = false;

    // We only automatically fix simple unused catch variables to avoid breaking things.
    // Replace 'catch (err) {' and 'catch (e) {' with 'catch {'
    const newContent = content.replace(/catch\s*\(\s*(err|e)\s*\)\s*\{/g, 'catch {');
    if (newContent !== content) {
        content = newContent;
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(fileReport.filePath, content, 'utf8');
    }
});
console.log('Fixed catch variables');
