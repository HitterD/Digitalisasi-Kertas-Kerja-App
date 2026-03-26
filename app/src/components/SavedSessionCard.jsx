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
        <div className="card mb-3">
            <div className="card__header">
                <div className="card__title">
                    <Package size={20} />
                    Opname Tersimpan
                </div>
                <span className="badge badge--info">{state.rooms.length} ruangan</span>
            </div>
            <p className="text-sm text-secondary mb-3">
                File: <strong>{state.fileName}</strong> — Data opname sebelumnya masih tersimpan.
            </p>
            <div className="flex-row--gap-sm" style={{ display: 'flex' }}>
                <button className="btn btn--outline btn--lg" onClick={handleContinue}>
                    <ArrowRight size={18} />
                    Lanjutkan Opname
                </button>
            </div>
        </div>
    );
}
