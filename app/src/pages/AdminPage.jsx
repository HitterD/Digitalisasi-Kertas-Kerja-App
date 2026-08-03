import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Users, UserPlus, ShieldPlus, Trash2, ArrowLeft, KeySquare,
    Activity, Database, HardDrive, Download, UploadCloud,
    Server, Clock, Search as SearchIcon, ChevronLeft, ChevronRight,
    X, Filter, Save, FileText, Settings2
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
        const acc = Array.isArray(user.access) ? user.access : [];
        setFormData({
            username: user.username, password: '', role: user.role,
            access: { app1: acc.includes('app1'), app2: acc.includes('app2'), app3: acc.includes('app3') }
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
    // DERIVED AUTH
    // ==========================================
    const getCurrentUser = () => {
        try {
            const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
            if (authStr) return JSON.parse(authStr).username || 'UNKNOWN';
        } catch (e) { /* ignore */ }
        return 'UNKNOWN';
    };
    const currentUser = getCurrentUser();

    // Toggle a single app access for an existing user
    const toggleUserAccess = async (app, user) => {
        const current = Array.isArray(user.access) ? user.access : [];
        const newAccess = current.includes(app)
            ? current.filter(a => a !== app)
            : [...current, app];
        try {
            const response = await fetchWithAuth(`/api/users/${user.username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-user': currentUser },
                body: JSON.stringify({
                    username: user.username,
                    role: user.role,
                    access: newAccess
                })
            });
            const data = await response.json();
            if (data.success) {
                showSuccess(`Akses ${app} ${newAccess.includes(app) ? 'ditambahkan' : 'dicabut'} untuk ${user.username}.`);
                fetchUsers();
            } else showError(data.error);
        } catch (err) {
            showError('Gagal memperbarui akses.');
        }
    };

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="admin-page admin-page-bg">
            {/* Slim header */}
            <header className="wa-app-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Link to="/" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--charcoal-500)' }}>
                        <ArrowLeft size={18} />
                    </Link>
                    <div style={{ width: 1, height: 18, background: 'rgba(26,26,26,0.1)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, background: 'var(--charcoal-900)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Settings2 size={14} color="var(--terracotta-400)" />
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)', letterSpacing: '-0.01em' }}>System Configuration</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin · PT Santos Jaya Abadi</div>
                        </div>
                    </div>
                </div>
                <div className="wa-status success" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, background: 'var(--success-500)', borderRadius: '50%' }}></div>
                    ADMINISTRATOR · {currentUser}
                </div>
            </header>

            {/* Tab strip */}
            <div className="wa-tabs">
                <div className={`wa-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                    <Users size={14} /> Users
                </div>
                <div className={`wa-tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
                    <Activity size={14} /> Audit Trail
                </div>
                <div className={`wa-tab ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
                    <HardDrive size={14} /> Backup
                </div>
                <div className={`wa-tab ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
                    <Server size={14} /> System Info
                </div>
            </div>

            <main className="admin-container" style={{ paddingTop: 18 }}>
                {error && <div className="admin-alert admin-alert--error"><ShieldPlus size={20} />{error}</div>}
                {success && <div className="admin-alert admin-alert--success"><ShieldPlus size={20} />{success}</div>}

                {/* Page header */}
                <div className="wa-page-header" style={{ marginTop: 18 }}>
                    <div>
                        <div className="eyebrow">System · Administrator</div>
                        <h1>Konfigurasi Sistem</h1>
                        <div className="subtitle">Kelola user, audit log, backup, dan informasi sistem. Akses terbatas untuk role admin.</div>
                    </div>
                </div>

                {/* ========================================================== */}
                {/* TAB 1: USERS */}
                {/* ========================================================== */}
                {activeTab === 'users' && (
                    <>
                        {/* Tambah User form */}
                        <div className="wa-card" style={{ padding: 18, marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div className="wa-icon-wrap" style={{ background: 'rgba(201,100,66,0.10)', color: 'var(--terracotta-500)' }}>
                                    <UserPlus size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)' }}>Tambah User Baru</div>
                                    <div style={{ fontSize: 11, color: 'var(--charcoal-500)', marginTop: 1 }}>Buat akun dan atur hak akses per modul.</div>
                                </div>
                            </div>
                            <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                    <div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Username</div>
                                        <input className="wa-input" required disabled={isEditing} placeholder="nama.user" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                                    </div>
                                    <div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Password{isEditing && ' (kosongkan jika tidak diubah)'}</div>
                                        <input className="wa-input" type="password" required={!isEditing} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                    <div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Role</div>
                                        <select className="wa-select" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                            <option value="user">user</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--cream-input)', borderRadius: 6, border: '1px solid rgba(26,26,26,0.08)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-500)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>Akses Aplikasi:</div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--charcoal-900)' }}>
                                            <input type="checkbox" name="app1" checked={formData.access.app1} onChange={handleAccessChange} style={{ accentColor: 'var(--terracotta-500)', width: 14, height: 14 }} /> APP 1
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--charcoal-900)' }}>
                                            <input type="checkbox" name="app2" checked={formData.access.app2} onChange={handleAccessChange} style={{ accentColor: 'var(--terracotta-500)', width: 14, height: 14 }} /> APP 2
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--charcoal-900)' }}>
                                            <input type="checkbox" name="app3" checked={formData.access.app3} onChange={handleAccessChange} style={{ accentColor: 'var(--terracotta-500)', width: 14, height: 14 }} /> APP 3
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {isEditing && (
                                            <button type="button" onClick={() => { setIsEditing(false); setFormData({ username: '', password: '', role: 'user', access: { app1: false, app2: false, app3: false } }); }} className="wa-btn-ghost" style={{ height: 32, padding: '0 14px', fontSize: 11 }}>Batal</button>
                                        )}
                                        <button type="submit" className="wa-btn-terracotta" style={{ height: 32, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                                            <UserPlus size={13} /> {isEditing ? 'Simpan' : 'Tambah'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Users table */}
                        <div className="wa-card" style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'var(--cream-input)', borderBottom: '1px solid rgba(26,26,26,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)' }}>Daftar User</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-500)' }}>{users.length} USER · {users.filter(u => u.role === 'admin').length} ADMIN</div>
                                </div>
                                <div className="wa-search" style={{ maxWidth: 220 }}>
                                    <SearchIcon size={13} />
                                    <input placeholder="Cari user…" />
                                </div>
                            </div>
                            <table className="wa-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th style={{ textAlign: 'center' }}>Role</th>
                                        <th style={{ textAlign: 'center' }}>App1</th>
                                        <th style={{ textAlign: 'center' }}>App2</th>
                                        <th style={{ textAlign: 'center' }}>App3</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th style={{ textAlign: 'right' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => {
                                        const initials = (u.username || '?').slice(0, 2).toUpperCase();
                                        const accessList = Array.isArray(u.access) ? u.access : [];
                                        return (
                                            <tr key={u.username}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 30, height: 30, background: u.role === 'admin' ? 'var(--charcoal-900)' : 'rgba(26,26,26,0.08)', color: u.role === 'admin' ? 'var(--terracotta-500)' : 'var(--charcoal-500)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700 }}>{initials}</div>
                                                        <div>
                                                            <div style={{ fontSize: 12, fontWeight: 600 }}>{u.username}</div>
                                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-400)' }}>AKUN SISTEM</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={u.role === 'admin' ? 'wa-role-pill admin' : 'wa-role-pill user'}>● {u.role.toUpperCase()}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div className={accessList.includes('app1') ? 'wa-toggle-switch on' : 'wa-toggle-switch'} onClick={() => toggleUserAccess('app1', u)}></div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div className={accessList.includes('app2') ? 'wa-toggle-switch on' : 'wa-toggle-switch'} onClick={() => toggleUserAccess('app2', u)}></div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div className={accessList.includes('app3') ? 'wa-toggle-switch on' : 'wa-toggle-switch'} onClick={() => toggleUserAccess('app3', u)}></div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--success-500)' }}>
                                                        <div style={{ width: 6, height: 6, background: 'var(--success-500)', borderRadius: '50%' }}></div>AKTIF
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="wa-btn-ghost" onClick={() => handleEdit(u)} style={{ fontSize: 10, padding: '5px 10px', marginRight: 4 }}>Edit</button>
                                                    {u.username !== 'ICT_SJA1' && (
                                                        <button className="wa-btn-ghost" onClick={() => handleDeleteUser(u.username)} style={{ fontSize: 10, padding: '5px 10px', color: 'var(--danger-500)', borderColor: 'var(--danger-500)' }}>Hapus</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* ========================================================== */}
                {/* TAB 2: AUDIT TRAIL */}
                {/* ========================================================== */}
                {activeTab === 'audit' && (
                    <div className="wa-card" style={{ padding: 18, marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="wa-icon-wrap" style={{ background: 'rgba(201,100,66,0.10)', color: 'var(--terracotta-500)' }}>
                                    <Activity size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)' }}>Audit Trail Log Lengkap</div>
                                    <div style={{ fontSize: 11, color: 'var(--charcoal-500)', marginTop: 1 }}>Riwayat aktivitas seluruh user di sistem.</div>
                                </div>
                            </div>
                            <button onClick={exportAuditCSV} className="wa-btn-ghost" style={{ height: 32, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                                <Download size={13} /> Export CSV
                            </button>
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
                            <button type="submit" className="wa-btn" style={{ padding: '0 20px', borderRadius: 6 }}>Cari</button>
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
                                    <button disabled={auditFilters.page <= 1} onClick={() => setAuditFilters(p => ({...p, page: p.page - 1}))} className="wa-btn-ghost" style={{ height: 30, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}><ChevronLeft size={14} /> Prev</button>
                                    <span>Halaman {auditPagination.page} dari {auditPagination.pages || 1} (Total {auditPagination.total})</span>
                                    <button disabled={auditFilters.page >= auditPagination.pages} onClick={() => setAuditFilters(p => ({...p, page: p.page + 1}))} className="wa-btn-ghost" style={{ height: 30, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>Next <ChevronRight size={14} /></button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ========================================================== */}
                {/* TAB 3: BACKUP & RESTORE */}
                {/* ========================================================== */}
                {activeTab === 'backup' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 14 }}>
                        <div className="wa-card" style={{ padding: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div className="wa-icon-wrap" style={{ background: 'rgba(201,100,66,0.10)', color: 'var(--terracotta-500)' }}>
                                    <Database size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)' }}>Buat Backup Sistem</div>
                                    <div style={{ fontSize: 11, color: 'var(--charcoal-500)', marginTop: 1 }}>Arsipkan database + JSON konfigurasi.</div>
                                </div>
                            </div>
                            <p style={{fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.6, marginBottom: 14, color: 'var(--charcoal-500)'}}>
                                Backup akan diarsipkan ke folder <code style={{ background: 'var(--cream-input)', padding: '1px 5px', borderRadius: 3 }}>/data/backups/</code>.
                            </p>
                            <div className="admin-callout admin-callout--info">
                                Pastikan tidak ada aktivitas besar (seperti Sync atau Extract) yang sedang berlangsung saat membuat backup.
                            </div>
                            <button onClick={handleCreateBackup} disabled={loading} className="wa-btn-terracotta" style={{ marginTop: 16, width: '100%', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <Save size={15} /> {loading ? 'Memproses...' : 'BUAT BACKUP SEKARANG'}
                            </button>
                        </div>

                        <div className="wa-card" style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'var(--cream-input)', borderBottom: '1px solid rgba(26,26,26,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)' }}>Daftar File Backup</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-500)' }}>{backups.length} FILE</div>
                                </div>
                            </div>
                            {loading ? <div className="admin-loading" style={{ padding: 20 }}>Memuat...</div> : (
                                <table className="wa-table">
                                    <thead>
                                        <tr>
                                            <th>Nama Backup</th>
                                            <th>Waktu</th>
                                            <th>Ukuran</th>
                                            <th style={{ textAlign: 'right' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backups.length ? backups.map(b => (
                                            <tr key={b.name}>
                                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--charcoal-900)' }}>{b.name}</td>
                                                <td style={{ fontSize: 12, color: 'var(--charcoal-500)' }}>{new Date(b.createdAt).toLocaleString('id-ID')}</td>
                                                <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{b.isDirectory ? 'Directory' : formatBytes(b.size)}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button onClick={() => handleRestore(b.name)} className="wa-btn-ghost" style={{ padding: '5px 10px', fontSize: 10, marginRight: 4, color: 'var(--amber-600)', borderColor: 'var(--amber-500)' }}>Restore</button>
                                                    <button onClick={() => handleDeleteBackup(b.name)} className="wa-btn-ghost" style={{ padding: '5px 10px', fontSize: 10, color: 'var(--danger-500)', borderColor: 'var(--danger-500)' }}>Hapus</button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--charcoal-400)' }}>Belum ada backup.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ========================================================== */}
                {/* TAB 4: SYSTEM INFO */}
                {/* ========================================================== */}
                {activeTab === 'system' && (
                    <div className="wa-card" style={{ padding: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div className="wa-icon-wrap" style={{ background: 'rgba(201,100,66,0.10)', color: 'var(--terracotta-500)' }}>
                                <Server size={18} />
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)' }}>Informasi & Utilitas Sistem</div>
                                <div style={{ fontSize: 11, color: 'var(--charcoal-500)', marginTop: 1 }}>Status server, resource, dan konfigurasi runtime.</div>
                            </div>
                        </div>

                        {loading && !systemInfo ? <div className="admin-loading" style={{ padding: 20 }}>Memuat...</div> : systemInfo ? (
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
                    <div className="wa-card admin-modal-content" style={{ padding: 22 }}>
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
