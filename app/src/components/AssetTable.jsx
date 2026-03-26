import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';

const KONDISI_OPTIONS = ['Baik', 'Rusak', 'Cetak Ulang', 'Salah Ruangan', 'Pending'];
const KONDISI_CLASS = {
    'Baik': 'tg-btn--active-green',
    'Rusak': 'tg-btn--active-red',
    'Cetak Ulang': 'tg-btn--active-warning',
    'Salah Ruangan': 'tg-btn--active-warning',
    'Pending': 'tg-btn--active-neutral',
};

// Short labels for space-saving display in table
const KONDISI_SHORT = {
    'Baik': 'Baik',
    'Rusak': 'Rusak',
    'Cetak Ulang': 'Cetak',
    'Salah Ruangan': 'Salah',
    'Pending': 'Pending',
};

function AdaToggle({ value, onChange }) {
    return (
        <div style={{ 
            display: 'inline-flex', 
            background: 'var(--warm-100)', 
            padding: '4px', 
            borderRadius: '999px',
            border: '1px solid var(--warm-200)',
            position: 'relative',
            width: 'max-content'
        }}>
            <button
                type="button"
                onClick={() => onChange(value === 'Ada' ? '' : 'Ada')}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '4px 14px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: value === 'Ada' ? 800 : 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: 'none',
                    cursor: 'pointer',
                    background: value === 'Ada' ? '#ffffff' : 'transparent',
                    color: value === 'Ada' ? 'var(--success-600)' : 'var(--charcoal-400)',
                    boxShadow: value === 'Ada' ? '0 2px 6px rgba(0,0,0,0.05), inset 0 0 0 1px var(--success-200)' : 'none'
                }}
            >
                Ada
            </button>
            <button
                type="button"
                onClick={() => onChange(value === 'Tidak Ada' ? '' : 'Tidak Ada')}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '4px 14px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: value === 'Tidak Ada' ? 800 : 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: 'none',
                    cursor: 'pointer',
                    background: value === 'Tidak Ada' ? '#ffffff' : 'transparent',
                    color: value === 'Tidak Ada' ? 'var(--danger-600)' : 'var(--charcoal-400)',
                    boxShadow: value === 'Tidak Ada' ? '0 2px 6px rgba(0,0,0,0.05), inset 0 0 0 1px var(--danger-200)' : 'none'
                }}
            >
                Tdk
            </button>
        </div>
    );
}

