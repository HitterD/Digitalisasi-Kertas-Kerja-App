import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ArrowLeft, Filter, RefreshCw, AlertCircle, Calendar, Database, CheckCircle2, XCircle, AlertTriangle, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiUrl, fetchWithAuth, fetchJsonWithAuth } from '../utils/apiConfig';

const COLORS = ['#10b981', '#f43f5e']; // Green for Scanned, Rose for Not Scanned

const DEPARTMENT_OPTIONS = [
    { value: 'Semua Departemen', label: 'Semua Departemen' },
    { value: 'ICT', label: 'ICT / IT' },
    { value: 'HRGA', label: 'HRGA / HRD' },
    { value: 'ENG', label: 'ENGINEERING' },
    { value: 'LAINNYA', label: 'Lainnya' },
];

const getDept = (createUser) => {
    const u = (createUser || '').toUpperCase();
    if (u.includes('ICT') || u.includes('IT')) return 'ICT';
    if (u.includes('HRD') || u.includes('HRGA') || u.includes('HC')) return 'HRGA';
    if (u.includes('ENG')) return 'ENG';
    return 'LAINNYA';
};

export default function DashboardPage() {
    const [years, setYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('Semua Departemen');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dashboardData, setDashboardData] = useState(null);

    // Set default filter if specific user
    useEffect(() => {
        try {
            const authStr = sessionStorage.getItem('auth') || localStorage.getItem('auth');
            if (authStr) {
                const auth = JSON.parse(authStr);
                if (auth.user === 'ICT_SJA1') setDepartmentFilter('ICT');
                // DASHBOARD_ASSET_SJA generally sees everything, but can filter
            }
        } catch (e) { }
    }, []);

    // Fetch periods and extract unique years on mount
    useEffect(() => {
        const fetchYears = async () => {
            try {
                const json = await fetchJsonWithAuth(apiUrl('/api/db/opname-periods'));
                if (json.data.length > 0) {
                    // Extract years. Example format: 'SJA4-12202502-ICT' -> '2025' or direct year string
                    const uniqueYears = new Set();
                    json.data.forEach(p => {
                        const parts = p.split('-');
                        if (parts.length >= 3 && parts[1].length >= 6) {
                            const year = parts[1].substring(2, 6);
                            if (!isNaN(year)) uniqueYears.add(year);
                        } else {
                            // If it's already just a year or a direct string, keep it fallback
                            uniqueYears.add(p);
                        }
                    });

                    // Sort descending
                    const sortedYears = Array.from(uniqueYears).sort((a, b) => b.localeCompare(a));

                    setYears(sortedYears);
                    setSelectedYear(sortedYears[0]); // Auto select newest year
                }
            } catch (err) {
                setError('Gagal memuat daftar tahun.');
            }
        };
        fetchYears();
    }, []);

    // Fetch opname data when year changes
    const fetchDashboardData = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        setError('');
        try {
            const [scannedRes, notScannedRes] = await Promise.all([
                fetchJsonWithAuth(apiUrl(`/api/db/opname-data/${encodeURIComponent(selectedYear)}`)),
                fetchJsonWithAuth(apiUrl(`/api/db/opname-not-scanned/${encodeURIComponent(selectedYear)}`))
            ]);

            const rawNotScanned = notScannedRes.data || {};
            const flatNotScanned = Array.isArray(rawNotScanned) ? rawNotScanned : Object.values(rawNotScanned).flat();

            setDashboardData({
                scanned: scannedRes.data || [],
                notScanned: flatNotScanned
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const stats = useMemo(() => {
        if (!dashboardData) return null;

        let { scanned, notScanned } = dashboardData;

        // Apply Department Filter
        if (departmentFilter !== 'Semua Departemen') {
            scanned = scanned.filter(item => getDept(item.CREATE_USER) === departmentFilter);
            notScanned = notScanned.filter(item => getDept(item.CREATE_USER) === departmentFilter);
        }

        // Metrics
        const ketidaksesuaian = scanned.filter(item => {
            // Logic for 'Salah Ruangan' matching ExtractOpnamePage
            const actualLoc = String(item.LOCATION_CODE || '').trim().replace(/^0+/, '');
            const systemLoc = String(item.SYSTEM_LOCATION || '').trim().replace(/^0+/, '');
            return actualLoc && systemLoc && actualLoc !== systemLoc;
        }).length;

        const totalScanned = scanned.length;
        const totalNotScanned = notScanned.length;
        const totalAssets = totalScanned + totalNotScanned;

        // Group by room for bar chart
        const roomMap = new Map();
        [...scanned, ...notScanned].forEach(item => {
            const roomName = item.NAMA_RUANGAN || 'Lainnya';
            if (!roomMap.has(roomName)) {
                roomMap.set(roomName, { name: roomName, scanned: 0, notScanned: 0 });
            }
        });

        scanned.forEach(item => {
            const roomName = item.NAMA_RUANGAN || 'Lainnya';
            roomMap.get(roomName).scanned += 1;
        });

        notScanned.forEach(item => {
            const roomName = item.NAMA_RUANGAN || 'Lainnya';
            roomMap.get(roomName).notScanned += 1;
        });

        // Sort rooms alphabetically or by total assets
        const roomStats = Array.from(roomMap.values()).sort((a, b) =>
            (b.scanned + b.notScanned) - (a.scanned + a.notScanned) // Sort by largest volume first
        );

        return {
            totalAssets,
            totalScanned,
            totalNotScanned,
            ketidaksesuaian,
            roomStats
        };
    }, [dashboardData, departmentFilter]);

    // Note: Premium UI styling is now handled directly by index.css (.card, .app-header, etc.)
    return (
        <div className="dashboard-page">

            <header className="app-header relative z-10">
                <div className="app-header__left">
                    <Link to="/" className="app-header__back text-white/80" title="Kembali">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="header-divider bg-white/20"></div>
                    <div className="app-header__brand">
                        <div className="bg-white/10 p-1.5 rounded-lg">
                            <BarChart3 size={20} color="#a5b4fc" />
                        </div>
                        <span className="font-bold -tracking-tight bg-transparent text-inherit">Insight & Analytics Dashboard</span>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                {/* Controls */}
                <div className="card dashboard-controls">
                    <div className="dashboard-controls__field">
                        <label className="dashboard-controls__label">
                            <Calendar size={16} color="#6366f1" /> Tahun Opname (Agregat)
                        </label>
                        <select
                            className="form-select dashboard-controls__select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            <option value="" disabled>Pilih Tahun...</option>
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="dashboard-controls__field">
                        <label className="dashboard-controls__label">
                            <Filter size={16} color="#6366f1" /> Filter Departemen
                        </label>
                        <select
                            className="form-select dashboard-controls__select"
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                        >
                            {DEPARTMENT_OPTIONS.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        className="btn btn--primary dashboard-controls__button"
                        onClick={fetchDashboardData}
                        disabled={loading || !selectedYear}
                    >
                        {loading ? <div className="spinner w-4.5 h-4.5"></div> : <RefreshCw size={18} />}
                        <span className="ml-2.5">Tarik Data Analytics</span>
                    </button>
                </div>

                {error && <div className="alert alert--danger mb-4 rounded-xl"><AlertCircle size={20} />{error}</div>}

                {/* Dashboard UI */}
                {!loading && stats && (
                    <div className="animate-in fade-in duration-500">
                        {/* Summary Cards */}
                        <div className="dashboard-stats-grid">
                            <div className="card stat-card border-t-4 border-blue-500">
                                <div className="stat-card__icon-bg"><Database size={120} /></div>
                                <div className="stat-card__label">Total Aset Target</div>
                                <div className="stat-card__value">
                                    {stats.totalAssets.toLocaleString('id-ID')}
                                </div>
                                <div className="stat-card__subtext">
                                    Target agregat tahun {selectedYear}
                                </div>
                            </div>
                            <div className="card stat-card border-t-4 border-emerald-500">
                                <div className="stat-card__icon-bg"><CheckCircle2 size={120} /></div>
                                <div className="stat-card__label">Sudah Ditemukan</div>
                                <div className="stat-card__value text-emerald-500">
                                    {stats.totalScanned.toLocaleString('id-ID')}
                                </div>
                                <div className="stat-card__progress-container">
                                    <div className="stat-card__progress-bar">
                                        <div className="stat-card__progress-fill bg-emerald-500" style={{ width: `${stats.totalAssets > 0 ? ((stats.totalScanned / stats.totalAssets) * 100) : 0}%` }}></div>
                                    </div>
                                    <span className="min-w-[40px] text-right text-xs font-semibold text-neutral-500">{stats.totalAssets > 0 ? ((stats.totalScanned / stats.totalAssets) * 100).toFixed(1) : 0}%</span>
                                </div>
                            </div>
                            <div className="card stat-card border-t-4 border-rose-500">
                                <div className="stat-card__icon-bg"><XCircle size={120} /></div>
                                <div className="stat-card__label">Belum Ditemukan</div>
                                <div className="stat-card__value text-rose-500">
                                    {stats.totalNotScanned.toLocaleString('id-ID')}
                                </div>
                                <div className="stat-card__subtext">
                                    Menunggu Pengecekan
                                </div>
                            </div>
                            <div className={`card stat-card border-t-4 border-amber-500 ${stats.ketidaksesuaian > 0 ? 'bg-amber-50/60' : ''}`}>
                                <div className="stat-card__icon-bg"><AlertTriangle size={120} /></div>
                                <div className="stat-card__label text-amber-700">Ketidaksesuaian (MAT)</div>
                                <div className="stat-card__value text-amber-500">
                                    {stats.ketidaksesuaian.toLocaleString('id-ID')}
                                </div>
                                <div className="stat-card__subtext text-amber-700">
                                    Salah Ruangan / Pindah
                                </div>
                            </div>
                        </div>

                        {/* Charts Area */}
                        <div className="chart-grid">
                            <div className="card">
                                <h3 className="chart-card__title">
                                    <PieChartIcon size={20} color="#6366f1" /> Status Global
                                </h3>
                                <div className="w-full h-[350px]">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Sudah Ditemukan', value: stats.totalScanned },
                                                    { name: 'Belum Ditemukan', value: stats.totalNotScanned }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={120}
                                                fill="#8884d8"
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                            >
                                                <Cell fill={COLORS[0]} />
                                                <Cell fill={COLORS[1]} />
                                            </Pie>
                                            <RechartsTooltip
                                                formatter={(value) => value.toLocaleString('id-ID')}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', fontWeight: 600 }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="card">
                                <div className="chart-card__header">
                                    <h3 className="chart-card__title">
                                        <BarChart3 size={20} color="#6366f1" /> Distribusi Ruangan
                                    </h3>
                                    <span className="chart-card__badge">Top 15 Volume</span>
                                </div>
                                <div className="w-full h-[400px]">
                                    {stats.roomStats.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart
                                                data={stats.roomStats.slice(0, 15)} // Show top 15 max to avoid clutter
                                                margin={{ top: 20, right: 10, left: 10, bottom: 60 }}
                                            >
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} interval={0} axisLine={false} tickLine={false} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                                <RechartsTooltip
                                                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 600 }}
                                                />
                                                <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} />
                                                <Bar dataKey="scanned" name="Sudah Scan" stackId="a" fill={COLORS[0]} radius={[0, 0, 4, 4]} animationDuration={1000} />
                                                <Bar dataKey="notScanned" name="Belum Scan" stackId="a" fill={COLORS[1]} radius={[4, 4, 0, 0]} animationDuration={1000} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-neutral-400 font-medium">
                                            <div className="text-center">
                                                <Database size={48} className="mx-auto mb-4 opacity-50 text-slate-300" />
                                                Tidak ada data ruangan untuk ditampilkan.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !dashboardData && !error && (
                    <div className="card dashboard-empty-state">
                        <div className="dashboard-empty-state__icon">
                            <Calendar size={40} color="#6366f1" />
                        </div>
                        <h3 className="dashboard-empty-state__title">Pilih Tahun Opname</h3>
                        <p className="dashboard-empty-state__text">Seluruh data analytics per tahun akan ditarik dari database untuk memberikan wawasan yang komprehensif.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
