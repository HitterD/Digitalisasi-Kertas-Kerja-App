import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import { Wifi, MonitorUp, SmartphoneNfc, DownloadCloud, Settings } from 'lucide-react';
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
        <div 
            className="card card--sync mb-3" 
            style={{ 
                borderRadius: '4px', 
                border: '1px solid var(--charcoal-900)', 
                boxShadow: '4px 4px 0px rgba(24, 24, 27, 0.1)', // subtle hard shadow 
                background: '#ffffff'
            }}
        >
            <div className="card__header" style={{ borderBottom: '1px solid var(--charcoal-200)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div className="card__title" style={{ color: 'var(--charcoal-900)', fontFamily: 'var(--font-sora)', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wifi size={20} />
                    Hub Sinkronisasi Jaringan
                </div>
            </div>
            
            <div className="flex-col">
                <p className="text-sm" style={{ margin: 0, color: 'var(--charcoal-600)', lineHeight: 1.5 }}>
                    Lakukan Sinkronisasi Jaringan Lokal 2 Arah antara <strong style={{color: 'var(--charcoal-900)'}}>PC</strong> dan <strong style={{color: 'var(--charcoal-900)'}}>Tablet Android</strong>.
                </p>

                <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                    {!isNativePlatform && (
                        <button
                            className="btn"
                            onClick={handlePushSession}
                            disabled={isSyncing || (!masterDb && !historyDb && state.rooms.length === 0)}
                            style={{ 
                                height: 'auto', 
                                padding: '12px 16px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'flex-start', 
                                gap: '16px', 
                                border: '1px solid var(--charcoal-300)', 
                                borderRadius: '0', 
                                background: 'transparent',
                                transition: 'all 0.2s ease',
                                opacity: (isSyncing || (!masterDb && !historyDb && state.rooms.length === 0)) ? 0.5 : 1
                            }}
                        >
                            <div style={{ background: 'var(--charcoal-900)', padding: '12px', borderRadius: '0', color: 'var(--amber-400)' }}>
                                <MonitorUp size={24} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--charcoal-900)', fontFamily: 'var(--font-sora)' }}>Bagikan Sesi</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--charcoal-500)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>PC &rarr; Jaringan Lokal</div>
                            </div>
                        </button>
                    )}

                    {isNativePlatform && (
                        <button
                            className="btn"
                            style={{ 
                                height: 'auto', 
                                padding: '12px 16px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'flex-start', 
                                gap: '16px', 
                                border: '1px solid var(--charcoal-300)', 
                                borderRadius: '0',
                                background: 'transparent',
                                opacity: isSyncing ? 0.5 : 1
                            }}
                            onClick={handlePullSession}
                            disabled={isSyncing}
                        >
                            <div style={{ background: 'var(--charcoal-900)', padding: '12px', borderRadius: '0', color: 'var(--amber-400)' }}>
                                <SmartphoneNfc size={24} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--charcoal-900)', fontFamily: 'var(--font-sora)' }}>Tarik Sesi</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--charcoal-500)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Jaringan Lokal &rarr; Tablet</div>
                            </div>
                        </button>
                    )}

                    {!isNativePlatform && (
                        <button
                            className="btn"
                            onClick={handlePullResult}
                            disabled={isSyncing}
                            style={{ 
                                height: 'auto', 
                                padding: '12px 16px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'flex-start', 
                                gap: '16px', 
                                borderRadius: '0',
                                background: 'var(--charcoal-900)',
                                color: 'var(--amber-400)',
                                border: '1px solid var(--charcoal-900)',
                                opacity: isSyncing ? 0.5 : 1
                            }}
                        >
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '0', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <DownloadCloud size={24} color="var(--amber-400)" />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-sora)' }}>Tarik Hasil Opname</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Tablet &rarr; PC</div>
                            </div>
                        </button>
                    )}

                    {isNativePlatform && (
                        <div style={{ marginTop: '8px', width: '100%' }}>
                            <button
                                type="button"
                                onClick={() => { setTempUrl(getServerUrl()); setShowConfig(!showConfig); }}
                                className="btn btn--ghost"
                                style={{ 
                                    fontSize: '0.75rem', 
                                    color: 'var(--charcoal-500)', 
                                    fontFamily: 'var(--font-mono)',
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    padding: '4px 0',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                <Settings size={14} /> [ Konfigurasi IP PC ]
                            </button>
                        </div>
                    )}

                    {showConfig && isNativePlatform && (
                        <div style={{ 
                            background: 'var(--warm-50)', 
                            padding: '16px', 
                            borderRadius: '0', 
                            borderLeft: '3px solid var(--charcoal-900)', 
                            border: '1px solid var(--charcoal-200)',
                            borderLeftWidth: '3px',
                            borderLeftColor: 'var(--charcoal-900)',
                            marginTop: '4px' 
                        }}>
                            <p style={{ fontSize: '12px', color: 'var(--charcoal-600)', fontFamily: 'var(--font-mono)', marginBottom: '12px', marginTop: 0 }}>&gt; Masukkan IP Wi-Fi PC untuk Sinkronisasi</p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={tempUrl}
                                    onChange={e => setTempUrl(e.target.value)}
                                    className="form-input"
                                    style={{ 
                                        flex: 1, 
                                        padding: '10px 12px', 
                                        fontSize: '13px',
                                        fontFamily: 'var(--font-mono)',
                                        borderRadius: '0',
                                        border: '1px solid var(--charcoal-300)',
                                        background: '#fff'
                                    }}
                                    placeholder="http://192.168.1.10:5181"
                                />
                                <button
                                    type="button"
                                    className="btn"
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
                                        padding: '10px 20px', 
                                        fontSize: '13px', 
                                        borderRadius: '0',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 'bold',
                                        background: 'var(--charcoal-900)',
                                        color: '#fff',
                                        border: '1px solid var(--charcoal-900)'
                                    }}
                                >
                                    SAVE
                                </button>
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--charcoal-400)', fontFamily: 'var(--font-mono)', marginTop: '12px', marginBottom: 0 }}>* Standar USB: http://localhost:5181</p>
                        </div>
                    )}
                </div>

                {syncError && <div className="alert alert--danger" style={{ marginTop: '16px', borderRadius: '0', borderLeft: '4px solid var(--red-600)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{syncError}</div>}
                {syncSuccess && <div className="alert alert--success" style={{ marginTop: '16px', borderRadius: '0', borderLeft: '4px solid #059669', background: '#ecfdf5', color: '#065f46', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{syncSuccess}</div>}
            </div>
        </div>
    );
}
