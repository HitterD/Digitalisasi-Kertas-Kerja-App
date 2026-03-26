import { useState } from 'react';

const CustomRoomModal = ({ isOpen, onClose, onSubmit, defaultPeriod }) => {
    const [roomName, setRoomName] = useState('');
    const [picName, setPicName] = useState('');
    const [period, setPeriod] = useState(defaultPeriod || '');
    const [area, setArea] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!roomName.trim()) return;
        onSubmit({ roomName, picName, period, area, date: new Date().toLocaleDateString('id-ID') });
        onClose();
        setRoomName('');
        setPicName('');
        setPeriod('');
        setArea('');
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 60, position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontFamily: 'var(--font-sora)', color: 'var(--charcoal-900)' }}>Tambah Ruang Custom</h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Nama Ruangan *</label>
                        <input type="text" className="form-input" value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Contoh: RUANG SERVER EXTERNAL" required autoFocus />
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>PIC Ruangan</label>
                        <input type="text" className="form-input" value={picName} onChange={e => setPicName(e.target.value)} placeholder="Opsional" />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Area / Lokasi</label>
                            <input type="text" className="form-input" value={area} onChange={e => setArea(e.target.value)} placeholder="Opsional" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Periode</label>
                            <input type="text" className="form-input" value={period} onChange={e => setPeriod(e.target.value)} placeholder="Opsional" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                        <button type="button" className="btn btn--ghost" onClick={onClose}>Batal</button>
                        <button type="submit" className="btn btn--primary">Simpan Ruangan</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomRoomModal;