function KondisiDropdown({ value, onChange }) {
    // Dynamic color styling for the select based on selected condition
    let selectClass = "form-select form-input--compact";
    if (value === 'Baik') selectClass += " text-success-700 bg-success-50 border-success-200 font-semibold";
    else if (value === 'Rusak') selectClass += " text-danger-700 bg-danger-50 border-danger-200 font-semibold";
    else if (value === 'Cetak Ulang' || value === 'Salah Ruangan') selectClass += " text-warning-700 bg-warning-50 border-warning-200 font-semibold";
    else if (value) selectClass += " text-primary-700 bg-primary-50 border-primary-200 font-semibold";

    return (
        <select
            className={selectClass}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">- Pilih -</option>
            {KONDISI_OPTIONS.map(opt => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
    );
}

// Optimization: Memoize the heavy table row to prevent entire DOM subtree from re-rendering on every keystroke
const AssetRow = React.memo(({ asset, roomIndex, onToggleCheck, onUpdateField }) => {
    const i = asset.originalIndex;
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        if (!asset.barcode) return;
        try {
            await navigator.clipboard.writeText(asset.barcode);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            // Fallback for Android WebView / Unsecured HTTP contexts
            const textArea = document.createElement("textarea");
            textArea.value = asset.barcode;
            // Prevent scrolling to bottom
            textArea.style.position = "fixed";
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (fallbackErr) {
                console.error('Fallback copy failed', fallbackErr);
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <tr className={asset.isChecked ? 'checked' : ''}>
            <td className="col-check">
                <input
                    type="checkbox"
                    className="checkbox-opname"
                    checked={asset.isChecked}
                    onChange={() => onToggleCheck(roomIndex, i)}
                />
            </td>
            <td className="col-no">{asset.no}</td>
            <td className="col-barcode" onClick={handleCopy} style={{ cursor: 'pointer', userSelect: 'none' }} title="Tap untuk copy">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                        color: isCopied ? 'var(--success-600)' : 'var(--blue-700)', 
                        fontWeight: 700, 
                        transition: 'color 0.2s'
                    }}>
                        {asset.barcode}
                    </span>
                    {isCopied && (
                        <span style={{
                            fontSize: '9px',
                            background: 'var(--success-500)',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '999px',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            boxShadow: '0 2px 4px rgba(34,197,94,0.3)'
                        }}>
                            COPIED
                        </span>
                    )}
                </div>
            </td>
            <td className="col-nama">{asset.namaAset}</td>
            <td className="col-po">{asset.noPO}</td>
            <td className="col-tipe">{asset.tipe}</td>
            <td className="col-bulan" style={{ whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--neutral-600)' }}>
                {asset.bulanPerolehan && asset.tahunPerolehan
                    ? `${String(asset.bulanPerolehan).padStart(2, '0')}/${asset.tahunPerolehan}`
                    : asset.bulanPerolehan || asset.tahunPerolehan || '—'}
            </td>
            <td className="col-input">
                <AdaToggle
                    value={asset.adaTidakAda}
                    onChange={(val) => onUpdateField(roomIndex, i, 'adaTidakAda', val)}
                />
            </td>
            <td className="col-input">
                <KondisiDropdown
                    value={asset.kondisi}
                    onChange={(val) => onUpdateField(roomIndex, i, 'kondisi', val)}
                />
            </td>
            <td className="col-input">
                <input
                    type="text"
                    className="form-input form-input--compact ghost-input"
                    value={asset.keterangan || ''}
                    onChange={(e) => onUpdateField(roomIndex, i, 'keterangan', e.target.value)}
                    placeholder="Keterangan..."
                />
            </td>
        </tr>
    );
}, (prevProps, nextProps) => {
    // Only re-render if vital content actually changed!
    return (
        prevProps.asset.isChecked === nextProps.asset.isChecked &&
        prevProps.asset.adaTidakAda === nextProps.asset.adaTidakAda &&
        prevProps.asset.kondisi === nextProps.asset.kondisi &&
        prevProps.asset.keterangan === nextProps.asset.keterangan
    );
});

export default function AssetTable({ assets, roomIndex, onToggleCheck, onUpdateField, masterDb, onAutofill, searchQuery = '' }) {

    // --- Pagination State ---
    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page whenever room changes or search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [roomIndex, searchQuery]);

    const filteredAssets = useMemo(() => {
        const mappedAssets = assets.map((a, i) => ({ ...a, originalIndex: i }));
        if (!searchQuery) return mappedAssets;

        const lowerQ = searchQuery.toLowerCase();
        return mappedAssets.filter(a => (a.barcode || '').toLowerCase().includes(lowerQ));
    }, [assets, searchQuery]);

    const handleBarcodeBlur = (i, barcode) => {
        if (!masterDb || !barcode || !onAutofill) return;
        const data = masterDb.get(barcode.trim());
        if (data) {
            onAutofill(roomIndex, i, data);
        }
    };

    // --- Slicing for Pagination ---
    const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE);

    // Safety check if current page goes out of bounds
    const safePage = Math.min(currentPage, totalPages > 0 ? totalPages : 1);

    const paginatedAssets = useMemo(() => {
        const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
        return filteredAssets.slice(startIndex, Math.min(startIndex + ITEMS_PER_PAGE, filteredAssets.length));
    }, [filteredAssets, safePage]);

    return (
        <div className="asset-table-wrapper">
            <table className="asset-table">
                <thead>
                    <tr>
                        <th className="col-check" style={{ color: '#ffffff' }}>✓</th>
                        <th className="col-no" style={{ color: '#ffffff' }}>NO</th>
                        <th className="col-barcode" style={{ minWidth: 140, color: '#ffffff' }}>BARCODE</th>
                        <th className="col-nama" style={{ minWidth: 140, color: '#ffffff' }}>NAMA ASET</th>
                        <th className="col-po" style={{ minWidth: 70, color: '#ffffff' }}>NO. PO</th>
                        <th className="col-tipe" style={{ minWidth: 50, color: '#ffffff' }}>TIPE</th>
                        <th className="col-bulan" style={{ minWidth: 54, color: '#ffffff' }}>PRL</th>
                        <th className="col-input" style={{ minWidth: 90, color: '#ffffff' }}>ADA/TDK</th>
                        <th className="col-input" style={{ minWidth: 100, color: '#ffffff' }}>KONDISI</th>
                        <th className="col-input" style={{ minWidth: 120, color: '#ffffff' }}>KETERANGAN</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedAssets.map((asset) => (
                        <AssetRow
                            key={asset.id}
                            asset={asset}
                            roomIndex={roomIndex}
                            onToggleCheck={onToggleCheck}
                            onUpdateField={onUpdateField}
                        />
                    ))}
                    {filteredAssets.length === 0 && (
                        <tr>
                            <td colSpan={10} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--neutral-400)' }}>
                                {searchQuery ? 'Tidak ada barcode yang cocok dengan pencarian.' : 'Belum ada data.'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', borderTop: '1px solid var(--neutral-200)', background: 'var(--neutral-50)' }}>
                    <button
                        className="btn btn--outline btn--icon"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        title="Halaman Sebelumnya"
                        style={{ height: 36, width: 36, padding: 0 }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neutral-600)' }}>
                        Hal {safePage} dari {totalPages}
                    </span>
                    <button
                        className="btn btn--outline btn--icon"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        title="Halaman Berikutnya"
                        style={{ height: 36, width: 36, padding: 0 }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ===== EDITABLE TABLE (No Barcode / Not at Location) =====
export function EditableAssetTable({
    assets,
    roomIndex,
    onUpdate,
    onRemove,
    sectionType,
    masterDb,
    onCrossRoomCheck,
}) {

    const handleBarcodeBlur = (i, barcode) => {
        if (!masterDb || !barcode || sectionType === 'noBarcode') return;
        const data = masterDb.get(barcode.trim());
        if (data) {
            // Auto-fill fields from database
            onUpdate(roomIndex, i, 'namaAset', data.namaAset || '');
            onUpdate(roomIndex, i, 'noPO', data.noPO || '');
            onUpdate(roomIndex, i, 'tipe', data.tipe || '');
            onUpdate(roomIndex, i, 'bulanPerolehan', data.bulanPerolehan || '');
            onUpdate(roomIndex, i, 'tahunPerolehan', data.tahunPerolehan || '');
        }
        // Cross-room auto-check: mark this barcode in its original room
        if (sectionType === 'notAtLocation' && onCrossRoomCheck) {
            onCrossRoomCheck(barcode.trim());
        }
    };

    return (
        <div className="asset-table-wrapper">
            <table className="asset-table">
                <thead>
                    <tr>
                        <th style={{ width: 34, minWidth: 34, color: '#ffffff' }}>#</th>
                        <th className="col-barcode" style={{ minWidth: 140, width: 140, color: '#ffffff' }}>BARCODE</th>
                        <th className="col-nama" style={{ minWidth: 150, color: '#ffffff' }}>NAMA ASET *</th>
                        <th className="col-po" style={{ minWidth: 70, color: '#ffffff' }}>NO. PO</th>
                        <th className="col-tipe" style={{ minWidth: 50, color: '#ffffff' }}>TIPE</th>
                        <th style={{ minWidth: 54, color: '#ffffff' }}>PRL</th>
                        <th className="col-input" style={{ minWidth: 90, color: '#ffffff' }}>ADA/TDK</th>
                        <th className="col-input" style={{ minWidth: 180, color: '#ffffff' }}>KONDISI</th>
                        <th className="col-input" style={{ minWidth: 140, color: '#ffffff' }}>KETERANGAN</th>
                        <th style={{ width: 34, minWidth: 34, color: '#ffffff' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map((asset, i) => (
                        <tr key={asset.id} className="editable-row">
                            <td className="col-no" style={{ textAlign: 'center', color: 'var(--neutral-400)' }}>{i + 1}</td>
                            <td className="col-barcode" style={{ minWidth: 140, width: 140 }}>
                                {sectionType === 'noBarcode' ? (
                                    <span style={{ color: 'var(--neutral-400)', fontSize: 'var(--font-size-xs)' }}>(NO BARCODE)</span>
                                ) : (
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="form-input form-input--compact ghost-input"
                                        value={asset.barcode}
                                        onChange={(e) => onUpdate(roomIndex, i, 'barcode', e.target.value)}
                                        onBlur={(e) => handleBarcodeBlur(i, e.target.value)}
                                        placeholder="Ketik barcode..."
                                        style={{ fontFamily: "'Courier New', monospace", fontWeight: 600, minWidth: '100%' }}
                                    />
                                )}
                            </td>
                            <td className="col-nama">
                                <input
                                    type="text"
                                    className="form-input form-input--compact ghost-input"
                                    value={asset.namaAset}
                                    onChange={(e) => onUpdate(roomIndex, i, 'namaAset', e.target.value)}
                                    placeholder="Nama aset *"
                                    required
                                    style={{ minWidth: 140 }}
                                />
                            </td>
                            <td className="col-po">
                                <input
                                    type="text"
                                    className="form-input form-input--compact ghost-input"
                                    value={asset.noPO}
                                    onChange={(e) => onUpdate(roomIndex, i, 'noPO', e.target.value)}
                                    placeholder="Opsional"
                                />
                            </td>
                            <td className="col-tipe">
                                <input
                                    type="text"
                                    className="form-input form-input--compact ghost-input"
                                    value={asset.tipe}
                                    onChange={(e) => onUpdate(roomIndex, i, 'tipe', e.target.value)}
                                    placeholder="Opsional"
                                />
                            </td>
                            <td className="col-bulan" style={{ whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        className="form-input form-input--compact ghost-input"
                                        value={asset.bulanPerolehan}
                                        onChange={(e) => onUpdate(roomIndex, i, 'bulanPerolehan', e.target.value)}
                                        placeholder="MM"
                                        style={{ width: 36, textAlign: 'center', fontSize: '11px' }}
                                    />
                                    <span style={{ color: 'var(--neutral-400)', fontSize: '11px' }}>/</span>
                                    <input
                                        type="text"
                                        className="form-input form-input--compact ghost-input"
                                        value={asset.tahunPerolehan}
                                        onChange={(e) => onUpdate(roomIndex, i, 'tahunPerolehan', e.target.value)}
                                        placeholder="YYYY"
                                        style={{ width: 46, textAlign: 'center', fontSize: '11px' }}
                                    />
                                </div>
                            </td>
                            <td className="col-input">
                                <AdaToggle
                                    value={asset.adaTidakAda}
                                    onChange={(val) => onUpdate(roomIndex, i, 'adaTidakAda', val)}
                                />
                            </td>
                            <td className="col-input">
                                <KondisiDropdown
                                    value={asset.kondisi}
                                    onChange={(val) => onUpdate(roomIndex, i, 'kondisi', val)}
                                />
                            </td>
                            <td className="col-input">
                                <input
                                    type="text"
                                    className="form-input form-input--compact ghost-input"
                                    value={asset.keterangan}
                                    onChange={(e) => onUpdate(roomIndex, i, 'keterangan', e.target.value)}
                                    placeholder="Keterangan..."
                                />
                            </td>
                            <td>
                                <button
                                    className="btn btn--ghost btn--icon btn--sm"
                                    onClick={() => onRemove(roomIndex, i)}
                                    title="Hapus baris"
                                >
                                    <Trash2 size={14} color="var(--danger-500)" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {assets.length === 0 && (
                        <tr>
                            <td colSpan={10} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--neutral-400)' }}>
                                Belum ada data. Klik tombol tambah di atas.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
