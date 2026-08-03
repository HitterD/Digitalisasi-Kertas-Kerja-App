import { useState, useCallback, useEffect } from 'react';
import { fetchFolders, fetchPeriods, downloadWorkbook } from '../utils/fileServerApi';
import { FolderOpen, RefreshCw, FileSpreadsheet, Download, AlertCircle, Calendar, Server, ChevronDown } from 'lucide-react';

/**
 * ServerFileBrowser — Browse & load kertas kerja Excel files
 * from the network share \\192.168.2.111\pt. santos jaya abadi\AssetManagement_Files
 * 
 * Flow: Auto-load folders -> Select folder -> List all workbooks (flat) -> Download specific file.
 */
export default function ServerFileBrowser({ onFileLoaded }) {
    const [folders, setFolders] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState('');
    const [loadingFolders, setLoadingFolders] = useState(false);

    const [availableFiles, setAvailableFiles] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(null); // stores 'periodName-filename'
    const [error, setError] = useState('');

    // ═══════════════════════════════════════════
    //  Fetch folder list from server
    // ═══════════════════════════════════════════
    const handleLoadFolders = useCallback(async () => {
        setLoadingFolders(true);
        setError('');
        try {
            const data = await fetchFolders();
            setFolders(data.folders || []);
            if ((data.folders || []).length === 0) {
                setError('Tidak ada folder divisi/area yang ditemukan di server.');
            }
        } catch (err) {
            const msg = err.message?.includes('fetch')
                ? 'Tidak dapat terhubung ke server. Pastikan server berjalan dan jaringan tersedia.'
                : err.message;
            setError(msg);
        } finally {
            setLoadingFolders(false);
        }
    }, []);

    // Auto-load folders on mount
    useEffect(() => {
        handleLoadFolders();
    }, [handleLoadFolders]);

    // ═══════════════════════════════════════════
    //  Select Folder -> fetch all files in that folder
    // ═══════════════════════════════════════════
    const handleSelectFolder = useCallback(async (e) => {
        const folderName = e.target.value;
        setSelectedFolder(folderName);
        setAvailableFiles(null);
        setError('');
        
        if (!folderName) return;

        setLoading(true);
        try {
            const data = await fetchPeriods(folderName); // Returns flat list of files now
            setAvailableFiles(data.files || []);
            if ((data.files || []).length === 0) {
                setError(`Folder "${folderName}" tidak berisi Kertas Kerja Opname yang valid.`);
            }
        } catch (err) {
            const msg = err.message?.includes('fetch')
                ? 'Koneksi ke server terputus saat memuat daftar file.'
                : err.message;
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    // ═══════════════════════════════════════════
    //  Download specific file
    // ═══════════════════════════════════════════
    const handleDownloadFile = useCallback(async (periodName, filename) => {
        if (!selectedFolder) return;
        const dlId = `${periodName}-${filename}`;
        setDownloading(dlId);
        setError('');
        try {
            const { buffer, filename: downloadedName } = await downloadWorkbook(selectedFolder, periodName, filename);
            onFileLoaded(buffer, downloadedName);
        } catch (err) {
            const msg = err.message?.includes('fetch')
                ? 'Koneksi ke server terputus saat mengunduh file.'
                : err.message;
            setError(msg);
        } finally {
            setDownloading(null);
        }
    }, [selectedFolder, onFileLoaded]);

    // Format helpers
    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        try {
            const d = new Date(isoStr);
            return d.toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric',
            });
        } catch { return ''; }
    };

    const parsePeriodLabel = (name) => {
        const match = name.match(/SJA\d?-(\d{2})(\d{4})/);
        if (!match) return name;
        const monthNum = parseInt(match[1], 10);
        const year = match[2];
        const months = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return months[monthNum] ? `${months[monthNum]} ${year}` : name;
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Initial loading folders */}
            {loadingFolders && !folders && (
                <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <div className="spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)', borderWidth: 3 }}></div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Menghubungkan ke server tersentralisasi...</p>
                </div>
            )}

            {/* Folders Selection */}
            {folders && (
                <div style={{ padding: '24px 24px 16px' }}>
                    <div className="app1-home__field">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="app1-home__field-label">
                                <Server size={16} color="var(--accent)" strokeWidth={2.5} /> Pilih Divisi / Lokasi Server
                            </label>
                            <button 
                                className="app1-home__button app1-home__button--ghost" 
                                onClick={handleLoadFolders} 
                                disabled={loading || loadingFolders} 
                                style={{ padding: '6px', minHeight: 'auto', borderRadius: '8px' }}
                                title="Refresh Folder List"
                            >
                                <RefreshCw size={14} strokeWidth={2.5} className={loadingFolders ? 'spin' : ''} />
                            </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <select className="app1-home__select" value={selectedFolder} onChange={handleSelectFolder} disabled={loading} style={{ appearance: 'none', paddingRight: '40px' }}>
                                <option value="">— Silakan pilih folder —</option>
                                {folders.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }}>
                                <ChevronDown size={18} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State when no folder selected */}
            {!selectedFolder && folders && !loadingFolders && (
                <div className="app1-home__empty">
                    <div className="app1-home__icon-box" style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-input)' }}>
                        <FolderOpen size={28} strokeWidth={1.5} color="var(--text-secondary)" />
                    </div>
                    <div>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>Belum Ada Folder Terpilih</p>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>Pilih divisi di atas untuk melihat daftar kertas kerja.</p>
                    </div>
                </div>
            )}

            {/* Loading Periods state */}
            {loading && (
                <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <div className="spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent)', borderWidth: 3 }}></div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mencari kertas kerja opname...</p>
                </div>
            )}

            {/* Flat File list */}
            {selectedFolder && availableFiles && availableFiles.length > 0 && !loading && (
                <div>
                    <div style={{ padding: '16px 24px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>File Excel Tersedia</p>
                        <span className="app1-home__badge app1-home__badge--secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>{availableFiles.length} File</span>
                    </div>
                    <div className="app1-home__file-list">
                        {availableFiles.map((file) => {
                            const dlId = `${file.periodName}-${file.filename}`;
                            const isDownloading = downloading === dlId;

                            return (
                                <button 
                                    key={dlId} 
                                    onClick={() => handleDownloadFile(file.periodName, file.filename)} 
                                    disabled={downloading !== null} 
                                    className="app1-home__file-row"
                                >
                                    <div className="app1-home__icon-box" style={{ width: 44, height: 44, borderRadius: 12, background: isDownloading ? 'var(--accent-soft)' : 'var(--bg-input)' }}>
                                        {isDownloading ? <div className="spinner" style={{ width: 20, height: 20, borderTopColor: 'var(--accent)', borderWidth: 2.5 }}></div> : <FileSpreadsheet size={20} strokeWidth={2} color={isDownloading ? 'var(--accent)' : 'currentColor'} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.filename}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span className="app1-home__badge app1-home__badge--primary" style={{ padding: '2px 6px', fontSize: 10, letterSpacing: '0.02em', background: 'var(--bg-input)' }}>
                                                <Calendar size={10} style={{ marginRight: 4 }} /> {parsePeriodLabel(file.periodName).toUpperCase()}
                                            </span>
                                            {file.modifiedDate && <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Modif: {formatDate(file.modifiedDate)}</span>}
                                        </div>
                                    </div>
                                    <div style={{ flexShrink: 0 }}>
                                        {isDownloading ? (
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>Mengunduh...</span>
                                        ) : (
                                            <div className="app1-home__button app1-home__button--ghost" style={{ padding: 10, borderRadius: '50%' }}>
                                                <Download size={18} />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div style={{ padding: '0 24px 24px 24px' }}>
                    <div className="app1-home__alert" style={{ background: 'var(--danger-50)', borderColor: 'var(--danger-200)', borderRadius: '16px', padding: '16px' }}>
                        <AlertCircle size={22} color="var(--danger-600)" style={{ flexShrink: 0 }} />
                        <div>
                            <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--danger-700)', margin: '0 0 4px 0' }}>Gagal memuat data server</p>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--danger-600)', margin: 0, lineHeight: 1.4 }}>{error}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
