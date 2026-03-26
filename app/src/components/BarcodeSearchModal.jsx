import { useState, useRef, useEffect } from 'react';
import { Search, X, Package, Hash, Calendar, Building, User, Info, FileText, History, MapPin, ClipboardCheck, Clock } from 'lucide-react';
import { useOpname } from '../store/OpnameContext';
import { lookupBarcode } from '../utils/masterDbParser';
import { lookupBarcodeHistory } from '../utils/historyDbParser';
import './BarcodeSearchModal.css';

export default function BarcodeSearchModal({ isOpen, onClose }) {
    const { masterDb, historyDb } = useOpname();
    const [barcode, setBarcode] = useState('');
    const [result, setResult] = useState(null);
    const [historyResult, setHistoryResult] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setBarcode('');
            setResult(null);
            setHistoryResult([]);
            setHasSearched(false);
            setTimeout(() => inputRef.current?.focus(), 150); // slight delay for animation smoothness
        }
    }, [isOpen]);

    const handleSearch = (e) => {
        e.preventDefault();
        const trimCode = barcode.trim();
        if (!trimCode) return;

        const data = lookupBarcode(masterDb, trimCode);
        const histData = lookupBarcodeHistory(historyDb, trimCode);
        setResult(data);
        setHistoryResult(histData);
        setHasSearched(true);
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
        <div className="bcs-overlay" onClick={onClose} role="presentation">
            <div className="bcs-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Cari Barcode Master Aset">
                
                {/* Header */}
                <div className="bcs-header">
                    <div className="bcs-title">
                        <Search size={24} className="text-primary-600" />
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

                    {/* Warning if Master DB not loaded */}
                    {!masterDb && (
                        <div className="alert alert--warning" style={{ borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <Info size={24} className="text-warning-600" />
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
                                    {/* Hero Card */}
                                    <div className="bcs-hero">
                                        <div className="bcs-hero-header">
                                            <div>
                                                <div className="bcs-hero-barcode">
                                                    <Hash size={16} /> {barcode.toUpperCase()}
                                                </div>
                                                <h3 className="bcs-hero-name">
                                                    {result.namaAset || '(Tanpa Nama)'}
                                                </h3>
                                            </div>
                                            <div className={`bcs-badge ${getConditionClass(result.kondisi)}`}>
                                                {result.kondisi || 'TIDAK DIKETAHUI'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bento Specs Grid */}
                                    <div className="bcs-specs-grid">
                                        <DetailItem icon={<Package />} label="Nomor PO" value={result.noPO} />
                                        <DetailItem icon={<Info />} label="Tipe Aset" value={result.tipe} />
                                        <DetailItem icon={<Calendar />} label="Periode Perolehan" value={`${result.bulanPerolehan || '-'} / ${result.tahunPerolehan || '-'}`} />
                                        <DetailItem icon={<Building />} label="Lokasi" value={result.lokasi} />
                                        <DetailItem icon={<User />} label="PIC" value={result.pic} />
                                        <div className="bcs-spec-full">
                                            <DetailItem icon={<FileText />} label="Keterangan Dasar" value={result.keterangan} />
                                        </div>
                                    </div>

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
    );
}

function DetailItem({ icon, label, value }) {
    return (
        <div className="bcs-spec-item">
            <div className="bcs-spec-label">
                {icon}
                <span>{label}</span>
            </div>
            <div className="bcs-spec-value">{value || '-'}</div>
        </div>
    );
}
