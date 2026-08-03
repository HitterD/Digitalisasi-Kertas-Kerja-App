import { useState, useRef, useEffect } from 'react';
import { Search, X, Package, Hash, Info, History, MapPin, ClipboardCheck, Clock, ArrowLeftRight } from 'lucide-react';
import { useOpname } from '../store/OpnameContext';
import { lookupBarcode } from '../utils/masterDbParser';
import { lookupBarcodeHistory } from '../utils/historyDbParser';
import MatHistoryModal from './MatHistoryModal';
import './BarcodeSearchModal.css';

export default function BarcodeSearchModal({ isOpen, onClose }) {
    const { masterDb, historyDb } = useOpname();
    const [barcode, setBarcode] = useState('');
    const [result, setResult] = useState(null);
    const [historyResult, setHistoryResult] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [showMatHistory, setShowMatHistory] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const [isCopied, setIsCopied] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('wa_recent_barcodes');
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        if (isOpen) {
            setBarcode('');
            setResult(null);
            setHistoryResult([]);
            setHasSearched(false);
            setShowMatHistory(false);
            setIsCopied(false);
            setTimeout(() => inputRef.current?.focus(), 150); // slight delay for animation smoothness
        }
    }, [isOpen]);

    const saveRecentSearch = (code) => {
        if (!code) return;
        const upperCode = code.toUpperCase();
        setRecentSearches(prev => {
            const filtered = prev.filter(item => item !== upperCode);
            const updated = [upperCode, ...filtered].slice(0, 10);
            try { localStorage.setItem('wa_recent_barcodes', JSON.stringify(updated)); } catch (e) {}
            return updated;
        });
    };

    const handleSearch = (e, overrideCode) => {
        if (e) e.preventDefault();
        const trimCode = (overrideCode || barcode).trim();
        if (!trimCode) return;

        if (overrideCode) setBarcode(overrideCode);

        const data = lookupBarcode(masterDb, trimCode);
        const histData = lookupBarcodeHistory(historyDb, trimCode);
        setResult(data);
        setHistoryResult(histData);
        setHasSearched(true);
        saveRecentSearch(trimCode);
    };

    const handleCopy = async (text) => {
        if (!text) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try { document.execCommand('copy'); } catch (err) {}
                document.body.removeChild(textArea);
            }
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {}
    };

    const historyNonOpname = historyResult.filter(r => !r.keterangan?.toUpperCase().includes('OPNAME'));
    const historyOpname = historyResult.filter(r => r.keterangan?.toUpperCase().includes('OPNAME'));

    if (!isOpen) return null;

    // Helper functions
    const getConditionClass = (kondisi) => {
        const k = (kondisi || '').toLowerCase();
        if (k.includes('rusak') || k.includes('hilang')) return 'danger';
        if (k.includes('baik') || k.includes('bagus')) return 'safe';
        return 'unknown';
    };

    return (
        <>
            <div className="bcs-overlay" onClick={onClose} role="presentation">
                <div className="bcs-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Cari Barcode Master Aset">
                    
                    {/* Header */}
                    <div className="bcs-header">
                        <div className="bcs-title">
                            <Search size={24} style={{ color: 'var(--accent)' }} />
                            Cari Barcode Master Aset
                        </div>
                        <button className="bcs-close-btn" onClick={onClose} aria-label="Tutup modal">
                            <X size={24} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="bcs-body">
                        {/* Search Form */}
                        <form onSubmit={handleSearch} className="bcs-search-form">
                            <div className="bcs-search-input-wrap">
                                <Search className="bcs-search-icon" size={24} strokeWidth={2.5} />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="bcs-input"
                                    placeholder="Scan atau ketik barcode di sini..."
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="bcs-btn" disabled={!masterDb}>
                                Cari
                            </button>
                        </form>

                        {/* Recent Searches */}
                        {!hasSearched && recentSearches.length > 0 && (
                            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                                <div className="bcs-recent-label">Pencarian Terakhir</div>
                                <div className="bcs-recent-wrap">
                                    {recentSearches.map((code) => (
                                        <button key={code} className="bcs-recent-chip" onClick={() => handleSearch(null, code)}>
                                            <History size={12} />
                                            {code}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Warning if Master DB not loaded */}
                        {!masterDb && (
                            <div className="alert alert--warning" style={{ borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', marginBottom: '24px' }}>
                                <Info size={24} style={{ color: 'var(--warning-600)', flex: 'none' }} />
                                <span style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.5, color: 'var(--warning-800)' }}>
                                    Database Master Aset belum dimuat. Silakan sinkronasikan dari SQL Server di halaman Upload terlebih dahulu.
                                </span>
                            </div>
                        )}

                        {/* Search Result */}
                        {hasSearched && masterDb && (
                            <div className="bcs-result-area">
                                {result ? (
                                    <>
                                        {/* Result Card */}
                                        <div className="bcs-result-card">
                                            <div className="bcs-card-header">
                                                <div>
                                                    <div className="bcs-card-barcode" onClick={() => handleCopy(barcode.toUpperCase())} title="Tap untuk salin">
                                                        <Hash size={14} />
                                                        <span style={{ color: isCopied ? 'var(--success-600)' : 'inherit', transition: 'color 0.2s' }}>
                                                            {barcode.toUpperCase()}
                                                        </span>
                                                        {isCopied && <span className="bcs-copied-tag">TERSALIN</span>}
                                                    </div>
                                                    <h3 className="bcs-card-name">{result.namaAset || '(Tanpa Nama)'}</h3>
                                                </div>
                                                <div className={`bcs-badge ${getConditionClass(result.kondisi)}`}>
                                                    {result.kondisi || 'TIDAK DIKETAHUI'}
                                                </div>
                                            </div>

                                            <div className="bcs-keystrip">
                                                <div className="bcs-keycell">
                                                    <div className="bcs-keylabel">Lokasi</div>
                                                    <div className="bcs-keyvalue">{result.lokasi || '-'}</div>
                                                </div>
                                                <div className="bcs-keycell">
                                                    <div className="bcs-keylabel">PIC</div>
                                                    <div className="bcs-keyvalue">{result.pic || '-'}</div>
                                                </div>
                                            </div>

                                            <div className="bcs-detail-list">
                                                <div className="bcs-detail-row">
                                                    <span className="bcs-detail-label">Nomor PO</span>
                                                    <span className="bcs-detail-value">{result.noPO || '-'}</span>
                                                </div>
                                                <div className="bcs-detail-row">
                                                    <span className="bcs-detail-label">Tipe Aset</span>
                                                    <span className="bcs-detail-value">{result.tipe || '-'}</span>
                                                </div>
                                                <div className="bcs-detail-row">
                                                    <span className="bcs-detail-label">Periode Perolehan</span>
                                                    <span className="bcs-detail-value">{`${result.bulanPerolehan || '-'} / ${result.tahunPerolehan || '-'}`}</span>
                                                </div>
                                                <div className="bcs-detail-row">
                                                    <span className="bcs-detail-label">Keterangan Dasar</span>
                                                    <span className="bcs-detail-value">{result.keterangan || '-'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* MAT History Trigger Button */}
                                        <button
                                            className="bcs-mat-track-btn"
                                            onClick={() => setShowMatHistory(true)}
                                            type="button"
                                        >
                                            <ArrowLeftRight size={15} strokeWidth={2.5} />
                                            Lacak Riwayat MAT
                                        </button>

                                        {/* History Section */}
                                        {historyDb && (
                                            <div className="bcs-history-container">
                                                
                                                {/* History Non Opname */}
                                                <div className="bcs-timeline-section">
                                                    <h4 className="bcs-timeline-header">
                                                        <div className="bcs-icon-box history">
                                                            <History size={20} />
                                                        </div>
                                                        Riwayat Keterangan & Perpindahan Asal
                                                    </h4>
                                                    {historyNonOpname.length > 0 ? (
                                                        <div className="bcs-timeline-list">
                                                            {historyNonOpname.map((item, idx) => (
                                                                <div key={idx} className="bcs-timeline-item">
                                                                    <div className="bcs-timeline-card">
                                                                        <div className="bcs-timeline-meta">
                                                                            <span className="bcs-timeline-location">
                                                                                <MapPin size={16} /> {item.ruangan || item.site || '-'}
                                                                            </span>
                                                                            {item.tanggal && item.tanggal !== 1899 && (
                                                                                <span className="bcs-timeline-date">
                                                                                    <Clock size={14} /> {item.tanggal}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="bcs-timeline-desc">{item.keterangan || '-'}</p>
                                                                        {item.ketOpname && item.ketOpname !== '-' && (
                                                                            <div className="bcs-timeline-extra">Keterangan Tambahan: {item.ketOpname}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="bcs-empty-history">
                                                            Tidak ada riwayat keterangan atau perpindahan tersendiri dari Excel History.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* History Opname */}
                                                <div className="bcs-timeline-section opname">
                                                    <h4 className="bcs-timeline-header">
                                                        <div className="bcs-icon-box opname">
                                                            <ClipboardCheck size={20} />
                                                        </div>
                                                        Riwayat Opname
                                                    </h4>
                                                    {historyOpname.length > 0 ? (
                                                        <div className="bcs-timeline-list">
                                                            {historyOpname.map((item, idx) => (
                                                                <div key={idx} className="bcs-timeline-item">
                                                                    <div className="bcs-timeline-card">
                                                                        <div className="bcs-timeline-meta">
                                                                            <span className="bcs-timeline-location">
                                                                                <MapPin size={16} /> {item.ruangan || item.site || '-'}
                                                                            </span>
                                                                            {item.tanggal && item.tanggal !== 1899 && (
                                                                                <span className="bcs-timeline-date">
                                                                                    <Clock size={14} /> {item.tanggal}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="bcs-timeline-desc">{item.keterangan || '-'}</p>
                                                                        {item.ketOpname && item.ketOpname !== '-' && (
                                                                            <div className="bcs-timeline-extra">{item.ketOpname}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="bcs-empty-history">
                                                            Aset ini belum pernah di-opname ke dalam sistem (historis opname kosong).
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="bcs-empty-state">
                                        <div className="bcs-empty-icon">
                                            <Package size={40} strokeWidth={1.5} />
                                        </div>
                                        <h4>Aset Tidak Ditemukan</h4>
                                        <p>Barcode <strong>"{barcode}"</strong> belum terdaftar dalam Master Aset lokal.<br/>Pastikan input sudah benar atau lakukan sinkronisasi data terbaru.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <MatHistoryModal
                barcode={barcode}
                namaAset={result?.namaAset}
                isOpen={showMatHistory}
                onClose={() => setShowMatHistory(false)}
            />
        </>
    );
}
