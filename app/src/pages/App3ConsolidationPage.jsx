import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, FileSpreadsheet, Loader2, ArrowRight, Download, Filter, FileWarning, Database, LayoutTemplate, Box, Sparkles } from 'lucide-react';
import '../index.css';

const SLOT_TYPES = ['master', 'exa', 'add', 'inv'];
const VALID_EXT = /\.(xlsx|xls)$/i;

export default function App3ConsolidationPage() {
    const [files, setFiles] = useState({ master: null, exa: null, add: null, inv: null });
    const [dragSlots, setDragSlots] = useState({ master: false, exa: false, add: false, inv: false });
    const [bats, setBats] = useState([]);
    const [selectedBats, setSelectedBats] = useState([]);
    const [loadingBats, setLoadingBats] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState(1);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const fileInputRefs = {
        master: useRef(null), exa: useRef(null), add: useRef(null), inv: useRef(null)
    };
    const dragCounters = useRef({ master: 0, exa: 0, add: 0, inv: 0 });

    const handleFileChange = (type, file) => {
        if (!file) return;
        if (!VALID_EXT.test(file.name)) {
            setErrorMsg(`File ${file.name} harus berformat .xlsx atau .xls`);
            return;
        }
        setFiles(prev => ({ ...prev, [type]: file }));
        setErrorMsg('');
    };

    const handlePickerChange = (type, e) => {
        const file = e.target.files && e.target.files[0];
        handleFileChange(type, file);
        // Reset so picking the same file again still fires onChange
        e.target.value = '';
    };

    const handleDragEnter = (e, type) => {
        e.preventDefault(); e.stopPropagation();
        dragCounters.current[type] += 1;
        if (dragCounters.current[type] === 1) {
            setDragSlots(prev => (prev[type] ? prev : { ...prev, [type]: true }));
        }
    };

    const handleDragLeave = (e, type) => {
        e.preventDefault(); e.stopPropagation();
        dragCounters.current[type] = Math.max(0, dragCounters.current[type] - 1);
        if (dragCounters.current[type] === 0) {
            setDragSlots(prev => (!prev[type] ? prev : { ...prev, [type]: false }));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e, type) => {
        e.preventDefault(); e.stopPropagation();
        dragCounters.current[type] = 0;
        setDragSlots(prev => (!prev[type] ? prev : { ...prev, [type]: false }));
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFileChange(type, file);
    };

    const extractBats = async () => {
        if (!files.exa && !files.add && !files.inv) {
            setErrorMsg('Diperlukan minimal satu source document (EXA / ADD / INV)'); return;
        }
        setLoadingBats(true); setErrorMsg(''); setSuccessMsg('');
        const formData = new FormData();
        Object.entries(files).forEach(([k, v]) => { if (v) formData.append(k, v) });

        try {
            const token = sessionStorage.getItem('jwt') || localStorage.getItem('jwt');
            const res = await fetch('/api/app3/get-bats', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            const data = await res.json();
            if (data.status === 'success') { setBats(data.data); setStep(2); }
            else setErrorMsg(data.error || 'Server Processing Error');
        } catch (err) { setErrorMsg('Connection issue: ' + err.message); }
        finally { setLoadingBats(false); }
    };

    const toggleBat = (b) => setSelectedBats(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);

    const processConsolidation = async () => {
        const effectiveBats = getEffectiveBats();
        if (effectiveBats.length === 0) { setErrorMsg('Harap pilih minimal satu filter target.'); return; }
        setProcessing(true); setErrorMsg('');
        const formData = new FormData();
        Object.entries(files).forEach(([k, v]) => { if (v) formData.append(k, v) });
        formData.append('selected_bats', JSON.stringify(effectiveBats));

        try {
            const token = sessionStorage.getItem('jwt') || localStorage.getItem('jwt');
            const res = await fetch('/api/app3/process', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `Master_Konsolidasi_${selectedBats.join('-')}_${Date.now()}.xlsx`;
                document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
                setSuccessMsg('Konsolidasi selesai. File otomatis terunduh.');
                setErrorMsg('');
                setStep(3);
                setTimeout(() => setStep(1), 5000);
            } else {
                const data = await res.json(); setErrorMsg(data.error || 'Konsolidasi gagal.');
            }
        } catch (err) { setErrorMsg('Transfer failed: ' + err.message); }
        finally { setProcessing(false); }
    };

    const UploadSlot = ({ type, title, subtitle, icon: Icon }) => {
        const isSet = !!files[type];
        const isDrag = !!dragSlots[type];
        return (
            <div
                onDragEnter={e => handleDragEnter(e, type)}
                onDragLeave={e => handleDragLeave(e, type)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, type)}
                onClick={() => fileInputRefs[type].current.click()}
                style={{
                    border: isSet ? '2px solid var(--success-600)' : isDrag ? '2px dashed var(--amber-500)' : '2px dashed var(--charcoal-900)',
                    background: isSet ? 'var(--success-50)' : isDrag ? 'var(--warm-200)' : 'rgba(255, 255, 255, 0.5)',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                    position: 'relative',
                    boxShadow: isSet ? '4px 4px 0px var(--success-600)' : isDrag ? '4px 4px 0px var(--amber-500)' : '4px 4px 0px var(--charcoal-900)',
                    transform: isDrag ? 'scale(1.02)' : 'none'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ marginBottom: '12px' }}>
                        {isSet ? <CheckCircle2 size={32} color="var(--success-600)" /> : <Icon size={32} color="var(--charcoal-500)" />}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-sora)', fontWeight: 800, fontSize: '16px', color: 'var(--charcoal-900)', margin: '0 0 4px 0' }}>{title}</h3>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isSet ? 'var(--success-700)' : 'var(--charcoal-500)', margin: 0 }}>
                        {isSet ? files[type].name : subtitle}
                    </p>
                </div>
                <input
                    type="file"
                    accept=".xlsx,.xls"
                    ref={fileInputRefs[type]}
                    className="hidden"
                    onChange={e => handlePickerChange(type, e)}
                />
            </div>
        );
    };

    const FILTER_CATEGORIES = ['ICT', 'ENG', 'BAT', 'HRGA', 'Kosong'];

    const classifyBat = (b) => {
        if (!b || String(b).trim() === '' || String(b).toLowerCase() === 'nan' || String(b).toLowerCase() === 'none') return 'Kosong';
        const upper = String(b).toUpperCase();
        if (upper.startsWith('ICT')) return 'ICT';
        if (upper.startsWith('ENG')) return 'ENG';
        if (upper.startsWith('HRGA')) return 'HRGA';
        if (upper.startsWith('BAT')) return 'BAT';
        return 'BAT';
    };

    const countByCat = bats.reduce((acc, b) => {
        const cat = classifyBat(b);
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});

    const selectedBatsForCategory = (cat) => bats.filter(b => classifyBat(b) === cat);

    const toggleCategory = (cat) => {
        setSelectedBats(prev => {
            if (prev.includes(cat)) return prev.filter(x => x !== cat);
            return [...prev, cat];
        });
    };

    const getEffectiveBats = () => {
        if (selectedBats.length === 0) return [];
        return selectedBats.flatMap(cat => selectedBatsForCategory(cat));
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            <div className="upload-dashboard-bento" style={{ gap: '24px' }}>

                {/* 3-Step Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
                    <div className="wa-step" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`wa-step-num ${step > 1 ? 'wa-step done' : ''}`} style={step === 1 ? { background: 'var(--charcoal-900)', color: 'var(--cream-surface)' } : step > 1 ? { background: 'var(--success-500)', color: 'var(--cream-surface)' } : {}}>{step > 1 ? '✓' : '1'}</div>
                        <div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Step 1</div>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>Upload 4 File</div>
                        </div>
                    </div>
                    <div className="wa-step-line" style={{ width: 60, height: 2, background: step >= 2 ? 'var(--success-500)' : 'rgba(26,26,26,0.08)', margin: '0 8px', transition: 'background 400ms ease' }} />
                    <div className="wa-step" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`wa-step-num ${step === 2 ? 'active' : ''}`} style={step === 2 ? { background: 'var(--charcoal-900)', color: 'var(--cream-surface)' } : {}}>{step > 2 ? '✓' : '2'}</div>
                        <div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: step === 2 ? 'var(--terracotta-500)' : 'var(--charcoal-400)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>Step 2 {step === 2 ? '· Aktif' : ''}</div>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>Pilih Filter</div>
                        </div>
                    </div>
                    <div className="wa-step-line" style={{ width: 60, height: 2, background: 'rgba(26,26,26,0.08)', margin: '0 8px' }} />
                    <div className="wa-step" style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.55 }}>
                        <div className="wa-step-num" style={{}}>3</div>
                        <div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--charcoal-400)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Step 3</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--charcoal-400)' }}>Generate Excel</div>
                        </div>
                    </div>
                </div>

                {/* Hero Header */}
                <div className="bento-header" style={{ marginBottom: '16px', flexDirection: 'column', alignItems: 'flex-start', borderBottom: '3px solid var(--charcoal-900)', paddingBottom: '24px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
                        background: 'var(--charcoal-900)', color: 'var(--amber-400)',
                        fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px'
                    }}>
                        <Sparkles size={14} /> Data Pipeline Intelligence
                    </div>
                    <h1 className="bento-title" style={{ fontSize: '32px', marginBottom: '12px' }}>
                        Master Data <span style={{ color: 'var(--amber-500)' }}>Consolidation</span>
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--charcoal-500)', maxWidth: '800px', lineHeight: 1.6 }}>
                        Harmonisasi dokumen EXA, ADD, dan INV menjadi satu single source of truth. Mendukung pemecahan smart multi-barcode dan master archiving otomatis.
                    </p>
                </div>

                {successMsg && (
                    <div style={{ background: 'var(--success-50)', border: '2px solid var(--success-600)', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start', boxShadow: '4px 4px 0px var(--success-600)', marginBottom: '24px' }}>
                        <CheckCircle2 color="var(--success-600)" size={20} />
                        <div style={{ fontFamily: 'var(--font-sora)', fontWeight: 600, fontSize: '13px', color: 'var(--success-800)' }}>{successMsg}</div>
                    </div>
                )}
                {errorMsg && (
                    <div style={{ background: 'var(--danger-50)', border: '2px solid var(--danger-600)', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start', boxShadow: '4px 4px 0px var(--danger-600)', marginBottom: '24px' }}>
                        <FileWarning color="var(--danger-600)" size={20} />
                        <div style={{ fontFamily: 'var(--font-sora)', fontWeight: 600, fontSize: '13px', color: 'var(--danger-800)' }}>{errorMsg}</div>
                    </div>
                )}

                {/* Step 1: Document Upload Arena */}
                <div style={{
                    transition: 'all 0.5s',
                    opacity: step === 1 ? 1 : 0.4,
                    filter: step === 1 ? 'none' : 'grayscale(100%)',
                    pointerEvents: step === 1 ? 'auto' : 'none',
                    transform: step === 1 ? 'translateY(0)' : 'translateY(-10px)'
                }}>
                    <div className="editorial-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '2px solid var(--charcoal-900)', background: 'rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '48px', height: '48px', background: 'var(--charcoal-900)', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sora)',
                                fontSize: '20px', fontWeight: 900, border: '2px solid var(--charcoal-900)',
                                boxShadow: '4px 4px 0px var(--amber-400)'
                            }}>1</div>
                            <div>
                                <h2 style={{ fontFamily: 'var(--font-sora)', fontWeight: 900, fontSize: '20px', color: 'var(--charcoal-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pipeline Ingestion</h2>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--charcoal-500)', margin: 0 }}>Unggah file sumber untuk diekstrak filternya.</p>
                            </div>
                        </div>

                        <div style={{ padding: '32px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                                <UploadSlot type="master" icon={Database} title="Master Eksisting" subtitle="Opsional: Kamus Data Master Lama (Arsip)" />
                                <UploadSlot type="exa" icon={LayoutTemplate} title="Sumber EXA" subtitle="Drag & drop file EXA di sini" />
                                <UploadSlot type="add" icon={Box} title="Sumber ADD" subtitle="Drag & drop file ADD di sini" />
                                <UploadSlot type="inv" icon={FileSpreadsheet} title="Sumber INV" subtitle="Drag & drop file INV di sini" />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={extractBats}
                                    disabled={loadingBats || (!files.exa && !files.add && !files.inv)}
                                    style={{
                                        background: 'var(--charcoal-900)', color: 'var(--amber-400)',
                                        border: '2px solid var(--charcoal-900)', borderRadius: '0',
                                        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '12px',
                                        fontFamily: 'var(--font-sora)', fontWeight: 900, fontSize: '14px',
                                        textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                                        transition: 'all 0.1s',
                                        boxShadow: (!files.exa && !files.add && !files.inv) ? 'none' : '6px 6px 0px var(--charcoal-900)',
                                        opacity: (!files.exa && !files.add && !files.inv) ? 0.6 : 1
                                    }}
                                    onMouseOver={e => { if(!loadingBats && (files.exa || files.add || files.inv)) { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '4px 4px 0px var(--charcoal-900)'; } }}
                                    onMouseOut={e => { if(!loadingBats && (files.exa || files.add || files.inv)) { e.currentTarget.style.transform = 'translate(0px, 0px)'; e.currentTarget.style.boxShadow = '6px 6px 0px var(--charcoal-900)'; } }}
                                >
                                    {loadingBats ? (
                                        <><Loader2 size={18} className="animate-spin" /> MENGANALISA...</>
                                    ) : (
                                        <><Filter size={18} strokeWidth={2.5} /> EKSTRAK FILTER KATEGORI <ArrowRight size={18} strokeWidth={2.5} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 2: Intelligent Filter & Process */}
                {step === 2 && (
                    <div style={{ marginTop: '32px' }}>
                        <div className="editorial-glass-card" style={{ padding: 0, overflow: 'hidden', borderColor: 'var(--amber-500)', boxShadow: '8px 8px 0px var(--amber-500)' }}>
                            <div style={{ padding: '24px', borderBottom: '2px solid var(--charcoal-900)', background: 'rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '48px', height: '48px', background: 'var(--amber-500)', color: 'var(--charcoal-900)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sora)',
                                    fontSize: '20px', fontWeight: 900, border: '2px solid var(--charcoal-900)',
                                    boxShadow: '4px 4px 0px var(--charcoal-900)'
                                }}>2</div>
                                <div>
                                    <h2 style={{ fontFamily: 'var(--font-sora)', fontWeight: 900, fontSize: '20px', color: 'var(--charcoal-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Filtrasi & Eksekusi</h2>
                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--charcoal-500)', margin: 0 }}>Pilih BAT dan lakukan konsolidasi akhir.</p>
                                </div>
                            </div>

                            <div style={{ padding: '32px' }}>
                                <div className="wa-card" style={{ padding: '20px', marginBottom: '24px' }}>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--charcoal-400)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>Pilih Kategori Filter</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                                        {FILTER_CATEGORIES.map(cat => {
                                            const isSelected = selectedBats.includes(cat);
                                            const count = countByCat[cat] || 0;
                                            return (
                                                <div
                                                    key={cat}
                                                    onClick={() => toggleCategory(cat)}
                                                    className={isSelected ? 'wa-card selected' : 'wa-card'}
                                                    style={{
                                                        background: isSelected ? 'var(--charcoal-900)' : 'var(--cream-surface)',
                                                        border: isSelected ? '1.5px solid var(--charcoal-900)' : '1.5px solid rgba(26,26,26,0.12)',
                                                        borderRadius: 10,
                                                        padding: '14px 12px',
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        color: isSelected ? 'var(--cream-surface)' : 'var(--charcoal-900)',
                                                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'var(--shadow-md)',
                                                        transition: 'all 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                                                    }}
                                                >
                                                    <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{cat}</div>
                                                    <div style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', background: isSelected ? 'var(--terracotta-500)' : 'rgba(26,26,26,0.06)', color: isSelected ? 'var(--cream-surface)' : 'var(--charcoal-500)', borderRadius: 9999, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>{count}</div>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--charcoal-400)', letterSpacing: '0.08em', marginTop: 6, textTransform: 'uppercase' }}>RECORD</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {bats.length === 0 && (
                                    <div style={{ marginBottom: '24px', padding: '14px 18px', background: 'var(--cream-input)', border: '1px solid rgba(26,26,26,0.08)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-500)', fontStyle: 'italic' }}>
                                        Tidak ada referensi BAT di source file.
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--cream-input)', border: '1px solid rgba(26,26,26,0.08)', borderRadius: 8, marginBottom: '24px', flexWrap: 'wrap' }}>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--charcoal-400)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Live Summary</div>
                                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-500)' }}>Total BAT: <strong style={{ color: 'var(--charcoal-900)' }}>{bats.length}</strong></span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-500)' }}>Selected: <strong style={{ color: 'var(--terracotta-500)' }}>{selectedBats.length}</strong></span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-500)' }}>Effective records: <strong style={{ color: 'var(--charcoal-900)' }}>{getEffectiveBats().length}</strong></span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                    <button
                                        onClick={() => setStep(1)}
                                        disabled={processing}
                                        className="wa-btn-ghost"
                                    >
                                        ← KEMBALI KE INGESTION
                                    </button>

                                    <button
                                        onClick={processConsolidation}
                                        disabled={processing || selectedBats.length === 0}
                                        className="wa-btn-terracotta"
                                        style={{ padding: '14px 28px', fontSize: 12 }}
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                <span>MENYUSUN DATA MASTER...</span>
                                            </>
                                        ) : (
                                            <><Download size={18} strokeWidth={2.5} /> FORMAT & UNDUH SEKARANG</>
                                        )}
                                    </button>
                                </div>

                                {processing && (
                                    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ height: '8px', width: '100%', background: 'var(--charcoal-300)', border: '1px solid var(--charcoal-900)' }}>
                                            <div className="animate-progress origin-left" style={{ height: '100%', background: 'var(--amber-500)', width: '100%' }}></div>
                                        </div>
                                        <p className="animate-pulse" style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--charcoal-600)', fontWeight: 700, textTransform: 'uppercase' }}>
                                            Menjalankan Regex Barcode Parsing & Algoritma Drop Duplicates...
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
