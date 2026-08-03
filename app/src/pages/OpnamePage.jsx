import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import AssetTable from '../components/AssetTable';
import NoBarcodeSection from '../components/NoBarcodeSection';
import NotAtLocationSection from '../components/NotAtLocationSection';
import SignatureSection from '../components/SignatureSection';
import RoomStatusSelect from '../components/RoomStatusSelect';
import { saveRoomPDF, generateAndSaveAllPDFs } from '../utils/pdfGenerator';
import {
    ChevronLeft, ChevronRight, ChevronDown, FileDown, FilePlus, MapPin,
    AlertTriangle, Plus, Home, CheckCircle2, Circle, Wifi,
    List, PenTool, UploadCloud, Search, Save, Loader2, MoreVertical, ArrowUp
} from 'lucide-react';
import CustomRoomModal from '../components/CustomRoomModal';
import SaveLoadModal from '../components/SaveLoadModal';
import DeleteRoomConfirmModal from '../components/DeleteRoomConfirmModal';
import SqlRoomImportModal from '../components/SqlRoomImportModal';

export default function OpnamePage() {
    const navigate = useNavigate();
    const {
        state, masterDb, setRoomIndex, toggleAssetCheck, updateAssetField, autofillAsset,
        addNoBarcodeAsset, updateNoBarcodeAsset, removeNoBarcodeAsset,
        addNotAtLocationAsset, updateNotAtLocationAsset, removeNotAtLocationAsset,
        updateSignatures, addCustomRoom, removeRoomLocal, addSqlImportedRoom, crossRoomCheck, importData,
        syncStatus, manualSync, syncLastError
    } = useOpname();
    const [generating, setGenerating] = useState(false);
    const [toast, setToast] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSqlImportModalOpen, setIsSqlImportModalOpen] = useState(false);
    
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const optionsMenuRef = useRef(null);

    // Scroll to Top FAB State
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = (e) => {
            const scrollTop = e.target.scrollTop || window.scrollY || document.documentElement.scrollTop || 0;
            setShowScrollTop(scrollTop > 300);
        };
        // Use capture phase to catch scroll events from any scrollable container
        window.addEventListener('scroll', handleScroll, true);
        
        function handleClickOutside(event) {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target)) {
                setIsOptionsMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
        // Fallback for containers
        const root = document.getElementById('root');
        if (root) root.scrollTo({ top: 0, behavior: 'smooth' });
        const appMain = document.querySelector('.app-main');
        if (appMain) appMain.scrollTo({ top: 0, behavior: 'smooth' });
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const roomIdx = state.currentRoomIndex;
    const room = state.rooms[roomIdx];

    const showToast = useCallback((msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Progress calculations
    const progress = useMemo(() => {
        if (!room) return { checked: 0, total: 0, pct: 0 };
        const checked = room.assets.filter(a => a.isChecked).length;
        const total = room.assets.length;
        return { checked, total, pct: total > 0 ? Math.round((checked / total) * 100) : 0 };
    }, [room]);

    const overallProgress = useMemo(() => {
        if (!state.rooms.length) return [];
        return state.rooms.map(r => {
            const checked = r.assets.filter(a => a.isChecked).length;
            return { checked, total: r.assets.length };
        });
    }, [state.rooms]);

    const handleRoomSelect = useCallback((targetIndex) => {
        setRoomIndex(targetIndex);
    }, [setRoomIndex]);

    const handlePrevRoom = useCallback(() => {
        if (roomIdx > 0) {
            setRoomIndex(roomIdx - 1);
        }
    }, [roomIdx, setRoomIndex]);

    const handleNextRoom = useCallback(() => {
        if (roomIdx < state.rooms.length - 1) {
            setRoomIndex(roomIdx + 1);
        }
    }, [roomIdx, state.rooms.length, setRoomIndex]);

    const handleGenerateCurrentPDF = useCallback(async () => {
        if (!room) return;
        setGenerating(true);
        try {
            const name = (room.meta.roomName || room.sheetName || 'room').replace(/[\\/:*?"<>|]/g, '-');
            saveRoomPDF(room, `${name}.pdf`);
            showToast('PDF berhasil diunduh!');
        } catch (err) {
            showToast('Gagal generate PDF: ' + err.message, 'error');
        } finally {
            setGenerating(false);
        }
    }, [room, showToast]);

    const handleGenerateAllPDFs = useCallback(async () => {
        setGenerating(true);
        try {
            const count = await generateAndSaveAllPDFs(state.rooms);
            showToast(`${count} file PDF berhasil diunduh!`);
        } catch (err) {
            showToast('Gagal generate PDF: ' + err.message, 'error');
        } finally {
            setGenerating(false);
        }
    }, [state.rooms, showToast]);

    // === Sync Jaringan (Auto + Manual) ===
    const handleNetworkSync = useCallback(async () => {
        try {
            await manualSync();
            showToast('Berhasil sinkron!');
        } catch (err) {
            showToast(err.message || 'Gagal sync', 'error');
        }
    }, [manualSync, showToast]);

    if (!room) {
        return (
            <div className="app-main">
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state__icon"><List size={48} className="text-neutral-400" /></div>
                        <p className="empty-state__text">Belum ada data opname. Silakan upload file Excel terlebih dahulu.</p>
                        <button className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/app1')}>
                            <Home size={16} />
                            Kembali ke Upload
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-main" style={{ width: '100%', maxWidth: '100%', padding: '0 var(--space-4)', paddingBottom: '100px' }}>
            {/* Room Navigation */}
            <div className="wa-room-nav">
              <div className="wa-room-nav-select-group">
                <button className="wa-room-nav-btn" onClick={handlePrevRoom} disabled={roomIdx === 0} aria-label="Ruangan sebelumnya">
                  <ChevronLeft size={16} />
                </button>
                <RoomStatusSelect
                  rooms={state.rooms}
                  progress={overallProgress}
                  value={roomIdx}
                  onChange={handleRoomSelect}
                />
                <button className="wa-room-nav-btn" onClick={handleNextRoom} disabled={roomIdx === state.rooms.length - 1} aria-label="Ruangan berikutnya">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="wa-room-nav-divider" />

              {/* Progress ring + count */}
              <div className="wa-room-nav-progress-group" style={{ gap: '20px', marginLeft: '12px' }}>
                <div style={{ position: 'relative', width: 72, height: 72 }}>
                  <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="36" cy="36" r="32" fill="none" stroke="var(--neutral-200)" strokeWidth="5" />
                    <circle cx="36" cy="36" r="32" fill="none" stroke="var(--terracotta-500)" strokeWidth="5" strokeDasharray="201.06" strokeDashoffset={201.06 - (201.06 * progress.pct / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.25,1,0.5,1)' }} />
                  </svg>
                  <div className="wa-room-nav-progress-pct" style={{ fontSize: '16px', fontWeight: 'bold' }}>{progress.pct}%</div>
                </div>
                <div>
                  <div className="wa-room-nav-progress-text" style={{ marginBottom: 4, fontSize: '16px', fontWeight: 'bold' }}>{progress.checked}/{progress.total} SELESAI</div>
                  <div className="wa-room-nav-progress-text" style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 600 }}>{progress.total - progress.checked} SISA</div>
                </div>
              </div>

              <div className="wa-room-nav-divider" />

              <div className="wa-room-nav-summary" aria-live="polite">
                <span className="wa-room-nav-summary__current" style={{ fontSize: '16px', fontWeight: 'bold' }}>Ruangan {roomIdx + 1}</span>
                <span className="wa-room-nav-summary__total" style={{ fontSize: '13px' }}>dari {state.rooms.length}</span>
              </div>
            </div>

            {/* Room Meta Info */}
            <div className="wa-card wa-room-meta-card" style={{ marginBottom: '24px' }}>
              <div className="wa-room-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '16px 20px' }}>
                <div className="wa-room-meta-col">
                  <div className="wa-room-meta-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--neutral-500)', letterSpacing: '0.05em', marginBottom: '4px' }}>Ruangan</div>
                  <div className="wa-room-meta-value" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--charcoal-900)' }}>{room.meta.roomName}</div>
                </div>
                <div className="wa-room-meta-col">
                  <div className="wa-room-meta-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--neutral-500)', letterSpacing: '0.05em', marginBottom: '4px' }}>PIC Ruangan</div>
                  <div className="wa-room-meta-value" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--charcoal-900)' }}>{room.meta.picName || '-'}</div>
                </div>
                <div className="wa-room-meta-col">
                  <div className="wa-room-meta-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--neutral-500)', letterSpacing: '0.05em', marginBottom: '4px' }}>Periode</div>
                  <div className="wa-room-meta-value" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--charcoal-900)' }}>{room.meta.period}</div>
                </div>
                <div className="wa-room-meta-col">
                  <div className="wa-room-meta-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--neutral-500)', letterSpacing: '0.05em', marginBottom: '4px' }}>Tanggal</div>
                  <div className="wa-room-meta-value" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--charcoal-900)' }}>{room.meta.date || '-'}</div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="opname-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--charcoal-900)' }}>Daftar Aset</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--neutral-500)', background: 'var(--neutral-100)', padding: '2px 8px', borderRadius: '12px' }}>{room.assets.length} ITEM</div>
              <div className="badge badge--success" style={{ padding: '4px 10px' }}>◉ {progress.checked} TEROPNAME</div>
              <div style={{ flex: 1 }} />
              <button
                className={`wa-btn-terracotta wa-btn-sync-status wa-btn-sync-status--${syncStatus}`}
                onClick={handleNetworkSync}
              >
                <Wifi size={13} />
                Auto Sync
              </button>

              <div style={{ position: 'relative' }} ref={optionsMenuRef}>
                <button 
                  className="wa-btn-ghost" 
                  style={{ padding: '8px', minHeight: '34px', minWidth: '34px' }}
                  onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)}
                >
                  <MoreVertical size={16} />
                </button>
                {isOptionsMenuOpen && (
                  <div style={{ 
                    position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                    background: 'var(--cream-surface)', border: '1px solid var(--border)',
                    borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    width: '180px', zIndex: 50, overflow: 'hidden', padding: '4px'
                  }}>
                    <button className="wa-btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', marginBottom: '2px', fontWeight: 500, padding: '8px 12px' }} onClick={() => { setIsOptionsMenuOpen(false); setIsCustomModalOpen(true); }}>+ Custom Ruangan</button>
                    <button className="wa-btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', marginBottom: '2px', fontWeight: 500, padding: '8px 12px' }} onClick={() => { setIsOptionsMenuOpen(false); setIsSaveModalOpen(true); }}>Save / Load Data</button>
                    <button className="wa-btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', marginBottom: '2px', fontWeight: 500, padding: '8px 12px' }} onClick={() => { setIsOptionsMenuOpen(false); handleGenerateCurrentPDF(); }}>Download PDF</button>
                    <button className="wa-btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', marginBottom: '4px', fontWeight: 500, padding: '8px 12px' }} onClick={() => { setIsOptionsMenuOpen(false); handleGenerateAllPDFs(); }}>Semua PDF</button>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                    <button className="wa-btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', color: 'var(--danger-600)', fontWeight: 500, padding: '8px 12px' }} onClick={() => { setIsOptionsMenuOpen(false); setIsDeleteModalOpen(true); }}>Delete Ruangan</button>
                  </div>
                )}
              </div>
            </div>

            {/* Main Asset Table */}
            <div className="card card--no-hover p-3">
                <div className="card__header mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="card__title text-base" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <List size={18} /> Daftar Aset ({room.assets.length} item)
                            </div>
                            <span className={`badge ${progress.pct === 100 ? 'badge--success' : progress.pct > 0 ? 'badge--warning' : 'badge--danger'}`}>
                                {progress.checked} teropname
                            </span>
                        </div>
                    </div>

                    <div className="wa-search" style={{ marginBottom: 12, maxWidth: 480 }}>
                      <Search size={16} />
                      <input inputMode="numeric" pattern="[0-9]*" placeholder="Scan atau ketik barcode aset…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                {room.isCustomRoom ? (
                    <div className="alert alert--info" style={{ backgroundColor: 'var(--blue-50)', color: 'var(--blue-800)', border: '1px solid var(--blue-200)', borderRadius: '8px', padding: '16px' }}>
                        <strong>Ruangan Custom:</strong> Ruangan ini ditambahkan secara manual.
                    </div>
                ) : (
                    <div className="opname-asset-table-wrapper">
                        <AssetTable
                            assets={room.assets}
                            roomIndex={roomIdx}
                            onToggleCheck={toggleAssetCheck}
                            onUpdateField={updateAssetField}
                            masterDb={masterDb}
                            onAutofill={autofillAsset}
                            searchQuery={searchQuery}
                        />
                    </div>
                )}
            </div>

            <NoBarcodeSection
                room={room}
                roomIdx={roomIdx}
                addNoBarcodeAsset={addNoBarcodeAsset}
                updateNoBarcodeAsset={updateNoBarcodeAsset}
                removeNoBarcodeAsset={removeNoBarcodeAsset}
                masterDb={masterDb}
            />

            <NotAtLocationSection
                room={room}
                roomIdx={roomIdx}
                addNotAtLocationAsset={addNotAtLocationAsset}
                updateNotAtLocationAsset={updateNotAtLocationAsset}
                removeNotAtLocationAsset={removeNotAtLocationAsset}
                masterDb={masterDb}
                onCrossRoomCheck={(barcode) => crossRoomCheck(roomIdx, barcode, room.meta.roomName)}
            />

            <SignatureSection
                room={room}
                roomIdx={roomIdx}
                onUpdateSignatures={updateSignatures}
            />

            <div className="mb-8"></div>

            <CustomRoomModal 
                isOpen={isCustomModalOpen} 
                onClose={() => setIsCustomModalOpen(false)} 
                onSubmit={(data) => {
                    addCustomRoom(data);
                    showToast('Ruangan custom berhasil ditambahkan!', 'success');
                    setRoomIndex(state.rooms.length);
                }}
                defaultPeriod={state.rooms[0]?.meta?.period}
                onOpenSqlImport={() => {
                    setIsCustomModalOpen(false);
                    setIsSqlImportModalOpen(true);
                }}
            />

            <SaveLoadModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                currentFileName={state.fileName}
                onSaveState={async () => state}
                onLoadState={async (loadedState) => {
                    importData(loadedState);
                    showToast('Data opname berhasil dimuat ulang!', 'success');
                }}
            />

            {isDeleteModalOpen && (
                <DeleteRoomConfirmModal
                    roomName={room.meta.roomName}
                    assetCount={room.assets ? room.assets.length : 0}
                    sourceLabel={room.isCustomRoom ? (room.meta.isSqlImported ? 'Import SQL' : 'Manual') : 'File Excel'}
                    onConfirm={() => {
                        removeRoomLocal(roomIdx);
                        setIsDeleteModalOpen(false);
                        showToast('Ruangan dihapus dari kertas kerja lokal.', 'success');
                    }}
                    onCancel={() => setIsDeleteModalOpen(false)}
                />
            )}

            <SqlRoomImportModal
                isOpen={isSqlImportModalOpen}
                existingRooms={state.rooms}
                onClose={() => setIsSqlImportModalOpen(false)}
                onImport={(data) => {
                    addSqlImportedRoom(data);
                    showToast(`Ruangan SQL ${data.roomName} berhasil ${data.appendIfExist ? 'diupdate' : 'ditambahkan'}!`, 'success');
                }}
            />

            {/* Toast */}
            {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}

            {/* Scroll to Top FAB */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="wa-btn-terracotta"
                    style={{
                        position: 'fixed',
                        bottom: '40px',
                        right: '24px',
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 99,
                    }}
                    title="Kembali ke atas"
                >
                    <ArrowUp size={24} />
                </button>
            )}
        </div>
    );
}
