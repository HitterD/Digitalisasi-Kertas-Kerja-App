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
            <div className="room-nav">
                <button className="btn btn--ghost btn--icon" onClick={handlePrevRoom} disabled={roomIdx === 0}>
                    <ChevronLeft size={20} />
                </button>

                <select
                    className="form-select room-nav__select"
                    value={roomIdx}
                    onChange={(e) => setRoomIndex(Number(e.target.value))}
                    style={{ maxWidth: '300px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                >
                    {state.rooms.map((r, i) => {
                        const op = overallProgress[i];
                        const pctStr = op ? ` (${op.checked}/${op.total})` : '';
                        return (
                            <option key={i} value={i}>
                                {i + 1}. {r.meta.roomName || r.sheetName}{pctStr}
                            </option>
                        );
                    })}
                </select>

                <button className="btn btn--ghost btn--icon" onClick={handleNextRoom} disabled={roomIdx === state.rooms.length - 1}>
                    <ChevronRight size={20} />
                </button>

                <div className="room-nav__progress">
                    <div className="room-nav__progress-bar" style={{ background: 'var(--warm-200)', height: 6, borderRadius: 0, overflow: 'hidden' }}>
                        <div className="room-nav__progress-fill" style={{ width: `${progress.pct}%`, background: 'var(--amber-500)', height: '100%', borderRadius: 0, transition: 'width 0.4s cubic-bezier(0.25, 1, 0.5, 1)' }}></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', marginTop: '4px' }}>
                        <span style={{ fontWeight: 800, fontFamily: 'var(--font-sora)', fontSize: '1.2rem', color: progress.pct === 100 ? 'var(--amber-600)' : 'var(--charcoal-900)', lineHeight: 1 }}>{progress.pct}%</span>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--charcoal-400)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{progress.checked} / {progress.total} DIPROSES</span>
                    </div>
                </div>

                {/* --- STATS WIDGET --- */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    marginLeft: 'auto',
                    background: '#ffffff',
                    padding: '8px 24px',
                    borderRadius: '12px',
                    border: '1px solid var(--warm-200)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '80px' }}>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--charcoal-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sisa Aset</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '18px', fontFamily: 'var(--font-sora)', fontWeight: 800, color: 'var(--charcoal-900)', lineHeight: 1 }}>
                                {progress.total - progress.checked}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--charcoal-400)', textTransform: 'uppercase' }}>item</span>
                        </div>
                    </div>
                    
                    <div style={{ width: '1px', height: '32px', background: 'var(--warm-200)' }}></div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '100px' }}>
                        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--charcoal-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status Area</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <div style={{ 
                                width: '10px', height: '10px', borderRadius: '50%', 
                                background: progress.pct === 100 ? 'var(--success-500)' : progress.pct > 0 ? 'var(--amber-500)' : 'var(--neutral-300)',
                                boxShadow: progress.pct === 100 ? '0 0 8px rgba(34, 197, 94, 0.4)' : progress.pct > 0 ? '0 0 8px rgba(245, 158, 11, 0.4)' : 'none'
                            }}></div>
                            <span style={{ fontSize: '13px', fontFamily: 'var(--font-sora)', fontWeight: 700, color: progress.pct === 100 ? 'var(--success-700)' : progress.pct > 0 ? 'var(--amber-700)' : 'var(--charcoal-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {progress.pct === 100 ? 'Selesai' : progress.pct > 0 ? 'Proses' : 'Menunggu'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Room Meta Info */}
            <div className="meta-info" style={{ background: 'var(--warm-50)', border: '1px solid var(--warm-200)', borderRadius: '4px', padding: '12px 16px', marginBottom: '16px' }}>
                <div className="meta-info__item">
                    <span className="meta-info__label" style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ruangan</span>
                    <span className="meta-info__value" style={{ fontFamily: 'var(--font-sora)', fontWeight: 600, color: 'var(--charcoal-900)' }}>{room.meta.roomName}</span>
                </div>
                <div className="meta-info__item">
                    <span className="meta-info__label" style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PIC Ruangan</span>
                    <span className="meta-info__value" style={{ fontFamily: 'var(--font-sora)', fontWeight: 600, color: 'var(--charcoal-900)' }}>{room.meta.picName || '-'}</span>
                </div>
                <div className="meta-info__item">
                    <span className="meta-info__label" style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Periode</span>
                    <span className="meta-info__value" style={{ fontFamily: 'var(--font-sora)', fontWeight: 600, color: 'var(--charcoal-900)' }}>{room.meta.period}</span>
                </div>
                <div className="meta-info__item">
                    <span className="meta-info__label" style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tanggal</span>
                    <span className="meta-info__value" style={{ fontFamily: 'var(--font-sora)', fontWeight: 600, color: 'var(--charcoal-900)' }}>{room.meta.date || '-'}</span>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="actions-bar" style={{ position: 'relative', zIndex: 100, display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px', background: 'var(--warm-100)', padding: '8px', borderRadius: '4px', border: '1px solid var(--warm-200)' }}>
                {/* COMBO PDF DROPDOWN */}
                <div style={{ position: 'relative', zIndex: 110 }} className="hide-on-mobile group">
                    <button 
                        className="btn btn--outline" 
                        disabled={generating || isSyncing}
                        style={{ background: 'var(--charcoal-900)', borderColor: 'var(--charcoal-900)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <FileDown size={14} />
                        {generating ? 'Memproses...' : 'Export PDF'}
                        <ChevronDown size={14} style={{ marginLeft: '4px' }} />
                    </button>
                    {/* Dropdown Menu Wrapper (Padding Bridge) */}
                    <div 
                        className="dropdown-wrapper"
                        style={{ 
                            position: 'absolute', top: '100%', left: 0, 
                            paddingTop: '8px', /* Provides a seamless bridge to catch hover */
                            minWidth: '200px', display: 'none', 
                            zIndex: 120
                        }}
                    >
                        {/* Actual Dropdown Box */}
                        <div style={{ background: '#fff', border: '1px solid var(--warm-200)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <button 
                                onClick={handleGenerateCurrentPDF} 
                                disabled={generating || isSyncing}
                                style={{ padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--warm-100)', fontSize: '13px', fontFamily: 'var(--font-sora)', fontWeight: 600, color: 'var(--charcoal-900)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--warm-50)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <FileDown size={16} style={{ color: 'var(--amber-600)' }} />
                                Cetak PDF Ruangan Ini
                            </button>
                            <button 
                                onClick={handleGenerateAllPDFs} 
                                disabled={generating || isSyncing}
                                style={{ padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: '13px', fontFamily: 'var(--font-sora)', fontWeight: 600, color: 'var(--charcoal-900)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--warm-50)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <FilePlus size={16} style={{ color: 'var(--amber-600)' }} />
                                Cetak PDF Semua Ruangan
                            </button>
                        </div>
                     </div>
                     {/* Use explicit style fallback */}
                     <style>{`
                         .group:hover .dropdown-wrapper { display: block !important; }
                         @media (max-width: 768px) {
                             .hide-on-mobile { display: none !important; }
                         }
                     `}</style>
                </div>

                <button 
                  className="btn btn--outline" 
                  onClick={() => setIsCustomModalOpen(true)} 
                  style={{ background: 'var(--blue-50)', borderColor: 'var(--blue-200)', color: 'var(--blue-700)', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  title="Tambah ruangan manual jika ada yang terlewat dari Excel"
                >
                    <Plus size={14} />
                    Ruang Custom
                </button>

                {/* SAVE BUTTON - Hidden on Android/Mobile, shown on SM+ */}
                <button
                    className="btn btn--outline hide-on-mobile"
                    title="Simpan sementara atau Load hasil opname tersimpan"
                    onClick={() => setIsSaveModalOpen(true)}
                    style={{ background: 'var(--warm-50)', borderColor: 'var(--warm-300)', color: 'var(--charcoal-900)', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                    <Save size={14} />
                    <span>Save / Load</span>
                </button>

                {/* UPGRADED NETWORK BUTTON */}
                <button
                    className="btn btn--primary"
                    onClick={handleNetworkSync}
                    disabled={isSyncing || generating}
                    title="Upload hasil opname langsung ke PC melalui jaringan WiFi"
                    style={{ 
                        background: 'linear-gradient(135deg, var(--charcoal-800) 0%, var(--charcoal-900) 100%)', 
                        color: 'var(--amber-400)', 
                        borderColor: 'transparent', 
                        fontFamily: 'var(--font-sora)', 
                        fontSize: '12px', 
                        fontWeight: 800,
                        textTransform: 'uppercase', 
                        letterSpacing: '0.06em', 
                        marginLeft: 'auto',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        transition: 'all 0.2s',
                        borderRadius: '6px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <UploadCloud size={16} style={{ filter: 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.4))' }} />
                    {isSyncing ? 'MENGIRIM...' : 'SYNC SERVER'}
                </button>

                {/* Room quick-nav badges */}
                <div className="ml-auto flex-row flex-row--gap-sm hidden sm:flex" style={{ flexWrap: 'wrap' }}>
                    {overallProgress.map((op, i) => {
                        const done = op.total > 0 && op.checked === op.total;
                        const started = op.checked > 0;
                        return (
                            <button
                                key={i}
                                className="btn btn--ghost btn--sm"
                                style={{
                                    padding: '2px 8px',
                                    minHeight: 28,
                                    borderRadius: '4px',
                                    fontFamily: 'var(--font-mono)',
                                    background: i === roomIdx ? 'var(--charcoal-900)' : 'transparent',
                                    color: i === roomIdx ? 'var(--amber-400)' : done ? 'var(--amber-600)' : started ? 'var(--charcoal-500)' : 'var(--warm-300)',
                                    border: `1px solid ${i === roomIdx ? 'var(--charcoal-900)' : 'transparent'}`,
                                    fontWeight: i === roomIdx ? 700 : 500,
                                }}
                                onClick={() => setRoomIndex(i)}
                                title={state.rooms[i].meta.roomName}
                            >
                                {done ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                                {i + 1}
                            </button>
                        );
                    })}
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

                    <div className="relative w-full" style={{ maxWidth: '500px' }}>
                        <div 
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#ffffff',
                                borderRadius: '999px',
                                border: '2px solid var(--charcoal-900)',
                                padding: '4px 6px',
                                boxShadow: '4px 4px 0px var(--charcoal-900)',
                                transition: 'all 0.15s ease-out',
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.transform = 'translate(2px, 2px)';
                                e.currentTarget.style.boxShadow = '2px 2px 0px var(--charcoal-900)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.transform = 'translate(0, 0)';
                                e.currentTarget.style.boxShadow = '4px 4px 0px var(--charcoal-900)';
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                background: 'var(--amber-400)',
                                borderRadius: '50%',
                                flexShrink: 0,
                                border: '1px solid var(--charcoal-900)'
                            }}>
                                <Search size={20} color="var(--charcoal-900)" strokeWidth={2.5} />
                            </div>
                            <input
                                type="search"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="KETIK BARCODE ASET..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '0 16px',
                                    color: 'var(--charcoal-900)',
                                    fontFamily: 'var(--font-sora)',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    outline: 'none',
                                }}
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        marginRight: '8px',
                                        background: 'var(--warm-200)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'var(--charcoal-600)',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--warm-300)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--warm-200)'}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {room.isCustomRoom ? (
                    <div className="alert alert--info" style={{ backgroundColor: 'var(--blue-50)', color: 'var(--blue-800)', border: '1px solid var(--blue-200)', borderRadius: '8px', padding: '16px' }}>
                        <strong>Ruangan Custom:</strong> Ruangan ini ditambahkan secara manual. Gunakan form <b>Asset Tidak Ada di Lokasi (Salah Ruangan)</b> dan <b>Asset Tanpa Barcode</b> di bawah untuk menginput data opname.
                    </div>
                ) : (
                    <AssetTable
                        assets={room.assets}
                        roomIndex={roomIdx}
                        onToggleCheck={toggleAssetCheck}
                        onUpdateField={updateAssetField}
                        masterDb={masterDb}
                        onAutofill={autofillAsset}
                        searchQuery={searchQuery}
                    />
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
