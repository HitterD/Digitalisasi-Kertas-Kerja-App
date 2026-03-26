import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Users, UserPlus, ShieldPlus, Trash2, ArrowLeft, KeySquare, 
    Activity, Database, HardDrive, Download, UploadCloud, 
    Server, Clock, Search as SearchIcon, ChevronLeft, ChevronRight, 
    X, Filter, Save, FileText 
} from 'lucide-react';
import { fetchWithAuth } from '../utils/apiConfig';
import '../index.css';

// Helper
const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('users');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // === TAB 1: USERS STATE ===
    const [users, setUsers] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        username: '', password: '', role: 'user', access: { app1: false, app2: false, app3: false }
    });

    // === TAB 2: AUDIT TRAIL STATE ===
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditStats, setAuditStats] = useState(null);
    const [auditFilters, setAuditFilters] = useState({
        page: 1, limit: 25, search: '', action: '', actor: '', dateFrom: '', dateTo: ''
    });
    const [auditPagination, setAuditPagination] = useState({ total: 0, pages: 0 });
    const [selectedLog, setSelectedLog] = useState(null); // For modal

    // === TAB 3: BACKUP STATE ===
    const [backups, setBackups] = useState([]);

    // === TAB 4: SYSTEM INFO STATE ===
    const [systemInfo, setSystemInfo] = useState(null);

    // Initial load
    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        else if (activeTab === 'audit') { fetchAuditLogs(); fetchAuditStats(); }
        else if (activeTab === 'backup') fetchBackups();
        else if (activeTab === 'system') fetchSystemInfo();
    // eslint-disable-next-line
    }, [activeTab]);

    // Refetch audit logs when filters change (debounced search handled via submit)
    useEffect(() => {
        if (activeTab === 'audit') fetchAuditLogs();
    // eslint-disable-next-line
    }, [auditFilters.page, auditFilters.limit]);

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    const showSuccess = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 5000); };
    const showError = (msg) => { setError(msg); setSuccess(''); setTimeout(() => setError(''), 5000); };

    // ==========================================
    // TAB 1: USER MANAGEMENT LOGIC
    // ==========================================
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth('/api/users');
            const data = await response.json();
            if (data.success) setUsers(data.users);
            else showError(data.error);
        } catch (err) {
            showError('Gagal mengambil data user.');
        } finally {
            setLoading(false);
        }
    };

    const handleAccessChange = (e) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, access: { ...prev.access, [name]: checked } }));
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            username: formData.username,
            password: formData.password,
            role: formData.role,
            access: Object.keys(formData.access).filter(k => formData.access[k])
        };

        try {
            const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
            let currentUser = 'UNKNOWN';
            if (authStr) { try { currentUser = JSON.parse(authStr).username; } catch(e){} }

            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing ? `/api/users/${formData.username}` : '/api/users';

            const response = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'x-user': currentUser },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.success) {
                showSuccess(isEditing ? 'User diperbarui.' : 'User ditambahkan.');
                setFormData({ username: '', password: '', role: 'user', access: { app1: false, app2: false, app3: false } });
                setIsEditing(false);
                fetchUsers();
            } else showError(data.error);
        } catch (err) {
            showError('Terjadi kesalahan koneksi.');
        }
    };

    const handleEdit = (user) => {
        setFormData({
            username: user.username, password: '', role: user.role,
            access: { app1: user.access.includes('app1'), app2: user.access.includes('app2'), app3: user.access.includes('app3') }
        });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteUser = async (username) => {
        if (!window.confirm(`Hapus user ${username}?`)) return;
        try {
            const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
            let currentUser = 'UNKNOWN';
            if (authStr) { try { currentUser = JSON.parse(authStr).username; } catch(e){} }

            const response = await fetchWithAuth(`/api/users/${username}`, { 
                method: 'DELETE', headers: { 'x-user': currentUser }
            });
            const data = await response.json();
            if (data.success) { showSuccess('User dihapus.'); fetchUsers(); }
            else showError(data.error);
        } catch (err) {
            showError('Terjadi kesalahan koneksi.');
        }
    };

    // ==========================================
    // TAB 2: AUDIT TRAIL LOGIC
    // ==========================================
    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(auditFilters).toString();
            const response = await fetchWithAuth(`/api/audit-logs?${query}`);
            const data = await response.json();
            if (data.success) {
                setAuditLogs(data.logs);
                setAuditPagination(data.pagination);
            }
        } catch (err) {
            showError('Gagal mengambil audit logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditStats = async () => {
        try {
            const response = await fetchWithAuth(`/api/audit-logs/stats`);
            const data = await response.json();
            if (data.success) setAuditStats(data.stats);
        } catch (err) {}
    };

    const handleAuditSearch = (e) => {
        e.preventDefault();
        setAuditFilters(prev => ({ ...prev, page: 1 }));
        fetchAuditLogs();
    };

    const exportAuditCSV = () => {
        if (!auditLogs.length) return;
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Waktu,Aktor,Aksi,Target,Status,IP\n"
            + auditLogs.map(e => `"${new Date(e.timestamp).toLocaleString('id-ID')}","${e.actor}","${e.action}","${e.target}","${e.status}","${e.ip}"`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ==========================================
    // TAB 3: BACKUP & RESTORE LOGIC
    // ==========================================
    const fetchBackups = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(`/api/admin/backups`);
            const data = await response.json();
            if (data.success) setBackups(data.backups);
        } catch (err) {
            showError('Gagal memuat list backup.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        if (!window.confirm('Buat backup database sekarang? Proses ini mungkin membutuhkan waktu beberapa detik.')) return;
        setLoading(true);
        try {
            const response = await fetchWithAuth(`/api/admin/backup`, { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                showSuccess(`Backup sukses: ${data.filename}`);
                fetchBackups();
            } else showError(data.error);
        } catch (err) {
            showError('Gagal membuat backup.');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (filename) => {
        if (!window.confirm(`PERINGATAN KRITIS: Restore database dari ${filename} akan MENIMPA semua data saat ini.\n\nApakah Anda sangat yakin?`)) return;
        setLoading(true);
        try {
            const response = await fetchWithAuth(`/api/admin/restore/${encodeURIComponent(filename)}`, { method: 'POST' });
            const data = await response.json();
            if (data.success) showSuccess(data.message);
            else showError(data.error);
        } catch (err) {
            showError('Gagal restore database.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBackup = async (filename) => {
        if (!window.confirm(`Hapus backup ${filename} selamanya?`)) return;
        setLoading(true);
        try {
            const response = await fetchWithAuth(`/api/admin/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) { showSuccess('Backup dihapus.'); fetchBackups(); }
            else showError(data.error);
        } catch (err) {
            showError('Gagal hapus backup.');
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // TAB 4: SYSTEM INFO LOGIC
    // ==========================================
    const fetchSystemInfo = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(`/api/admin/system-info`);
            const data = await response.json();
            if (data.success) setSystemInfo(data.info);
        } catch (err) {
            showError('Gagal mengambil System Info');
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const renderTabs = () => (
        <div className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                <Users size={18} /> Manajemen Akses
            </button>
            <button className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
                <Activity size={18} /> Audit Trail
            </button>
            <button className={`admin-tab ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
                <Database size={18} /> Backup & Recovery
            </button>
            <button className={`admin-tab ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
                <Server size={18} /> System Info
            </button>
        </div>
    );

    return (
        <div className="admin-page admin-page-bg">
            <header className="app-header">
                <div className="app-header__left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link to="/" className="app-header__back" title="Kembali ke Menu"><ArrowLeft size={18} /></Link>
                    <div className="header-divider"></div>
                    <div className="app-header__brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldPlus size={22} className="text-primary-300" />
                        <span>Administrator Platform</span>
                    </div>
                </div>
            </header>

            <main className="admin-container">
                {error && <div className="admin-alert admin-alert--error"><ShieldPlus size={20} />{error}</div>}
                {success && <div className="admin-alert admin-alert--success"><ShieldPlus size={20} />{success}</div>}

                {/* Tabs Navigation */}
                {renderTabs()}

                {/* ========================================================== */}
                {/* TAB 1: USERS */}
                {/* ========================================================== */}
                {activeTab === 'users' && (
                    <div className="admin-layout-sidebar">
                        <div className="admin-card">
                            <h2 className="admin-card__title">
                                {isEditing ? <KeySquare size={20} /> : <UserPlus size={20} />}
                                {isEditing ? 'Edit User' : 'Tambah User Baru'}
                            </h2>
                            <form onSubmit={handleUserSubmit}>
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Username</label>
                                    <input type="text" required disabled={isEditing} className="admin-form-input"
                                        value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Password {isEditing && <span style={{ fontWeight: 'normal', color: 'var(--neutral-400)' }}>(Kosongkan jika tidak diubah)</span>}</label>
                                    <input type="password" required={!isEditing} className="admin-form-input"
                                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Role Sistem</label>
                                    <select className="admin-form-select" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        <option value="user">User Standar</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-form-label" style={{ marginBottom: '8px' }}>Hak Akses Aplikasi</label>
                                    <div>
                                        {['app1', 'app2', 'app3'].map(app => (
                                            <label key={app} className="admin-checkbox-card">
                                                <input type="checkbox" name={app} checked={formData.access[app]} onChange={handleAccessChange} />
                                                <span style={{ fontWeight: 500, color: 'var(--neutral-700)' }}>
                                                    App {app.replace('app', '')} - {app === 'app1' ? 'Opname Aset' : app === 'app2' ? 'Extract Hasil' : 'Dashboard Analytics'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="admin-form-actions">
                                    {isEditing && (
                                        <button type="button" onClick={() => { setIsEditing(false); setFormData({ username: '', password: '', role: 'user', access: { app1: false, app2: false, app3: false } }); }} className="btn btn--outline">Batal</button>
                                    )}
                                    <button type="submit" className="btn btn--primary">{isEditing ? 'Simpan Perubahan' : 'Tambah User'}</button>
                                </div>
                            </form>
                        </div>

                        <div className="admin-card">
                            <h2 className="admin-card__title"><Users size={20} /> Daftar Pengguna Sistem</h2>
                            {loading ? <div className="admin-loading">Memuat...</div> : (
                                <div className="admin-table-wrapper">
                                    <table className="admin-table">
                                        <thead><tr><th>Username</th><th>Role</th><th>Akses</th><th style={{ textAlign: 'right' }}>Aksi</th></tr></thead>
                                        <tbody>
                                            {users.map(user => (
                                                <tr key={user.username}>
                                                    <td style={{ fontWeight: 600 }}>{user.username}</td>
                                                    <td><span className={`admin-badge ${user.role === 'admin' ? 'admin-badge--role-admin' : 'admin-badge--role-user'}`}>{user.role}</span></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                            {user.access.map(app => <span key={app} className={`admin-badge admin-badge--${app}`}>{app}</span>)}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button onClick={() => handleEdit(user)} className="btn btn--outline" style={{ padding: '4px 10px', fontSize: '10px', marginRight: '4px' }}>EDIT</button>
                                                        {user.username !== 'ICT_SJA1' && <button onClick={() => handleDeleteUser(user.username)} className="btn btn--danger" style={{ padding: '4px 10px', fontSize: '10px' }}>HAPUS</button>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ========================================================== */}
                {/* TAB 2: AUDIT TRAIL */}
                {/* ========================================================== */}
                {activeTab === 'audit' && (
                    <div className="admin-card f-w-full">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <h2 className="admin-card__title" style={{ marginBottom: 0 }}><Activity size={20} /> Audit Trail Log Lengkap</h2>
                            <button onClick={exportAuditCSV} className="btn btn--outline" style={{ padding: '8px 16px' }}><Download size={16} style={{marginRight: '6px'}}/> Export CSV</button>
                        </div>

                        {/* Stats Row */}
                        {auditStats && (
                            <div className="admin-stats-row">
                                <div className="admin-stat-box">
                                    <div className="stat-value">{auditStats.total}</div>
                                    <div className="stat-label">Total Log Event</div>
                                </div>
                                <div className="admin-stat-box error-stat">
                                    <div className="stat-value">{auditStats.recentFailures}</div>
                                    <div className="stat-label">Kegagalan 24 Jam Terakhir</div>
                                </div>
                                {Object.entries(auditStats.byAction || {}).slice(0, 3).map(([act, count]) => (
                                    <div key={act} className="admin-stat-box">
                                        <div className="stat-value" style={{fontSize: '1.2rem', color: 'var(--charcoal-900)'}}>{count}</div>
                                        <div className="stat-label">{act}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Filter Bar */}
                        <form onSubmit={handleAuditSearch} className="admin-filter-bar">
                            <div className="filter-group">
                                <SearchIcon size={16} color="var(--neutral-500)"/>
                                <input type="text" placeholder="Cari IP, aksi, target..." value={auditFilters.search} onChange={e => setAuditFilters(prev => ({...prev, search: e.target.value}))} />
                            </div>
                            <div className="filter-group">
                                <Filter size={16} color="var(--neutral-500)"/>
                                <select value={auditFilters.action} onChange={e => setAuditFilters(prev => ({...prev, action: e.target.value}))}>
                                    <option value="">Semua Aksi</option>
                                    <option value="LOGIN_SUCCESS">LOGIN SUCCESS</option>
                                    <option value="LOGIN_FAILED">LOGIN FAILED</option>
                                    <option value="SYNC_UPLOAD">SYNC UPLOAD</option>
                                    <option value="SYNC_DOWNLOAD">SYNC DOWNLOAD</option>
                                    <option value="APP3_CONSOLIDATE">APP3 CONSOLIDATE</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn--primary" style={{ padding: '0 20px', borderRadius: 0 }}>Cari</button>
                        </form>

                        {/* Table */}
                        {loading ? <div className="admin-loading">Memuat logs...</div> : (
                            <>
                                <div className="admin-table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Waktu</th>
                                                <th>Aktor</th>
                                                <th>Aksi</th>
                                                <th>Target</th>
                                                <th>Status</th>
                                                <th>Detail IP</th>
                                                <th style={{textAlign: 'center'}}>Info</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLogs.length > 0 ? auditLogs.map(log => (
                                                <tr key={log.id}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                                                    <td style={{ fontWeight: 600 }}>{log.actor}</td>
                                                    <td>
                                                        <span className="admin-badge" style={{
                                                            background: log.action.includes('FAIL') || log.action.includes('DELETE') ? 'var(--danger-500)' : 'var(--warm-200)',
                                                            color: log.action.includes('FAIL') || log.action.includes('DELETE') ? '#fff' : 'var(--charcoal-900)'
                                                        }}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td>{log.target}</td>
                                                    <td>
                                                        <span style={{ color: log.status === 'SUCCESS' ? 'var(--success-600)' : 'var(--danger-500)', fontWeight: 700, fontSize: '12px' }}>
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>{log.ip}</td>
                                                    <td style={{textAlign: 'center'}}>
                                                        <button onClick={() => setSelectedLog(log)} className="admin-icon-btn"><FileText size={16} /></button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>Tidak ada log yang sesuai filter.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="admin-pagination">
                                    <button disabled={auditFilters.page <= 1} onClick={() => setAuditFilters(p => ({...p, page: p.page - 1}))} className="btn-page"><ChevronLeft size={16} /> Prev</button>
                                    <span>Halaman {auditPagination.page} dari {auditPagination.pages || 1} (Total {auditPagination.total})</span>
                                    <button disabled={auditFilters.page >= auditPagination.pages} onClick={() => setAuditFilters(p => ({...p, page: p.page + 1}))} className="btn-page">Next <ChevronRight size={16} /></button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ========================================================== */}
                {/* TAB 3: BACKUP & RESTORE */}
                {/* ========================================================== */}
                {activeTab === 'backup' && (
                    <div className="admin-layout-sidebar">
                        <div className="admin-card">
                            <h2 className="admin-card__title"><Database size={20} /> Buat Backup Sistem</h2>
                            <p style={{fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px'}}>
                                Backup akan mengarsipkan seluruh file database SQLite beserta JSON konfigurasi ke dalam folder <br/><code>/data/backups/</code>.
                            </p>
                            <div className="admin-callout admin-callout--info">
                                Pastikan tidak ada aktivitas besar (seperti Sync atau Extract) yang sedang berlangsung saat membuat backup untuk menghindari data korup.
                            </div>
                            <button onClick={handleCreateBackup} disabled={loading} className="btn btn--primary" style={{marginTop: '20px', width: '100%', padding: '16px'}}>
                                <Save size={18} style={{marginRight: '8px'}} /> {loading ? 'Memproses...' : 'BUAT BACKUP SEKARANG'}
                            </button>
                        </div>
                        
                        <div className="admin-card">
                            <h2 className="admin-card__title"><HardDrive size={20} /> Daftar File Backup</h2>
                            {loading ? <div className="admin-loading">Memuat...</div> : (
                                <div className="admin-table-wrapper">
                                    <table className="admin-table">
                                        <thead><tr><th>Nama Backup</th><th>Waktu</th><th>Ukuran</th><th style={{ textAlign: 'right' }}>Aksi</th></tr></thead>
                                        <tbody>
                                            {backups.length ? backups.map(b => (
                                                <tr key={b.name}>
                                                    <td style={{ fontWeight: 600, fontSize: '12px' }}>{b.name}</td>
                                                    <td style={{ fontSize: '12px' }}>{new Date(b.createdAt).toLocaleString('id-ID')}</td>
                                                    <td style={{ fontSize: '12px' }}>{b.isDirectory ? 'Directory' : formatBytes(b.size)}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button onClick={() => handleRestore(b.name)} className="btn btn--outline" style={{ padding: '4px 10px', fontSize: '10px', marginRight: '4px', borderColor: 'var(--amber-500)', color: 'var(--amber-600)' }}>RESTORE</button>
                                                        <button onClick={() => handleDeleteBackup(b.name)} className="btn btn--danger" style={{ padding: '4px 10px', fontSize: '10px' }}>HAPUS</button>
                                                    </td>
                                                </tr>
                                            )) : <tr><td colSpan="4" style={{textAlign: 'center'}}>Belum ada backup.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ========================================================== */}
                {/* TAB 4: SYSTEM INFO */}
                {/* ========================================================== */}
                {activeTab === 'system' && (
                    <div className="admin-card f-w-full">
                        <h2 className="admin-card__title"><Server size={20} /> Informasi & Utilitas Sistem</h2>
                        
                        {loading && !systemInfo ? <div className="admin-loading">Memuat...</div> : systemInfo ? (
                            <div className="system-grid">
                                <div className="sys-panel sys-panel--dark">
                                    <Clock className="sys-icon" />
                                    <div className="sys-label">SERVER UPTIME</div>
                                    <div className="sys-value">{Math.floor(systemInfo.uptime / 60 / 60)} Jam {Math.floor(systemInfo.uptime / 60) % 60} Menit</div>
                                </div>
                                <div className="sys-panel">
                                    <HardDrive className="sys-icon" />
                                    <div className="sys-label">APP MEMORY USAGE</div>
                                    <div className="sys-value">{formatBytes(systemInfo.memoryUsage.rss)}</div>
                                </div>
                                <div className="sys-panel">
                                    <Users className="sys-icon" />
                                    <div className="sys-label">REGISTERED USERS</div>
                                    <div className="sys-value">{systemInfo.appStats.userCount} Akun Active</div>
                                </div>
                                <div className="sys-panel">
                                    <Database className="sys-icon" />
                                    <div className="sys-label">TOTAL DATA SIZE</div>
                                    <div className="sys-value">{formatBytes(systemInfo.appStats.dataSize)} ({systemInfo.appStats.dbCount} DBs)</div>
                                </div>
                                <div className="sys-panel">
                                    <UploadCloud className="sys-icon" />
                                    <div className="sys-label">OS PLATFORM</div>
                                    <div className="sys-value" style={{ textTransform: 'capitalize' }}>{systemInfo.os.platform} {systemInfo.os.release}</div>
                                </div>
                                <div className="sys-panel">
                                    <ShieldPlus className="sys-icon" />
                                    <div className="sys-label">PENGAMANAN</div>
                                    <div className="sys-value" style={{ color: 'var(--success-600)' }}>Aktif & Termonitor</div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

            </main>

            {/* LOG DETAIL MODAL */}
            {selectedLog && (
                <div className="admin-modal-overlay">
                    <div className="admin-card admin-modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 className="admin-card__title" style={{ marginBottom: 0 }}>Detail Audit Log</h2>
                            <button onClick={() => setSelectedLog(null)} className="admin-icon-btn"><X size={20}/></button>
                        </div>
                        <div className="detail-grid">
                            <div className="detail-row"><span className="detail-label">Log ID</span><span className="detail-val">{selectedLog.id}</span></div>
                            <div className="detail-row"><span className="detail-label">Timestamp</span><span className="detail-val">{new Date(selectedLog.timestamp).toLocaleString('id-ID')}</span></div>
                            <div className="detail-row"><span className="detail-label">Actor</span><span className="detail-val" style={{fontWeight: 'bold'}}>{selectedLog.actor}</span></div>
                            <div className="detail-row"><span className="detail-label">Action</span><span className="detail-val">{selectedLog.action}</span></div>
                            <div className="detail-row"><span className="detail-label">Target</span><span className="detail-val">{selectedLog.target}</span></div>
                            <div className="detail-row"><span className="detail-label">IP Addr</span><span className="detail-val">{selectedLog.ip}</span></div>
                            <div className="detail-row"><span className="detail-label">Status</span><span className="detail-val" style={{color: selectedLog.status === 'SUCCESS' ? 'var(--success-600)' : 'var(--danger-500)'}}>{selectedLog.status}</span></div>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                            <div className="detail-label">Extra Payload Details:</div>
                            <pre className="detail-json">{JSON.stringify(selectedLog.details || {}, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
