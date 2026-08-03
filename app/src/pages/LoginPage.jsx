import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Settings } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { getServerUrl, setServerUrl } from '../utils/apiConfig';
import ThemeToggle from '../components/ThemeToggle';

const isNativePlatform = Capacitor.isNativePlatform();

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
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            fontFamily: 'var(--font-sora)',
            position: 'relative',
            padding: '24px',
        }}>
            {/* Absolute Theme Toggle & Settings */}
            <div style={{ position: 'absolute', top: 32, right: 32, zIndex: 10, display: 'flex', gap: '12px' }}>
                {isNativePlatform && (
                    <button 
                        onClick={() => { setTempUrl(baseUrl); setShowSettings(true); }}
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                        title="Server Settings"
                        aria-label="Server Settings"
                    >
                        <Settings size={16} />
                    </button>
                )}
                <ThemeToggle />
            </div>

            <div className="app1-home__panel" style={{
                width: '100%',
                maxWidth: '440px',
                padding: '40px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '12px' }}>
                        PT SANTOS JAYA ABADI
                    </div>
                    <h1 style={{
                        fontSize: '32px', lineHeight: 1.1, fontWeight: 700,
                        color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0,
                    }}>
                        Kertas Kerja<br />Digital
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.5 }}>
                        Sistem manajemen opname fisik aset perusahaan terintegrasi.
                    </p>
                </div>

                <div style={{ width: '100%' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '8px' }}>Username</div>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                    <User size={16} />
                                </div>
                                <input
                                    type="text"
                                    className="app1-home__input"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Masukkan username"
                                    autoFocus
                                    autoComplete="username"
                                    style={{ paddingLeft: '40px', width: '100%', height: '44px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '8px' }}>Password</div>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="app1-home__input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan password"
                                    autoComplete="current-password"
                                    style={{ paddingLeft: '40px', paddingRight: '40px', width: '100%', height: '44px' }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0', color: 'var(--text-tertiary)' }}
                                    aria-label="Toggle password visibility">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
                            Ingat sesi saya
                        </label>

                        {error && (
                            <div className="app1-home__alert" style={{ marginTop: '16px', background: 'var(--danger-50)', borderColor: 'var(--danger-200)', color: 'var(--danger-700)', padding: '10px 12px', fontSize: '12px' }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading || !username || !password} className="app1-home__button app1-home__button--primary" style={{ width: '100%', marginTop: '24px', height: '44px', fontWeight: 600 }}>
                            {loading ? 'Memproses…' : 'Masuk Sistem'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Server config modal (native only) */}
            {showSettings && isNativePlatform && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
                    <div className="app1-home__panel" style={{ maxWidth: '440px', width: '100%', padding: '24px', background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <Settings size={18} style={{ color: 'var(--accent)' }} />
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Server Configuration</h3>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                            Konfigurasi target API server.<br />
                            <b>USB (ADB Reverse):</b> <code style={{ color: 'var(--text-primary)' }}>http://localhost:5181</code><br />
                            <b>WiFi (PC IP):</b> <code style={{ color: 'var(--text-primary)' }}>http://192.168.x.x:5181</code>
                        </p>
                        <input type="text" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} className="app1-home__input" placeholder="http://localhost:5181" style={{ marginBottom: '16px', width: '100%' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" className="app1-home__button app1-home__button--ghost" onClick={() => setShowSettings(false)}>Batal</button>
                            <button type="button" className="app1-home__button app1-home__button--primary" onClick={() => { setServerUrl(tempUrl.trim()); setBaseUrl(tempUrl.trim()); setShowSettings(false); }}>Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
