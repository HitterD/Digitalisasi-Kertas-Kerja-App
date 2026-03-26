import { AlertTriangle, Plus } from 'lucide-react';
import { EditableAssetTable } from './AssetTable';

export default function NoBarcodeSection({ room, roomIdx, addNoBarcodeAsset, updateNoBarcodeAsset, removeNoBarcodeAsset, masterDb }) {
    return (
        <>
            <div className="section-header" style={{ borderBottom: '1px solid var(--neutral-200)', paddingBottom: 'var(--space-2)' }}>
                <div className="section-header__title" style={{ color: 'var(--neutral-700)' }}>
                    <AlertTriangle size={18} className="text-warning-500" />
                    Asset Tanpa Barcode
                    {room.noBarcodeAssets.length > 0 && (
                        <span className="badge badge--warning ml-2">{room.noBarcodeAssets.length}</span>
                    )}
                </div>
                <button className="btn btn--outline btn--sm text-warning-600" style={{ borderColor: 'var(--warning-200)' }} onClick={() => addNoBarcodeAsset(roomIdx)}>
                    <Plus size={14} />
                    Tambah
                </button>
            </div>
            <div className="card card--no-hover p-3">
                <EditableAssetTable
                    assets={room.noBarcodeAssets}
                    roomIndex={roomIdx}
                    onUpdate={updateNoBarcodeAsset}
                    onRemove={removeNoBarcodeAsset}
                    sectionType="noBarcode"
                    masterDb={masterDb}
                />
            </div>
        </>
    );
}
