import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, FileSpreadsheet, Loader2, ArrowRight, Download, Filter, FileWarning, Database, LayoutTemplate, Box, Sparkles } from 'lucide-react';
import '../index.css';

import {
  FILTER_CATEGORIES,
  canExtractFilters,
  countBatsByCategory,
  getEffectiveBats as getEffectiveBatsForSelection,
  getSourceFileCount,
} from '../utils/app3ConsolidationUi';

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

    const sourceFileCount = getSourceFileCount(files);
    const canContinueUpload = canExtractFilters(files);
    const countByCat = countBatsByCategory(bats);
    const effectiveBats = getEffectiveBatsForSelection(bats, selectedBats);

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

    const toggleCategory = (cat) => {
        setSelectedBats(prev => {
            if (prev.includes(cat)) return prev.filter(x => x !== cat);
            return [...prev, cat];
        });
    };

    const processConsolidation = async () => {
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
                className={`app3-upload-slot ${isSet ? 'is-loaded' : ''} ${isDrag ? 'is-dragging' : ''} ${type === 'master' ? 'is-optional' : 'is-source'}`}
            >
                <div className="app3-upload-slot__content">
                  <span className={`app3-upload-slot__badge ${isSet ? 'valid' : type === 'master' ? 'optional' : 'source'}`}>
                    {isSet ? 'VALID' : type === 'master' ? 'OPSIONAL' : 'SOURCE'}
                  </span>
                  <div className="app3-upload-slot__icon">
                    {isSet ? <CheckCircle2 size={24} /> : <Icon size={24} />}
                  </div>
                  <h3 className="app3-upload-slot__title">{title}</h3>
                  <p className={isSet ? 'app3-upload-slot__file' : 'app3-upload-slot__hint'}>
                    {isSet ? files[type].name : subtitle}
                  </p>
                  <div className="app3-upload-slot__action">{isSet ? 'Ganti file' : 'Pilih / drop file'}</div>
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

    return (
      <div className="app3-page">
        <div className="app3-container">

          <nav className="app3-stepper" aria-label="Langkah konsolidasi">
            {[['1', 'Upload'], ['2', 'Filter'], ['3', 'Generate Excel']].map(([value, label]) => {
              const valueNum = Number(value);
              const stateClass = step === valueNum ? 'active' : step > valueNum ? 'done' : 'inactive';
              return (
                <div key={value} className={`app3-step ${stateClass}`}>
                  <div className="app3-step__num">{step > valueNum ? '✓' : value}</div>
                  <div>
                    <div className="app3-step__label">Step {value}</div>
                    <div className="app3-step__title">{label}</div>
                  </div>
                </div>
              );
            })}
          </nav>

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

          <section className={`app3-panel ${step !== 1 ? 'is-muted' : ''}`}>
            <div className="app3-panel__header">
              <div className="app3-panel__num">1</div>
              <div>
                <h2>Upload File</h2>
                <p>Masukkan file sumber sebelum ekstrak filter.</p>
              </div>
            </div>
            <div className="app3-panel__body">
              <div className="app3-rule-strip">
                <span><strong>Aturan lanjut:</strong> minimal satu source valid dari EXA / ADD / INV.</span>
                <strong>ANTI-SALAH UPLOAD</strong>
              </div>
              <div className="app3-upload-grid">
                <UploadSlot type="master" icon={Database} title="Master Lama" subtitle="Opsional: kamus master existing untuk arsip" />
                <UploadSlot type="exa" icon={LayoutTemplate} title="EXA" subtitle="Source document Excel" />
                <UploadSlot type="add" icon={Box} title="ADD" subtitle="Source document Excel" />
                <UploadSlot type="inv" icon={FileSpreadsheet} title="INV" subtitle="Source document Excel" />
              </div>
              <div className="app3-action-row">
                <div className="app3-readiness">
                  <span className={sourceFileCount > 0 ? 'ok' : ''}>{sourceFileCount} SOURCE VALID</span>
                  <span>.XLSX / .XLS SAJA</span>
                  <span>MASTER OPSIONAL</span>
                </div>
                <button
                  type="button"
                  onClick={extractBats}
                  disabled={loadingBats || !canContinueUpload}
                  className="wa-btn-terracotta app3-primary-action"
                >
                  {loadingBats ? <><Loader2 size={16} className="spin" /> MENGANALISA...</> : <><Filter size={16} /> EKSTRAK FILTER <ArrowRight size={16} /></>}
                </button>
              </div>
            </div>
          </section>

          {step === 2 && (
            <section className="app3-panel">
              <div className="app3-panel__header">
                <div className="app3-panel__num">2</div>
                <div>
                  <h2>Filter Kategori</h2>
                  <p>Pilih kategori yang akan masuk output Excel.</p>
                </div>
              </div>
              <div className="app3-panel__body">
                <div className="app3-summary-chips">
                  <span>TOTAL BAT: <strong>{bats.length}</strong></span>
                  <span>SELECTED: <strong>{selectedBats.length}</strong></span>
                  <span>EFFECTIVE RECORDS: <strong>{effectiveBats.length}</strong></span>
                </div>

                {bats.length === 0 ? (
                  <div className="app3-empty-state">Tidak ada referensi BAT di source file.</div>
                ) : (
                  <div className="app3-category-grid">
                    {FILTER_CATEGORIES.map((cat) => {
                      const isSelected = selectedBats.includes(cat);
                      const count = countByCat[cat] || 0;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`app3-category-card ${isSelected ? 'selected' : ''}`}
                        >
                          <span className="app3-category-card__title">
                            {cat}
                            <strong>{count}</strong>
                          </span>
                          <span className="app3-category-card__hint">
                            {isSelected ? 'Masuk hasil Excel' : cat === 'Kosong' ? 'Data tanpa prefix kategori' : 'Klik untuk tambah filter'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="app3-action-row">
                  <button type="button" onClick={() => setStep(1)} disabled={processing} className="wa-btn-ghost">
                    ← KEMBALI
                  </button>
                  <button
                    type="button"
                    onClick={processConsolidation}
                    disabled={processing || selectedBats.length === 0}
                    className="wa-btn-terracotta app3-primary-action"
                  >
                    {processing ? <><Loader2 size={18} className="spin" /> MENYUSUN DATA MASTER...</> : <><Download size={18} /> GENERATE EXCEL</>}
                  </button>
                </div>

                {processing && (
                  <div className="app3-processing" role="status">
                    <div><span /></div>
                    <p>Menyusun data master… tunggu sampai file otomatis terunduh.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    );
}
