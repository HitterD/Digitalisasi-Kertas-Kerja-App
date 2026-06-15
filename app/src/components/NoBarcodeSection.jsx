import { AlertCircle, Plus } from 'lucide-react';
import { EditableAssetTable } from './AssetTable';

export default function NoBarcodeSection({ room, roomIdx, addNoBarcodeAsset, updateNoBarcodeAsset, removeNoBarcodeAsset, masterDb }) {
    const count = room.noBarcodeAssets.length;
    return (
        <div className="wa-section">
            <div className="wa-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="wa-icon-wrap">
                        <AlertCircle size={18} color="var(--warning-500)" />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--charcoal-900)' }}>
                        Aset Tanpa Barcode
                    </div>
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '2px 8px', borderRadius: 999, background: 'rgba(234,179,8,0.12)', color: 'var(--warning-500)'
                    }}>
                        {count} ITEM
                    </span>
                </div>
                <button
                    className="wa-btn"
                    style={{ background: 'rgba(234,179,8,0.12)', color: 'var(--warning-500)', boxShadow: 'none' }}
                    onClick={() => addNoBarcodeAsset(roomIdx)}
                >
                    <Plus size={14} /> Tambah
                </button>
            </div>
            <div style={{ padding: '0 12px 12px' }}>
                <EditableAssetTable
                    assets={room.noBarcodeAssets}
                    roomIndex={roomIdx}
                    onUpdate={updateNoBarcodeAsset}
                    onRemove={removeNoBarcodeAsset}
                    sectionType="noBarcode"
                    masterDb={masterDb}
                />
            </div>
        </div>
    );
}
