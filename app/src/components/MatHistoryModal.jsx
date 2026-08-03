import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    const [approvalTemplates, setApprovalTemplates] = useState([]);
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
                setApprovalTemplates(res.approvalTemplates || []);
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

    const modalContent = (
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
                        <div className="mhm-timeline-container">
                            {data.map((item, idx) => {
                                const isActive = !INACTIVE_STATUSES.includes((item.STATUS || '').toUpperCase());
                                const isCompleted = (item.STATUS || '').toUpperCase() === 'COMPLETED';
                                const isRejected = (item.STATUS || '').toUpperCase() === 'REJECTED';

                                const steps = [];

                                // 1. Dibuat (Pembuat)
                                steps.push({
                                    id: 'step-maker',
                                    title: `Dibuat (Ruang ${item.ASAL_RUANGAN_ID || '-'})`,
                                    subtitle: item.ASAL_RUANGAN_NAME || '-',
                                    description: `Pembuat: ${item.NAME_MAKER || '-'}`,
                                    date: item.CREATED_DATE,
                                    status: 'done',
                                    icon: '✓'
                                });

                                // Get templates for this JENIS_MAT and DEPT
                                const matJenis = (item.JENIS_MAT || '').trim().toUpperCase();
                                const matDept = (item.DEPT || '').trim().toUpperCase();

                                const templates = approvalTemplates.filter(t => 
                                    (t.JENIS_MAT || '').trim().toUpperCase() === matJenis && 
                                    (t.DEPT || '').trim().toUpperCase().includes(matDept)
                                ).sort((a, b) => a.STEP_APPROVAL - b.STEP_APPROVAL);

                                const completedSteps = item.approvalSteps || [];

                                if (templates.length > 0) {
                                    let cIndex = 0;
                                    let activeConsumed = false;

                                    templates.forEach((tmplStep, tIdx) => {
                                        const cStep = completedSteps[cIndex];

                                        if (cStep) {
                                            const stepRejected = (cStep.STATUS || '').toUpperCase() === 'REJECTED';
                                            steps.push({
                                                id: `step-appr-${tIdx}`,
                                                title: `Verifikasi oleh ${cStep.VERIFIED_BY || '-'}`,
                                                subtitle: `Role: ${tmplStep.ROLE || cStep.NEXT_ROLE || '-'}`,
                                                description: cStep.NOTE ? `Catatan: ${cStep.NOTE}` : '',
                                                date: cStep.VERIFIED_DATE,
                                                status: stepRejected ? 'rejected' : 'done',
                                                icon: stepRejected ? '✕' : '✓'
                                            });
                                            cIndex++;
                                        } else {
                                            const isNextStep = (cIndex === completedSteps.length) && !activeConsumed;

                                            if (isNextStep && isActive) {
                                                steps.push({
                                                    id: `step-active-${tIdx}`,
                                                    title: `Menunggu Approval ${item.NEXT_ROLE_VERIFICATOR || tmplStep.ROLE || '-'}`,
                                                    subtitle: `Oleh: ${item.NEXT_VERIFICATOR || '-'}`,
                                                    description: item.PENJELASAN ? `Penjelasan: ${item.PENJELASAN}` : '',
                                                    date: null,
                                                    status: 'active',
                                                    icon: (tIdx + 1).toString()
                                                });
                                                activeConsumed = true;
                                            } else if (!isCompleted && !isRejected) {
                                                steps.push({
                                                    id: `step-pending-${tIdx}`,
                                                    title: `Menunggu Approval ${tmplStep.ROLE || '-'}`,
                                                    subtitle: '',
                                                    description: '',
                                                    date: null,
                                                    status: 'pending',
                                                    icon: (tIdx + 1).toString()
                                                });
                                            }
                                        }
                                    });

                                    // Fallback for trailing completed steps
                                    while (cIndex < completedSteps.length) {
                                        const cStep = completedSteps[cIndex];
                                        const stepRejected = (cStep.STATUS || '').toUpperCase() === 'REJECTED';
                                        steps.push({
                                            id: `step-appr-fb-${cIndex}`,
                                            title: `Verifikasi oleh ${cStep.VERIFIED_BY || '-'}`,
                                            subtitle: `Role: ${cStep.NEXT_ROLE || '-'}`,
                                            description: cStep.NOTE ? `Catatan: ${cStep.NOTE}` : '',
                                            date: cStep.VERIFIED_DATE,
                                            status: stepRejected ? 'rejected' : 'done',
                                            icon: stepRejected ? '✕' : '✓'
                                        });
                                        cIndex++;
                                    }

                                    // Fallback for trailing active step
                                    if (isActive && !activeConsumed) {
                                        steps.push({
                                            id: `step-active-fb`,
                                            title: `Menunggu Approval ${item.NEXT_ROLE_VERIFICATOR || '-'}`,
                                            subtitle: `Oleh: ${item.NEXT_VERIFICATOR || '-'}`,
                                            description: item.PENJELASAN ? `Penjelasan: ${item.PENJELASAN}` : '',
                                            date: null,
                                            status: 'active',
                                            icon: (steps.length).toString()
                                        });
                                    }
                                } else {
                                    // Fallback if no templates found
                                    completedSteps.forEach((step, sIdx) => {
                                        const stepRejected = (step.STATUS || '').toUpperCase() === 'REJECTED';
                                        steps.push({
                                            id: `step-appr-fb-${sIdx}`,
                                            title: `Verifikasi oleh ${step.VERIFIED_BY || '-'}`,
                                            subtitle: `Role: ${step.NEXT_ROLE || '-'}`,
                                            description: step.NOTE ? `Catatan: ${step.NOTE}` : '',
                                            date: step.VERIFIED_DATE,
                                            status: stepRejected ? 'rejected' : 'done',
                                            icon: stepRejected ? '✕' : '✓'
                                        });
                                    });

                                    if (isActive) {
                                        steps.push({
                                            id: 'step-active-fb',
                                            title: `Menunggu Approval ${item.NEXT_ROLE_VERIFICATOR || '-'}`,
                                            subtitle: `Oleh: ${item.NEXT_VERIFICATOR || '-'}`,
                                            description: item.PENJELASAN ? `Penjelasan: ${item.PENJELASAN}` : '',
                                            date: null,
                                            status: 'active',
                                            icon: (completedSteps.length + 1).toString()
                                        });
                                    }
                                }

                                // 4. Diterima (Tujuan)
                                steps.push({
                                    id: 'step-dest',
                                    title: `Diterima (Ruang ${item.TUJUAN_RUANGAN_ID || '-'})`,
                                    subtitle: item.TUJUAN_RUANGAN_NAME || '-',
                                    description: '',
                                    date: null,
                                    status: isCompleted ? 'done' : (isActive ? 'pending' : 'rejected'),
                                    icon: isCompleted ? '✓' : (isRejected ? '✕' : '')
                                });

                                return (
                                    <div key={item.TRXID ?? idx} className="mhm-transaction-block">
                                        <div className="mhm-trx-header">
                                            <div className="mhm-trx-info">
                                                <div className="mhm-trx-date">{formatDate(item.CREATED_DATE)}</div>
                                                <div className="mhm-trx-no">{item.NO_MAT || '-'}</div>
                                            </div>
                                            <div className={`mhm-status-badge ${getStatusClass(item.STATUS)}`}>
                                                {item.STATUS || '-'}
                                            </div>
                                        </div>

                                        <div className="mhm-steps">
                                            <div className="mhm-steps-line" />
                                            {steps.map((step, sIdx) => {
                                                const isLast = sIdx === steps.length - 1;
                                                return (
                                                    <div key={step.id} className={`mhm-step mhm-step-${step.status}`}>
                                                        <div className="mhm-step-icon">
                                                            {step.icon}
                                                        </div>
                                                        <div className="mhm-step-content">
                                                            <div className="mhm-step-title">{step.title}</div>
                                                            {step.subtitle && <div className="mhm-step-subtitle">{step.subtitle}</div>}
                                                            {step.description && (
                                                                <div className="mhm-step-desc">
                                                                    {step.description}
                                                                </div>
                                                            )}
                                                            {step.date && <div className="mhm-step-date">{formatDate(step.date)}</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
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

    return createPortal(modalContent, document.body);
}