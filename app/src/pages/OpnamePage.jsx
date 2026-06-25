import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import AssetTable from '../components/AssetTable';
import NoBarcodeSection from '../components/NoBarcodeSection';
import NotAtLocationSection from '../components/NotAtLocationSection';
import SignatureSection from '../components/SignatureSection';
import RoomStatusSelect from '../components/RoomStatusSelect';
import { saveRoomPDF, generateAndSaveAllPDFs } from '../utils/pdfGenerator';
import { apiUrl, fetchJsonWithAuth } from '../utils/apiConfig';
import {
    ROOM_NAV_ELLIPSIS,
    getRoomStatus,
    getVisibleRoomItems,
} from '../utils/opnameRoomNav';
import {
    ChevronLeft, ChevronRight, ChevronDown, FileDown, FilePlus, MapPin,
    AlertTriangle, Plus, Home, CheckCircle2, Circle, Wifi,
    List, PenTool, UploadCloud, Search, Save, Loader2
} from 'lucide-react';

import CustomRoomModal from '../components/CustomRoomModal';
import SaveLoadModal from '../components/SaveLoadModal'; // NEW
import DeleteRoomConfirmModal from '../components/DeleteRoomConfirmModal';
import SqlRoomImportModal from '../components/SqlRoomImportModal';

