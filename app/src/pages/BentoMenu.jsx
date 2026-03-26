import { useNavigate, Navigate } from 'react-router-dom';
import { LogOut, Settings, Grid } from 'lucide-react';

const MODULE_META = [
    { code: '01', category: 'OPERATIONAL' },
    { code: '02', category: 'REPORTING' },
    { code: '03', category: 'DATABASE' },
    { code: '04', category: 'INTELLIGENCE' },
];

const ALL_APPS = [
    {
        id: 'app1',
        title: 'Opname Aset',
        description: 'Digitalisasi kertas kerja opname aset tetap. Scan barcode, input data, dan generate laporan secara instan.',
        path: '/app1',
        variant: 'hero',
        moduleIndex: 0,
    },
    {
        id: 'app2',
        title: 'Extract Hasil Opname & MAT',
        description: 'Ambil data hasil opname dari database, generate laporan recouncil per ruangan, dan buat report MAT.',
        path: '/app2',
        variant: 'dark',
        moduleIndex: 1,
    },
    {
        id: 'app3',
        title: 'Master Data & Recouncil',
        description: 'Gabungkan data Master dengan upload Multi-File Opname untuk dievaluasi seketika.',
        path: '/app3',
        variant: 'light',
        moduleIndex: 2,
    },
    {
        id: 'app5',
        title: 'Real-time Dashboard Analytics',
        description: 'Visualisasi dan analitik progress opname aset di seluruh departemen secara real-time dengan monitoring KPI terpadu.',
        path: '/dashboard',
        variant: 'accent',
        moduleIndex: 3,
    },
];

/* SVG icons per module — simple, editorial */
const ModuleIcons = {
    app1: () => (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
            <rect x="6" y="4" width="22" height="28" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M10 12h14M10 17h14M10 22h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="31" cy="31" r="7" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2"/>
            <path d="M28 31l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    app2: () => (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
            <path d="M8 32V8h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M8 26l7-7 5 5 8-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="32" cy="16" r="3" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2"/>
        </svg>
    ),
    app3: () => (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
            <ellipse cx="20" cy="12" rx="12" ry="5" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 12v8c0 2.76 5.37 5 12 5s12-2.24 12-5v-8" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 20v8c0 2.76 5.37 5 12 5s12-2.24 12-5v-8" stroke="currentColor" strokeWidth="2"/>
        </svg>
    ),
    app5: () => (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
            <rect x="4" y="8" width="32" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M13 21v-5M18 21v-8M23 21v-3M28 21v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 31h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M20 28v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
    ),
};

/* Premium KKD Logo */
const KKDLogo = ({ size = 32 }) => (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        <polygon points="18,2 34,11 34,29 18,38 2,29 2,11" fill="var(--charcoal-900)" stroke="var(--amber-600)" strokeWidth="1.5"/>
        <polygon points="18,7 29,13.5 29,26.5 18,33 7,26.5 7,13.5" fill="none" stroke="var(--amber-500)" strokeWidth="0.75" opacity="0.5"/>
        <text x="18" y="23" textAnchor="middle" fontFamily="'DM Mono', monospace" fontWeight="700" fontSize="10" fill="var(--amber-400)" letterSpacing="0">KKD</text>
    </svg>
);

