import { PenTool, Plus, Minus } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { normalizeSignatures, addSignatureColumn, removeSignatureColumn, MAX_SIGNATURE_COLUMNS, MIN_SIGNATURE_COLUMNS } from '../utils/signatures';

export default function SignatureSection({ room, roomIdx, onUpdateSignatures }) {
    const signatures = normalizeSignatures(room.signatures);
    
    const handleAdd = () => {
        onUpdateSignatures(roomIdx, addSignatureColumn(signatures));
    };
    
    const handleRemove = () => {
        onUpdateSignatures(roomIdx, removeSignatureColumn(signatures));
    };
    
    const handleUpdateItem = (index, updatedItem) => {
        const newSigs = [...signatures];
        newSigs[index] = { ...updatedItem, updatedAt: new Date().toISOString() };
        onUpdateSignatures(roomIdx, newSigs);
    };

    return (
        <div className="wa-section">
            <div className="wa-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="wa-icon-wrap">
                        <PenTool size={18} color="var(--terracotta-500)" />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--charcoal-900)' }}>
                        Tanda Tangan &amp; Nama Terang
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--charcoal-500)' }}>
                        {signatures.length}/4 kolom aktif · minimal 2
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                        className="wa-btn" 
                        style={{ 
                            background: 'var(--neutral-50)', 
                            color: 'var(--charcoal-600)', 
                            border: '1px solid var(--border)',
                            boxShadow: 'none',
                            opacity: signatures.length <= MIN_SIGNATURE_COLUMNS ? 0.5 : 1
                        }}
                        onClick={handleRemove} 
                        disabled={signatures.length <= MIN_SIGNATURE_COLUMNS}
                    >
                        <Minus size={14} /> Kurangi
                    </button>
                    <button 
                        className="wa-btn" 
                        style={{ 
                            background: 'rgba(239, 108, 0, 0.1)', 
                            color: 'var(--terracotta-600)', 
                            border: '1px solid rgba(239, 108, 0, 0.2)',
                            boxShadow: 'none',
                            opacity: signatures.length >= MAX_SIGNATURE_COLUMNS ? 0.5 : 1
                        }}
                        onClick={handleAdd} 
                        disabled={signatures.length >= MAX_SIGNATURE_COLUMNS}
                    >
                        <Plus size={14} /> Tambah PIC
                    </button>
                </div>
            </div>
            <div
                key={`sigs-${roomIdx}`}
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${signatures.length}, minmax(0, 1fr))`,
                    gap: 14,
                    padding: '0 22px 18px',
                }}
                className={`signature-section signature-section--${signatures.length}`}
            >
                {signatures.map((item, idx) => (
                    <div key={item.id || idx} className="wa-card" style={{ padding: 16 }}>
                        <SignaturePad
                            item={item}
                            onUpdate={(updated) => handleUpdateItem(idx, updated)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
