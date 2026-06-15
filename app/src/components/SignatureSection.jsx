import { PenTool } from 'lucide-react';
import SignaturePad from './SignaturePad';

export default function SignatureSection({ room, roomIdx, handleSaveSig, handleSaveName }) {
    return (
        <div className="wa-section">
            <div className="wa-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="wa-icon-wrap">
                        <PenTool size={18} color="var(--terracotta-500)" />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--charcoal-900)' }}>
                        Tanda Tangan &amp; Nama Terang
                    </div>
                </div>
            </div>
            <div
                key={`sigs-${roomIdx}`}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 14,
                    padding: '0 22px 18px',
                }}
                className="signature-section signature-section--three"
            >
                <div className="wa-card" style={{ padding: 16 }}>
                    <SignaturePad
                        label="PETUGAS OPNAME 1"
                        onSave={(data) => handleSaveSig('petugasOpname1', data)}
                        onNameChange={(name) => handleSaveName('petugasOpname1', name)}
                        initialData={room.signatures?.petugasOpname1}
                        initialName={room.signatures?.petugasOpname1Name}
                    />
                </div>
                <div className="wa-card" style={{ padding: 16 }}>
                    <SignaturePad
                        label="PETUGAS OPNAME 2"
                        onSave={(data) => handleSaveSig('petugasOpname2', data)}
                        onNameChange={(name) => handleSaveName('petugasOpname2', name)}
                        initialData={room.signatures?.petugasOpname2}
                        initialName={room.signatures?.petugasOpname2Name}
                    />
                </div>
                <div className="wa-card" style={{ padding: 16 }}>
                    <SignaturePad
                        label="PIC RUANGAN"
                        onSave={(data) => handleSaveSig('picRuangan', data)}
                        onNameChange={(name) => handleSaveName('picRuangan', name)}
                        initialData={room.signatures?.picRuangan}
                        initialName={room.signatures?.picRuanganName}
                    />
                </div>
            </div>
        </div>
    );
}