export default function BentoMenu() {
    const navigate = useNavigate();

    const handleLogout = () => {
        sessionStorage.removeItem('auth');
        localStorage.removeItem('auth');
        navigate('/login', { replace: true });
    };

    const auth = JSON.parse(sessionStorage.getItem('auth') || localStorage.getItem('auth') || '{}');

    if (auth.user === 'DASHBOARD_ASSET_SJA') {
        return <Navigate to="/dashboard" replace />;
    }

    const isAdmin = auth.role === 'admin';
    const visibleApps = ALL_APPS.filter(
        app => isAdmin || (auth.access && auth.access.includes(app.id))
    );

    return (
        <div className="bm-page">
            <div className={`bm-layout ${!isAdmin ? 'bm-layout--user' : ''}`}>
                
                {/* ── Sidebar (Admin Only) ── */}
                {isAdmin && (
                    <aside className="bm-aside">
                        <div className="bm-aside__header">
                            <KKDLogo size={28} />
                            <div className="bm-aside__brand">
                                OPNAME ASET <strong>PLATFORM</strong>
                            </div>
                        </div>
                        <div className="bm-aside__nav">
                            <span className="bm-aside__nav-label">MAIN MENU</span>
                            <button className="bm-aside__link bm-aside__link--active" onClick={() => navigate('/bento')}>
                                <Grid size={16} /> Dashboard
                            </button>
                            <button className="bm-aside__link" onClick={() => navigate('/admin')}>
                                <Settings size={16} /> System Config
                            </button>
                        </div>
                        <div className="bm-aside__footer">
                            <div className="bm-aside__user">
                                <span className="bm-aside__user-role">ADMINISTRATOR</span>
                                <span className="bm-aside__user-name">{auth.user || 'Admin'}</span>
                            </div>
                            <button className="bm-aside__logout-btn" onClick={handleLogout} title="Logout">
                                <LogOut size={14} />
                            </button>
                        </div>
                    </aside>
                )}

                {/* ── Main Content Area ── */}
                <div className="bm-main-area">
                    
                    {/* ── Topbar (User Layout) ── */}
                    {!isAdmin && (
                        <div className="bm-topbar">
                            <div className="bm-topbar__left">
                                <div className="bm-topbar__logo">
                                    <KKDLogo size={24} />
                                </div>
                                <span className="bm-topbar__brand">OPNAME ASET PLATFORM</span>
                            </div>

                            <div className="bm-topbar__center">
                                KERTAS KERJA DIGITAL
                            </div>

                            <div className="bm-topbar__right">
                                <div className="bm-topbar__user-info">
                                    <span className="bm-topbar__user-label">LOGGED IN AS</span>
                                    <span className="bm-topbar__user-name">{auth.user || 'User'}</span>
                                </div>
                                <button className="bm-topbar__logout" onClick={handleLogout}>
                                    LOGOUT
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Body Content ── */}
                    <main className="bm-content">
                        <div className="bm-welcome">
                            <h1 className="bm-welcome__title">Selamat Datang<span className="bm-welcome__dot">.</span></h1>
                            <p className="bm-welcome__sub">PILIH APLIKASI YANG INGIN DIJALANKAN</p>
                        </div>

                        <div className={`bm-grid-tight ${visibleApps.length === 3 ? 'bm-grid--3-items' : ''}`}>
                            {visibleApps.map((app) => {
                                const meta = MODULE_META[app.moduleIndex];
                                const IconComp = ModuleIcons[app.id];
                                return (
                                    <button
                                        key={app.id}
                                        className={`bm-card bm-card--${app.variant}`}
                                        onClick={() => navigate(app.path)}
                                    >
                                        {IconComp && (
                                            <div className="bm-card__icon">
                                                <IconComp />
                                            </div>
                                        )}
                                        <div className="bm-card__body">
                                            <h2 className="bm-card__title">{app.title}</h2>
                                            <p className="bm-card__desc">{app.description}</p>
                                        </div>
                                        <div className="bm-card__footer">
                                            <div className="bm-card__tag">
                                                [ MOD {meta.code} ] {meta.category}
                                            </div>
                                            <div className="bm-card__action">
                                                <svg className="bm-card__arrow-svg" viewBox="0 0 40 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <line className="bm-arrow-line" x1="0" y1="8" x2="32" y2="8" stroke="currentColor" strokeWidth="1.5"/>
                                                    <g className="bm-arrow-head">
                                                        <path d="M26 2 L33 8 L26 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                                                    </g>
                                                </svg>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </main>

                    {/* ── Footer ── */}
                    <footer className="bm-footer">
                        <span className="bm-footer__brand">V1.0.4-BUILD.2026</span>
                        <div className="bm-footer__meta">
                            <span className="bm-footer__label">LAST UPDATE</span>
                            <span className="bm-footer__value">MAR 26, 2026 – 14:01</span>
                        </div>
                        <div className="bm-footer__meta">
                            <span className="bm-footer__label">ENVIRONMENT</span>
                            <span className="bm-footer__value bm-footer__value--live">◆ PRODUCTION SERVER</span>
                        </div>
                    </footer>

                </div>
            </div>
        </div>
    );
}
