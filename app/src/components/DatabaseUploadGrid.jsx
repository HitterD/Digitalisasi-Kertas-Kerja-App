import { useState, useCallback } from 'react';
import { useOpname } from '../store/OpnameContext';
import { parseMasterDatabase } from '../utils/masterDbParser';
import { parseHistoryDatabase } from '../utils/historyDbParser';
import { fetchMasterAssets, fetchHistoryAssets } from '../utils/sqlServerApi';
import { Database, History, CheckCircle, RefreshCw, Upload, Wifi, WifiOff, Server, Clock } from 'lucide-react';

/**
 * DatabaseUploadGrid — Sync from SQL Server (on-demand) + file upload (fallback).
 * Data is cached in IndexedDB for offline use.
 * 
 * IMPORTANT: No automatic network requests on mount — the app works fully offline.
 * Sync only happens when the user explicitly clicks the sync button.
 */
export default function DatabaseUploadGrid() {
    const {
        masterDb, masterDbFileName, setMasterDb, setMasterDbFileName,
        historyDb, historyDbFileName, setHistoryDb, setHistoryDbFileName,
        masterDbSource, historyDbSource,
        masterDbSyncTime, historyDbSyncTime,
        setMasterDbSource, setHistoryDbSource,
        setMasterDbSyncTime, setHistoryDbSyncTime,
    } = useOpname();

    // Sync states
    const [masterSyncing, setMasterSyncing] = useState(false);
    const [historySyncing, setHistorySyncing] = useState(false);
    const [masterSyncError, setMasterSyncError] = useState('');
    const [historySyncError, setHistorySyncError] = useState('');
    const [lastSyncSuccess, setLastSyncSuccess] = useState(null); // true/false/null

    // Upload states (fallback)
    const [dbLoading, setDbLoading] = useState(false);
    const [dbError, setDbError] = useState('');
    const [historyDbLoading, setHistoryDbLoading] = useState(false);
    const [historyDbError, setHistoryDbError] = useState('');

    // ═══════════════════════════════════════════
    //  SYNC FROM SQL SERVER (ON-DEMAND ONLY)
    //  No auto-check — sync is only triggered by user click
    // ═══════════════════════════════════════════

    const handleSyncMaster = useCallback(async () => {
        setMasterSyncing(true);
        setMasterSyncError('');
        try {
            const { lookup, count, timestamp } = await fetchMasterAssets();
            setMasterDb(lookup, null, `SQL Server (${count} aset)`);
            setMasterDbFileName(`SQL Server (${count} aset)`);
            setMasterDbSource('server');
            setMasterDbSyncTime(timestamp);
            setLastSyncSuccess(true);
        } catch (err) {
            setMasterSyncError('Gagal sinkron: ' + (err.message.includes('fetch') ? 'Tidak dapat terhubung ke server. Pastikan jaringan tersedia.' : err.message));
            setLastSyncSuccess(false);
        } finally {
            setMasterSyncing(false);
        }
    }, [setMasterDb, setMasterDbFileName, setMasterDbSource, setMasterDbSyncTime]);

    const handleSyncHistory = useCallback(async () => {
        setHistorySyncing(true);
        setHistorySyncError('');
        try {
            const { historyMap, count, timestamp } = await fetchHistoryAssets();
            setHistoryDb(historyMap, null, `SQL Server (${count} barcode)`);
            setHistoryDbFileName(`SQL Server (${count} barcode)`);
            setHistoryDbSource('server');
            setHistoryDbSyncTime(timestamp);
            setLastSyncSuccess(true);
        } catch (err) {
            setHistorySyncError('Gagal sinkron: ' + (err.message.includes('fetch') ? 'Tidak dapat terhubung ke server. Pastikan jaringan tersedia.' : err.message));
            setLastSyncSuccess(false);
        } finally {
            setHistorySyncing(false);
        }
    }, [setHistoryDb, setHistoryDbFileName, setHistoryDbSource, setHistoryDbSyncTime]);

    // Sync both at once
    const handleSyncAll = useCallback(async () => {
        setLastSyncSuccess(null);
        await Promise.all([handleSyncMaster(), handleSyncHistory()]);
    }, [handleSyncMaster, handleSyncHistory]);

    // ═══════════════════════════════════════════
    //  FILE UPLOAD (FALLBACK / OFFLINE)
    // ═══════════════════════════════════════════

    const handleDbFile = useCallback(async (file) => {
        if (!file) return;
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setDbError('Format file harus .xlsx atau .xls');
            return;
        }
        setDbLoading(true);
        setDbError('');
        try {
            const buffer = await file.arrayBuffer();
            const lookup = parseMasterDatabase(buffer);
            setMasterDb(lookup, buffer, file.name);
            setMasterDbFileName(file.name);
            setMasterDbSource('file');
            setMasterDbSyncTime(null);
        } catch (err) {
            setDbError('Gagal membaca database: ' + err.message);
        } finally {
            setDbLoading(false);
        }
    }, [setMasterDb, setMasterDbFileName, setMasterDbSource, setMasterDbSyncTime]);

    const handleDbInputChange = useCallback((e) => {
        handleDbFile(e.target.files[0]);
    }, [handleDbFile]);

    const handleHistoryDbFile = useCallback(async (file) => {
        if (!file) return;
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setHistoryDbError('Format file harus .xlsx atau .xls');
            return;
        }
        setHistoryDbLoading(true);
        setHistoryDbError('');
        try {
            const buffer = await file.arrayBuffer();
            const lookup = parseHistoryDatabase(buffer);
            setHistoryDb(lookup, buffer, file.name);
            setHistoryDbFileName(file.name);
            setHistoryDbSource('file');
            setHistoryDbSyncTime(null);
        } catch (err) {
            setHistoryDbError('Gagal membaca history database: ' + err.message);
        } finally {
            setHistoryDbLoading(false);
        }
    }, [setHistoryDb, setHistoryDbFileName, setHistoryDbSource, setHistoryDbSyncTime]);

    const handleHistoryDbInputChange = useCallback((e) => {
        handleHistoryDbFile(e.target.files[0]);
    }, [handleHistoryDbFile]);

    // ═══════════════════════════════════════════
    //  Format timestamp for display
    // ═══════════════════════════════════════════
    const formatTimestamp = (ts) => {
        if (!ts) return null;
        try {
            const d = new Date(ts);
            return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return ts;
        }
    };

    // ═══════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════

    const isSyncing = masterSyncing || historySyncing;

    return (
        <div className="card mb-3">
            {/* Header */}
            <div className="card__header">
                <div className="card__title">
                    <Server size={20} />
                    Sumber Data Aset
                </div>
                {lastSyncSuccess === true && (
                    <span className="badge badge--success">
                        <Wifi size={12} /> Tersinkron
                    </span>
                )}
                {lastSyncSuccess === false && (
                    <span className="badge badge--danger">
                        <WifiOff size={12} /> Gagal terhubung
                    </span>
                )}
            </div>

            {/* Sync All Button — always visible */}
            <div style={{ padding: '0 var(--space-5) var(--space-4)', borderBottom: '1px solid var(--neutral-200)' }}>
                <button
                    className="btn btn--primary"
                    onClick={handleSyncAll}
                    disabled={isSyncing}
                    style={{ width: '100%' }}
                >
                    {isSyncing ? (
                        <>
                            <div className="spinner" style={{ width: 16, height: 16 }}></div>
                            Menyinkronkan dari SQL Server...
                        </>
                    ) : (
                        <>
                            <RefreshCw size={16} />
                            Sinkron Semua dari Server
                        </>
                    )}
                </button>
                <p className="text-xs text-muted" style={{ marginTop: 'var(--space-2)', textAlign: 'center' }}>
                    Tekan untuk mengambil data terbaru • Data tersimpan offline setelah sinkron
                </p>
            </div>

            {/* Stack: Master + History */}
            <div className="flex-col" style={{ padding: 'var(--space-5)', gap: 'var(--space-4)' }}>
                {/* ─── Master Database Card ─── */}
                <div className="card mb-0" style={{ border: '1px solid var(--neutral-200)' }}>
                    <div className="card__header">
                        <div className="card__title">
                            <Database size={20} />
                            Database Master Aset
                        </div>
                        {masterDb && (
                            <span className="badge badge--success">
                                <CheckCircle size={12} />
                                {masterDb.size.toLocaleString()} aset
                            </span>
                        )}
                    </div>

                    {masterDb ? (
                        <div className="flex-col" style={{ gap: 'var(--space-3)' }}>
                            <div className="db-status-box">
                                <p className="db-status-box__title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle size={16} className="text-success-600" /> {masterDbFileName} — {masterDb.size.toLocaleString()} barcode dimuat
                                </p>
                                <p className="db-status-box__subtitle">
                                    {masterDbSource === 'server' ? (
                                        <>Sumber: SQL Server • Input barcode otomatis mengisi data dari database.</>
                                    ) : (
                                        <>Sumber: File Upload • Input barcode otomatis mengisi data dari database.</>
                                    )}
                                </p>
                                {masterDbSyncTime && (
                                    <p className="text-xs text-muted" style={{ marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={11} /> Terakhir sync: {formatTimestamp(masterDbSyncTime)}
                                    </p>
                                )}
                            </div>
                            <div className="flex-row flex-row--wrap" style={{ gap: 'var(--space-2)' }}>
                                <button className="btn btn--outline btn--sm" onClick={handleSyncMaster} disabled={masterSyncing}>
                                    <RefreshCw size={14} className={masterSyncing ? 'spin' : ''} />
                                    {masterSyncing ? 'Menyinkronkan...' : 'Sinkron Ulang'}
                                </button>
                                <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer' }}>
                                    <Upload size={14} />
                                    Upload File
                                    <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleDbInputChange} />
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-col" style={{ gap: 'var(--space-3)' }}>
                            <button
                                className="btn btn--outline btn--sm"
                                onClick={handleSyncMaster}
                                disabled={masterSyncing}
                                style={{ width: '100%' }}
                            >
                                {masterSyncing ? (
                                    <>
                                        <div className="spinner" style={{ width: 14, height: 14 }}></div>
                                        Mengambil data dari server...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={14} />
                                        Sinkron dari Server
                                    </>
                                )}
                            </button>
                            <div
                                className="upload-zone--dashed"
                                onClick={() => document.getElementById('db-upload').click()}
                                style={{ padding: 'var(--space-4)' }}
                            >
                                <input type="file" id="db-upload" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleDbInputChange} />
                                {dbLoading ? (
                                    <div className="flex-col flex-col--center flex-col--gap-sm">
                                        <div className="spinner"></div>
                                        <p className="text-sm">Memuat database...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={24} className="text-muted" style={{ marginBottom: 'var(--space-1)' }} />
                                        <p className="text-sm text-dark">Atau upload file Excel (.xlsx)</p>
                                        <p className="text-xs text-muted">ASPxGridView — untuk mode offline</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {masterSyncError && <div className="alert alert--lg alert--danger mt-3">{masterSyncError}</div>}
                    {dbError && <div className="alert alert--lg alert--danger mt-3">{dbError}</div>}
                </div>

                {/* ─── History Database Card ─── */}
                <div className="card mb-0" style={{ border: '1px solid var(--neutral-200)' }}>
                    <div className="card__header">
                        <div className="card__title">
                            <History size={20} />
                            Database History Aset
                        </div>
                        {historyDb && (
                            <span className="badge badge--success">
                                <CheckCircle size={12} />
                                {historyDb.size.toLocaleString()} barcode
                            </span>
                        )}
                    </div>

                    {historyDb ? (
                        <div className="flex-col" style={{ gap: 'var(--space-3)' }}>
                            <div className="db-status-box">
                                <p className="db-status-box__title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle size={16} className="text-success-600" /> {historyDbFileName} — {historyDb.size.toLocaleString()} barcode dimuat
                                </p>
                                <p className="db-status-box__subtitle">
                                    {historyDbSource === 'server' ? (
                                        <>Sumber: SQL Server • Riwayat perpindahan dan opname tersedia saat pencarian.</>
                                    ) : (
                                        <>Sumber: File Upload • Riwayat perpindahan dan opname tersedia saat pencarian.</>
                                    )}
                                </p>
                                {historyDbSyncTime && (
                                    <p className="text-xs text-muted" style={{ marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={11} /> Terakhir sync: {formatTimestamp(historyDbSyncTime)}
                                    </p>
                                )}
                            </div>
                            <div className="flex-row flex-row--wrap" style={{ gap: 'var(--space-2)' }}>
                                <button className="btn btn--outline btn--sm" onClick={handleSyncHistory} disabled={historySyncing}>
                                    <RefreshCw size={14} className={historySyncing ? 'spin' : ''} />
                                    {historySyncing ? 'Menyinkronkan...' : 'Sinkron Ulang'}
                                </button>
                                <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer' }}>
                                    <Upload size={14} />
                                    Upload File
                                    <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleHistoryDbInputChange} />
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-col" style={{ gap: 'var(--space-3)' }}>
                            <button
                                className="btn btn--outline btn--sm"
                                onClick={handleSyncHistory}
                                disabled={historySyncing}
                                style={{ width: '100%' }}
                            >
                                {historySyncing ? (
                                    <>
                                        <div className="spinner" style={{ width: 14, height: 14 }}></div>
                                        Mengambil data dari server...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={14} />
                                        Sinkron dari Server
                                    </>
                                )}
                            </button>
                            <div
                                className="upload-zone--dashed"
                                onClick={() => document.getElementById('history-db-upload').click()}
                                style={{ padding: 'var(--space-4)' }}
                            >
                                <input type="file" id="history-db-upload" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleHistoryDbInputChange} />
                                {historyDbLoading ? (
                                    <div className="flex-col flex-col--center flex-col--gap-sm">
                                        <div className="spinner"></div>
                                        <p className="text-sm">Memuat history database...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={24} className="text-muted" style={{ marginBottom: 'var(--space-1)' }} />
                                        <p className="text-sm text-dark">Atau upload file Excel (.xlsx)</p>
                                        <p className="text-xs text-muted">Report History — untuk mode offline</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {historySyncError && <div className="alert alert--lg alert--danger mt-3">{historySyncError}</div>}
                    {historyDbError && <div className="alert alert--lg alert--danger mt-3">{historyDbError}</div>}
                </div>
            </div>
        </div>
    );
}
