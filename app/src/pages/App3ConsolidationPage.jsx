import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, FileSpreadsheet, Loader2, ArrowRight, Download, Filter, FileWarning, Database, LayoutTemplate, Box, Sparkles } from 'lucide-react';
import '../index.css';

export default function App3ConsolidationPage() {
    const [files, setFiles] = useState({ master: null, exa: null, add: null, inv: null });
    const [bats, setBats] = useState([]);
    const [selectedBats, setSelectedBats] = useState([]);
    const [loadingBats, setLoadingBats] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState(1);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const fileInputRefs = {
        master: useRef(null), exa: useRef(null), add: useRef(null), inv: useRef(null)
    };

    const handleFileChange = (type, file) => {
        if (file) {
            setFiles(prev => ({ ...prev, [type]: file }));
            setErrorMsg('');
        }
    };

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e, type) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(type, e.dataTransfer.files[0]);
        }
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
            const res = await fetch('/api/app3/get-bats', { method: 'POST', headers: { 'Authorization': `Bearer ${token} ` }, body: formData });
            const data = await res.json();
            if (data.status === 'success') { setBats(data.data); setStep(2); }
            else setErrorMsg(data.error || 'Server Processing Error');
        } catch (err) { setErrorMsg('Connection issue: ' + err.message); }
        finally { setLoadingBats(false); }
    };

    const toggleBat = (b) => setSelectedBats(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);

    const processConsolidation = async () => {
        if (selectedBats.length === 0) { setErrorMsg('Harap pilih minimal satu filter target.'); return; }
        setProcessing(true); setErrorMsg('');
        const formData = new FormData();
        Object.entries(files).forEach(([k, v]) => { if (v) formData.append(k, v) });
        formData.append('selected_bats', JSON.stringify(selectedBats));

        try {
            const token = sessionStorage.getItem('jwt') || localStorage.getItem('jwt');
            const res = await fetch('/api/app3/process', { method: 'POST', headers: { 'Authorization': `Bearer ${token} ` }, body: formData });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `Master_Konsolidasi_${selectedBats.join('-')}_${Date.now()}.xlsx`;
                document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
                setSuccessMsg('Konsolidasi selesai. File otomatis terunduh.');
                setErrorMsg('');
                setTimeout(() => setStep(1), 5000);
            } else {
                const data = await res.json(); setErrorMsg(data.error || 'Konsolidasi gagal.');
            }
        } catch (err) { setErrorMsg('Transfer failed: ' + err.message); }
        finally { setProcessing(false); }
    };

    const UploadSlot = ({ type, title, subtitle, icon: Icon }) => {
        const isSet = !!files[type];
        return (
            <div
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={e => handleDrop(e, type)}
                onClick={() => fileInputRefs[type].current.click()}
                style={{
                    border: isSet ? '2px solid var(--success-600)' : '2px dashed var(--charcoal-900)',
                    background: isSet ? 'var(--success-50)' : dragActive ? 'var(--warm-200)' : 'rgba(255, 255, 255, 0.5)',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                    position: 'relative',
                    boxShadow: isSet ? '4px 4px 0px var(--success-600)' : '4px 4px 0px var(--charcoal-900)',
                    transform: dragActive ? 'scale(1.02)' : 'none'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '12px' }}>
                        {isSet ? <CheckCircle2 size={32} color="var(--success-600)" /> : <Icon size={32} color="var(--charcoal-500)" />}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-sora)', fontWeight: 800, fontSize: '16px', color: 'var(--charcoal-900)', margin: '0 0 4px 0' }}>{title}</h3>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isSet ? 'var(--success-700)' : 'var(--charcoal-500)', margin: 0 }}>
                        {isSet ? files[type].name : subtitle}
                    </p>
                </div>
                <input type="file" accept=".xlsx, .xls" ref={fileInputRefs[type]} className="hidden" onChange={(e) => handleFileChange(type, e.target.files[0])} style={{ display: 'none' }} />
            </div>
        );
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            <div className="upload-dashboard-bento" style={{ gap: '24px' }}>

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
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
                                    {bats.map(b => (
                                        <button
                                            key={b}
                                            onClick={() => toggleBat(b)}
                                            style={{
                                                background: selectedBats.includes(b) ? 'var(--charcoal-900)' : '#fff',
                                                color: selectedBats.includes(b) ? 'var(--amber-400)' : 'var(--charcoal-900)',
                                                border: '2px solid var(--charcoal-900)',
                                                padding: '8px 16px',
                                                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px',
                                                boxShadow: selectedBats.includes(b) ? '2px 2px 0px var(--amber-400)' : '4px 4px 0px var(--charcoal-900)',
                                                transform: selectedBats.includes(b) ? 'translate(2px, 2px)' : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.1s'
                                            }}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                    {bats.length === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--charcoal-400)', fontStyle: 'italic' }}>Tidak ada referensi BAT di source file.</span>}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                    <button
                                        onClick={() => setStep(1)}
                                        disabled={processing}
                                        style={{
                                            background: 'transparent', color: 'var(--charcoal-900)',
                                            border: 'none', textDecoration: 'underline',
                                            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px',
                                            cursor: processing ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        ← KEMBALI KE INGESTION
                                    </button>

                                    <button
                                        onClick={processConsolidation}
                                        disabled={processing || selectedBats.length === 0}
                                        style={{
                                            background: 'var(--amber-400)', color: 'var(--charcoal-900)',
                                            border: '2px solid var(--charcoal-900)', borderRadius: '0',
                                            padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '12px',
                                            fontFamily: 'var(--font-sora)', fontWeight: 900, fontSize: '14px',
                                            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                                            transition: 'all 0.1s',
                                            boxShadow: (selectedBats.length === 0) ? 'none' : '6px 6px 0px var(--charcoal-900)',
                                            opacity: (selectedBats.length === 0) ? 0.6 : 1
                                        }}
                                        onMouseOver={e => { if(!processing && selectedBats.length > 0) { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '4px 4px 0px var(--charcoal-900)'; } }}
                                        onMouseOut={e => { if(!processing && selectedBats.length > 0) { e.currentTarget.style.transform = 'translate(0px, 0px)'; e.currentTarget.style.boxShadow = '6px 6px 0px var(--charcoal-900)'; } }}
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                <span>MENYUSUN DATA MASTER...</span>
                                            </>
                                        ) : (
                                            <><Download size={20} strokeWidth={2.5} /> FORMAT & UNDUH SEKARANG</>
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
