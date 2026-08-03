import { Trash2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { fetchActiveMatByBarcodes } from '../utils/matApi';
import MatHistoryModal from './MatHistoryModal';

const KONDISI_OPTIONS = ['Baik', 'Rusak', 'Cetak Ulang', 'Salah Ruangan', 'Pending'];

// KONDISI_CLASS removed in v3 — dead code, replaced by KondisiDropdown dynamic styling

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
        <div className="wa-toggle">
            <button
                type="button"
                className={`wa-toggle-btn ada ${value === 'Ada' ? 'active' : ''}`}
                onClick={() => onChange(value === 'Ada' ? '' : 'Ada')}
            >
                Ada
            </button>
            <button
                type="button"
                className={`wa-toggle-btn tdk ${value === 'Tidak Ada' ? 'active' : ''}`}
                onClick={() => onChange(value === 'Tidak Ada' ? '' : 'Tidak Ada')}
            >
                Tdk
            </button>
        </div>
    );
}

function KondisiDropdown({ value, onChange }) {
    let modifier = "";
    if (value === 'Baik') modifier = "wa-select--success";
    else if (value === 'Rusak') modifier = "wa-select--danger";
    else if (value === 'Cetak Ulang' || value === 'Salah Ruangan') modifier = "wa-select--warning";
    else if (value) modifier = "wa-select--filled";

    return (
        <select
            className={`wa-select ${modifier}`}
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

function MatProcessBadge({ matInfo }) {
    if (!matInfo) return null;

    const matLabel = matInfo.noMat ? `proses MAT · ${matInfo.noMat}` : 'proses MAT';
    const nextLabel = matInfo.nextRoleVerificator || matInfo.nextVerificator;

    return (
        <div style={{ marginTop: 4 }}>
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 7px',
                borderRadius: 999,
                border: '1px solid #bae6fd',
                background: '#e0f2fe',
                color: '#075985',
                fontSize: 9.5,
                fontWeight: 900,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                lineHeight: 1.2,
            }}>
                <span aria-hidden="true">●</span>
                {matLabel}
            </div>
            {nextLabel && (
                <div style={{
                    marginTop: 3,
                    color: 'var(--text-tertiary)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    lineHeight: 1.2,
                }}>
                    next: {nextLabel}
                </div>
            )}
        </div>
    );
}

// Optimization: Memoize the heavy table row to prevent entire DOM subtree from re-rendering on every keystroke
const areAssetPropsEqual = (prevProps, nextProps) => {
    return (
        prevProps.asset.isChecked === nextProps.asset.isChecked &&
        prevProps.asset.adaTidakAda === nextProps.asset.adaTidakAda &&
        prevProps.asset.kondisi === nextProps.asset.kondisi &&
        prevProps.asset.keterangan === nextProps.asset.keterangan &&
        prevProps.matInfo === nextProps.matInfo
    );
};

const AssetRow = React.memo(({ asset, roomIndex, onToggleCheck, onUpdateField, matInfo, onShowMatHistory }) => {
    const i = asset.originalIndex;
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        if (!asset.barcode) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(asset.barcode);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = asset.barcode;
                textArea.style.position = "fixed";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try { document.execCommand('copy'); } catch (err) {}
                document.body.removeChild(textArea);
            }
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    return (
        <tr className={asset.isChecked ? 'checked' : ''}>
            <td className="col-check">
                <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        className="wa-check"
                        checked={asset.isChecked}
                        onChange={() => onToggleCheck(roomIndex, i)}
                    />
                </label>
            </td>
            <td className="col-no">{asset.no}</td>
            <td className="col-barcode" onClick={handleCopy} style={{ cursor: 'pointer', userSelect: 'none' }} title="Tap untuk copy">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                        color: isCopied ? 'var(--success-500)' : 'var(--accent)', 
                        fontWeight: 800, 
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
            <td 
                className="col-nama"
                onClick={() => matInfo && onShowMatHistory({ barcode: asset.barcode, namaAset: asset.namaAset })}
                style={{ cursor: matInfo ? 'pointer' : 'default' }}
                title={matInfo ? "Klik untuk melihat riwayat MAT" : undefined}
            >
                <div style={{ color: matInfo ? 'var(--primary-600)' : 'inherit', textDecoration: matInfo ? 'underline' : 'none', textUnderlineOffset: '2px' }}>
                    {asset.namaAset}
                </div>
                <MatProcessBadge matInfo={matInfo} />
            </td>
            <td className="col-po">{asset.noPO}</td>
            <td className="col-tipe">{asset.tipe}</td>
            <td className="col-bulan" style={{ whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--text-tertiary)' }}>
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
                    className="wa-input"
                    value={asset.keterangan || ''}
                    onChange={(e) => onUpdateField(roomIndex, i, 'keterangan', e.target.value)}
                    placeholder="Keterangan..."
                />
            </td>
        </tr>
    );
}, areAssetPropsEqual);

