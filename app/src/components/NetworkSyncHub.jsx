import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import { Wifi, MonitorUp, SmartphoneNfc, DownloadCloud, Settings, ArrowRight, Loader2 } from 'lucide-react';
import { apiUrl, getServerUrl, setServerUrl, fetchWithAuth } from '../utils/apiConfig';
import { ensureSyncTarget, getCurrentSyncTarget, getLatestSessionTarget, hasRoomsToImport } from '../utils/opnameSyncPullTarget';
import { Capacitor } from '@capacitor/core';

const isNativePlatform = Capacitor.isNativePlatform();

const isValidUrl = (url) => {
    try { new URL(url); return true; } catch { return false; }
};

/**
 * NetworkSyncHub — Bi-directional sync between PC and Tablet via WiFi.
 */
export default function NetworkSyncHub() {
    const navigate = useNavigate();
    const { state, dispatch, masterDb, historyDb, importData, exportSession, importSession } = useOpname();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState('');
    const [syncSuccess, setSyncSuccess] = useState('');
    const [showConfig, setShowConfig] = useState(false);
    const [tempUrl, setTempUrl] = useState('');

    // Session Picker State
    const [isFetchingSessions, setIsFetchingSessions] = useState(false);
    const [availableSessions, setAvailableSessions] = useState([]);
    const [showSessionPicker, setShowSessionPicker] = useState(false);

    const renderTrailingIcon = () => (
        isSyncing || isFetchingSessions
            ? <Loader2 size={14} className="spin" />
            : <ArrowRight size={14} />
    );

    const handlePushSession = useCallback(async () => {
        setIsSyncing(true); setSyncError(''); setSyncSuccess('');
        try {
            const { sync, target } = ensureSyncTarget(state);
            if (!state.sync) {
                dispatch({ type: 'INIT_SYNC', payload: sync });
            }
            const sessionPayload = exportSession();
            const payload = {
                ...sessionPayload,
                state: {
                    ...sessionPayload.state,
                    sync,
                },
            };
            const params = `?period=${encodeURIComponent(target.period)}&sessionId=${encodeURIComponent(target.sessionId)}`;
            const res = await fetchWithAuth(apiUrl(`/api/sync/session${params}`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) setSyncSuccess('Berhasil membagikan Master & History DB ke Jaringan!');
            else setSyncError(data.error || 'Server error.');
        } catch {
            setSyncError('Koneksi Vite Error.');
        } finally { setIsSyncing(false); }
    }, [dispatch, exportSession, state]);

    const handlePullSession = useCallback(async (selectedPeriod, selectedSessionId) => {
        // 1. If no specific session selected, fetch list and show picker
        if (typeof selectedPeriod !== 'string' || typeof selectedSessionId !== 'string') {
            setIsFetchingSessions(true); setSyncError(''); setSyncSuccess('');
            try {
                const res = await fetchWithAuth(apiUrl('/api/sync/sessions?period=all'));
                const payload = await res.json();
                if (res.ok && payload.sessions) {
                    setAvailableSessions(payload.sessions);
                    setShowSessionPicker(true);
                } else {
                    setSyncError(payload.error || 'Gagal mengambil daftar sesi.');
                }
            } catch {
                setSyncError('Koneksi Vite Error (Gagal daftar sesi).');
            } finally { setIsFetchingSessions(false); }
            return;
        }

        // 2. Proceed to pull specific session
        if (state.rooms && state.rooms.length > 0) {
            const confirmRewrite = window.confirm(
                "PERINGATAN: Anda sudah memiliki data opname lokal!\n\n" +
                "Menarik Sesi dari PC akan MENIMPA dan MENGHAPUS semua progres di Tablet ini dengan Sesi terpilih.\n\n" +
                "Lanjutkan Tarik Sesi?"
            );
            if (!confirmRewrite) return;
        }
        setIsSyncing(true); setSyncError(''); setSyncSuccess('');
        try {
            const params = `?period=${encodeURIComponent(selectedPeriod)}&sessionId=${encodeURIComponent(selectedSessionId)}`;
            const res = await fetchWithAuth(apiUrl(`/api/sync/session${params}`));
            const payload = await res.json();
            if (res.ok && payload.masterDb) {
                importSession(payload);
                setShowSessionPicker(false);
                setSyncSuccess('Sesi berhasil ditarik dari PC! Anda siap Keliling Opname.');
                if (payload.state && payload.state.rooms && payload.state.rooms.length > 0) {
                    setTimeout(() => navigate('/app1/opname'), 1500);
                }
            } else {
                setSyncError(payload.message || 'Gagal menarik Sesi.');
            }
        } catch {
            setSyncError('Gagal menarik Sesi (Koneksi WiFi).');
        } finally { setIsSyncing(false); }
    }, [importSession, navigate, state.rooms]);

    const handlePullResult = useCallback(async () => {
        setIsSyncing(true); setSyncError(''); setSyncSuccess('');
        try {
            let target = getCurrentSyncTarget(state);
            let data = null;

            if (target) {
                const params = `?period=${encodeURIComponent(target.period)}&sessionId=${encodeURIComponent(target.sessionId)}`;
                const res = await fetchWithAuth(apiUrl(`/api/sync/result${params}`));
                data = await res.json();
                if (!res.ok || !hasRoomsToImport(data)) {
                    target = null;
                }
            }

            if (!target) {
                const sessionsRes = await fetchWithAuth(apiUrl('/api/sync/sessions?period=all'));
                const sessionsPayload = await sessionsRes.json();
                if (!sessionsRes.ok || !sessionsPayload.success) {
                    throw new Error(sessionsPayload.error || sessionsPayload.message || 'Gagal mengambil daftar sesi.');
                }
                target = getLatestSessionTarget(sessionsPayload.sessions);
                if (!target) {
                    setSyncError('Belum ada sesi hasil opname dari Android.');
                    return;
                }

                const params = `?period=${encodeURIComponent(target.period)}&sessionId=${encodeURIComponent(target.sessionId)}`;
                const res = await fetchWithAuth(apiUrl(`/api/sync/result${params}`));
                data = await res.json();
            }

            if (hasRoomsToImport(data)) {
                importData({
                    ...data,
                    sync: data.sync || {
                        period: target.period,
                        sessionId: target.sessionId,
                    },
                });
                navigate('/app1/opname');
            } else {
                setSyncError(data?.message || 'Belum ada hasil dikirimkan dari Tablet.');
            }
        } catch (err) {
            setSyncError(err.message || 'Koneksi Gagal Tarik Data Hasil.');
        } finally { setIsSyncing(false); }
    }, [importData, navigate, state]);

    return (
        <div className="app1-home__panel">
            <div className="app1-home__panel-header">
                <div>
                    <p className="app1-home__label">Jaringan</p>
                    <h2 className="app1-home__panel-title">Sync Hub</h2>
                </div>
                <div className="app1-home__icon-box app1-home__icon-box--sm">
                    <Wifi size={16} />
                </div>
            </div>
            <p className="app1-home__text">
                Sinkron 2 arah antara PC & Tablet Android via WiFi.
            </p>

            <div className="app1-home__actions" style={{ flexDirection: 'column', gap: 8, marginTop: 16 }}>
                {!isNativePlatform ? (
                    <>
                        <button className="app1-home__button app1-home__button--ghost" onClick={handlePushSession} disabled={isSyncing || (!masterDb && !historyDb && state.rooms.length === 0)} style={{ justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MonitorUp size={15} /> PC ➔ Android (Push Sesi)</span>
                            {renderTrailingIcon()}
                        </button>
                        <button className="app1-home__button app1-home__button--ghost" onClick={handlePullResult} disabled={isSyncing} style={{ justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><DownloadCloud size={15} /> Android ➔ PC (Tarik Hasil)</span>
                            {renderTrailingIcon()}
                        </button>
                    </>
                ) : (
                    <>
                        <button className="app1-home__button app1-home__button--ghost" onClick={handlePullSession} disabled={isSyncing || isFetchingSessions} style={{ justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <SmartphoneNfc size={15} /> PC ➔ Android (Tarik Sesi)
                            </span>
                            {renderTrailingIcon()}
                        </button>
                        <div style={{ width: '100%' }}>
                            <button className="app1-home__button app1-home__button--ghost" onClick={() => { setTempUrl(getServerUrl()); setShowConfig(!showConfig); }} style={{ width: '100%', justifyContent: 'center' }}>
                                <Settings size={14} /> IP PC
                            </button>
                        </div>
                    </>
                )}

                {showConfig && isNativePlatform && (
                    <div className="app1-home__status-box">
                        <div className="app1-home__field">
                            <label className="app1-home__field-label">IP Wi-Fi PC</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input type="text" className="app1-home__input" value={tempUrl} onChange={e => setTempUrl(e.target.value)} placeholder="http://192.168.1.10:5181" style={{ flex: 1 }} />
                                <button type="button" className="app1-home__button app1-home__button--primary" onClick={() => {
                                    const trimmed = tempUrl.trim();
                                    if (!isValidUrl(trimmed)) { setSyncError('Format tidak valid.'); return; }
                                    setServerUrl(trimmed); setShowConfig(false); setSyncError(''); setSyncSuccess('IP Disimpan!');
                                }}>SAVE</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {syncError && <div className="app1-home__alert" style={{ marginTop: 12 }}>{syncError}</div>}
            {syncSuccess && <div className="app1-home__alert" style={{ marginTop: 12, background: 'var(--success-50)', borderColor: 'var(--success-500)', color: 'var(--success-700)' }}>{syncSuccess}</div>}
            {/* Session Picker Modal */}
            {showSessionPicker && (
                <div className="wa-modal">
                    <div className="wa-modal-content" style={{ maxWidth: 400, width: '90%' }}>
                        <h3 className="wa-modal-title">Pilih Sesi Opname</h3>
                        <p className="app1-home__text" style={{ marginBottom: 12 }}>
                            Daftar sesi opname yang dibagikan dari PC:
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                            {availableSessions.length === 0 ? (
                                <div style={{ padding: 12, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>
                                    Tidak ada sesi yang tersedia di server.
                                </div>
                            ) : (
                                availableSessions.map(sess => (
                                    <button 
                                        key={sess.sessionId} 
                                        className="app1-home__button app1-home__button--ghost"
                                        style={{ display: 'block', textAlign: 'left', padding: 12, height: 'auto' }}
                                        onClick={() => handlePullSession(sess.period, sess.sessionId)}
                                        disabled={isSyncing}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#111' }}>{sess.fileName || 'Sesi Tanpa Nama'}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 4 }}>
                                            Periode: <b>{sess.period}</b> • {new Date(sess.createdAt).toLocaleString('id-ID')}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 4 }}>
                                            Progress: {sess.checkedCount || 0} / {sess.totalCount || 0} Aset Dicek
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="wa-modal-actions">
                            <button className="wa-btn" onClick={() => setShowSessionPicker(false)} disabled={isSyncing}>
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
