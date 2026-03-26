import { PenTool } from 'lucide-react';
import SignaturePad from './SignaturePad';

export default function SignatureSection({ room, roomIdx, handleSaveSig, handleSaveName }) {
    return (
        <div className="card card--no-hover mt-6">
            <div className="card__header">
                <div className="card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PenTool size={18} /> Tanda Tangan & Nama Terang
                </div>
            </div>
            <div className="signature-section signature-section--three" key={`sigs-${roomIdx}`}>
                <SignaturePad
                    label="PETUGAS OPNAME 1"
                    onSave={(data) => handleSaveSig('petugasOpname1', data)}
                    onNameChange={(name) => handleSaveName('petugasOpname1', name)}
                    initialData={room.signatures?.petugasOpname1}
                    initialName={room.signatures?.petugasOpname1Name}
                />
                <SignaturePad
                    label="PETUGAS OPNAME 2"
                    onSave={(data) => handleSaveSig('petugasOpname2', data)}
                    onNameChange={(name) => handleSaveName('petugasOpname2', name)}
                    initialData={room.signatures?.petugasOpname2}
                    initialName={room.signatures?.petugasOpname2Name}
                />
                <SignaturePad
                    label="PIC RUANGAN"
                    onSave={(data) => handleSaveSig('picRuangan', data)}
                    onNameChange={(name) => handleSaveName('picRuangan', name)}
                    initialData={room.signatures?.picRuangan}
                    initialName={room.signatures?.picRuanganName}
                />
            </div>
        </div>
    );
}
