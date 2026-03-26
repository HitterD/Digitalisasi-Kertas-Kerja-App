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
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--warm-50)' }}>
            
            {/* Initial loading folders */}
            {loadingFolders && !folders && (
                <div className="py-5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className="spinner" style={{ width: 32, height: 32 }}></div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--charcoal-900)' }}>MENGHUBUNGI SERVER...</p>
                </div>
            )}

            {/* Folders Selection */}
            {folders && (
                <div style={{
                    padding: '24px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            fontFamily: 'var(--font-sora)', fontSize: '12px',
                            fontWeight: 900, color: 'var(--charcoal-900)',
                            textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                            <Folder size={16} color="var(--charcoal-900)" strokeWidth={3} />
                            PILIH DIVISI / LOKASI SERVER
                        </label>
                        <button
                            onClick={handleLoadFolders}
                            title="Refresh daftar folder"
                            disabled={loading || loadingFolders}
                            style={{
                                background: '#fff', border: '2px solid var(--charcoal-900)',
                                borderRadius: 0, cursor: 'pointer', padding: '6px',
                                display: 'flex', alignItems: 'center', color: 'var(--charcoal-900)',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--charcoal-900)'; e.currentTarget.style.color = 'var(--amber-400)'}}
                            onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = 'var(--charcoal-900)'}}
                        >
                            <RefreshCw size={14} strokeWidth={3} className={loadingFolders ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <select
                        style={{
                            width: '100%', padding: '14px 16px',
                            fontSize: '14px', fontFamily: 'var(--font-mono)',
                            borderRadius: 0, border: '2px solid var(--charcoal-900)',
                            outline: 'none', background: '#fff',
                            color: 'var(--charcoal-900)', fontWeight: 700,
                            boxShadow: '4px 4px 0 var(--charcoal-900)',
                            cursor: 'pointer', appearance: 'none'
                        }}
                        value={selectedFolder}
                        onChange={handleSelectFolder}
                        disabled={loading}
                    >
                        <option value="">— SILAKAN PILIH FOLDER —</option>
                        {folders.map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Empty State when no folder selected */}
            {!selectedFolder && folders && !loadingFolders && (
                <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderTop: '3px solid var(--charcoal-900)', backgroundColor: '#fff' }}>
                    <div style={{ width: 64, height: 64, background: 'var(--charcoal-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-400)', marginBottom: '24px' }}>
                        <FolderOpen size={32} strokeWidth={3} />
                    </div>
                    <p style={{
                        fontFamily: 'var(--font-sora)', fontSize: '16px', fontWeight: 900,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: 'var(--charcoal-900)', margin: 0
                    }}>
                        BELUM ADA FOLDER TERPILIH
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--charcoal-600)', marginTop: '12px' }}>
                        PILIH FOLDER DI ATAS UNTUK MELIHAT DAFTAR KERTAS KERJA OPNAME.
                    </p>
                </div>
            )}

            {/* Loading Periods state */}
            {loading && (
                <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '3px solid var(--charcoal-900)', backgroundColor: '#fff' }}>
                    <div className="spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--amber-400)' }}></div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--charcoal-900)', marginTop: '24px' }}>MENCARI KERTAS KERJA OPNAME...</p>
                </div>
            )}

            {/* Flat File list */}
            {selectedFolder && availableFiles && availableFiles.length > 0 && !loading && (
                <div style={{ borderTop: '3px solid var(--charcoal-900)', backgroundColor: 'var(--warm-50)' }}>
                    <div style={{
                        padding: '24px 24px 16px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <p style={{
                            fontFamily: 'var(--font-sora)', fontSize: '13px',
                            fontWeight: 900, textTransform: 'uppercase',
                            letterSpacing: '0.05em', color: 'var(--charcoal-900)',
                            margin: 0
                        }}>
                            File Excel Tersedia:
                        </p>
                        <span style={{ 
                                background: 'var(--charcoal-900)', color: 'var(--amber-400)', 
                                padding: '4px 8px', fontSize: '11px', fontWeight: 900, fontFamily: 'var(--font-mono)',
                                border: '2px solid var(--charcoal-900)' 
                        }}>
                            {availableFiles.length} FILE
                        </span>
                    </div>
                    <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {availableFiles.map((file) => {
                            const dlId = `${file.periodName}-${file.filename}`;
                            const isDownloading = downloading === dlId;
                            
                            return (
                                <button
                                    key={dlId}
                                    onClick={() => handleDownloadFile(file.periodName, file.filename)}
                                    disabled={downloading !== null}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                        width: '100%', textAlign: 'left',
                                        padding: '16px',
                                        background: isDownloading ? 'var(--amber-400)' : '#ffffff',
                                        border: '2px solid var(--charcoal-900)',
                                        borderRadius: 0,
                                        boxShadow: isDownloading ? '0 0 0' : '4px 4px 0 var(--charcoal-900)',
                                        cursor: downloading !== null ? 'not-allowed' : 'pointer',
                                        opacity: (downloading !== null && !isDownloading) ? 0.5 : 1,
                                        transition: 'all 0.1s',
                                    }}
                                    onMouseOver={e => { if(!downloading) e.currentTarget.style.backgroundColor = 'var(--warm-100)'; }}
                                    onMouseOut={e => { if(!downloading) e.currentTarget.style.backgroundColor = '#ffffff'; }}
                                    onMouseDown={e => { if(!downloading) { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 var(--charcoal-900)'; } }}
                                    onMouseUp={e => { if(!downloading) { e.currentTarget.style.transform = 'translate(0px, 0px)'; e.currentTarget.style.boxShadow = '4px 4px 0 var(--charcoal-900)'; } }}
                                >
                                    <div style={{
                                        flexShrink: 0, width: 44, height: 44,
                                        background: isDownloading ? 'var(--charcoal-900)' : 'var(--charcoal-900)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 0,
                                    }}>
                                        {isDownloading ? (
                                            <div className="spinner" style={{ width: 20, height: 20, borderTopColor: 'var(--amber-400)' }}></div>
                                        ) : (
                                            <FileSpreadsheet size={20} color="var(--amber-400)" strokeWidth={2.5} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                        <span style={{
                                            display: 'block',
                                            fontFamily: 'var(--font-mono)', fontSize: '13px',
                                            fontWeight: 800, color: 'var(--charcoal-900)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                        }}>
                                            {file.filename}
                                        </span>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '12px',
                                            fontFamily: 'var(--font-mono)', fontSize: '11px',
                                            fontWeight: 600, color: 'var(--charcoal-600)', marginTop: '6px',
                                            textTransform: 'uppercase'
                                        }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--amber-400)', color: 'var(--charcoal-900)', padding: '2px 6px', border: '1px solid var(--charcoal-900)', fontWeight: 800 }}>
                                                <Calendar size={12} strokeWidth={2.5} />
                                                {parsePeriodLabel(file.periodName)}
                                            </span>
                                            {file.modifiedDate && (
                                                <span>MODIF: {formatDate(file.modifiedDate)}</span>
                                            )}
                                        </span>
                                    </div>
                                    <div style={{ flexShrink: 0 }}>
                                        {isDownloading ? (
                                            <span style={{
                                                fontFamily: 'var(--font-sora)', fontSize: '12px', fontWeight: 900,
                                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                                color: 'var(--charcoal-900)'
                                            }}>LOADING...</span>
                                        ) : (
                                            <div style={{ width: 36, height: 36, border: '2px solid var(--charcoal-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
                                                <Download size={18} strokeWidth={3} color="var(--charcoal-900)" />
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
                        padding: '16px',
                        background: '#FEF2F2',
                        border: '2px solid #991B1B',
                        boxShadow: '4px 4px 0 #991B1B',
                        borderRadius: 0,
                    }}>
                        <AlertCircle size={24} color="#991B1B" strokeWidth={3} style={{ flexShrink: 0 }} />
                        <div>
                            <p style={{
                                fontFamily: 'var(--font-sora)', fontWeight: 900, fontSize: '12px',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                color: '#991B1B', margin: '0 0 4px 0'
                            }}>GAGAL MEMUAT DATA SERVER</p>
                            <p style={{
                                fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600,
                                color: '#7F1D1D', margin: 0
                            }}>{error}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
