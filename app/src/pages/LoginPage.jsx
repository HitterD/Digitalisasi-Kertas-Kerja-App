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
        <div className="lp-page">
            {/* ── LEFT: Brand Panel ── */}
            <div className="lp-left">
                {/* Shared noise texture overlay */}
                <div className="lp-noise" />

                {/* Header */}
                <div className="lp-left__header">
                    <div className="lp-badge">
                        <div className="lp-badge__dot" />
                        <span>Asset Management System</span>
                    </div>
                </div>

                {/* Hero text */}
                <div className="lp-left__hero">
                    <h1 className="lp-hero-title">
                        Kertas Kerja<br />
                        <span className="lp-hero-accent">Digital.</span>
                    </h1>
                    <p className="lp-hero-sub">
                        Sistem pengendalian opname aset<br />
                        cerdas &amp; terintegrasi — PT Santos Jaya Abadi
                    </p>
                </div>

                {/* Module cards */}
                <div className="lp-modules">
                    {MODULES.map((mod, i) => (
                        <div key={mod.id} className="lp-mod" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
                            <div className="lp-mod__img-wrap">
                                <img
                                    src={mod.img}
                                    alt={mod.label}
                                    className="lp-mod__img"
                                    draggable={false}
                                />
                            </div>
                            <div className="lp-mod__body">
                                <span className="lp-mod__num">{mod.id}</span>
                                <h3 className="lp-mod__title">{mod.label}</h3>
                                <p className="lp-mod__desc">{mod.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="lp-left__footer">
                    <span>© 2026 PT Santos Jaya Abadi — Internal System</span>
                </div>
            </div>

            {/* ── RIGHT: Form Panel ── */}
            <div className="lp-right">
                <div className="lp-noise" />

                <div className="lp-form-wrap">
                    {/* Logo */}
                    <div className="lp-form-logo">
                        <span className="lp-form-logo__dot" />
                        <span className="lp-form-logo__text">KERTAS KERJA DIGITAL</span>
                    </div>

                    <div className="lp-form-header">
                        <p className="lp-form-eyebrow">Portal Masuk</p>
                        <h2 className="lp-form-heading">Masuk ke<br />Sistem</h2>
                        <p className="lp-form-tagline">
                            Digitalisasi opname fisik aset tetap perusahaan
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="lp-form">
                        <div className="lp-field">
                            <label className="lp-field__label">
                                <User size={11} strokeWidth={2} />
                                Username
                            </label>
                            <input
                                type="text"
                                className="lp-field__input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Masukkan username"
                                autoFocus
                                autoComplete="username"
                            />
                        </div>

                        <div className="lp-field">
                            <label className="lp-field__label">
                                <Lock size={11} strokeWidth={2} />
                                Password
                            </label>
                            <div className="lp-field__pw-wrap">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="lp-field__input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan password"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="lp-field__eye"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        <div className="lp-remember">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label htmlFor="rememberMe">Ingat sesi saya</label>
                        </div>

                        {error && (
                            <div className="lp-error" role="alert">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="lp-submit"
                            disabled={loading || !username || !password}
                        >
                            {loading ? (
                                <span className="lp-submit__spinner" />
                            ) : null}
                            {loading ? 'Memproses…' : 'Masuk'}
                        </button>

                        {isNativePlatform && (
                            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                                <button
                                    type="button"
                                    className="lp-settings-btn"
                                    onClick={() => { setTempUrl(baseUrl); setShowSettings(true); }}
                                >
                                    <Settings size={12} />
                                    Server Configuration
                                </button>
                            </div>
                        )}
                    </form>

                    <p className="lp-form-footer">
                        Solusi Pintar Untuk Kemudahan Opname Aset Terintegrasi
                    </p>
                </div>
            </div>

            {/* Config Modal for Native Apps */}
            {showSettings && isNativePlatform && (
                <div className="lp-modal-overlay">
                    <div className="lp-modal">
                        <div className="lp-modal__header">
                            <Settings size={17} style={{ color: 'var(--amber-500)' }} />
                            <h3>Server Configuration</h3>
                        </div>
                        <p className="lp-modal__desc">
                            Konfigurasi target API server.<br />
                            • <b>USB (ADB Reverse):</b> <code>http://localhost:5181</code><br />
                            • <b>WiFi (PC IP):</b> <code>http://192.168.x.x:5181</code>
                        </p>
                        <input
                            type="text"
                            value={tempUrl}
                            onChange={(e) => setTempUrl(e.target.value)}
                            className="lp-modal__input"
                            placeholder="http://localhost:5181"
                        />
                        <div className="lp-modal__actions">
                            <button type="button" className="lp-modal__btn lp-modal__btn--cancel" onClick={() => setShowSettings(false)}>
                                Batal
                            </button>
                            <button
                                type="button"
                                className="lp-modal__btn lp-modal__btn--save"
                                onClick={() => {
                                    const newUrl = tempUrl.trim();
                                    setServerUrl(newUrl);
                                    setBaseUrl(newUrl);
                                    setShowSettings(false);
                                }}
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
