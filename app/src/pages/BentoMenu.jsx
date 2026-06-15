import { useNavigate, Navigate } from 'react-router-dom';

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
        <div style={{ minHeight: '100vh', background: 'var(--cream-bg)', fontFamily: 'var(--font-sora)' }}>
            {/* Top bar */}
            <div className="wa-app-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, background: 'var(--charcoal-900)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--terracotta-500)', letterSpacing: '0.05em' }}>KKD</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.01em' }}>Kertas Kerja Digital</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Logged in as</div>
                        <div style={{ fontSize: 12, color: 'var(--charcoal-900)', fontWeight: 600 }}>{auth.user || 'User'}</div>
                    </div>
                    <button onClick={handleLogout} className="wa-btn-ghost">Logout</button>
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.02em', marginTop: 6 }}>
                            Selamat datang, {auth.user || 'User'}.
                        </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.15em' }}>PILIH APLIKASI →</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
                    {visibleApps.map((app) => {
                        const meta = MODULE_META[app.moduleIndex];
                        const IconComp = ModuleIcons[app.id];
                        return (
                            <button key={app.id} className="wa-card" onClick={() => navigate(app.path)}
                                style={{ padding: 24, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', border: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.2em' }}>
                                        MOD {meta.code} · {meta.category.toUpperCase()}
                                    </div>
                                    {app.id === 'app1' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <div style={{ width: 5, height: 5, background: 'var(--terracotta-500)', borderRadius: '50%' }} />
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--terracotta-500)', letterSpacing: '0.12em', fontWeight: 700 }}>RECENT</span>
                                        </div>
                                    )}
                                </div>
                                <div className="wa-icon-wrap" style={{ marginBottom: 18 }}>
                                    {IconComp && <IconComp />}
                                </div>
                                <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.01em' }}>{app.title}</div>
                                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--charcoal-500)', lineHeight: 1.5 }}>{app.description}</div>
                                <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(26,26,26,0.06)' }}>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.1em' }}>AKTIF</div>
                                    <div style={{ fontSize: 11, color: 'var(--charcoal-900)', fontWeight: 600 }}>Buka →</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, borderTop: '1px solid rgba(26,26,26,0.08)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.12em' }}>
                    <span>V1.0.4 · BUILD 2026.06</span>
                    <span>PT SANTOS JAYA ABADI · INTERNAL</span>
                    <span>◆ PRODUCTION</span>
                </div>
            </div>
        </div>
    );
}
