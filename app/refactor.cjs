const fs = require('fs');

function replaceFile(path, replacer) {
    let content = fs.readFileSync(path, 'utf8');
    let newContent = replacer(content);
    if (content !== newContent) {
        fs.writeFileSync(path, newContent, 'utf8');
    }
}

// useRecentBarcodes.js
replaceFile('src/hooks/useRecentBarcodes.js', c => c.replace(/catch \(e\) {/g, 'catch {'));
// useTheme.js
replaceFile('src/hooks/useTheme.js', c => c.replace(/catch \(e\) {/g, 'catch {'));
// AdminPage.jsx
replaceFile('src/pages/AdminPage.jsx', c => {
    let s = c.replace(/catch \(err\) {/g, 'catch {');
    s = s.replace(/catch \(e\) {/g, 'catch {');
    s = s.replace(/const handleAccessChange =.*?};/s, '');
    return s;
});
// App3ConsolidationPage.jsx
replaceFile('src/pages/App3ConsolidationPage.jsx', c => {
    let s = c.replace(/const toggleBat =.*?};/s, '');
    s = s.replace(/const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone/g, 'const { getRootProps, getInputProps, isDragActive } = useDropzone');
    s = s.replace(/Icon = Upload,/g, '');
    return s;
});
// App4RecouncilPage.jsx
replaceFile('src/pages/App4RecouncilPage.jsx', c => {
    let s = c.replace(/Icon = Upload,/g, '');
    s = s.replace(/const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone/g, 'const { getRootProps, getInputProps, isDragActive } = useDropzone');
    return s;
});
// DashboardPage.jsx
replaceFile('src/pages/DashboardPage.jsx', c => {
    let s = c.replace(/catch \(e\) {/g, 'catch {');
    s = s.replace(/catch \(err\) {/g, 'catch {');
    s = s.replace(/, fetchWithAuth/g, '');
    s = s.replace(/name: 'App 3 - Rekonsiliasi Excel',/g, ''); // Fix name is defined but never used
    return s;
});
// ExtractOpnamePage.jsx
replaceFile('src/pages/ExtractOpnamePage.jsx', c => {
    let s = c.replace(/const filteredTotalScanned = [\s\S]*?;/, '');
    s = s.replace(/const filteredTotalNotScanned = [\s\S]*?;/, '');
    s = s.replace(/const totalRooms = [\s\S]*?;/, '');
    // fix useMemo
    s = s.replace(/}, \[selectedDept, filteredOpnames\]\);/g, '}, [selectedDept, filteredOpnames, getGroupedPeriods]);');
    s = s.replace(/}, \[searchQuery\]\);/g, '}, [searchQuery, matchesDeptFilter]);');
    return s;
});
// LoginPage.jsx
replaceFile('src/pages/LoginPage.jsx', c => {
    let s = c.replace(/catch \(err\) {/g, 'catch {');
    s = s.replace(/catch \(e\) {/g, 'catch {');
    return s;
});
// OpnamePage.jsx
replaceFile('src/pages/OpnamePage.jsx', c => {
    let s = c.replace(/const \[generating, setGenerating\] = useState\(false\);/g, '');
    s = s.replace(/const handleGenerateAllPDFs =[\s\S]*?};\n/g, '');
    s = s.replace(/const isSyncing = false;/g, '');
    return s;
});
// UploadPage.jsx
replaceFile('src/pages/UploadPage.jsx', c => {
    let s = c.replace(/const loading = false;/g, '');
    s = s.replace(/const error = null;/g, '');
    return s;
});
// OpnameContext.jsx
replaceFile('src/store/OpnameContext.jsx', c => {
    let s = c.replace(/export const DB_CONFIG =/g, 'const DB_CONFIG =');
    return s;
});
// useOpnameState.jsx
replaceFile('src/store/useOpnameState.jsx', c => {
    let s = c.replace(/\(set, get\)/g, '(set)');
    return s;
});
// pdfGenerator.js
replaceFile('src/utils/pdfGenerator.js', c => {
    let s = c.replace(/catch \(e\) {/g, 'catch {');
    return s;
});
// SignaturePad.jsx
replaceFile('src/components/SignaturePad.jsx', c => {
    let s = c.replace(/useEffect\(\(\) => {\n\s*setNamaTerang\(initialName \|\| ''\);\n\s*}, \[initialName\]\);/g, 'useEffect(() => {\n        setNamaTerang(initialName || \'\');\n        // eslint-disable-next-line\n    }, [initialName]);');
    return s;
});
