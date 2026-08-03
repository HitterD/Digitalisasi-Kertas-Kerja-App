import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import { parseExcelFile, splitExcelBySheets } from '../utils/excelParser';
import { FileSpreadsheet, Scissors, ChevronRight, Save, Server, Upload } from 'lucide-react';
import { saveAs } from 'file-saver';

import SavedSessionCard from '../components/SavedSessionCard';
import NetworkSyncHub from '../components/NetworkSyncHub';
import DatabaseUploadGrid from '../components/DatabaseUploadGrid';
import ServerFileBrowser from '../components/ServerFileBrowser';
import SaveLoadModal from '../components/SaveLoadModal';

import { getSavedSessionSummary, getDatabaseReadiness, getApp1HeroCta } from '../utils/app1HomeStatus';

export default function UploadPage() {
    const navigate = useNavigate();
    const { state, masterDb, historyDb, setData, resetData, mergeRooms, importData } = useOpname();
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

    const sessionSummary = getSavedSessionSummary(state);
    const databaseReadiness = getDatabaseReadiness({ masterDb, historyDb });
    const heroCta = getApp1HeroCta({ hasSession: sessionSummary.hasSession });

    const handleHeroCtaClick = () => {
        if (heroCta.target === 'opname') {
            navigate('/app1/opname');
        } else {
            setIsServerModalOpen(true);
        }
    };

    // ═══════════════════════════════════════════
    //  MAIN DASHBOARD VIEW (DARK MODE / SQL FIRST)
    // ═══════════════════════════════════════════
    return (
        <div className="app1-home">
            <div className="app1-home__shell">
                <div className="app1-home__hero">
                    <div className="app1-home__hero-main">
                        <p className="app1-home__eyebrow">Modul 01 · Operasional</p>
                        <h1 id="app1-home-title" className="app1-home__title">Mulai opname tanpa bingung.</h1>
                        <p className="app1-home__subtitle">
                            Siapkan data aset, sinkron dari SQL Server, lalu lanjutkan ke kertas kerja opname.
                            Upload file tetap tersedia sebagai fallback saat jaringan tidak siap.
                        </p>
                        <div className="app1-home__actions">
                            <button className="app1-home__button app1-home__button--primary" onClick={handleHeroCtaClick}>
                                {heroCta.target === 'opname' ? <ChevronRight size={17} /> : <Server size={17} />}
                                {heroCta.label}
                            </button>
                            <button className="app1-home__button app1-home__button--secondary" onClick={() => setIsServerModalOpen(true)}>
                                <Server size={16} /> Ambil Data Server
                            </button>
                            <button className="app1-home__button app1-home__button--ghost" onClick={() => setIsSaveModalOpen(true)}>
                                <Save size={16} /> Lanjutkan dari Lokal
                            </button>
                        </div>
                    </div>

                    <div className="app1-home__side-stack">
                        <div className="app1-home__panel">
                            <p className="app1-home__label">Status Sesi</p>
                            <h2 className="app1-home__panel-title">{sessionSummary.label}</h2>
                            <p className="app1-home__text">
                                {sessionSummary.hasSession
                                    ? `${sessionSummary.assetCount.toLocaleString('id-ID')} aset tersimpan dari sesi lokal.`
                                    : 'Belum ada sesi opname lokal yang aktif.'}
                            </p>
                        </div>
                        <div className="app1-home__panel">
                            <p className="app1-home__label">Kesiapan Data</p>
                            <h2 className="app1-home__panel-title">{databaseReadiness.label}</h2>
                            <div className="app1-home__actions" style={{ marginTop: 12 }}>
                                <span className={`app1-home__badge app1-home__badge--${masterDb ? 'success' : 'warning'}`}>
                                    {databaseReadiness.masterLabel}
                                </span>
                                <span className={`app1-home__badge app1-home__badge--${historyDb ? 'success' : 'warning'}`}>
                                    {databaseReadiness.historyLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="app1-home__grid">
                    <SavedSessionCard />
                    <NetworkSyncHub />
                </div>

                <DatabaseUploadGrid />
            </div>

            {/* ─── POPUP MODAL SERVER FILE ─── */}
            {isServerModalOpen && (
                <div className="app1-home__modal-overlay" onClick={() => setIsServerModalOpen(false)}>
                    <div className="app1-home__modal" onClick={e => e.stopPropagation()}>
                        <div className="app1-home__modal-header">
                            <h2 className="app1-home__modal-title">
                                <div className="app1-home__icon-box">
                                    <Server size={18} strokeWidth={2.5} />
                                </div>
                                Browse File Server
                            </h2>
                            <button className="app1-home__modal-close" onClick={() => setIsServerModalOpen(false)}>
                                &times;
                            </button>
                        </div>
                        <div className="app1-home__modal-body">
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
