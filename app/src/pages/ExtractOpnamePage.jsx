import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Download, RefreshCw, Database, ChevronDown, ChevronRight, FileSpreadsheet, Search, Upload, Building2, ScanLine, AlertCircle, XCircle } from 'lucide-react';
import { fetchWithAuth, apiUrl } from '../utils/apiConfig';
import { generateAllExports, generateSingleExport, buildPreviewData } from '../utils/excelExportOpname';
import { saveExtractOpnameState, loadExtractOpnameState } from '../utils/db';
import { parseMasterDatabase } from '../utils/masterDbParser';
import SearchableGroupedSelect from '../components/SearchableGroupedSelect';
import PreviewModal from '../components/PreviewModal';


// -----------------------------------------------------
// 3) Main Page Component
// -----------------------------------------------------
export default function ExtractOpnamePage() {
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('Semua Departemen');
    const [scannedData, setScannedData] = useState([]);
    const [notScannedData, setNotScannedData] = useState({});
    const [loading, setLoading] = useState(false);
    const [synced, setSynced] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [expandedRooms, setExpandedRooms] = useState(new Set());
    const [error, setError] = useState('');
    const [oracleDataMap, setOracleDataMap] = useState(null);
    const [oracleFileName, setOracleFileName] = useState('');
    const [app1DataMap, setApp1DataMap] = useState(new Map());
    const [isRestored, setIsRestored] = useState(false);

    // Preview Modal States
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewDataPayload, setPreviewDataPayload] = useState(null);

    // Handle ASPxGridView File
    const handleOracleUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            setOracleFileName('');
            setOracleDataMap(null);
            return;
        }
        setOracleFileName(file.name);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const map = parseMasterDatabase(evt.target.result);
                setOracleDataMap(map);
            } catch (err) {
                console.error("Failed to parse Oracle Master Data", err);
                setError("Gagal membaca file ASPxGridView: " + err.message);
                setOracleFileName('');
                setOracleDataMap(null);
            }
        };
        reader.onerror = () => {
            setError("Gagal membaca file.");
            setOracleFileName('');
        };
        reader.readAsArrayBuffer(file);
    };

    // Set default department filter based on logged-in user
    useEffect(() => {
        if (isRestored) return; // Prevent overwriting if already restored
        try {
            const authData = JSON.parse(sessionStorage.getItem('auth') || localStorage.getItem('auth') || '{}');
            if (authData && authData.user === 'ICT_SJA1') {
                setDepartmentFilter('ICT');
            }
        } catch {
            // Ignore parse errors from missing session storage
        }
    }, [isRestored]);

    // Fetch available periods on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(apiUrl('/api/db/opname-periods'));
                const json = await res.json();
                if (json.success) {
                    setPeriods(json.data);
                }
            } catch (err) {
                console.error('Failed to fetch periods:', err);
            }
        })();
    }, []);

    // 1) Load cached state on component mount
    useEffect(() => {
        (async () => {
            try {
                const state = await loadExtractOpnameState();
                if (state) {
                    if (state.selectedPeriod) setSelectedPeriod(state.selectedPeriod);
                    if (state.departmentFilter) setDepartmentFilter(state.departmentFilter);
                    if (state.scannedData) setScannedData(state.scannedData);
                    if (state.notScannedData) setNotScannedData(state.notScannedData);
                    if (state.app1DataMap) setApp1DataMap(state.app1DataMap);
                    if (state.oracleDataMap) setOracleDataMap(state.oracleDataMap);
                    if (state.oracleFileName) setOracleFileName(state.oracleFileName);
                    if (state.synced !== undefined) setSynced(state.synced);
                }
            } catch (err) {
                console.error('Failed to restore extract state:', err);
            } finally {
                setIsRestored(true);
            }
        })();
    }, []);

    // 2) Auto-save state when relevant variables change (after initial restore)
    useEffect(() => {
        if (!isRestored) return;
        saveExtractOpnameState({
            selectedPeriod,
            departmentFilter,
            scannedData,
            notScannedData,
            app1DataMap,
            oracleFileName,
            oracleDataMap,
            synced
        }).catch(err => console.error('Failed to save extract state:', err));
    }, [isRestored, selectedPeriod, departmentFilter, scannedData, notScannedData, app1DataMap, oracleFileName, oracleDataMap, synced]);

    // Format & Group Periods
    const getGroupedPeriods = () => {
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        const parsed = periods.map(p => {
            const parts = p.split('-');
            if (parts.length >= 3) {
                const site = parts[0];
                const dateCode = parts[1];
                const dept = parts[2];
                const m = parseInt(dateCode.substring(0, 2), 10);
                const monthStr = (m >= 1 && m <= 12) ? monthNames[m] : dateCode.substring(0, 2);
                const year = dateCode.substring(2, 6);
                const seq = dateCode.substring(6) || '00';

                const sortKey = year + dateCode.substring(0, 2) + seq;
                const label = `${monthStr} ${year} — ${p}`;

                return { original: p, site, dateCode, dept, sortKey, label };
            }
            return { original: p, site: 'Lainnya', dateCode: p, dept: 'Lainnya', sortKey: p, label: p };
        });

        // Sort: Site (ASC) -> Dept (Custom Order) -> Date (DESC)
        const deptOrder = { 'ICT': 1, 'HRGA': 2, 'ENGINEERING': 3 };
        parsed.sort((a, b) => {
            if (a.site !== b.site) return a.site.localeCompare(b.site);

            const deptA = deptOrder[a.dept] || 99;
            const deptB = deptOrder[b.dept] || 99;
            if (deptA !== deptB) return deptA - deptB;
            if (a.dept !== b.dept) return a.dept.localeCompare(b.dept);

            return b.sortKey.localeCompare(a.sortKey);
        });

        // Group by Site & Dept
        const grouped = {};
        parsed.forEach(p => {
            const groupName = `${p.site} — ${p.dept}`;
            if (!grouped[groupName]) grouped[groupName] = [];
            grouped[groupName].push(p);
        });

        return grouped;
    };

    const groupedPeriods = useMemo(() => getGroupedPeriods(), [periods]);

    // Sync data for selected period
    const handleSync = useCallback(async () => {
        if (!selectedPeriod) return;
        setLoading(true);
        setError('');
        setSynced(false);

        try {
            // Fetch scanned data + not-scanned data + app1 local data in parallel
            const [scannedRes, notScannedRes, app1Res] = await Promise.all([
                fetchWithAuth(apiUrl(`/api/db/opname-data/${encodeURIComponent(selectedPeriod)}`)),
                fetchWithAuth(apiUrl(`/api/db/opname-not-scanned/${encodeURIComponent(selectedPeriod)}`)),
                fetchWithAuth(apiUrl(`/api/app1/opname-data/${encodeURIComponent(selectedPeriod)}`))
            ]);

            const scannedJson = await scannedRes.json();
            const notScannedJson = await notScannedRes.json();
            const app1Json = await app1Res.json();

            if (!scannedJson.success) throw new Error(scannedJson.error || 'Failed to fetch scanned data');
            if (!notScannedJson.success) throw new Error(notScannedJson.error || 'Failed to fetch not-scanned data');

            // Build App 1 Data Map (Barcode -> Full Asset Data)
            const newApp1Map = new Map();
            if (app1Json.success && Array.isArray(app1Json.data)) {
                app1Json.data.forEach(item => {
                    const barcode = item.barcode || item.BARCODE_ASSET;
                    if (barcode) {
                        newApp1Map.set(String(barcode).trim().toUpperCase(), item);
                    }
                });
            }
            setApp1DataMap(newApp1Map);

            setScannedData(scannedJson.data);
            setNotScannedData(notScannedJson.data);
            setSynced(true);
        } catch (err) {
            setError(err.message);
            console.error('Sync failed:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedPeriod]);

    // Department Mapping Logic
    const getDept = (createUser) => {
        const u = (createUser || '').toUpperCase();
        if (u.includes('ICT') || u.includes('IT')) return 'ICT';
        if (u.includes('HRD') || u.includes('HRGA') || u.includes('HC')) return 'HRGA';
        if (u.includes('ENG')) return 'ENG';
        return 'LAINNYA';
    };

    const matchesDeptFilter = (createUser) => {
        if (departmentFilter === 'Semua Departemen') return true;
        return getDept(createUser) === departmentFilter;
    };

    // Memoize all heavy data processing
    const { scannedByRoom, filteredTotalScanned, filteredNotScannedData, filteredTotalNotScanned, allRooms, totalRooms, salahRuanganCount } = useMemo(() => {
        // Filter and group scanned data
        const _scannedByRoom = {};
        let _filteredTotalScanned = 0;
        for (const row of scannedData) {
            if (!matchesDeptFilter(row.CREATE_USER)) continue;
            const room = row.Ruangan_Opname || 'UNKNOWN';
            if (!_scannedByRoom[room]) _scannedByRoom[room] = [];
            _scannedByRoom[room].push(row);
            _filteredTotalScanned++;
        }

        // Filter not-scanned data
        const _filteredNotScannedData = {};
        let _filteredTotalNotScanned = 0;
        for (const [room, items] of Object.entries(notScannedData)) {
            const filtered = items.filter(row => matchesDeptFilter(row.CREATE_USER));
            if (filtered.length > 0) {
                _filteredNotScannedData[room] = filtered;
                _filteredTotalNotScanned += filtered.length;
            }
        }

        // All unique rooms based on filtered data only
        const _allRooms = [...new Set([
            ...Object.keys(_scannedByRoom),
            ...Object.keys(_filteredNotScannedData),
        ])].sort();

        // Stats
        const _totalRooms = _allRooms.length;
        let _salahRuanganCount = 0;

        Object.values(_scannedByRoom).flat().forEach(r => {
            const ro = (r.Ruangan_Opname || '').trim();
            const rb = (r.Ruangan_Barcode || '').trim();
            if (rb && ro && rb !== ro) _salahRuanganCount++;
        });

        return {
            scannedByRoom: _scannedByRoom,
            filteredTotalScanned: _filteredTotalScanned,
            filteredNotScannedData: _filteredNotScannedData,
            filteredTotalNotScanned: _filteredTotalNotScanned,
            allRooms: _allRooms,
            totalRooms: _totalRooms,
            salahRuanganCount: _salahRuanganCount
        };
    }, [scannedData, notScannedData, departmentFilter]);

    const handlePreviewSingleRoom = (room) => {
        const scanned = scannedByRoom[room] || [];
        const notScanned = filteredNotScannedData[room] || [];

        const payload = buildPreviewData({
            room,
            scanned,
            notScanned,
            oracleDataMap,
            app1DataMap
        });

        setPreviewDataPayload(payload);
        setPreviewModalOpen(true);
    };

    const toggleRoom = (room) => {
        setExpandedRooms(prev => {
            const next = new Set(prev);
            if (next.has(room)) next.delete(room); else next.add(room);
            return next;
        });
    };

    // Export all Excel files
    const handleExport = async () => {
        setExporting(true);
        try {
            await generateAllExports({
                periode: selectedPeriod,
                scannedByRoom,
                notScannedData: filteredNotScannedData,
                allRooms,
                oracleDataMap,
                app1DataMap
            });
        } catch (err) {
            console.error('Export gagal:', err);
            setError('Export gagal: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    // Export Single Room function
    const handleExportSingle = async (room) => {
        setExporting(true);
        try {
            const scanned = scannedByRoom[room] || [];
            const notScanned = filteredNotScannedData[room] || [];
            await generateSingleExport({
                periode: selectedPeriod,
                room,
                scanned,
                notScanned,
                oracleDataMap,
                app1DataMap
            });
        } catch (err) {
            console.error('Export Single failed:', err);
            setError('Export gagal didownload: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="extract-page">
            {/* Controls */}
            <div className="extract-controls-wrapper">
                <div className="extract-controls-grid">
                    {/* Row 1: Filters */}
                    <div className="extract-controls-row">
                        <div className="extract-page__field extract-field-periode">
                            <label>Periode Opname</label>
                            <SearchableGroupedSelect
                                groupedOptions={groupedPeriods}
                                value={selectedPeriod}
                                onChange={(val) => { setSelectedPeriod(val); setSynced(false); }}
                                placeholder="— Pilih Periode —"
                            />
                        </div>
                        <div className="extract-page__field extract-field-dept">
                            <label>Filter Departemen Aset</label>
                            <select
                                className="form-select"
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                            >
                                <option value="Semua Departemen">Semua Departemen</option>
                                <option value="ICT">ICT / IT</option>
                                <option value="HRGA">HRGA / HRD</option>
                                <option value="ENG">ENGINEERING</option>
                                <option value="LAINNYA">Lainnya</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Upload & Action */}
                    <div className="extract-controls-row">
                        <div className="extract-page__field extract-field-upload">
                            <label>Master Data Asset Management (ASPxGridView1)</label>
                            <div className="extract-upload-wrapper">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleOracleUpload}
                                    title="Upload file ASPxGridView dari Asset Management"
                                />
                                <div className={`extract-upload-btn ${oracleFileName ? 'has-file' : ''}`}>
                                    <Upload size={16} />
                                    <span>{oracleFileName || 'Pilih File Excel...'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="extract-field-action">
                            <button
                                className="btn btn--primary"
                                style={{ height: '44px', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minWidth: '180px' }}
                                onClick={handleSync}
                                disabled={!selectedPeriod || loading}
                            >
                                {loading ? <><RefreshCw size={18} className="animate-spin" /> Menarik Data...</> : <><Database size={18} /> Sinkronisasi</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 16, color: '#dc2626', fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="extract-loading">
                    <div className="extract-spinner" />
                    <span>Mengambil data dari database...</span>
                </div>
            )}
            {/* Data Display */}
            {synced && !loading && (
                <>
                    {/* STATS */}
                    <div className="extract-stats-grid">
                        <div className="stat-card-premium">
                            <div className="stat-icon-wrapper stat-icon-blue">
                                <Building2 size={28} strokeWidth={2.5} />
                            </div>
                            <div className="stat-card-content">
                                <span className="stat-card-value stat-value-blue">{totalRooms}</span>
                                <span className="stat-card-label">Total Ruangan</span>
                            </div>
                        </div>

                        <div className="stat-card-premium">
                            <div className="stat-icon-wrapper stat-icon-emerald">
                                <ScanLine size={28} strokeWidth={2.5} />
                            </div>
                            <div className="stat-card-content">
                                <span className="stat-card-value stat-value-emerald">{filteredTotalScanned}</span>
                                <span className="stat-card-label">Asset Terscan</span>
                            </div>
                        </div>

                        <div className="stat-card-premium">
                            <div className="stat-icon-wrapper stat-icon-amber">
                                <AlertCircle size={28} strokeWidth={2.5} />
                            </div>
                            <div className="stat-card-content">
                                <span className="stat-card-value stat-value-amber">{filteredTotalNotScanned}</span>
                                <span className="stat-card-label">Asset Tidak Terscan</span>
                            </div>
                        </div>

                        <div className="stat-card-premium">
                            <div className="stat-icon-wrapper stat-icon-rose">
                                <XCircle size={28} strokeWidth={2.5} />
                            </div>
                            <div className="stat-card-content">
                                <span className="stat-card-value stat-value-rose">{salahRuanganCount}</span>
                                <span className="stat-card-label">Salah Ruangan (MAT)</span>
                            </div>
                        </div>
                    </div>

                    {/* Room list */}
                    <div className="extract-rooms">
                        {allRooms.map(room => {
                            const scanned = scannedByRoom[room] || [];
                            const notScanned = filteredNotScannedData[room] || [];
                            const isExpanded = expandedRooms.has(room);

                            return (
                                <div key={room} className={`extract-room ${scanned.length > 0 && notScanned.length === 0 ? 'extract-room--done' : scanned.length > 0 ? 'extract-room--partial' : 'extract-room--empty'}`}>
                                    <div className="extract-room__header" onClick={() => toggleRoom(room)}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto', maxWidth: '45%' }}>
                                            {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                                            <span className="extract-room__name" style={{ fontSize: 'var(--font-size-base)' }}>{room}</span>
                                        </div>
                                        <div className="extract-room__progress">
                                            <div className="extract-room__progress-bar">
                                                <div
                                                    className={`extract-room__progress-fill ${notScanned.length === 0 ? 'extract-room__progress-fill--green' : 'extract-room__progress-fill--amber'}`}
                                                    style={{ width: `${scanned.length + notScanned.length > 0 ? Math.round((scanned.length / (scanned.length + notScanned.length)) * 100) : 0}%` }}
                                                />
                                            </div>
                                            <span className="extract-room__progress-text">
                                                {scanned.length}/{scanned.length + notScanned.length}
                                            </span>
                                        </div>
                                        <div className="extract-room__counts">
                                            <span className="extract-room__badge extract-room__badge--scanned">
                                                {scanned.length} terscan
                                            </span>
                                            {notScanned.length > 0 && (
                                                <span className="extract-room__badge extract-room__badge--not-scanned">
                                                    {notScanned.length} tidak terscan
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            className="btn btn--outline"
                                            style={{ borderColor: 'var(--primary-200)', color: 'var(--primary-600)' }}
                                            onClick={(e) => { e.stopPropagation(); handlePreviewSingleRoom(room); }}
                                            disabled={exporting || (scanned.length === 0 && notScanned.length === 0)}
                                            title="Buka popup Preview Excel khusus ruangan ini"
                                        >
                                            <FileSpreadsheet size={16} /> Preview
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <div className="extract-room__body">
                                            {scanned.length > 0 && (
                                                <>
                                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--charcoal-900)', marginBottom: 8, textTransform: 'uppercase' }}>
                                                        Terscan ({scanned.length})
                                                    </h4>
                                                    <div className="asset-table-wrapper" style={{ marginBottom: 16 }}>
                                                        <table className="asset-table">
                                                            <thead>
                                                                <tr style={{ background: '#f8fafc', color: '#475569', textTransform: 'uppercase', fontSize: '0.70rem', letterSpacing: '0.05em' }}>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>No</th>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>Barcode</th>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>Nama Asset</th>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>Ruangan</th>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>Kondisi</th>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>Keterangan</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {scanned.map((row, i) => {
                                                                    const isSalahRuangan = row.Ruangan_Barcode && row.Ruangan_Opname &&
                                                                        row.Ruangan_Barcode.trim() !== row.Ruangan_Opname.trim();
                                                                    return (
                                                                        <tr key={row.id || i} style={isSalahRuangan ? { background: '#dbeafe' } : undefined}>
                                                                            <td className="col-no">{i + 1}</td>
                                                                            <td className="col-barcode">{row.Barcode}</td>
                                                                            <td>{row.Nama_Asset}</td>
                                                                            <td>
                                                                                {row.Ruangan_Opname}
                                                                                {isSalahRuangan && (
                                                                                    <div style={{ fontSize: '11px', color: 'var(--warning-600)', fontWeight: 600, marginTop: 2 }}>
                                                                                        ⚠ Barcode: {row.Ruangan_Barcode}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td>{row.Kondisi}</td>
                                                                            <td>{row.Keterangan || row.KETERANGAN_MASTER || ''}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}

                                            {notScanned.length > 0 && (
                                                <>
                                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber-600)', marginBottom: 8, textTransform: 'uppercase' }}>
                                                        Tidak Terscan ({notScanned.length})
                                                    </h4>
                                                    <div className="asset-table-wrapper">
                                                        <table className="asset-table">
                                                            <thead>
                                                                <tr style={{ background: '#f8fafc', color: '#475569', textTransform: 'uppercase', fontSize: '0.70rem', letterSpacing: '0.05em' }}>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>No</th>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>Barcode</th>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>Nama Asset</th>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>Lokasi (Master)</th>
                                                                    <th style={{ padding: '8px 12px', fontWeight: 'bold' }}>Kondisi</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {notScanned.map((row, i) => (
                                                                    <tr key={row.BARCODE_ASSET || i} style={{ background: '#fefce8' }}>
                                                                        <td className="col-no">{i + 1}</td>
                                                                        <td className="col-barcode">{row.BARCODE_ASSET}</td>
                                                                        <td>{row.NAMA_ASSET}</td>
                                                                        <td>{row.NAMA_RUANGAN}</td>
                                                                        <td>{row.NAMA_KONDISI}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )
                                    }
                                </div>
                            );
                        })}
                    </div>

                    {/* Export bar (Sticky) */}
                    <div className="extract-export-bar">
                        <div className="extract-export-bar__info">
                            <FileSpreadsheet size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: 'var(--charcoal-900)' }} />
                            <strong>{totalRooms} file Excel</strong> ({filteredTotalScanned} terscan + {filteredTotalNotScanned} tidak terscan)
                            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                            <strong>1 HASIL_MAT</strong>
                        </div>
                        <div className="extract-export-bar__actions">
                            <button
                                className="btn btn--primary btn--lg"
                                onClick={handleExport}
                                disabled={exporting || filteredTotalScanned === 0}
                                style={{ minWidth: 200, justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(13, 17, 23, 0.2)' }}
                            >
                                {exporting ? (
                                    <><RefreshCw size={18} className="animate-spin" /> Generating...</>
                                ) : (
                                    <><Download size={18} /> Export Semua Excel</>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )
            }

            {/* In-app Preview Modal */}
            <PreviewModal
                isOpen={previewModalOpen}
                onClose={() => setPreviewModalOpen(false)}
                previewData={previewDataPayload}
                onDownload={() => {
                    if (previewDataPayload) {
                        handleExportSingle(previewDataPayload.room);
                    }
                }}
            />
        </div >
    );
}