// Mobile layout component
const AssetCard = React.memo(({ asset, roomIndex, onToggleCheck, onUpdateField, matInfo, onShowMatHistory }) => {
    const i = asset.originalIndex;
    return (
        <div className="wa-card" style={{ padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                    className={`wa-check ${asset.isChecked ? 'on' : ''}`}
                    onClick={() => onToggleCheck(roomIndex, i)}
                    role="checkbox"
                    aria-checked={!!asset.isChecked}
                    tabIndex={0}
                />
                <div 
                    style={{ flex: 1, minWidth: 0, cursor: matInfo ? 'pointer' : 'default' }}
                    onClick={() => matInfo && onShowMatHistory({ barcode: asset.barcode, namaAset: asset.namaAset })}
                >
                    <div className="asset-card-barcode">{asset.barcode}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: matInfo ? 'var(--primary-600)' : 'var(--charcoal-900)', marginTop: 2, lineHeight: 1.3, textDecoration: matInfo ? 'underline' : 'none' }}>
                        {asset.namaAset}
                    </div>
                    <MatProcessBadge matInfo={matInfo} />
                </div>
                <AdaToggle
                    value={asset.adaTidakAda}
                    onChange={(val) => onUpdateField(roomIndex, i, 'adaTidakAda', val)}
                />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <KondisiDropdown
                    value={asset.kondisi}
                    onChange={(val) => onUpdateField(roomIndex, i, 'kondisi', val)}
                />
                <input
                    className="wa-input"
                    style={{ flex: 1, fontSize: 11 }}
                    placeholder="Keterangan…"
                    value={asset.keterangan || ''}
                    onChange={(e) => onUpdateField(roomIndex, i, 'keterangan', e.target.value)}
                />
            </div>
        </div>
    );
}, areAssetPropsEqual);

