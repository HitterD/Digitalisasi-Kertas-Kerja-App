import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import { Wifi, MonitorUp, SmartphoneNfc, DownloadCloud, Settings, ArrowRight } from 'lucide-react';
import { apiUrl, getServerUrl, setServerUrl, fetchWithAuth } from '../utils/apiConfig';
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
    const { state, masterDb, historyDb, importData, exportSession, importSession } = useOpname();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState('');
    const [syncSuccess, setSyncSuccess] = useState('');
    const [showConfig, setShowConfig] = useState(false);
    const [tempUrl, setTempUrl] = useState('');

    const handlePushSession = useCallback(async () => {
        setIsSyncing(true); setSyncError(''); setSyncSuccess('');
        try {
            const payload = exportSession();
            const res = await fetchWithAuth(apiUrl('/api/sync/session'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) setSyncSuccess('Berhasil membagikan Master & History DB ke Jaringan!');
            else setSyncError(data.error || 'Server error.');
        } catch (err) {
            setSyncError('Koneksi Vite Error.');
        } finally { setIsSyncing(false); }
    }, [exportSession]);

    const handlePullSession = useCallback(async () => {
        if (state.rooms && state.rooms.length > 0) {
            const confirmRewrite = window.confirm(
                "PERINGATAN: Anda sudah memiliki data opname lokal!\n\n" +
                "Menarik Sesi dari PC akan MENIMPA dan MENGHAPUS semua progres di Tablet ini dengan Sesi terakhir yang dibagikan PC.\n\n" +
                "Lanjutkan Tarik Sesi?"
            );
            if (!confirmRewrite) return;
        }
        setIsSyncing(true); setSyncError(''); setSyncSuccess('');
        try {
            const res = await fetchWithAuth(apiUrl('/api/sync/session'));
            const payload = await res.json();
            if (res.ok && payload.masterDb) {
                importSession(payload);
                setSyncSuccess('Sesi berhasil dikloning dari PC! Anda siap Keliling Opname.');
                if (payload.state && payload.state.rooms && payload.state.rooms.length > 0) {
                    setTimeout(() => navigate('/app1/opname'), 1500);
                }
            } else {
                setSyncError(payload.message || 'PC belum membagikan Sesi.');
            }
        } catch (err) {
            setSyncError('Gagal menarik Sesi (Koneksi WiFi).');
        } finally { setIsSyncing(false); }
    }, [importSession, navigate, state.rooms]);

    const handlePullResult = useCallback(async () => {
        setIsSyncing(true); setSyncError(''); setSyncSuccess('');
        try {
            const res = await fetchWithAuth(apiUrl('/api/sync/result'));
            const data = await res.json();
            if (res.ok && data.rooms) {
                importData(data);
                navigate('/app1/opname');
            } else {
                setSyncError(data.message || 'Belum ada hasil dikirimkan dari Tablet.');
            }
        } catch (err) {
            setSyncError('Koneksi Gagal Tarik Data Hasil.');
        } finally { setIsSyncing(false); }
    }, [importData, navigate]);

    return (
        <div className="wa-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div className="wa-icon-wrap" style={{ background: 'rgba(26,26,26,0.06)' }}>
                    <Wifi size={20} color="var(--charcoal-900)" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal-900)' }}>Hub Sinkronisasi Jaringan</div>
                    <div style={{ fontSize: 11.5, color: 'var(--charcoal-500)', marginTop: 3 }}>Sinkron 2 arah antara PC &amp; Tablet via WiFi.</div>
                </div>
            </div>

            <div className="flex-col">
                <p className="text-sm" style={{ margin: '0 0 12px', color: 'var(--charcoal-600)', lineHeight: 1.5 }}>
                    Lakukan Sinkronisasi Jaringan Lokal 2 Arah antara <strong style={{color: 'var(--charcoal-900)'}}>PC</strong> dan <strong style={{color: 'var(--charcoal-900)'}}>Tablet Android</strong>.
                </p>

                <div style={{ display: 'grid', gap: 8 }}>
                    {!isNativePlatform && (
                        <button
                            className="wa-btn-ghost"
                            onClick={handlePushSession}
                            disabled={isSyncing || (!masterDb && !historyDb && state.rooms.length === 0)}
                            style={{
                                width: '100%',
                                height: 'auto',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                                opacity: (isSyncing || (!masterDb && !historyDb && state.rooms.length === 0)) ? 0.5 : 1
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <MonitorUp size={18} color="var(--charcoal-700)" />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--charcoal-900)' }}>Bagikan Sesi</div>
                                    <div style={{ fontSize: 10, color: 'var(--charcoal-500)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>PC &rarr; JARINGAN LOKAL</div>
                                </div>
                            </div>
                            <ArrowRight size={14} color="var(--charcoal-500)" />
                        </button>
                    )}

                    {isNativePlatform && (
                        <button
                            className="wa-btn-ghost"
                            style={{
                                width: '100%',
                                height: 'auto',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                                opacity: isSyncing ? 0.5 : 1
                            }}
                            onClick={handlePullSession}
                            disabled={isSyncing}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <SmartphoneNfc size={18} color="var(--charcoal-700)" />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--charcoal-900)' }}>Tarik Sesi</div>
                                    <div style={{ fontSize: 10, color: 'var(--charcoal-500)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>JARINGAN LOKAL &rarr; TABLET</div>
                                </div>
                            </div>
                            <ArrowRight size={14} color="var(--charcoal-500)" />
                        </button>
                    )}

                    {!isNativePlatform && (
                        <button
                            className="wa-btn-ghost"
                            onClick={handlePullResult}
                            disabled={isSyncing}
                            style={{
                                width: '100%',
                                height: 'auto',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 16,
                                opacity: isSyncing ? 0.5 : 1
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <DownloadCloud size={18} color="var(--charcoal-700)" />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--charcoal-900)' }}>Tarik Hasil Opname</div>
                                    <div style={{ fontSize: 10, color: 'var(--charcoal-500)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>TABLET &rarr; PC</div>
                                </div>
                            </div>
                            <ArrowRight size={14} color="var(--charcoal-500)" />
                        </button>
                    )}

                    {isNativePlatform && (
                        <div style={{ marginTop: 4, width: '100%' }}>
                            <button
                                type="button"
                                onClick={() => { setTempUrl(getServerUrl()); setShowConfig(!showConfig); }}
                                className="wa-btn-ghost"
                                style={{
                                    width: '100%',
                                    fontSize: 11,
                                    color: 'var(--charcoal-500)',
                                    fontFamily: 'var(--font-mono)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                    padding: '8px 14px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Settings size={12} /> Konfigurasi IP PC
                                </span>
                            </button>
                        </div>
                    )}

                    {showConfig && isNativePlatform && (
                        <div style={{
                            background: 'var(--bg-input)',
                            padding: 14,
                            borderRadius: 8,
                            border: '1px solid var(--charcoal-200)',
                            borderLeft: '3px solid var(--charcoal-900)',
                            marginTop: 4
                        }}>
                            <p style={{ fontSize: 11, color: 'var(--charcoal-600)', fontFamily: 'var(--font-mono)', marginBottom: 10, marginTop: 0 }}>Masukkan IP Wi-Fi PC untuk Sinkronisasi</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    value={tempUrl}
                                    onChange={e => setTempUrl(e.target.value)}
                                    className="form-input"
                                    style={{
                                        flex: 1,
                                        padding: '8px 10px',
                                        fontSize: 12,
                                        fontFamily: 'var(--font-mono)',
                                        borderRadius: 6,
                                        border: '1px solid var(--charcoal-300)',
                                        background: '#fff'
                                    }}
                                    placeholder="http://192.168.1.10:5181"
                                />
                                <button
                                    type="button"
                                    className="wa-btn"
                                    onClick={() => {
                                        const trimmed = tempUrl.trim();
                                        if (!isValidUrl(trimmed)) {
                                            setSyncError('Format URL tidak valid. Contoh: http://192.168.1.10:5181');
                                            return;
                                        }
                                        setServerUrl(trimmed);
                                        setShowConfig(false);
                                        setSyncError('');
                                        setSyncSuccess('IP Disimpan! Silakan coba Tarik Sesi kembali.');
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        fontSize: 12
                                    }}
                                >
                                    SAVE
                                </button>
                            </div>
                            <p style={{ fontSize: 10, color: 'var(--charcoal-400)', fontFamily: 'var(--font-mono)', marginTop: 8, marginBottom: 0 }}>* Standar USB: http://localhost:5181</p>
                        </div>
                    )}
                </div>

                {syncError && <div className="alert alert--danger" style={{ marginTop: 12, borderRadius: 8, borderLeft: '4px solid var(--red-600)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{syncError}</div>}
                {syncSuccess && <div className="alert alert--success" style={{ marginTop: 12, borderRadius: 8, borderLeft: '4px solid #059669', background: '#ecfdf5', color: '#065f46', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{syncSuccess}</div>}
            </div>
        </div>
    );
}
