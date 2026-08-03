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
        <div className="app1-home__section">
            <div className="app1-home__section-header">
                <div>
                    <p className="app1-home__label">Koneksi Data SQL</p>
                    <h2 className="app1-home__section-title">Sumber Data Aset</h2>
                </div>
            </div>

            <div className="app1-home__section-cta">
                <button className="app1-home__button app1-home__button--primary" onClick={handleSyncAll} disabled={isSyncing} style={{ width: '100%', justifyContent: 'center' }}>
                    <RefreshCw size={15} className={isSyncing ? 'spin' : ''} />
                    {isSyncing ? 'Menyinkronkan...' : 'Sinkron Semua dari Server'}
                </button>
            </div>

            <div className="app1-home__status-grid">
                {/* MASTER */}
                <div className="app1-home__status-card">
                    <div className="app1-home__status-header">
                        <div>
                            <p className="app1-home__label">Database Utama</p>
                            <h3 className="app1-home__status-title">Master Aset</h3>
                        </div>
                        {masterDb && <span className="app1-home__badge app1-home__badge--success"><CheckCircle size={10} /> TERSEDIA</span>}
                    </div>

                    {masterDb ? (
                        <>
                            <div className="app1-home__status-box app1-home__status-box--success">
                                <p className="app1-home__status-line">{masterDbFileName} — {masterDb.size.toLocaleString()} aset</p>
                                <p className="app1-home__status-hint">Sumber: {masterDbSource === 'server' ? 'SQL Server' : 'File Upload'}</p>
                            </div>
                            <div className="app1-home__file-actions">
                                <button className="app1-home__button app1-home__button--secondary" onClick={handleSyncMaster} disabled={masterSyncing}>
                                    <RefreshCw size={14} className={masterSyncing ? 'spin' : ''} /> Sinkron Ulang
                                </button>
                                <label className="app1-home__button app1-home__button--ghost" style={{ cursor: 'pointer' }}>
                                    <Upload size={14} /> Upload File Fallback
                                    <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleDbInputChange} />
                                </label>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="app1-home__status-box app1-home__status-box--warning">
                                <p className="app1-home__status-line">Data Kosong</p>
                                <p className="app1-home__status-hint">Tekan Sinkron dari Server untuk memulai.</p>
                            </div>
                            <div className="app1-home__file-actions">
                                <button className="app1-home__button app1-home__button--secondary" onClick={handleSyncMaster} disabled={masterSyncing} style={{ width: '100%', justifyContent: 'center' }}>
                                    <RefreshCw size={14} className={masterSyncing ? 'spin' : ''} /> Sinkron dari Server
                                </button>
                                <label className="app1-home__button app1-home__button--ghost" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                                    <Upload size={14} /> Upload File Fallback
                                    <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleDbInputChange} />
                                </label>
                            </div>
                        </>
                    )}
                    {masterSyncError && <div className="app1-home__alert" style={{ marginTop: 12 }}>{masterSyncError}</div>}
                    {dbError && <div className="app1-home__alert" style={{ marginTop: 12 }}>{dbError}</div>}
                </div>

                {/* HISTORY */}
                <div className="app1-home__status-card">
                    <div className="app1-home__status-header">
                        <div>
                            <p className="app1-home__label">Database Pelengkap</p>
                            <h3 className="app1-home__status-title">History Aset</h3>
                        </div>
                        {historyDb && <span className="app1-home__badge app1-home__badge--success"><CheckCircle size={10} /> TERSEDIA</span>}
                    </div>

                    {historyDb ? (
                        <>
                            <div className="app1-home__status-box app1-home__status-box--success">
                                <p className="app1-home__status-line">{historyDbFileName} — {historyDb.size.toLocaleString()} aset</p>
                                <p className="app1-home__status-hint">Sumber: {historyDbSource === 'server' ? 'SQL Server' : 'File Upload'}</p>
                            </div>
                            <div className="app1-home__file-actions">
                                <button className="app1-home__button app1-home__button--secondary" onClick={handleSyncHistory} disabled={historySyncing}>
                                    <RefreshCw size={14} className={historySyncing ? 'spin' : ''} /> Sinkron Ulang
                                </button>
                                <label className="app1-home__button app1-home__button--ghost" style={{ cursor: 'pointer' }}>
                                    <Upload size={14} /> Upload File Fallback
                                    <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleHistoryDbInputChange} />
                                </label>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="app1-home__status-box app1-home__status-box--warning">
                                <p className="app1-home__status-line">Data Kosong</p>
                                <p className="app1-home__status-hint">Riwayat perpindahan tidak tersedia.</p>
                            </div>
                            <div className="app1-home__file-actions">
                                <button className="app1-home__button app1-home__button--secondary" onClick={handleSyncHistory} disabled={historySyncing} style={{ width: '100%', justifyContent: 'center' }}>
                                    <RefreshCw size={14} className={historySyncing ? 'spin' : ''} /> Sinkron dari Server
                                </button>
                                <label className="app1-home__button app1-home__button--ghost" style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                                    <Upload size={14} /> Upload File Fallback
                                    <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleHistoryDbInputChange} />
                                </label>
                            </div>
                        </>
                    )}
                    {historySyncError && <div className="app1-home__alert" style={{ marginTop: 12 }}>{historySyncError}</div>}
                    {historyDbError && <div className="app1-home__alert" style={{ marginTop: 12 }}>{historyDbError}</div>}
                </div>
            </div>
        </div>
    );
}
