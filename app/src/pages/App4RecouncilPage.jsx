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
                className={`wa-zone ${isSet ? 'loaded' : ''}`}
                style={{ padding: 24, textAlign: 'center' }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ marginBottom: 12 }}>
                        {isSet ? <CheckCircle2 size={32} color="var(--success-500)" /> : <Icon size={32} color="var(--charcoal-900)" />}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-sora)', fontWeight: 600, fontSize: 16, color: 'var(--charcoal-900)', margin: '0 0 4px 0' }}>{title}</h3>
                    {optional && !isSet && (
                        <span style={{
                            display: 'inline-block', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                            background: 'var(--amber-100)', color: 'var(--charcoal-700)', border: '1px solid var(--amber-300)',
                            padding: '2px 8px', marginBottom: '8px', borderRadius: 9999, textTransform: 'uppercase'
                        }}>Opsional</span>
                    )}
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isSet ? 'var(--success-500)' : 'var(--charcoal-500)', margin: 0 }}>
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
        <div className="app3-page app4-page-lite">
            <div className="app3-container">
                <div className="upload-dashboard-bento" style={{ gap: '24px' }}>

                {/* Hero Header */}
                <div className="app3-hero app4-hero-lite">
                  <div>
                    <div className="app3-eyebrow"><Activity size={14} /> APP4 · EVALUATION</div>
                    <h1 className="app3-title">Evaluation Recouncil</h1>
                    <p className="app3-copy">
                      Bandingkan hasil opname dengan master data terbaru. Upload file wajib, tambahkan ASPxGridView bila ada, lalu generate hasil evaluasi.
                    </p>
                  </div>
                </div>

                {successMsg && (
                    <div className="app3-alert app3-alert--success" role="status">
                        <CheckCircle2 size={18} />
                        <span>{successMsg}</span>
                    </div>
                )}
                {errorMsg && (
                    <div className="app3-alert app3-alert--danger" role="alert">
                        <FileWarning size={18} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Section Upload */}
                <div>
                    <div className="wa-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(26,26,26,0.08)', background: 'var(--cream-input)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '40px', height: '40px', background: 'var(--charcoal-900)', color: 'var(--cream-surface)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sora)',
                                fontSize: '14px', fontWeight: 800, borderRadius: 'var(--radius-sm)'
                            }}>01</div>
                            <div>
                                <h2 style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: '16px', color: 'var(--charcoal-900)', margin: 0, letterSpacing: '0.01em' }}>Cross-Verification Data</h2>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--charcoal-500)', margin: 0 }}>Masukkan File Hasil Opname (App2) dan Data Master Terbaru (App3).</p>
                            </div>
                        </div>

                        <div style={{ padding: '28px' }}>
                            {/* Row 1: Opname + Master (wajib) - 1.4fr 1fr grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <UploadSlot type="opname" multiple={true} icon={UploadCloud} title="Hasil Opname (App2)" subtitle="Drag & drop multiple file Export Opname" />
                                <UploadSlot type="master" multiple={false} icon={Database} title="Master Data (App3)" subtitle="Drag & drop file Kamus Konsolidasi Master" />
                            </div>

                            {/* Row 2: ASPxGridView1 (opsional) - full-width horizontal */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(26,26,26,0.12)' }}></div>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, color: 'var(--charcoal-500)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>PENGAYAAN DATA TAMBAHAN</span>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(26,26,26,0.12)' }}></div>
                                </div>
                                <div className="wa-zone" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 24px', flexDirection: 'row' }}>
                                    <div onClick={() => fileInputRefs.aspx.current.click()} onDragEnter={e => handleDrag(e, 'aspx')} onDragLeave={e => handleDrag(e, 'aspx')} onDragOver={e => handleDrag(e, 'aspx')} onDrop={e => handleDrop(e, 'aspx')} style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, cursor: 'pointer' }}>
                                        <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream-input)', borderRadius: 'var(--radius-sm)' }}>
                                            {files.aspx ? <CheckCircle2 size={22} color="var(--success-600)" /> : <Table2 size={22} color="var(--charcoal-500)" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                                <h3 style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: '14px', color: 'var(--charcoal-900)', margin: 0 }}>Master Data Asset Management (ASPxGridView1)</h3>
                                                <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: 800, fontFamily: 'var(--font-mono)', background: 'var(--terracotta-500)', color: 'var(--cream-surface)', padding: '2px 8px', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Opsional</span>
                                            </div>
                                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: files.aspx ? 'var(--success-700)' : 'var(--charcoal-500)', margin: 0 }}>
                                                {files.aspx ? files.aspx.name : 'Drag & drop file ASPxGridView1.xlsx untuk pengayaan Oracle ID & Tahun Perolehan'}
                                            </p>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        ref={fileInputRefs.aspx}
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileChange('aspx', e.target.files)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '0 28px 28px 28px', display: 'flex', justifyContent: 'center' }}>
                            {processing ? (
                                <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <Loader2 size={32} color="var(--terracotta-500)" className="animate-spin" />
                                    </div>
                                    <div style={{ height: '8px', width: '100%', background: 'rgba(26,26,26,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div className="animate-progress origin-left" style={{ height: '100%', background: 'var(--terracotta-500)', width: '100%' }}></div>
                                    </div>
                                    <p className="animate-pulse" style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--charcoal-600)', fontWeight: 700, textTransform: 'uppercase' }}>
                                        Mencocokkan Barcode & Kalkulasi Status...
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={processRecouncil}
                                    disabled={!allFilesReady}
                                    className="wa-btn-terracotta"
                                    style={{ padding: '16px 36px', fontSize: 13, fontWeight: 700 }}
                                >
                                    <Sparkles size={20} strokeWidth={2.5} /> Proses Recouncil Sekarang →
                                </button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
            </div>
        </div>
    );
}
