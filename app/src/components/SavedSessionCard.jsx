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
        <div className="app1-home__panel">
            <div className="app1-home__panel-header">
                <div>
                    <p className="app1-home__label">Sesi Lokal</p>
                    <h2 className="app1-home__panel-title">Opname Tersimpan</h2>
                </div>
                <div className="app1-home__badge app1-home__badge--success">
                    {state.rooms.length} RUANGAN
                </div>
            </div>
            <p className="app1-home__text">
                File: <strong style={{ color: 'var(--text-primary)' }}>{state.fileName}</strong> — Data opname sebelumnya masih tersimpan.
            </p>
            <div className="app1-home__actions" style={{ marginTop: 16 }}>
                <button className="app1-home__button app1-home__button--secondary" onClick={handleContinue} style={{ width: '100%' }}>
                    Lanjutkan Sesi <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}
