import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import AssetTable from '../components/AssetTable';
import NoBarcodeSection from '../components/NoBarcodeSection';
import NotAtLocationSection from '../components/NotAtLocationSection';
import SignatureSection from '../components/SignatureSection';
import { saveRoomPDF, generateAndSaveAllPDFs } from '../utils/pdfGenerator';
import { apiUrl, fetchWithAuth } from '../utils/apiConfig';
import {
    ChevronLeft, ChevronRight, ChevronDown, FileDown, FilePlus, MapPin,
    AlertTriangle, Plus, Home, CheckCircle2, Circle, Wifi,
    List, PenTool, UploadCloud, Search, Save
} from 'lucide-react';

import CustomRoomModal from '../components/CustomRoomModal';
import SaveLoadModal from '../components/SaveLoadModal'; // NEW

export default function OpnamePage() {
    const navigate = useNavigate();
    const {
        state, masterDb, setRoomIndex, toggleAssetCheck, updateAssetField, autofillAsset,
        addNoBarcodeAsset, updateNoBarcodeAsset, removeNoBarcodeAsset,
        addNotAtLocationAsset, updateNotAtLocationAsset, removeNotAtLocationAsset,
        setSignature, addCustomRoom, crossRoomCheck, importData
    } = useOpname();
    const [generating, setGenerating] = useState(false);
    const [toast, setToast] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false); // NEW

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

    const handlePrevRoom = useCallback(() => {
        if (roomIdx > 0) setRoomIndex(roomIdx - 1);
    }, [roomIdx, setRoomIndex]);

    const handleNextRoom = useCallback(() => {
        if (roomIdx < state.rooms.length - 1) setRoomIndex(roomIdx + 1);
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
            const res = await fetchWithAuth(apiUrl('/api/sync/result'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentState),
            });

            const data = await res.json();
            if (data.success) {
                showToast('Berhasil Upload ke Jaringan PC!');
            } else {
                showToast(`Gagal: ${data.error || 'Server tidak merespon'}`, 'error');
            }
        } catch (err) {
            console.error('Sync Error:', err);
            showToast('Koneksi Gagal. Pastikan Tablet & PC di WiFi yang sama.', 'error');
        } finally {
            setIsSyncing(false);
        }
    }, [state, showToast]);

    // === Signatures ===
    const handleSaveSig = useCallback((type, data) => {
        setSignature(roomIdx, type, data);
    }, [roomIdx, setSignature]);

    const handleSaveName = useCallback((type, name) => {
        setSignature(roomIdx, type + 'Name', name);
    }, [roomIdx, setSignature]);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', background: 'var(--cream-surface)', borderBottom: '1px solid rgba(26,26,26,0.06)' }}>
              {/* Prev/Next + select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <button onClick={handlePrevRoom} disabled={roomIdx === 0} style={{ width: 30, height: 30, background: 'transparent', border: '1px solid rgba(26,26,26,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--charcoal-900)', cursor: roomIdx === 0 ? 'not-allowed' : 'pointer', opacity: roomIdx === 0 ? 0.25 : 1 }}>
                  <ChevronLeft size={14} />
                </button>
                <select className="wa-select" value={roomIdx} onChange={(e) => setRoomIndex(Number(e.target.value))} style={{ minWidth: 240, fontSize: 12, fontWeight: 600 }}>
                  {state.rooms.map((r, i) => {
                    const op = overallProgress[i];
                    const pctStr = op ? ` (${op.checked}/${op.total})` : '';
                    return <option key={i} value={i}>{i + 1}. {r.meta.roomName || r.sheetName}{pctStr}</option>;
                  })}
                </select>
                <button onClick={handleNextRoom} disabled={roomIdx === state.rooms.length - 1} style={{ width: 30, height: 30, background: 'transparent', border: '1px solid rgba(26,26,26,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--charcoal-900)', cursor: roomIdx === state.rooms.length - 1 ? 'not-allowed' : 'pointer', opacity: roomIdx === state.rooms.length - 1 ? 0.25 : 1 }}>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div style={{ width: 1, height: 24, background: 'rgba(26,26,26,0.08)' }} />

              {/* Progress ring + count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ position: 'relative', width: 36, height: 36 }}>
                  <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(26,26,26,0.08)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--terracotta-500)" strokeWidth="3" strokeDasharray="87.96" strokeDashoffset={87.96 - (87.96 * progress.pct / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.25,1,0.5,1)' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, color: 'var(--charcoal-900)' }}>{progress.pct}%</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{progress.checked}/{progress.total}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.08em' }}>{progress.total - progress.checked} SISA</div>
                </div>
              </div>

              <div style={{ width: 1, height: 24, background: 'rgba(26,26,26,0.08)' }} />

              {/* Dot grid (horizontal scroll) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, overflowX: 'auto', flex: 1, minWidth: 0, paddingRight: 8 }}>
                {state.rooms.map((r, i) => {
                  const op = overallProgress[i];
                  const isActive = i === roomIdx;
                  const isDone = op && op.checked === op.total;
                  const isProcess = op && op.checked > 0 && op.checked < op.total;
                  return (
                    <div key={i} title={`Ruang ${i + 1}`} style={{
                      width: 12, height: 12, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                      background: isActive ? 'var(--cream-surface)' : (isDone ? 'var(--charcoal-900)' : (isProcess ? 'var(--terracotta-500)' : 'var(--cream-surface)')),
                      border: isActive ? '2px solid var(--terracotta-500)' : '1.5px solid var(--charcoal-300)',
                    }} onClick={() => setRoomIndex(i)} />
                  );
                })}
              </div>
            </div>

            {/* Room Meta Info */}
            <div className="wa-card" style={{ padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
                <div style={{ paddingRight: 18, borderRight: '1px solid rgba(26,26,26,0.06)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--terracotta-500)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Ruangan</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal-900)', lineHeight: 1.3 }}>{room.meta.roomName}</div>
                </div>
                <div style={{ padding: '0 18px', borderRight: '1px solid rgba(26,26,26,0.06)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--terracotta-500)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>PIC Ruangan</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal-900)', lineHeight: 1.3 }}>{room.meta.picName || '-'}</div>
                </div>
                <div style={{ padding: '0 18px', borderRight: '1px solid rgba(26,26,26,0.06)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--terracotta-500)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Periode</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal-900)', lineHeight: 1.3 }}>{room.meta.period}</div>
                </div>
                <div style={{ paddingLeft: 18 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--terracotta-500)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Tanggal</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal-900)', lineHeight: 1.3 }}>{room.meta.date || '-'}</div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal-900)' }}>Daftar Aset</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-500)' }}>{room.assets.length} ITEM</div>
              <button className="wa-btn" style={{ background: 'rgba(201,100,66,0.10)', color: 'var(--terracotta-500)', boxShadow: 'none' }}>◉ TEROPNAME</button>
              <div style={{ flex: 1 }} />
              <button className="wa-btn-ghost" onClick={() => setIsCustomModalOpen(true)}>+ Custom</button>
              <button className="wa-btn-ghost" onClick={() => setIsSaveModalOpen(true)}>Save / Load</button>
              <button className="wa-btn" onClick={handleGenerateCurrentPDF}>↓ PDF</button>
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
                      <input placeholder="Scan atau ketik barcode aset…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                        <div className="opname-asset-cards">
                            {room.assets.map((asset, i) => (
                                <div key={asset.id} className="wa-card" style={{ padding: 12, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div
                                            className={`wa-check ${asset.isChecked ? 'on' : ''}`}
                                            onClick={() => toggleAssetCheck(roomIdx, i)}
                                            role="checkbox"
                                            aria-checked={!!asset.isChecked}
                                            tabIndex={0}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--terracotta-500)' }}>{asset.barcode}</div>
                                            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--charcoal-900)', marginTop: 2, lineHeight: 1.3 }}>{asset.namaAset}</div>
                                        </div>
                                        <div className="wa-toggle">
                                            <span
                                                className={asset.adaTidakAda === 'Ada' ? 'on' : ''}
                                                onClick={() => updateAssetField(roomIdx, i, 'adaTidakAda', 'Ada')}
                                            >Ada</span>
                                            <span
                                                className={asset.adaTidakAda === 'Tidak Ada' ? 'on' : ''}
                                                onClick={() => updateAssetField(roomIdx, i, 'adaTidakAda', 'Tidak Ada')}
                                            >Tdk</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                        <select
                                            className="wa-select"
                                            style={{ flex: 1, fontSize: 11 }}
                                            value={asset.kondisi || ''}
                                            onChange={(e) => updateAssetField(roomIdx, i, 'kondisi', e.target.value)}
                                        >
                                            <option value="">— Kondisi —</option>
                                            <option>Baik</option>
                                            <option>Rusak</option>
                                            <option>Cetak Ulang</option>
                                            <option>Salah Ruangan</option>
                                            <option>Pending</option>
                                        </select>
                                        <input
                                            className="wa-input"
                                            style={{ flex: 1, fontSize: 11 }}
                                            placeholder="Keterangan…"
                                            value={asset.keterangan || ''}
                                            onChange={(e) => updateAssetField(roomIdx, i, 'keterangan', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
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
                handleSaveSig={handleSaveSig}
                handleSaveName={handleSaveName}
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

            {/* Toast */}
            {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
