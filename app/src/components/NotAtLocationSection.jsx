import { MapPin, Plus } from 'lucide-react';
import { EditableAssetTable } from './AssetTable';

export default function NotAtLocationSection({ room, roomIdx, addNotAtLocationAsset, updateNotAtLocationAsset, removeNotAtLocationAsset, masterDb, onCrossRoomCheck }) {
    return (
        <>
            <div className="section-header" style={{ borderBottom: '1px solid var(--neutral-200)', paddingBottom: 'var(--space-2)' }}>
                <div className="section-header__title" style={{ color: 'var(--neutral-700)' }}>
                    <MapPin size={18} className="text-danger-500" />
                    Asset Tidak Ada di Lokasi (Salah Ruangan)
                    {room.notAtLocationAssets.length > 0 && (
                        <span className="badge badge--danger ml-2">{room.notAtLocationAssets.length}</span>
                    )}
                </div>
                <button className="btn btn--outline btn--sm text-danger-600" style={{ borderColor: 'var(--danger-200)' }} onClick={() => addNotAtLocationAsset(roomIdx, room.meta.roomName)}>
                    <Plus size={14} />
                    Tambah
                </button>
            </div>
            <div className="card card--no-hover p-3">
                <EditableAssetTable
                    assets={room.notAtLocationAssets}
                    roomIndex={roomIdx}
                    onUpdate={updateNotAtLocationAsset}
                    onRemove={removeNotAtLocationAsset}
                    sectionType="notAtLocation"
                    masterDb={masterDb}
                    onCrossRoomCheck={onCrossRoomCheck}
                />
            </div>
        </>
    );
}
