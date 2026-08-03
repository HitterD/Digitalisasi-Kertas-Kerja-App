import { MapPin, Plus } from 'lucide-react';
import { EditableAssetTable } from './AssetTable';

export default function NotAtLocationSection({ room, roomIdx, addNotAtLocationAsset, updateNotAtLocationAsset, removeNotAtLocationAsset, masterDb, onCrossRoomCheck }) {
    const count = room.notAtLocationAssets.length;
    return (
        <div className="wa-section">
            <div className="wa-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="wa-icon-wrap">
                        <MapPin size={18} color="var(--danger-500)" />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--charcoal-900)' }}>
                        Aset Tidak Ada di Lokasi (Salah Ruangan)
                    </div>
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '4px 10px', borderRadius: 999, background: 'rgba(220,38,38,0.12)', color: 'var(--danger-500)'
                    }}>
                        {count} ITEM
                    </span>
                </div>
            </div>
            <div style={{ padding: '0 12px 12px' }}>
                <EditableAssetTable
                    assets={room.notAtLocationAssets}
                    roomIndex={roomIdx}
                    onUpdate={updateNotAtLocationAsset}
                    onRemove={removeNotAtLocationAsset}
                    sectionType="notAtLocation"
                    masterDb={masterDb}
                    onCrossRoomCheck={(barcode) => onCrossRoomCheck && onCrossRoomCheck(barcode)}
                    onAdd={() => addNotAtLocationAsset(roomIdx, room.meta.roomName)}
                />
            </div>
        </div>
    );
}
