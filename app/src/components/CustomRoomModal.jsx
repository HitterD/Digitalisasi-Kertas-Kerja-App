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
        <div className="modal-overlay" style={{ zIndex: 60, position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="wa-card" style={{ padding: '24px', width: '100%', maxWidth: '420px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '17px', fontWeight: 700, color: 'var(--charcoal-900)' }}>Tambah Ruang Custom</h3>
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
                        <button type="button" className="wa-btn-ghost" onClick={onClose}>Batal</button>
                        <button type="submit" className="wa-btn wa-btn-terracotta">Simpan Ruangan</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomRoomModal;
