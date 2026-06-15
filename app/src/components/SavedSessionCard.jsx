import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpname } from '../store/OpnameContext';
import { Package, ArrowRight } from 'lucide-react';

/**
 * SavedSessionCard — Shows when a previous opname session exists.
 */
export default function SavedSessionCard() {
    const navigate = useNavigate();
    const { state } = useOpname();

    const handleContinue = useCallback(() => {
        if (state.rooms.length > 0) {
            navigate('/app1/opname');
        }
    }, [state.rooms, navigate]);

    if (state.rooms.length === 0) return null;

    return (
        <div className="wa-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div className="wa-icon-wrap" style={{ background: 'rgba(26,26,26,0.06)' }}>
                    <Package size={20} color="var(--charcoal-900)" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal-900)' }}>Opname Tersimpan</div>
                    <div style={{ fontSize: 11.5, color: 'var(--charcoal-500)', marginTop: 3 }}>Lanjutkan sesi opname sebelumnya dari lokal.</div>
                </div>
                <div className="wa-status">{state.rooms.length} RUANGAN</div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--charcoal-600)', marginBottom: 14, marginTop: 0 }}>
                File: <strong>{state.fileName}</strong> — Data opname sebelumnya masih tersimpan.
            </p>
            <button className="wa-btn" onClick={handleContinue} style={{ width: '100%' }}>
                <ArrowRight size={14} /> Lanjutkan Opname
            </button>
        </div>
    );
}
