import { useState, useCallback, useEffect } from 'react';
import { fetchFolders, fetchPeriods, downloadWorkbook } from '../utils/fileServerApi';
import { FolderOpen, RefreshCw, FileSpreadsheet, Download, AlertCircle, Calendar, HardDrive, Folder } from 'lucide-react';

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
                <div className="py-5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className="spinner" style={{ width: 32, height: 32 }}></div>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(26, 26, 26, 0.6)' }}>Menghubungi server...</p>
                </div>
            )}

            {/* Folders Selection */}
            {folders && (
                <div style={{
                    padding: '24px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            fontSize: '12px',
                            fontWeight: 600, color: 'var(--charcoal-900)',
                        }}>
                            <Folder size={16} color="var(--charcoal-900)" strokeWidth={2.5} />
                            Pilih divisi / lokasi server
                        </label>
                        <button
                            onClick={handleLoadFolders}
                            title="Refresh daftar folder"
                            disabled={loading || loadingFolders}
                            style={{
                                background: 'transparent', border: '1px solid rgba(26, 26, 26, 0.12)',
                                borderRadius: '10px', cursor: 'pointer', padding: '6px',
                                display: 'flex', alignItems: 'center', color: 'var(--charcoal-900)',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(26,26,26,0.05)'; }}
                            onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            <RefreshCw size={14} strokeWidth={2.5} className={loadingFolders ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <select
                        style={{
                            width: '100%', padding: '12px 16px',
                            fontSize: '14px',
                            borderRadius: '10px', border: '1px solid rgba(26, 26, 26, 0.12)',
                            outline: 'none', background: '#fff',
                            color: 'var(--charcoal-900)', fontWeight: 500,
                            boxShadow: '0 1px 2px rgba(45, 45, 45, 0.04)',
                            cursor: 'pointer', appearance: 'none'
                        }}
                        value={selectedFolder}
                        onChange={handleSelectFolder}
                        disabled={loading}
                    >
                        <option value="">— Silakan pilih folder —</option>
                        {folders.map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Empty State when no folder selected */}
            {!selectedFolder && folders && !loadingFolders && (
                <div className="wa-card" style={{ margin: '0 24px 24px 24px', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, background: 'rgba(201, 100, 66, 0.10)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--terracotta-500)', marginBottom: '16px' }}>
                        <FolderOpen size={28} strokeWidth={2.5} />
                    </div>
                    <p style={{
                        fontSize: '15px', fontWeight: 700,
                        color: 'var(--charcoal-900)', margin: 0
                    }}>
                        Belum ada folder terpilih
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(26, 26, 26, 0.6)', marginTop: '8px' }}>
                        Pilih folder di atas untuk melihat daftar kertas kerja opname.
                    </p>
                </div>
            )}

            {/* Loading Periods state */}
            {loading && (
                <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="spinner" style={{ width: 36, height: 36, borderTopColor: 'var(--terracotta-500)' }}></div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(26, 26, 26, 0.6)', marginTop: '16px' }}>Mencari kertas kerja opname...</p>
                </div>
            )}

            {/* Flat File list */}
            {selectedFolder && availableFiles && availableFiles.length > 0 && !loading && (
                <div>
                    <div style={{
                        padding: '20px 24px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <p style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--charcoal-900)',
                            margin: 0
                        }}>
                            File Excel Tersedia
                        </p>
                        <span style={{
                                background: 'rgba(201, 100, 66, 0.10)', color: 'var(--terracotta-500)',
                                padding: '3px 8px', fontSize: '11px', fontWeight: 600,
                                borderRadius: '6px',
                        }}>
                            {availableFiles.length} file
                        </span>
                    </div>
                    <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {availableFiles.map((file) => {
                            const dlId = `${file.periodName}-${file.filename}`;
                            const isDownloading = downloading === dlId;

                            return (
                                <button
                                    key={dlId}
                                    onClick={() => handleDownloadFile(file.periodName, file.filename)}
                                    disabled={downloading !== null}
                                    className="wa-card"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        width: '100%', textAlign: 'left',
                                        padding: '12px 14px',
                                        background: isDownloading ? 'rgba(201, 100, 66, 0.06)' : 'var(--cream-surface, #FDFCF7)',
                                        border: '1px solid rgba(26, 26, 26, 0.06)',
                                        borderRadius: '10px',
                                        cursor: downloading !== null ? 'not-allowed' : 'pointer',
                                        opacity: (downloading !== null && !isDownloading) ? 0.5 : 1,
                                        transition: 'all 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                                        fontFamily: 'inherit', fontSize: '12px',
                                        color: 'var(--charcoal-900)',
                                    }}
                                    onMouseOver={e => { if(!downloading) { e.currentTarget.style.borderColor = 'var(--terracotta-500)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                    onMouseOut={e => { if(!downloading) { e.currentTarget.style.borderColor = 'rgba(26, 26, 26, 0.06)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                                >
                                    <div style={{
                                        flexShrink: 0, width: 40, height: 40,
                                        background: 'rgba(201, 100, 66, 0.10)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: '10px', color: 'var(--terracotta-500)',
                                    }}>
                                        {isDownloading ? (
                                            <div className="spinner" style={{ width: 18, height: 18, borderTopColor: 'var(--terracotta-500)' }}></div>
                                        ) : (
                                            <FileSpreadsheet size={18} strokeWidth={2.5} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                        <span style={{
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: 600, color: 'var(--charcoal-900)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                        }}>
                                            {file.filename}
                                        </span>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '10px',
                                            fontSize: '11px',
                                            fontWeight: 500, color: 'rgba(26, 26, 26, 0.6)', marginTop: '4px',
                                        }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(201, 100, 66, 0.10)', color: 'var(--terracotta-500)', padding: '2px 6px', borderRadius: '5px', fontWeight: 600 }}>
                                                <Calendar size={11} strokeWidth={2.5} />
                                                {parsePeriodLabel(file.periodName)}
                                            </span>
                                            {file.modifiedDate && (
                                                <span>Modif: {formatDate(file.modifiedDate)}</span>
                                            )}
                                        </span>
                                    </div>
                                    <div style={{ flexShrink: 0 }}>
                                        {isDownloading ? (
                                            <span style={{
                                                fontSize: '11px', fontWeight: 600,
                                                color: 'var(--terracotta-500)'
                                            }}>Loading...</span>
                                        ) : (
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(26, 26, 26, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--charcoal-900)' }}>
                                                <Download size={16} strokeWidth={2.5} />
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
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 16px',
                        background: 'rgba(220, 38, 38, 0.06)',
                        border: '1px solid rgba(220, 38, 38, 0.15)',
                        borderRadius: '10px',
                    }}>
                        <AlertCircle size={20} color="#991B1B" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                        <div>
                            <p style={{
                                fontWeight: 700, fontSize: '12px',
                                color: '#991B1B', margin: '0 0 2px 0'
                            }}>Gagal memuat data server</p>
                            <p style={{
                                fontSize: '12px', fontWeight: 500,
                                color: '#7F1D1D', margin: 0
                            }}>{error}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
