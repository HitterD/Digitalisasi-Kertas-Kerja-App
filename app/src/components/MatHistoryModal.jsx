import { useState, useEffect } from 'react';
import { X, ArrowRight, AlertTriangle } from 'lucide-react';
import { fetchMatHistory } from '../utils/matApi';
import './MatHistoryModal.css';

const INACTIVE_STATUSES = ['COMPLETED', 'REJECTED'];

function getStatusClass(status) {
    const s = (status || '').toUpperCase();
    if (s === 'REJECTED') return 'status-rejected';
    if (INACTIVE_STATUSES.includes(s)) return 'status-done';
    return 'status-active';
}

function formatDate(value) {
    if (!value) return '-';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value).trim();
        const day = d.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
    } catch {
        return String(value).trim();
    }
}

export default function MatHistoryModal({ barcode, namaAset, isOpen, onClose }) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [hasActiveMAT, setHasActiveMAT] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !barcode) return;

        let cancelled = false;
        setLoading(true);
        setData([]);
        setHasActiveMAT(false);
        setError(null);

        fetchMatHistory(barcode)
            .then((res) => {
                if (cancelled) return;
                setData(res.data || []);
                setHasActiveMAT(res.hasActiveMAT || false);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err.message || 'Gagal mengambil data riwayat MAT');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [isOpen, barcode]);

    if (!isOpen) return null;

    return (
        <div className="mhm-overlay" onClick={onClose} role="presentation">
            <div
                className="mhm-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Riwayat MAT Aset"
            >
                {/* Header */}
                <div className="mhm-header">
                    <div className="mhm-header-left">
                        <div className="mhm-title">Riwayat MAT — {namaAset || barcode}</div>
                        <div className="mhm-subtitle">Barcode: {barcode}</div>
                        {hasActiveMAT && (
                            <div className="mhm-badge-active">
                                <AlertTriangle size={11} strokeWidth={2.5} />
                                Proses MAT
                            </div>
                        )}
                    </div>
                    <button
                        className="mhm-close-btn"
                        onClick={onClose}
                        aria-label="Tutup modal riwayat MAT"
                    >
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body */}
                <div className="mhm-body">
                    {loading && (
                        <div className="mhm-loading">
                            <div className="mhm-spinner" />
                            Mengambil riwayat MAT...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="mhm-error">{error}</div>
                    )}

                    {!loading && !error && data.length === 0 && (
                        <div className="mhm-empty">
                            <p>Tidak ada riwayat MAT untuk aset ini.</p>
                        </div>
                    )}

                    {!loading && !error && data.length > 0 && (
                        <div className="mhm-timeline">
                            {data.map((item, idx) => {
                                const isActive = !INACTIVE_STATUSES.includes(
                                    (item.STATUS || '').toUpperCase()
                                );
                                return (
                                    <div key={item.TRXID ?? idx} className="mhm-timeline-item">
                                        <div className="mhm-timeline-left">
                                            <div className={`mhm-dot${isActive ? ' active' : ''}`} />
                                            <div className="mhm-line" />
                                        </div>

                                        <div className="mhm-card">
                                            <div className="mhm-card-header">
                                                <div>
                                                    <div className="mhm-card-date">
                                                        {formatDate(item.CREATED_DATE)}
                                                    </div>
                                                    <div className="mhm-card-no-mat">
                                                        {item.NO_MAT || '-'}
                                                    </div>
                                                </div>
                                                <div className={`mhm-status-badge ${getStatusClass(item.STATUS)}`}>
                                                    {item.STATUS || '-'}
                                                </div>
                                            </div>

                                            <div className="mhm-movement">
                                                <div className="mhm-movement-from">
                                                    <span className="mhm-movement-label">Dari</span>
                                                    {item.ASAL_RUANGAN_ID || '-'}
                                                </div>
                                                <ArrowRight
                                                    className="mhm-movement-arrow"
                                                    size={16}
                                                    strokeWidth={2.5}
                                                />
                                                <div className="mhm-movement-to">
                                                    <span className="mhm-movement-label">Ke</span>
                                                    {item.TUJUAN_RUANGAN_ID || '-'}
                                                </div>
                                            </div>

                                            <div className="mhm-fields">
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">Jenis MAT</span>
                                                    <span className="mhm-field-value">{item.JENIS_MAT || '-'}</span>
                                                </div>
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">LPB</span>
                                                    <span className="mhm-field-value">{item.LPB || '-'}</span>
                                                </div>
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">Kondisi</span>
                                                    <span className="mhm-field-value">{item.KONDISI_ID || '-'}</span>
                                                </div>
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">Dept</span>
                                                    <span className="mhm-field-value">{item.DEPT || '-'}</span>
                                                </div>
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">Pembuat</span>
                                                    <span className="mhm-field-value">{item.NAME_MAKER || '-'}</span>
                                                </div>
                                                <div className="mhm-field">
                                                    <span className="mhm-field-label">Step Approval</span>
                                                    <span className="mhm-field-value">
                                                        {item.COUNTER_NUM != null && item.STEP_APPROVAL != null
                                                            ? `${item.COUNTER_NUM} / ${item.STEP_APPROVAL}`
                                                            : '-'}
                                                    </span>
                                                </div>
                                                <div className="mhm-field full-width">
                                                    <span className="mhm-field-label">Penjelasan</span>
                                                    <span className="mhm-field-value">{item.PENJELASAN || '-'}</span>
                                                </div>
                                                {item.NEXT_VERIFICATOR && (
                                                    <div className="mhm-field full-width">
                                                        <span className="mhm-field-label">Next Verificator</span>
                                                        <span className="mhm-field-value">
                                                            {item.NEXT_VERIFICATOR}
                                                            {item.NEXT_ROLE_VERIFICATOR
                                                                ? ` (${item.NEXT_ROLE_VERIFICATOR})`
                                                                : ''}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mhm-footer">
                    <button className="mhm-btn-close" onClick={onClose}>Tutup</button>
                </div>
            </div>
        </div>
    );
}