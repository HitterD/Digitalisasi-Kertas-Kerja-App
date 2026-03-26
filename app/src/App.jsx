import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { OpnameProvider } from './store/OpnameContext';
import UploadPage from './pages/UploadPage';
import OpnamePage from './pages/OpnamePage';
import LoginPage from './pages/LoginPage';
import BentoMenu from './pages/BentoMenu';
import ExtractOpnamePage from './pages/ExtractOpnamePage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import BarcodeSearchModal from './components/BarcodeSearchModal';
import ErrorBoundary from './components/ErrorBoundary';
import { ClipboardList, Home, Search, ClipboardCheck, FileSpreadsheet, ArrowLeft, LogOut, BarChart3, Database } from 'lucide-react';
import './index.css';
import './extract-opname.css';
import App3ConsolidationPage from './pages/App3ConsolidationPage';
import UnifiedMasterDataPage from './pages/UnifiedMasterDataPage';
import { isCapacitor } from './utils/apiConfig';
import { getAuthStr, clearAuth } from './utils/auth';

const isNativePlatform = isCapacitor();

/* ---- Auth Guard ---- */
function RequireAuth({ children, requiredApp, requireAdmin }) {
  const authStr = getAuthStr();
  if (!authStr) return <Navigate to="/login" replace />;

  try {
    const auth = JSON.parse(authStr);

    // Check Admin
    if (requireAdmin && auth.role !== 'admin') {
      return <Navigate to="/" replace />;
    }

    // Check App Access
    if (requiredApp && auth.role !== 'admin') {
      if (!auth.access || !auth.access.includes(requiredApp)) {
        return <Navigate to="/login" state={{ toastMessage: 'Anda tidak memiliki akses ke fitur ini.' }} replace />;
      }
    }

    return children;
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
}

/* ---- App 1 Layout (Opname Aset) ---- */
function App1Layout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/app1' || location.pathname === '/app1/';

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <OpnameProvider>
      <>
        <header className="app-header" style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--warm-50)',
          borderBottom: '2px solid var(--charcoal-900)',
          boxShadow: '0 2px 0 var(--amber-500)'
        }}>
          <div className="app-header__left">
            {isNativePlatform ? (
              <button
                onClick={handleLogout}
                className="app-header__back"
                title="Logout Aplikasi"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <LogOut size={18} color="#ef4444" />
              </button>
            ) : (
              <Link to="/" className="app-header__back" title="Kembali ke Menu">
                <ArrowLeft size={18} />
              </Link>
            )}
            <div className="header-divider" style={{ width: '1px', height: '24px', background: 'var(--warm-300)', margin: '0 var(--space-3)' }}></div>
            <Link to="/app1" className="app-header__brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--charcoal-900)' }}>
              <div style={{ width: 32, height: 32, background: 'var(--charcoal-900)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={18} color="var(--amber-400)" />
              </div>
              <span style={{ letterSpacing: '-0.02em' }}>Opname Aset</span>
            </Link>
            <div style={{ 
              display: 'flex', 
              background: 'var(--warm-100)', 
              borderRadius: '999px', 
              padding: '4px', 
              gap: '4px', 
              border: '1px solid var(--warm-200)', 
              marginLeft: 'var(--space-2)' 
            }}>
              <Link to="/app1" style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '6px 14px',
                borderRadius: '999px',
                background: isHome ? '#ffffff' : 'transparent',
                color: isHome ? 'var(--charcoal-900)' : 'var(--charcoal-500)',
                fontFamily: 'var(--font-sora)', 
                fontSize: '12px', 
                fontWeight: isHome ? 700 : 600, 
                textTransform: 'uppercase', 
                letterSpacing: '0.04em',
                boxShadow: isHome ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                textDecoration: 'none'
              }}>
                <Home size={15} style={{ color: isHome ? 'var(--amber-500)' : 'currentColor', transition: 'color 0.2s' }} />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <Link to="/app1/opname" style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '6px 14px',
                borderRadius: '999px',
                background: location.pathname.includes('/opname') ? '#ffffff' : 'transparent',
                color: location.pathname.includes('/opname') ? 'var(--charcoal-900)' : 'var(--charcoal-500)',
                fontFamily: 'var(--font-sora)', 
                fontSize: '12px', 
                fontWeight: location.pathname.includes('/opname') ? 700 : 600, 
                textTransform: 'uppercase', 
                letterSpacing: '0.04em',
                boxShadow: location.pathname.includes('/opname') ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                textDecoration: 'none'
              }}>
                <ClipboardCheck size={15} style={{ color: location.pathname.includes('/opname') ? 'var(--amber-500)' : 'currentColor', transition: 'color 0.2s' }} />
                <span className="hidden sm:inline">Kertas Kerja</span>
              </Link>
            </div>
          </div>
          <div className="app-header__right">
            <button 
              className="header-search-btn" 
              onClick={() => setIsSearchOpen(true)} 
              title="Cari master data berdasarkan barcode"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--charcoal-900)', 
                color: 'var(--amber-400)', 
                border: '2px solid var(--charcoal-900)',
                borderRadius: '8px',
                padding: '6px 14px',
                fontFamily: 'var(--font-sora)',
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                boxShadow: '4px 4px 0px var(--amber-400)',
                transition: 'all 0.15s ease-out',
                position: 'relative'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
                e.currentTarget.style.boxShadow = '6px 6px 0px var(--amber-400)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translate(0px, 0px)';
                e.currentTarget.style.boxShadow = '4px 4px 0px var(--amber-400)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translate(4px, 4px)';
                e.currentTarget.style.boxShadow = '0px 0px 0px var(--amber-400)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
                e.currentTarget.style.boxShadow = '6px 6px 0px var(--amber-400)';
              }}
            >
              <Search size={16} strokeWidth={3} />
              <span className="hidden sm:inline" style={{ marginTop: '1px' }}>BARCODE CHECKER</span>
            </button>
          </div>
        </header>
        <BarcodeSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <Outlet />
      </>
    </OpnameProvider>
  );
}

