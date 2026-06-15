import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Settings } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { getServerUrl, setServerUrl } from '../utils/apiConfig';

const isNativePlatform = Capacitor.isNativePlatform();

const MODULES = [
    {
        id: '01',
        label: 'Operational',
        desc: 'Opname fisik aset dengan validasi checklist real-time',
        img: '/assets/images/mod_opname_asset_1774070338826.png',
    },
    {
        id: '02',
        label: 'Reporting',
        desc: 'Rekap kertas kerja digital dalam laporan terstruktur',
        img: '/assets/images/mod_reporting_v2.png',
    },
    {
        id: '03',
        label: 'Recouncil',
        desc: 'Rekonsiliasi data lapangan vs database perusahaan',
        img: '/assets/images/mod_recouncil_1774070376730.png',
    },
    {
        id: '04',
        label: 'Intelligence',
        desc: 'Analitik statistik & insight kondisi aset terkini',
        img: '/assets/images/mod_analytics_v2.png',
    },
];

export default function LoginPage() {
    const navigate = useNavigate();
    const [baseUrl, setBaseUrl] = useState(isNativePlatform ? getServerUrl() : '');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [tempUrl, setTempUrl] = useState('');

    const handleSuccess = (user, token) => {
        const authPayload = { user: user.username, role: user.role, access: user.access, loginTime: Date.now() };
        if (rememberMe) {
            localStorage.setItem('auth', JSON.stringify(authPayload));
            if (token) localStorage.setItem('jwt', token);
        } else {
            sessionStorage.setItem('auth', JSON.stringify(authPayload));
            if (token) sessionStorage.setItem('jwt', token);
        }
        if (isNativePlatform) {
            navigate('/app1', { replace: true });
        } else {
            navigate('/', { replace: true });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (data.success) {
                if (data.cache) {
                    localStorage.setItem('users_cache', JSON.stringify(data.cache));
                }
                handleSuccess(data.user, data.token);
            } else {
                setError(data.error || 'Username atau password salah');
            }
        } catch (err) {
            // Fallback offline (PWA / APK)
            try {
                const cacheStr = localStorage.getItem('users_cache');
                if (cacheStr) {
                    const cachedUsers = JSON.parse(cacheStr);
                    const encoder = new TextEncoder();
                    const data = encoder.encode('SJA-opname-2026' + password);
                    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    const user = cachedUsers.find(u => u.username === username && u.passwordHash === inputHash);
                    if (user) {
                        handleSuccess({ username: user.username, role: user.role, access: user.access }, null);
                    } else {
                        setError('Mode Offline: Username atau password salah');
                    }
                } else {
                    setError('Mode Offline: Belum ada cache user. Hubungkan ke jaringan untuk login pertama kali.');
                }
            } catch (e) {
                setError('Koneksi Gagal: Tidak dapat terhubung ke Server.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page" style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 1fr',
            minHeight: '100vh',
            background: 'var(--cream-bg)',
            fontFamily: 'var(--font-sora)',
        }}>
            <style>{`
                @media (max-width: 900px) {
                    .login-page { grid-template-columns: 1fr !important; }
                    .login-page > div:first-child { padding: 32px 24px !important; min-height: 40vh; }
                }
            `}</style>

            {/* LEFT: Brand Panel */}
            <div style={{
                padding: '48px 56px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
            }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.22em', color: 'var(--charcoal-400)', textTransform: 'uppercase' }}>
                    Kertas Kerja Digital
                </div>

                <div>
                    <h1 style={{
                        fontSize: '44px', lineHeight: 1.05, fontWeight: 600,
                        color: 'var(--charcoal-900)', letterSpacing: '-0.025em', margin: 0,
                    }}>
                        Kertas Kerja<br/>Digital
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--charcoal-500)', marginTop: '12px', maxWidth: '420px', lineHeight: 1.55 }}>
                        Opname fisik aset PT Santos Jaya Abadi, dicatat sekali dan selamanya.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '28px 0 18px' }}>
                        <div style={{ height: '1px', background: 'var(--charcoal-900)', flex: 1, maxWidth: '180px' }} />
                        <div style={{ width: '6px', height: '6px', background: 'var(--terracotta-500)', borderRadius: '50%' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 28px', fontSize: '13px', color: 'var(--charcoal-900)' }}>
                        {MODULES.map((mod) => (
                            <div key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderTop: '1px solid rgba(26,26,26,0.08)' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-400)', fontSize: '9px' }}>{mod.id}</span>
                                {mod.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--charcoal-400)', letterSpacing: '0.1em' }}>
                    PT SANTOS JAYA ABADI · INTERNAL
                </div>
            </div>

            {/* RIGHT: Form Panel */}
            <div style={{ padding: '48px 56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: '380px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.01em' }}>Masuk</div>
                    <div style={{ fontSize: '12px', color: 'var(--charcoal-500)', marginTop: '4px' }}>Lanjutkan ke sistem opname Anda.</div>

                    <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--charcoal-400)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '6px' }}>Username</div>
                            <input
                                type="text"
                                className="wa-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Masukkan username"
                                autoFocus
                                autoComplete="username"
                            />
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--charcoal-400)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '6px' }}>Password</div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="wa-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan password"
                                    autoComplete="current-password"
                                    style={{ paddingRight: '40px' }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--charcoal-500)' }}
                                    aria-label="Toggle password visibility">
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '11px', color: 'var(--charcoal-500)' }}>
                            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: 'var(--terracotta-500)' }} />
                            Ingat sesi saya
                        </label>

                        {error && (
                            <div role="alert" style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--danger-50)', color: 'var(--danger-500)', borderRadius: '8px', fontSize: '11.5px' }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading || !username || !password} className="wa-btn" style={{ width: '100%', marginTop: '18px', padding: '12px' }}>
                            {loading ? 'Memproses…' : 'Masuk'}
                        </button>

                        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '10px', color: 'var(--charcoal-400)' }}>
                            Hak akses terbatas. Aktivitas dicatat.
                        </div>
                    </form>
                </div>
            </div>

            {/* Server config modal (native only) — keep existing structure, just restyle */}
            {showSettings && isNativePlatform && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
                    <div className="wa-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <Settings size={17} style={{ color: 'var(--terracotta-500)' }} />
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--charcoal-900)' }}>Server Configuration</h3>
                        </div>
                        <p style={{ fontSize: '11.5px', color: 'var(--charcoal-500)', lineHeight: 1.5, marginBottom: '12px' }}>
                            Konfigurasi target API server.<br/>
                            <b>USB (ADB Reverse):</b> <code>http://localhost:5181</code><br/>
                            <b>WiFi (PC IP):</b> <code>http://192.168.x.x:5181</code>
                        </p>
                        <input type="text" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} className="wa-input" placeholder="http://localhost:5181" style={{ marginBottom: '12px' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="wa-btn-ghost" onClick={() => setShowSettings(false)}>Batal</button>
                            <button type="button" className="wa-btn" onClick={() => { setServerUrl(tempUrl.trim()); setBaseUrl(tempUrl.trim()); setShowSettings(false); }}>Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
