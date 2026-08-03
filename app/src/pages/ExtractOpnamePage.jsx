import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Download, RefreshCw, Database, ChevronDown, ChevronRight, FileSpreadsheet, Search, Upload, Building2, ScanLine, AlertCircle, XCircle, CheckCircle2, Eye, Loader2 } from 'lucide-react';
import { fetchWithAuth, apiUrl } from '../utils/apiConfig';
import { generateAllExports, generateSingleExport, buildPreviewData } from '../utils/excelExportOpname';
import { overallProgress, roomProgress, roomStatus } from '../utils/extractStats';
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

    // Hidden file input ref for Oracle/ASPxGridView upload
    const oracleInputRef = useRef(null);

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
            const [scannedRes, notScannedRes, app1Res] = await Promise.all([
                fetchWithAuth(apiUrl(`/api/db/opname-data/${encodeURIComponent(selectedPeriod)}`)),
                fetchWithAuth(apiUrl(`/api/db/opname-not-scanned/${encodeURIComponent(selectedPeriod)}`)),
                fetchWithAuth(apiUrl(`/api/app1/opname-data/${encodeURIComponent(selectedPeriod)}`))
            ]);

            const scannedJson = await scannedRes.json();
            const notScannedJson = await notScannedRes.json();
            const app1Json = await app1Res.json();

            // Aggregate per-endpoint errors instead of all-or-nothing
            const errors = [];
            let successCount = 0;

            if (scannedJson.success) {
                setScannedData(scannedJson.data);
                successCount++;
            } else {
                errors.push(`Data terscan: ${scannedJson.error || 'gagal'}`);
            }

            if (notScannedJson.success) {
                setNotScannedData(notScannedJson.data);
                successCount++;
            } else {
                errors.push(`Data tidak terscan: ${notScannedJson.error || 'gagal'}`);
            }

            if (app1Json.success && Array.isArray(app1Json.data)) {
                const newApp1Map = new Map();
                app1Json.data.forEach(item => {
                    const barcode = item.barcode || item.BARCODE_ASSET;
                    if (barcode) {
                        newApp1Map.set(String(barcode).trim().toUpperCase(), item);
                    }
                });
                setApp1DataMap(newApp1Map);
                successCount++;
            }

            if (successCount > 0) {
                setSynced(true);
            }

            if (errors.length > 0) {
                setError(`Sinkronisasi partial (${successCount}/3 endpoint berhasil): ${errors.join('; ')}`);
            } else {
                setError('');
            }
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
        <div className="wa-app-body" style={{ paddingBottom: 100 /* room for sticky bar */ }}>
            <div className="wa-page-header">
                <div>
                    <div className="eyebrow">Modul 02 · Reporting</div>
                    <h1>Extract MAT</h1>
                    <div className="subtitle">Tarik hasil opname per periode, bandingkan dengan master, generate rekap MAT otomatis.</div>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="wa-alert wa-alert--danger">
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <div className="wa-alert__title">Sinkronisasi gagal</div>
                        <div>{error}</div>
                        <div className="wa-alert__hint">
                            Cek koneksi SQL Server (192.168.2.111) atau pilih periode lain.
                        </div>
                    </div>
                </div>
            )}

            {/* Loading indicator (kept from previous layout) */}
            {loading && (
                <div className="extract-loading">
                    <div className="extract-spinner" />
                    <span>Mengambil data dari database...</span>
                </div>
            )}

            {/* Filter + Upload card */}
            <div className="x-filter">
                <div className="x-filter__grid">
                    <div>
                        <div className="x-field__label">Periode Opname</div>
                        <SearchableGroupedSelect
                            groupedOptions={groupedPeriods}
                            value={selectedPeriod}
                            onChange={(val) => { setSelectedPeriod(val); setSynced(false); }}
                            placeholder="— Pilih Periode —"
                        />
                    </div>
                    <div>
                        <div className="x-field__label">Filter Departemen Aset</div>
                        <select className="wa-select" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                            <option value="Semua Departemen">Semua Departemen</option>
                            <option value="ICT">ICT / IT</option>
                            <option value="HRGA">HRGA / HRD</option>
                            <option value="ENG">ENGINEERING</option>
                            <option value="LAINNYA">Lainnya</option>
                        </select>
                    </div>
                </div>

                <div className="x-filter__master">
                    <div className="x-field__label">Master Data Asset Management (ASPxGridView1)</div>
                    <div className="x-filter__master-row">
                        <div className="x-filefield">
                            <div className="x-filefield__icon">
                                <FileSpreadsheet size={14} color="var(--success-500)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="x-filefield__name">{oracleFileName || 'Pilih File Excel...'}</div>
                                <div className={`x-filefield__status${oracleDataMap ? ' x-filefield__status--loaded' : ''}`}>
                                    {oracleDataMap ? '✓ MASTER DATA DIMUAT' : 'OPSIONAL · DRAG & DROP'}
                                </div>
                            </div>
                        </div>
                        <input type="file" accept=".xlsx,.xls" onChange={handleOracleUpload} style={{ display: 'none' }} ref={oracleInputRef} />
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button className="wa-btn-ghost" onClick={() => oracleInputRef.current?.click()} title="Pilih file Excel master data">
                                <Upload size={13} /> Pilih File
                            </button>
                            <button
                                className="wa-btn-terracotta"
                                onClick={handleSync}
                                disabled={!selectedPeriod || loading}
                                title={!selectedPeriod ? 'Pilih periode dulu' : 'Tarik data opname dari server'}
                            >
                                {loading
                                    ? <><Loader2 size={13} className="wa-spin" /> Menyinkronkan...</>
                                    : <><RefreshCw size={13} /> Sinkron Data Opname</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Hero */}
            {(() => {
                const op = overallProgress(filteredTotalScanned, filteredTotalNotScanned);
                const fmt = (n) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 });
                return (
                    <div className="x-summary">
                        <div className="x-summary__top">
                            <div>
                                <div className="x-summary__eyebrow">Progres Opname</div>
                                <div className="x-summary__subtitle">
                                    {totalRooms} ruangan{selectedPeriod ? ` · ${selectedPeriod}` : ''}
                                </div>
                            </div>
                            <div>
                                <div className="x-summary__pct">
                                    {op.hasData ? fmt(op.scannedPct) : '—'}<small>%</small>
                                </div>
                                <div className="x-summary__ratio">{filteredTotalScanned} / {op.total} ASET</div>
                            </div>
                        </div>
                        <div className="x-bar">
                            <div className="x-bar__scanned" style={{ width: `${op.scannedPct}%` }} />
                            <div className="x-bar__not" style={{ width: `${op.notScannedPct}%` }} />
                        </div>
                        {!op.hasData && <div className="x-summary__empty">Belum ada data — pilih periode lalu sinkron.</div>}
                        <div className="x-summary__stats">
                            <div className="x-stat">
                                <div className="x-stat__label">Terscan</div>
                                <div className="x-stat__value x-stat__value--scanned">{filteredTotalScanned}</div>
                            </div>
                            <div className="x-stat">
                                <div className="x-stat__label">Tidak Terscan</div>
                                <div className="x-stat__value x-stat__value--danger">{filteredTotalNotScanned}</div>
                            </div>
                            <div className="x-stat">
                                <div className="x-stat__label">Salah Ruangan</div>
                                <div className="x-stat__value x-stat__value--danger">{salahRuanganCount}</div>
                            </div>
                            <div className="x-stat">
                                <div className="x-stat__label">Ruangan</div>
                                <div className="x-stat__value x-stat__value--neutral">{totalRooms}</div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Room cards */}
            <div className="x-rooms">
                <div className="x-rooms__header">Daftar Ruangan · {totalRooms}</div>
                {allRooms.length === 0 ? (
                    <div className="x-state">
                        <div className="x-state__icon"><Database size={30} strokeWidth={1.5} /></div>
                        <div className="x-state__title">Belum ada data</div>
                        <div className="x-state__hint">Pilih periode dan sinkronisasi data untuk melihat ruangan.</div>
                    </div>
                ) : (
                    allRooms.map((room) => {
                        const notScannedItems = filteredNotScannedData[room] || [];
                        const scannedItems = scannedByRoom[room] || [];
                        const isExpanded = expandedRooms.has(room);
                        const status = roomStatus(notScannedItems.length);
                        const pct = roomProgress(scannedItems.length, notScannedItems.length).pct;

                        return (
                            <div key={room} className={`x-room x-room--${status}`}>
                                <div className="x-room__head" onClick={() => toggleRoom(room)}>
                                    <span className={`x-room__chevron${isExpanded ? ' x-room__chevron--open' : ''}`}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </span>
                                    <div className="x-room__main">
                                        <div className="x-room__name">{room}</div>
                                        <div className="x-room__progress">
                                            <div className="x-room__progress-track">
                                                <div className="x-room__progress-fill" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="x-room__progress-label">{Math.round(pct)}%</span>
                                        </div>
                                    </div>
                                    <span className="x-pill x-pill--scanned">{scannedItems.length} TERSCAN</span>
                                    {notScannedItems.length > 0 && (
                                        <span className="x-pill x-pill--not">{notScannedItems.length} TIDAK</span>
                                    )}
                                    <button className="x-pill x-pill--ghost" onClick={(e) => { e.stopPropagation(); handlePreviewSingleRoom(room); }}>
                                        <Eye size={11} /> Preview
                                    </button>
                                </div>
                                {isExpanded && (
                                    <div className="x-room__body">
                                        {notScannedItems.length > 0 && (
                                            <div>
                                                <div className="x-room__group-label x-room__group-label--not">BELUM TERSCAN ({notScannedItems.length})</div>
                                                {notScannedItems.map((item, i) => (
                                                    <div key={i} className="x-room__item">• {item.BARCODE_ASSET} — {item.NAMA_ASSET}</div>
                                                ))}
                                            </div>
                                        )}
                                        {scannedItems.length > 0 && (
                                            <div>
                                                <div className="x-room__group-label x-room__group-label--scanned">TERSCAN ({scannedItems.length})</div>
                                                {scannedItems.slice(0, 10).map((item, i) => (
                                                    <div key={i} className="x-room__item">• {item.Barcode}</div>
                                                ))}
                                                {scannedItems.length > 10 && (
                                                    <div className="x-room__more">...dan {scannedItems.length - 10} lainnya</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Sticky bottom action bar */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-primary)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div className="wa-icon-wrap" style={{ background: 'var(--border)' }}>
                        <FileSpreadsheet size={14} color="var(--text-primary)" />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{totalRooms} file Excel <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>({filteredTotalScanned} terscan + {filteredTotalNotScanned} tidak terscan)</span></div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--success-500)', letterSpacing: '0.1em', marginTop: 2, fontWeight: 700 }}>✓ 1 HASIL_MAT</div>
                    </div>
                </div>
                <button className="wa-btn" onClick={handleExport} disabled={exporting}>
                    <Download size={13} /> Export Semua Excel
                </button>
            </div>

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
        </div>
    );
}