export default function AssetTable({ assets, roomIndex, onToggleCheck, onUpdateField, masterDb, onAutofill, searchQuery = '' }) {

    // --- Pagination State ---
    const ITEMS_PER_PAGE = 20;
    const [currentPage, setCurrentPage] = useState(1);
    const [activeMatByBarcode, setActiveMatByBarcode] = useState({});
    const [matModalData, setMatModalData] = useState(null);

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

    const visibleBarcodes = useMemo(() => (
        Array.from(new Set(
            paginatedAssets
                .map((asset) => String(asset.barcode || '').trim())
                .filter(Boolean)
        ))
    ), [paginatedAssets]);

    useEffect(() => {
        let cancelled = false;

        if (visibleBarcodes.length === 0) {
            setActiveMatByBarcode({});
            return () => { cancelled = true; };
        }

        fetchActiveMatByBarcodes(visibleBarcodes)
            .then((result) => {
                if (!cancelled) {
                    setActiveMatByBarcode(result?.data || {});
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setActiveMatByBarcode({});
                }
            });

        return () => { cancelled = true; };
    }, [visibleBarcodes]);

    return (
        <div className="asset-table-wrapper">
            <div className="opname-asset-table-wrapper">
                <table className="wa-table">
                <thead>
                    <tr>
                        <th className="col-check">✓</th>
                        <th className="col-no">NO</th>
                        <th className="col-barcode" style={{ minWidth: 140 }}>BARCODE</th>
                        <th className="col-nama" style={{ minWidth: 140 }}>NAMA ASET</th>
                        <th className="col-po" style={{ minWidth: 70 }}>NO. PO</th>
                        <th className="col-tipe" style={{ minWidth: 50 }}>TIPE</th>
                        <th className="col-bulan" style={{ minWidth: 54 }}>PRL</th>
                        <th className="col-input" style={{ minWidth: 90 }}>ADA/TDK</th>
                        <th className="col-input" style={{ minWidth: 100 }}>KONDISI</th>
                        <th className="col-input" style={{ minWidth: 120 }}>KETERANGAN</th>
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
                            matInfo={activeMatByBarcode[String(asset.barcode || '').trim()]}
                            onShowMatHistory={setMatModalData}
                        />
                    ))}
                    {filteredAssets.length === 0 && (
                        <tr>
                            <td colSpan={10} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                                {searchQuery ? 'Tidak ada barcode yang cocok dengan pencarian.' : 'Belum ada data.'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            </div>

            <div className="opname-asset-cards">
                {paginatedAssets.map((asset) => (
                    <AssetCard
                        key={asset.id}
                        asset={asset}
                        roomIndex={roomIndex}
                        onToggleCheck={onToggleCheck}
                        onUpdateField={onUpdateField}
                        matInfo={activeMatByBarcode[String(asset.barcode || '').trim()]}
                        onShowMatHistory={setMatModalData}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', borderTop: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                    <button
                        className="wa-btn-ghost wa-btn-icon"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        title="Halaman Sebelumnya"
                        style={{ height: 36, width: 36, padding: 0 }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                        Hal {safePage} dari {totalPages}
                    </span>
                    <button
                        className="wa-btn-ghost wa-btn-icon"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        title="Halaman Berikutnya"
                        style={{ height: 36, width: 36, padding: 0 }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            <MatHistoryModal
                barcode={matModalData?.barcode}
                namaAset={matModalData?.namaAset}
                isOpen={!!matModalData}
                onClose={() => setMatModalData(null)}
            />
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
    onAdd,
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
            <table className="wa-table">
                <thead>
                    <tr>
                        <th style={{ width: 34, minWidth: 34 }}>#</th>
                        <th className="col-barcode" style={{ minWidth: 140, width: 140 }}>BARCODE</th>
                        <th className="col-nama" style={{ minWidth: 150 }}>NAMA ASET *</th>
                        <th className="col-po" style={{ minWidth: 70 }}>NO. PO</th>
                        <th className="col-tipe" style={{ minWidth: 50 }}>TIPE</th>
                        <th style={{ minWidth: 54 }}>PRL</th>
                        <th className="col-input" style={{ minWidth: 90 }}>ADA/TDK</th>
                        <th className="col-input" style={{ minWidth: 180 }}>KONDISI</th>
                        <th className="col-input" style={{ minWidth: 140 }}>KETERANGAN</th>
                        <th style={{ width: 34, minWidth: 34 }}></th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map((asset, i) => (
                        <tr key={asset.id} className="">
                            <td className="col-no" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td className="col-barcode" style={{ minWidth: 140, width: 140 }}>
                                {sectionType === 'noBarcode' ? (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(NO BARCODE)</span>
                                ) : (
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="wa-input"
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
                                    className="wa-input"
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
                                    className="wa-input"
                                    value={asset.noPO}
                                    onChange={(e) => onUpdate(roomIndex, i, 'noPO', e.target.value)}
                                    placeholder="Opsional"
                                />
                            </td>
                            <td className="col-tipe">
                                <input
                                    type="text"
                                    className="wa-input"
                                    value={asset.tipe}
                                    onChange={(e) => onUpdate(roomIndex, i, 'tipe', e.target.value)}
                                    placeholder="Opsional"
                                />
                            </td>
                            <td className="col-bulan" style={{ whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        className="wa-input"
                                        value={asset.bulanPerolehan}
                                        onChange={(e) => onUpdate(roomIndex, i, 'bulanPerolehan', e.target.value)}
                                        placeholder="MM"
                                        style={{ width: 36, textAlign: 'center', fontSize: '11px' }}
                                    />
                                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>/</span>
                                    <input
                                        type="text"
                                        className="wa-input"
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
                                    className="wa-input"
                                    value={asset.keterangan}
                                    onChange={(e) => onUpdate(roomIndex, i, 'keterangan', e.target.value)}
                                    placeholder="Keterangan..."
                                />
                            </td>
                            <td>
                                <button
                                    className="wa-btn-ghost wa-btn-icon"
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
                            <td colSpan={10} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                                Belum ada data. Klik tombol tambah di bawah.
                            </td>
                        </tr>
                    )}
                    {onAdd && (
                        <tr>
                            <td colSpan={10} style={{ padding: 0 }}>
                                <button
                                    className="wa-btn"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'center',
                                        background: sectionType === 'noBarcode' ? 'rgba(234,179,8,0.08)' : 'rgba(220,38,38,0.05)',
                                        color: sectionType === 'noBarcode' ? 'var(--warning-600)' : 'var(--danger-600)',
                                        border: 'none',
                                        borderTop: sectionType === 'noBarcode' ? '1px dashed rgba(234,179,8,0.4)' : '1px dashed rgba(220,38,38,0.3)',
                                        borderRadius: 0,
                                        boxShadow: 'none',
                                        padding: '12px'
                                    }}
                                    onClick={onAdd}
                                >
                                    <Plus size={16} /> {sectionType === 'noBarcode' ? 'Tambah Aset Tanpa Barcode' : 'Tambah Aset Salah Ruangan'}
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