/* ---- App 2 Layout (Extract Hasil Opname) ---- */
function App2Layout() {
  return (
    <>
      <header className="app-header" style={{
        background: 'var(--warm-50)',
        borderBottom: '2px solid var(--charcoal-900)',
        boxShadow: '0 2px 0 var(--amber-500)'
      }}>
        <div className="app-header__left">
          <Link to="/" className="app-header__back" title="Kembali ke Menu">
            <ArrowLeft size={18} />
          </Link>
          <div className="header-divider" style={{ width: '1px', height: '24px', background: 'var(--warm-300)', margin: '0 var(--space-3)' }}></div>
          <Link to="/app2" className="app-header__brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--charcoal-900)' }}>
            <div style={{ width: 32, height: 32, background: 'var(--charcoal-900)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={18} color="var(--amber-400)" />
            </div>
            <span style={{ letterSpacing: '-0.02em' }}>Extract MAT</span>
          </Link>
        </div>
      </header>
      <Outlet />
    </>
  );
}

/* ---- Main App ---- */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Main Menu */}
          <Route path="/" element={
            <RequireAuth>
              {isNativePlatform ? <Navigate to="/app1" replace /> : <BentoMenu />}
            </RequireAuth>
          } />

          {/* User Management Route */}
          <Route path="/admin" element={
            <RequireAuth requireAdmin={true}>
              <AdminPage />
            </RequireAuth>
          } />

          {/* App 1 — Opname Aset */}
          <Route path="/app1" element={<RequireAuth requiredApp="app1"><App1Layout /></RequireAuth>}>
            <Route index element={<UploadPage />} />
            <Route path="opname" element={<OpnamePage />} />
          </Route>

          {/* App 2 — Extract Hasil Opname & MAT (Only Web) */}
          {!isNativePlatform && (
            <Route path="/app2" element={<RequireAuth requiredApp="app2"><App2Layout /></RequireAuth>}>
              <Route index element={<ExtractOpnamePage />} />
            </Route>
          )}

          {/* Unified App 3 & 4 — Master Data & Recouncil (Only Web) */}
          {!isNativePlatform && (
            <Route path="/app3" element={<RequireAuth requiredApp="app3"><UnifiedMasterDataPage /></RequireAuth>} />
          )}

          {/* Legacy Dashboard (Moved out / disabled or rename to /dashboard_old if needed) */}
          {!isNativePlatform && (
            <Route path="/dashboard" element={<RequireAuth requiredApp="app3"><DashboardPage /></RequireAuth>} />
          )}

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
