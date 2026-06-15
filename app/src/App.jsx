import { useState, useEffect } from 'react';
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
import { isCapacitor, fetchWithAuth } from './utils/apiConfig';
import { getAuthStr, clearAuth } from './utils/auth';

const isNativePlatform = isCapacitor();

/* ---- Global Auth Refresher (Mencegah JWT Expired) ---- */
function AuthRefresher() {
  useEffect(() => {
    // Jalankan pengecekan token setiap 1 jam untuk mencegah sesi kadaluarsa (12 jam dari backend).
    const interval = setInterval(async () => {
      const authStr = getAuthStr();
      if (!authStr) return; // Jika belum login, skip

      try {
        const response = await fetchWithAuth('/api/auth/verify');
        if (response && response.success && response.token) {
          if (localStorage.getItem('jwt')) {
            localStorage.setItem('jwt', response.token);
          } else if (sessionStorage.getItem('jwt')) {
            sessionStorage.setItem('jwt', response.token);
          }
        }
      } catch (err) {
        console.error('[Auth] Silent refresh failed:', err);
      }
    }, 60 * 60 * 1000); // Berjalan setiap 1 jam (60 * 60 * 1000 ms)

    return () => clearInterval(interval);
  }, []);

  return null;
}

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
        <header className="wa-app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={handleLogout} title={isNativePlatform ? 'Logout Aplikasi' : 'Kembali ke Menu'}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--charcoal-500)' }}>
              {isNativePlatform ? <LogOut size={18} color="var(--danger-500)" /> : <ArrowLeft size={18} />}
            </button>
            <div style={{ width: 1, height: 18, background: 'rgba(26,26,26,0.1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, background: 'var(--charcoal-900)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={18} color="var(--terracotta-400)" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.01em' }}>Opname Aset</div>
            </div>
            <div className="wa-pill" style={{ marginLeft: 8 }}>
              <Link to="/app1" className={`wa-pill-item ${isHome ? 'active' : ''}`}><Home size={15} style={{ color: isHome ? 'var(--terracotta-500)' : 'var(--charcoal-400)' }} />Home</Link>
              <Link to="/app1/opname" className={`wa-pill-item ${!isHome ? 'active' : ''}`}><ClipboardCheck size={15} />Kertas Kerja</Link>
            </div>
          </div>
          <div className="wa-btn" onClick={() => setIsSearchOpen(true)} style={{ background: 'var(--charcoal-900)', color: 'var(--cream-surface)', cursor: 'pointer' }}>
            <Search size={16} strokeWidth={3} /> BARCODE CHECKER
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="wa-app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--charcoal-500)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div style={{ width: 1, height: 18, background: 'rgba(26,26,26,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, background: 'var(--charcoal-900)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={18} color="var(--terracotta-400)" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.01em' }}>Extract &amp; MAT</div>
          </div>
        </div>
        <div className="wa-btn" onClick={() => setIsSearchOpen(true)} style={{ background: 'var(--charcoal-900)', color: 'var(--cream-surface)', cursor: 'pointer' }}>
          <Search size={16} strokeWidth={3} /> BARCODE CHECKER
        </div>
      </header>
      <BarcodeSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <Outlet />
    </>
  );
}

/* ---- Main App ---- */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthRefresher />
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