export default function OpnamePage() {
    const navigate = useNavigate();
    const {
        state, masterDb, setRoomIndex, toggleAssetCheck, updateAssetField, autofillAsset,
        addNoBarcodeAsset, updateNoBarcodeAsset, removeNoBarcodeAsset,
        addNotAtLocationAsset, updateNotAtLocationAsset, removeNotAtLocationAsset,
        updateSignatures, addCustomRoom, removeRoomLocal, addSqlImportedRoom, crossRoomCheck, importData
    } = useOpname();
    const [generating, setGenerating] = useState(false);
    const [toast, setToast] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false); // NEW
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSqlImportModalOpen, setIsSqlImportModalOpen] = useState(false);

    const roomIdx = state.currentRoomIndex;
    const room = state.rooms[roomIdx];

    const [isRoomGridOpen, setIsRoomGridOpen] = useState(false);

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

    const visibleRoomItems = useMemo(() => (
        getVisibleRoomItems(roomIdx, state.rooms.length)
    ), [roomIdx, state.rooms.length]);

    const handleRoomSelect = useCallback((targetIndex) => {
        setRoomIndex(targetIndex);
        setIsRoomGridOpen(false);
    }, [setRoomIndex]);

    const getRoomName = useCallback((targetIndex) => {
        const targetRoom = state.rooms[targetIndex];
        return targetRoom?.meta?.roomName || targetRoom?.sheetName || `Ruangan ${targetIndex + 1}`;
    }, [state.rooms]);

    const renderRoomNavButton = useCallback((targetIndex, variant = 'preview') => {
        const status = getRoomStatus(overallProgress[targetIndex]);
        const isActive = targetIndex === roomIdx;
        const roomName = getRoomName(targetIndex);

        return (
            <button
                key={`${variant}-${targetIndex}`}
                type="button"
                title={`${targetIndex + 1}. ${roomName}`}
                aria-label={`Buka ruangan ${targetIndex + 1}: ${roomName}`}
                aria-current={isActive ? 'true' : undefined}
                className={`wa-room-nav-dot wa-room-nav-dot--${variant} wa-room-nav-dot--${status}${isActive ? ' active' : ''}`}
                onClick={() => handleRoomSelect(targetIndex)}
            >
                {targetIndex + 1}
            </button>
        );
    }, [getRoomName, handleRoomSelect, overallProgress, roomIdx]);

    const handlePrevRoom = useCallback(() => {
        if (roomIdx > 0) {
            setRoomIndex(roomIdx - 1);
            setIsRoomGridOpen(false);
        }
    }, [roomIdx, setRoomIndex]);

    const handleNextRoom = useCallback(() => {
        if (roomIdx < state.rooms.length - 1) {
            setRoomIndex(roomIdx + 1);
            setIsRoomGridOpen(false);
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

    // === Sync Jaringan (Tablet -> PC) ===
    const [isSyncing, setIsSyncing] = useState(false);
    const handleNetworkSync = useCallback(async () => {
        setIsSyncing(true);
        try {
            const currentState = {
                fileName: state.fileName,
                rooms: state.rooms,
                currentRoomIndex: state.currentRoomIndex || 0,
            };

            // Relative URL ensures we hit the exact same IP and Port serving the frontend
            const data = await fetchJsonWithAuth(apiUrl('/api/sync/result'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentState),
            });

            showToast('Berhasil Upload ke Jaringan PC!');
        } catch (err) {
            console.error('Sync Error:', err);
            showToast(err.message || 'Koneksi Gagal. Pastikan Tablet & PC di WiFi yang sama.', 'error');
        } finally {
            setIsSyncing(false);
        }
    }, [state, showToast]);

    // === Signatures ===
    // handled by updateSignatures directly in SignatureSection

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
        <div className="app-main" style={{ width: '100%', maxWidth: '100%', padding: '0 var(--space-4)' }}>
            {/* Room Navigation */}
            <div className="wa-room-nav">
              {/* Prev/Next + select */}
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
              <div className="wa-room-nav-progress-group">
                <div style={{ position: 'relative', width: 36, height: 36 }}>
                  <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--terracotta-500)" strokeWidth="3" strokeDasharray="87.96" strokeDashoffset={87.96 - (87.96 * progress.pct / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.25,1,0.5,1)' }} />
                  </svg>
                  <div className="wa-room-nav-progress-pct">{progress.pct}%</div>
                </div>
                <div>
                  <div className="wa-room-nav-progress-text" style={{ marginBottom: 2 }}>{progress.checked}/{progress.total}</div>
                  <div className="wa-room-nav-progress-text">{progress.total - progress.checked} SISA</div>
                </div>
              </div>

              <div className="wa-room-nav-divider" />

              <div className="wa-room-nav-summary" aria-live="polite">
                <span className="wa-room-nav-summary__current">Ruangan {roomIdx + 1}</span>
                <span className="wa-room-nav-summary__total">dari {state.rooms.length}</span>
              </div>

              <button
                type="button"
                className="wa-room-nav-toggle"
                aria-expanded={isRoomGridOpen}
                onClick={() => setIsRoomGridOpen((current) => !current)}
              >
                {isRoomGridOpen ? 'Tutup' : 'Lihat semua'}
                <ChevronDown size={14} className={isRoomGridOpen ? 'open' : ''} />
              </button>

              {/* Compact room preview */}
              <div className="wa-room-nav-dots wa-room-nav-dots--preview" aria-label="Preview nomor ruangan">
                {visibleRoomItems.map((item) => (
                  item.type === ROOM_NAV_ELLIPSIS
                    ? <span key={item.key} className="wa-room-nav-ellipsis">…</span>
                    : renderRoomNavButton(item.index, 'preview')
                ))}
              </div>

              {isRoomGridOpen && (
                <div className="wa-room-nav-grid-panel" role="region" aria-label="Pilih ruangan opname">
                  <div className="wa-room-nav-grid">
                    {state.rooms.map((_, i) => renderRoomNavButton(i, 'grid'))}
                  </div>
                </div>
              )}
            </div>

            {/* Room Meta Info */}
            <div className="wa-card wa-room-meta-card">
              <div className="wa-room-meta-grid">
                <div className="wa-room-meta-col">
                  <div className="wa-room-meta-label">Ruangan</div>
                  <div className="wa-room-meta-value">{room.meta.roomName}</div>
                </div>
                <div className="wa-room-meta-col">
                  <div className="wa-room-meta-label">PIC Ruangan</div>
                  <div className="wa-room-meta-value">{room.meta.picName || '-'}</div>
                </div>
                <div className="wa-room-meta-col">
                  <div className="wa-room-meta-label">Periode</div>
                  <div className="wa-room-meta-value">{room.meta.period}</div>
                </div>
                <div className="wa-room-meta-col">
                  <div className="wa-room-meta-label">Tanggal</div>
                  <div className="wa-room-meta-value">{room.meta.date || '-'}</div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="opname-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)' }}>Daftar Aset</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-500)' }}>{room.assets.length} ITEM</div>
              <button className="wa-btn" style={{ background: 'var(--accent-soft)', color: 'var(--terracotta-500)', boxShadow: 'none' }}>◉ TEROPNAME</button>
              <div style={{ flex: 1 }} />
              <button className="wa-btn" style={{ color: 'var(--danger-700)', background: 'var(--danger-50)', borderColor: 'var(--danger-200)' }} onClick={() => setIsDeleteModalOpen(true)}>Delete Ruangan</button>
              <button className="wa-btn-ghost" onClick={() => setIsCustomModalOpen(true)}>+ Custom</button>
              <button className="wa-btn-ghost" onClick={() => setIsSaveModalOpen(true)}>Save / Load</button>
              <button className="wa-btn" onClick={handleGenerateCurrentPDF} disabled={generating}>
                {generating ? <Loader2 size={13} className="wa-spin" /> : '↓ PDF'}
              </button>
              <button className="wa-btn" onClick={handleGenerateAllPDFs} disabled={generating}>
                {generating ? <Loader2 size={13} className="wa-spin" /> : '↓ Semua PDF'}
              </button>
              <button className="wa-btn-terracotta" onClick={handleNetworkSync}>↻ Sync</button>
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

                    <div className="wa-search" style={{ marginBottom: 12, maxWidth: 380 }}>
                      <Search size={13} />
                      <input inputMode="numeric" pattern="[0-9]*" placeholder="Scan atau ketik barcode aset…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                {room.isCustomRoom ? (
                    <div className="alert alert--info" style={{ backgroundColor: 'var(--blue-50)', color: 'var(--blue-800)', border: '1px solid var(--blue-200)', borderRadius: '8px', padding: '16px' }}>
                        <strong>Ruangan Custom:</strong> Ruangan ini ditambahkan secara manual. Gunakan form <b>Asset Tidak Ada di Lokasi (Salah Ruangan)</b> dan <b>Asset Tanpa Barcode</b> di bawah untuk menginput data opname.
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </div>

            {/* No Barcode Section */}
            <NoBarcodeSection
                room={room}
                roomIdx={roomIdx}
                addNoBarcodeAsset={addNoBarcodeAsset}
                updateNoBarcodeAsset={updateNoBarcodeAsset}
                removeNoBarcodeAsset={removeNoBarcodeAsset}
                masterDb={masterDb}
            />

            {/* Not at Location Section */}
            <NotAtLocationSection
                room={room}
                roomIdx={roomIdx}
                addNotAtLocationAsset={addNotAtLocationAsset}
                updateNotAtLocationAsset={updateNotAtLocationAsset}
                removeNotAtLocationAsset={removeNotAtLocationAsset}
                masterDb={masterDb}
                onCrossRoomCheck={(barcode) => crossRoomCheck(roomIdx, barcode, room.meta.roomName)}
            />

            {/* Signature Section */}
            <SignatureSection
                room={room}
                roomIdx={roomIdx}
                onUpdateSignatures={updateSignatures}
            />

            <div className="mb-8"></div>

            {/* Modal */}
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
        </div>
    );
}
