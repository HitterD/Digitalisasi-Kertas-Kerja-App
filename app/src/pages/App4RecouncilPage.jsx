import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, FileSpreadsheet, Loader2, ArrowRight, Download, FileWarning, Database, Sparkles, Activity, Table2 } from 'lucide-react';
import '../index.css';

export default function App4RecouncilPage() {
    // files.opname is array; files.master and files.aspx are single files
    const [files, setFiles] = useState({ opname: [], master: null, aspx: null });
    const [processing, setProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [dragActive, setDragActive] = useState({ opname: false, master: false, aspx: false });

    const fileInputRefs = {
        opname: useRef(null), master: useRef(null), aspx: useRef(null)
    };

    const handleFileChange = (type, newFiles) => {
        if (!newFiles) return;
        if (type === 'opname') {
            const fileArray = Array.from(newFiles);
            if (fileArray.length > 0) {
                setFiles(prev => ({ ...prev, opname: fileArray }));
            }
        } else {
            const singleFile = newFiles instanceof FileList ? newFiles[0] : newFiles;
            if (singleFile) {
                setFiles(prev => ({ ...prev, [type]: singleFile }));
            }
        }
        setErrorMsg('');
    };

    const handleDrag = (e, type) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(prev => ({ ...prev, [type]: true }));
        } else if (e.type === "dragleave") {
            setDragActive(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleDrop = (e, type) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(prev => ({ ...prev, [type]: false }));
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(type, e.dataTransfer.files);
        }
    };

    const processRecouncil = async () => {
        if (!files.opname || files.opname.length === 0 || !files.master) {
            setErrorMsg('Harap unggah minimal 1 file Hasil Opname (App2) dan 1 Master Data (App3).');
            return;
        }

        setProcessing(true);
        setErrorMsg('');
        setSuccessMsg('');

        const formData = new FormData();
        files.opname.forEach(file => formData.append('opname', file));
        formData.append('master', files.master);
        // ASPxGridView1 opsional
        if (files.aspx) {
            formData.append('aspx', files.aspx);
        }

        try {
            const token = sessionStorage.getItem('jwt') || localStorage.getItem('jwt');
            const res = await fetch('/api/app4/process', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const contentDisposition = res.headers.get('Content-Disposition');
                let filename = `Recouncil_Result_${Date.now()}.xlsx`;
                if (contentDisposition && contentDisposition.includes('filename=')) {
                    filename = contentDisposition.split('filename=')[1].replace(/['"]/g, '');
                } else if (files.opname.length > 1) {
                    filename = `Recouncil_Result_${Date.now()}.zip`;
                }

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();

                setSuccessMsg('Konsolidasi Recouncil selesai. File otomatis terunduh.');
                setErrorMsg('');
                setFiles({ opname: [], master: null, aspx: null });
            } else {
                const data = await res.json();
                setErrorMsg(data.error || 'Proses Recouncil gagal.');
            }
        } catch (err) {
            setErrorMsg('Transfer failed: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const UploadSlot = ({ type, title, subtitle, icon: Icon, multiple = false, optional = false }) => {
        const isOpname = type === 'opname';
        const isSet = isOpname ? files.opname.length > 0 : !!files[type];
        const isDragging = dragActive[type];

        let labelDesc = subtitle;
        if (isSet) {
            if (isOpname) {
                labelDesc = files.opname.length === 1
                    ? files.opname[0].name
                    : `${files.opname.length} File Terpilih`;
            } else {
                labelDesc = files[type].name;
            }
        }

        return (
            <div
                onDragEnter={e => handleDrag(e, type)}
                onDragLeave={e => handleDrag(e, type)}
                onDragOver={e => handleDrag(e, type)}
                onDrop={e => handleDrop(e, type)}
                onClick={() => fileInputRefs[type].current.click()}
                style={{
                    border: isSet ? '2px solid var(--success-600)' : '2px dashed var(--charcoal-900)',
                    background: isSet ? 'var(--success-50)' : isDragging ? 'var(--warm-200)' : 'rgba(255, 255, 255, 0.5)',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                    position: 'relative',
                    boxShadow: isSet ? '4px 4px 0px var(--success-600)' : '4px 4px 0px var(--charcoal-900)',
                    transform: isDragging ? 'scale(1.02)' : 'none'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '12px' }}>
                        {isSet ? <CheckCircle2 size={32} color="var(--success-600)" /> : <Icon size={32} color="var(--charcoal-500)" />}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-sora)', fontWeight: 800, fontSize: '16px', color: 'var(--charcoal-900)', margin: '0 0 4px 0' }}>{title}</h3>
                    {optional && !isSet && (
                        <span style={{
                            display: 'inline-block', fontSize: '10px', fontWeight: 800, fontFamily: 'var(--font-mono)',
                            background: 'var(--amber-400)', color: 'var(--charcoal-900)', border: '1px solid var(--charcoal-900)',
                            padding: '2px 8px', marginBottom: '8px', textTransform: 'uppercase'
                        }}>Opsional</span>
                    )}
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isSet ? 'var(--success-700)' : 'var(--charcoal-500)', margin: 0 }}>
                        {labelDesc}
                    </p>
                </div>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    ref={fileInputRefs[type]}
                    className="hidden"
                    multiple={multiple}
                    onChange={(e) => handleFileChange(type, e.target.files)}
                    style={{ display: 'none' }}
                />
            </div>
        );
    };

    const allFilesReady = files.opname.length > 0 && files.master;

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
                        <Activity size={14} /> Final Evaluation Module
                    </div>
                    <h1 className="bento-title" style={{ fontSize: '32px', marginBottom: '12px' }}>
                        Recouncil <span style={{ color: 'var(--amber-500)' }}>Intelligence</span>
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--charcoal-500)', maxWidth: '800px', lineHeight: 1.6 }}>
                        Modul mitigasi otomatis menyilangkan (Left-Join) data Lapangan (Opname) dengan Master Data Oracle.
                        Mengkalkulasi Barcode loss, Perbedaan Ruangan, dan Status Kesesuaian.
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

                {/* Section Upload */}
                <div>
                    <div className="editorial-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '2px solid var(--charcoal-900)', background: 'rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '48px', height: '48px', background: 'var(--charcoal-900)', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sora)',
                                fontSize: '20px', fontWeight: 900, border: '2px solid var(--charcoal-900)',
                                boxShadow: '4px 4px 0px var(--amber-400)'
                            }}>1</div>
                            <div>
                                <h2 style={{ fontFamily: 'var(--font-sora)', fontWeight: 900, fontSize: '20px', color: 'var(--charcoal-900)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cross-Verification Data</h2>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--charcoal-500)', margin: 0 }}>Masukkan File Hasil Opname (App2) dan Data Master Terbaru (App3).</p>
                            </div>
                        </div>

                        <div style={{ padding: '32px' }}>
                            {/* Row 1: Opname + Master (wajib) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                                <UploadSlot type="opname" multiple={true} icon={UploadCloud} title="Hasil Opname (App2)" subtitle="Drag & drop multiple file Export Opname" />
                                <UploadSlot type="master" multiple={false} icon={Database} title="Master Data (App3)" subtitle="Drag & drop file Kamus Konsolidasi Master" />
                            </div>

                            {/* Row 2: ASPxGridView1 (opsional) */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <div style={{ flex: 1, height: '2px', background: 'var(--charcoal-900)' }}></div>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 800, color: 'var(--charcoal-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PENGAYAAN DATA TAMBAHAN</span>
                                    <div style={{ flex: 1, height: '2px', background: 'var(--charcoal-900)' }}></div>
                                </div>
                                <UploadSlot
                                    type="aspx"
                                    multiple={false}
                                    optional={true}
                                    icon={Table2}
                                    title="Master Data Asset Management (ASPxGridView1)"
                                    subtitle="Drag & drop file ASPxGridView1.xlsx untuk pengayaan Oracle ID & Tahun Perolehan"
                                />
                            </div>
                        </div>

                        <div style={{ padding: '0 32px 32px 32px', display: 'flex', justifyContent: 'center' }}>
                            {processing ? (
                                <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <Loader2 size={32} color="var(--amber-500)" className="animate-spin" />
                                    </div>
                                    <div style={{ height: '8px', width: '100%', background: 'var(--charcoal-300)', border: '1px solid var(--charcoal-900)' }}>
                                        <div className="animate-progress origin-left" style={{ height: '100%', background: 'var(--amber-500)', width: '100%' }}></div>
                                    </div>
                                    <p className="animate-pulse" style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--charcoal-600)', fontWeight: 700, textTransform: 'uppercase' }}>
                                        Mencocokkan Barcode & Kalkulasi Status...
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={processRecouncil}
                                    disabled={!allFilesReady}
                                    style={{
                                        background: 'var(--charcoal-900)', color: 'var(--amber-400)',
                                        border: '2px solid var(--charcoal-900)', borderRadius: '0',
                                        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '12px',
                                        fontFamily: 'var(--font-sora)', fontWeight: 900, fontSize: '14px',
                                        textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                                        transition: 'all 0.1s',
                                        boxShadow: !allFilesReady ? 'none' : '6px 6px 0px var(--charcoal-900)',
                                        opacity: !allFilesReady ? 0.6 : 1
                                    }}
                                    onMouseOver={e => { if(allFilesReady && !processing) { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = '4px 4px 0px var(--charcoal-900)'; } }}
                                    onMouseOut={e => { if(allFilesReady && !processing) { e.currentTarget.style.transform = 'translate(0px, 0px)'; e.currentTarget.style.boxShadow = '6px 6px 0px var(--charcoal-900)'; } }}
                                >
                                    <Sparkles size={20} strokeWidth={2.5} /> PROSES RECOUNCIL SEKARANG
                                </button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
