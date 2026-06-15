import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import { parseExcelFile, splitExcelBySheets } from '../utils/excelParser';
import { FileSpreadsheet, Scissors, ChevronRight, Save, Server, Layers, RefreshCw, Upload } from 'lucide-react';
import { saveAs } from 'file-saver';

import SavedSessionCard from '../components/SavedSessionCard';
import NetworkSyncHub from '../components/NetworkSyncHub';
import DatabaseUploadGrid from '../components/DatabaseUploadGrid';
import ServerFileBrowser from '../components/ServerFileBrowser';
import SaveLoadModal from '../components/SaveLoadModal'; // NEW

export default function UploadPage() {
    const navigate = useNavigate();
    const { state, setData, resetData, mergeRooms, importData } = useOpname();
    const [isServerModalOpen, setIsServerModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [error, setError] = useState('');
    const [splitting, setSplitting] = useState(false);
    const [fileBuffer, setFileBuffer] = useState(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false); // NEW


    const handleSplitExcel = useCallback(async () => {
        if (!fileBuffer) return;
        setSplitting(true);
        try {
            const files = await splitExcelBySheets(fileBuffer);
            for (const f of files) {
                saveAs(f.blob, f.name);
                await new Promise(r => setTimeout(r, 300));
            }
        } catch (err) {
            setError('Gagal memisahkan file: ' + err.message);
        } finally {
            setSplitting(false);
        }
    }, [fileBuffer]);

    const handleStartOpname = useCallback(async () => {
        if (!parsedData) return;
        await resetData();
        setData(parsedData);
        navigate('/app1/opname');
    }, [parsedData, setData, navigate, resetData]);

    const handleMergeRooms = useCallback(() => {
        if (!parsedData) return;
        mergeRooms(parsedData);
        navigate('/app1/opname');
    }, [parsedData, mergeRooms, navigate]);

    const handleReset = useCallback(() => {
        setParsedData(null);
        setFileBuffer(null);
    }, []);

    const handleServerFile = useCallback(async (buffer, fileName) => {
        setLoading(true);
        setError('');
        try {
            setFileBuffer(buffer);
            const data = parseExcelFile(buffer, fileName);
            setParsedData(data);
            setIsServerModalOpen(false);
        } catch (err) {
            setError('Gagal membaca file Excel dari server: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // ═══════════════════════════════════════════
    //  PARSED RESULT VIEW (full width)
    // ═══════════════════════════════════════════
    if (parsedData) {
        return (
            <div className="app-main" style={{ maxWidth: 900 }}>
                <div className="card">
                    <div className="card__header">
                        <div className="card__title">
                            <FileSpreadsheet size={20} />
                            File Berhasil Dibaca
                        </div>
                        <span className="badge badge--success">{parsedData.sheets.length} sheet ditemukan</span>
                    </div>

                    <p className="text-sm text-secondary mb-4">
                        <strong>{parsedData.fileName}</strong>
                    </p>

                    <div className="sheet-list">
                        {parsedData.sheets.map((sheet, i) => (
                            <div key={i} className="sheet-item">
                                <div className="sheet-item__number">{i + 1}</div>
                                <div className="sheet-item__name">{sheet.meta.roomName || sheet.sheetName}</div>
                                <div className="sheet-item__count">{sheet.assets.length} aset</div>
                            </div>
                        ))}
                    </div>

                    <div className="flex-row flex-row--wrap mt-5">
                        <button className="btn btn--primary btn--lg" onClick={handleStartOpname} title="Mulai opname baru (Akan menimpa yang sudah ada)">
                            <ChevronRight size={18} />
                            Mulai Baru
                        </button>
                        {state.rooms && state.rooms.length > 0 && (
                            <button className="btn btn--outline btn--lg" onClick={handleMergeRooms} style={{ color: 'var(--amber-700)', borderColor: 'var(--amber-500)', backgroundColor: 'var(--amber-50)' }} title="Menambahkan ruangan yang belum ada tanpa menghapus progres ruangan saat ini">
                                <FileSpreadsheet size={18} />
                                Tambah Ruangan ke Sesi Saat Ini
                            </button>
                        )}
                        <button className="btn btn--outline" onClick={handleSplitExcel} disabled={splitting}>
                            <Scissors size={16} />
                            {splitting ? 'Memisahkan...' : 'Pisahkan ke File Terpisah'}
                        </button>
                        <button className="btn btn--danger btn--outline" onClick={handleReset} style={{ marginLeft: 'auto' }}>
                            Batal / Reset
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════
    //  MAIN DASHBOARD VIEW (BENTO ASYMMETRICAL LAYOUT)
    // ═══════════════════════════════════════════
    return (
        <div className="wa-app-body">
            <div className="wa-page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div className="wa-icon-wrap" style={{ background: 'rgba(26,26,26,0.06)' }}>
                        <FileSpreadsheet size={20} color="var(--charcoal-900)" />
                    </div>
                    <div>
                        <div className="eyebrow">Modul 01 · Operasional</div>
                        <h1>Kertas Kerja Opname</h1>
                        <div className="subtitle">Mulai opname baru, lanjutkan sesi sebelumnya, atau sinkronkan data dari jaringan.</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="wa-btn" onClick={() => setIsSaveModalOpen(true)}>
                        <Save size={13} /> Lanjutkan dari Lokal (Save)
                    </button>
                    <button className="wa-btn-terracotta" onClick={() => setIsServerModalOpen(true)}>
                        <Server size={13} /> Ambil Data Server (Baru)
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Card 1: Saved Session */}
                <SavedSessionCard />
                {/* Card 2: Network Sync Hub */}
                <NetworkSyncHub />
                {/* Card 3: Sumber Data Aset (full-width) */}
                <div className="wa-card" style={{ gridColumn: 'span 2', padding: 22 }}>
                    <DatabaseUploadGrid />
                </div>
                {/* Card 4: Database Master Aset (full-width) */}
                <div className="wa-card" style={{ gridColumn: 'span 2', padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                        <div className="wa-icon-wrap" style={{ background: 'rgba(22,163,74,0.10)' }}>
                            <Layers size={20} color="var(--success-500)" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal-900)' }}>Database Master Aset</div>
                            <div style={{ fontSize: 11.5, color: 'var(--charcoal-500)', marginTop: 3 }}>Kamus utama barcode &amp; metadata aset perusahaan.</div>
                        </div>
                        <div className="wa-status success">✓ 98,837 ASET</div>
                    </div>
                    <div style={{ padding: 14, background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--success-500)', fontWeight: 600 }}>SQL Server (98837 aset) — 98,837 barcode dimuat</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-400)', marginTop: 6 }}>⏱ Terakhir sync: 15 Jun 2026, 11:45</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <button className="wa-btn-ghost"><RefreshCw size={12} /> Sinkron Ulang</button>
                        <button className="wa-btn-ghost"><Upload size={12} /> Upload File</button>
                    </div>
                </div>
            </div>

            {/* ─── POPUP MODAL SERVER FILE ─── */}
            {isServerModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 9999, position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setIsServerModalOpen(false)}>
                    <div style={{ backgroundColor: 'var(--warm-50)', width: '100%', maxWidth: '900px', boxShadow: '8px 8px 0px rgba(15,23,42,1)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '3px solid var(--charcoal-900)', borderRadius: '0' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderBottom: '3px solid var(--charcoal-900)' }}>
                            <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-sora)', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--charcoal-900)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <div style={{ width: 36, height: 36, background: 'var(--amber-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--charcoal-900)', border: '2px solid var(--charcoal-900)' }}>
                                    <FileSpreadsheet size={18} strokeWidth={3} />
                                </div>
                                BROWSE FILE SERVER
                            </h2>
                            <button onClick={() => setIsServerModalOpen(false)} style={{ background: '#fff', border: '2px solid var(--charcoal-900)', cursor: 'pointer', padding: 0, width: 36, height: 36, color: 'var(--charcoal-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.backgroundColor='var(--charcoal-900)'; e.currentTarget.style.color='#fff' }} onMouseOut={e => { e.currentTarget.style.backgroundColor='#fff'; e.currentTarget.style.color='var(--charcoal-900)'}}>
                                <span style={{ fontSize: '24px', lineHeight: '100%', fontWeight: 300, display: 'block' }}>&times;</span>
                            </button>
                        </div>
                        <div style={{ padding: '0', overflowY: 'auto' }}>
                            <ServerFileBrowser onFileLoaded={handleServerFile} />
                        </div>
                    </div>
                </div>
            )}

            {/* ─── POPUP MODAL SAVE/LOAD ─── */}
            <SaveLoadModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                currentFileName={state.fileName}
                onSaveState={async () => state}
                onLoadState={async (loadedState) => {
                    importData(loadedState);
                    navigate('/app1/opname');
                }}
            />
        </div>
    );
}
