import { useState, useEffect, useCallback } from 'react';
import { Save, Download, Trash2, X, AlertCircle } from 'lucide-react';
import { apiUrl, fetchWithAuth } from '../utils/apiConfig';

/**
 * Dialog Box to Save / Load / Delete Opname state to/from the Server
 */
export default function SaveLoadModal({ isOpen, onClose, currentFileName, onSaveState, onLoadState }) {
    const [activeTab, setActiveTab] = useState('save'); // 'save' | 'load'
    const [saves, setSaves] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saveName, setSaveName] = useState('');

    // Fetch saves when modal opens or tab changes
    const fetchSaves = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetchWithAuth(apiUrl('/api/app1/saves'));
            const data = await res.json();
            if (res.ok && data.success) {
                setSaves(data.saves || []);
            } else {
                setError(data.error || 'Failed to fetch saves');
            }
        } catch (err) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchSaves();
            // Default save name based on datetime
            const d = new Date();
            const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
            setSaveName(`${currentFileName ? currentFileName + ' - ' : 'Opname '}${dateStr} ${timeStr}`);
        }
    }, [isOpen, activeTab, fetchSaves, currentFileName]);

    const handleSaveNew = async () => {
        if (!saveName.trim()) return setError('Nama save tidak boleh kosong');
        
        setLoading(true);
        setError('');
        try {
            const stateObj = await onSaveState(); // Get state from parent
            
            // Generate basic metadata
            const roomCount = stateObj.rooms?.length || 0;
            const assetCount = stateObj.rooms?.reduce((acc, r) => acc + (r.assets?.length || 0), 0) || 0;
            const periode = stateObj.rooms?.[0]?.assets?.[0]?.PERIODE || '';

            const res = await fetchWithAuth(apiUrl('/api/app1/saves'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: saveName.trim(),
                    periode,
                    roomCount,
                    assetCount,
                    stateJson: JSON.stringify(stateObj)
                })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                await fetchSaves();
                setActiveTab('load'); // Switch to load tab to see it
                setSaveName('');
            } else {
                setError(data.error || 'Gagal menyimpan');
            }
        } catch (err) {
            setError(err.message || 'Error saat menyimpan');
        } finally {
            setLoading(false);
        }
    };

    const handleOverwrite = async (save) => {
        if (!confirm(`Timpa save "${save.name}" dengan state saat ini?`)) return;
        
        setLoading(true);
        setError('');
        try {
            const stateObj = await onSaveState(); // Get state from parent
            
            const roomCount = stateObj.rooms?.length || 0;
            const assetCount = stateObj.rooms?.reduce((acc, r) => acc + (r.assets?.length || 0), 0) || 0;
            const periode = save.periode || stateObj.rooms?.[0]?.assets?.[0]?.PERIODE || ''; // retain or update

            const res = await fetchWithAuth(apiUrl(`/api/app1/saves/${save.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: save.name, // Keep existing name
                    periode,
                    roomCount,
                    assetCount,
                    stateJson: JSON.stringify(stateObj)
                })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                await fetchSaves();
            } else {
                setError(data.error || 'Gagal menimpa save');
            }
        } catch (err) {
            setError(err.message || 'Error saat menimpa');
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = async (save) => {
        if (!confirm(`Load data "${save.name}"? Progres saat ini yang belum tersave akan hilang.`)) return;
        
        setLoading(true);
        setError('');
        try {
            const res = await fetchWithAuth(apiUrl(`/api/app1/saves/${save.id}`));
            const data = await res.json();
            
            if (res.ok && data.success && data.save) {
                const parsedState = JSON.parse(data.save.stateJson);
                await onLoadState(parsedState); // Pass to parent to dispatch
                onClose(); // Close modal on success
            } else {
                setError(data.error || 'Gagal me-load data');
            }
        } catch (err) {
            setError(err.message || 'Error saat load');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (save) => {
        if (!confirm(`Hapus permanen save "${save.name}"?`)) return;
        
        setLoading(true);
        setError('');
        try {
            const res = await fetchWithAuth(apiUrl(`/api/app1/saves/${save.id}`), {
                method: 'DELETE'
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                await fetchSaves();
            } else {
                setError(data.error || 'Gagal menghapus');
            }
        } catch (err) {
            setError(err.message || 'Error saat menghapus');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 9999, position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="modal-content" style={{ backgroundColor: 'var(--warm-50)', width: '100%', maxWidth: '540px', boxShadow: '8px 8px 0px rgba(15, 23, 42, 1)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '3px solid var(--charcoal-900)', borderRadius: '0' }}>
                
                {/* Header */}
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderBottom: '3px solid var(--charcoal-900)' }}>
                    <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-sora)', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--charcoal-900)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <div style={{ width: 36, height: 36, background: 'var(--amber-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--charcoal-900)', border: '2px solid var(--charcoal-900)' }}>
                            <Save size={18} strokeWidth={3} />
                        </div>
                        DATA OPNAME
                    </h2>
                    <button onClick={onClose} style={{ background: '#fff', border: '2px solid var(--charcoal-900)', cursor: 'pointer', padding: '0', width: 36, height: 36, color: 'var(--charcoal-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.backgroundColor='var(--charcoal-900)'; e.currentTarget.style.color='#fff' }} onMouseOut={e => { e.currentTarget.style.backgroundColor='#fff'; e.currentTarget.style.color='var(--charcoal-900)'}}>
                        <X size={20} strokeWidth={3}/>
                    </button>
                </div>

                {/* Brutalist Tabs */}
                <div style={{ display: 'flex', borderBottom: '3px solid var(--charcoal-900)', backgroundColor: '#fff' }}>
                    <button 
                        style={{ flex: 1, padding: '16px', fontWeight: 900, fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-sora)', border: 'none', borderRight: '3px solid var(--charcoal-900)', background: activeTab === 'save' ? 'var(--charcoal-900)' : 'transparent', color: activeTab === 'save' ? 'var(--amber-400)' : 'var(--charcoal-900)', transition: 'all 0.1s ease', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        onClick={() => setActiveTab('save')}
                    >
                        Simpan (Save)
                    </button>
                    <button 
                        style={{ flex: 1, padding: '16px', fontWeight: 900, fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-sora)', border: 'none', background: activeTab === 'load' ? 'var(--charcoal-900)' : 'transparent', color: activeTab === 'load' ? 'var(--amber-400)' : 'var(--charcoal-900)', transition: 'all 0.1s ease', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        onClick={() => setActiveTab('load')}
                    >
                        Muat Ulang (Load)
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: '300px', backgroundColor: 'var(--warm-50)' }}>
                    
                    {error && (
                        <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#FEF2F2', color: '#991B1B', border: '2px solid #991B1B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                            <AlertCircle size={18} strokeWidth={3} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {activeTab === 'save' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            
                            {/* New Save Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 900, fontFamily: 'var(--font-sora)', color: 'var(--charcoal-900)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SIMPAN SEBAGAI FILE BARU</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                                    <input 
                                        type="text" 
                                        value={saveName}
                                        onChange={e => setSaveName(e.target.value)}
                                        placeholder="Ketik nama untuk di-save..."
                                        style={{ flex: 1, padding: '12px 16px', border: '2px solid var(--charcoal-900)', borderRadius: '0', fontSize: '14px', outline: 'none', backgroundColor: '#fff', color: 'var(--charcoal-900)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}
                                        disabled={loading}
                                    />
                                    <button 
                                        onClick={handleSaveNew}
                                        disabled={loading || !saveName.trim()}
                                        style={{ backgroundColor: 'var(--charcoal-900)', color: 'var(--amber-400)', padding: '0 24px', fontSize: '13px', fontWeight: 900, fontFamily: 'var(--font-sora)', textTransform: 'uppercase', letterSpacing: '0.06em', border: '2px solid var(--charcoal-900)', cursor: (loading || !saveName.trim()) ? 'not-allowed' : 'pointer', opacity: (loading || !saveName.trim()) ? 0.6 : 1, transition: 'transform 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onMouseDown={e=>e.currentTarget.style.transform='translate(2px, 2px)'}
                                        onMouseUp={e=>e.currentTarget.style.transform='translate(0, 0)'}
                                    >
                                        SAVE
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: '3px', backgroundColor: 'var(--charcoal-900)', width: '100%' }}></div>

                            {/* Overwrite List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 900, fontFamily: 'var(--font-sora)', color: 'var(--charcoal-900)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>TIMPA (OVERWRITE) FILE TERSIMPAN:</h3>
                                {loading && saves.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '13px', color: 'var(--charcoal-900)', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>MENGAMBIL DATA...</div>
                                ) : saves.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '13px', color: 'var(--charcoal-900)', backgroundColor: '#fff', border: '2px dashed var(--charcoal-900)', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>BELUM ADA DATA TERSIMPAN.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {saves.map(save => (
                                            <div key={save.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '2px solid var(--charcoal-900)', backgroundColor: '#ffffff', boxShadow: '4px 4px 0px var(--charcoal-900)' }}>
                                                <div style={{ minWidth: 0, flex: 1, paddingRight: '16px' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '14px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--charcoal-900)' }}>{save.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--charcoal-600)', marginTop: '6px', display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                                                        <span>{new Date(save.updatedAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} • {new Date(save.updatedAt).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}</span>
                                                        <span style={{width: 6, height: 6, background: 'var(--charcoal-900)'}}></span>
                                                        <span>{save.roomCount} Area</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleOverwrite(save)}
                                                    disabled={loading}
                                                    style={{ flexShrink: 0, fontSize: '11px', fontWeight: 900, fontFamily: 'var(--font-sora)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 16px', border: '2px solid var(--charcoal-900)', color: 'var(--charcoal-900)', backgroundColor: 'var(--amber-400)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, transition: 'all 0.1s' }}
                                                    onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--charcoal-900)'; e.currentTarget.style.color = 'var(--amber-400)'}}
                                                    onMouseOut={e => { e.currentTarget.style.backgroundColor = 'var(--amber-400)'; e.currentTarget.style.color = 'var(--charcoal-900)'}}
                                                >
                                                    TIMPA
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'load' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {loading && saves.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: '13px', color: 'var(--charcoal-900)', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>MEMUAT DATA...</div>
                            ) : saves.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', color: 'var(--charcoal-900)', backgroundColor: '#fff', border: '2px dashed var(--charcoal-900)', textAlign: 'center' }}>
                                    <div style={{ width: 56, height: 56, background: 'var(--charcoal-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: 'var(--amber-400)' }}>
                                        <Download size={28} strokeWidth={3} />
                                    </div>
                                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 900, fontFamily: 'var(--font-sora)', color: 'var(--charcoal-900)', textTransform: 'uppercase' }}>BELUM ADA DATA</p>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', lineHeight: 1.6, maxWidth: '240px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>SIMPAN PROGRES DI TAB "SIMPAN" AGAR TIDAK HILANG.</p>
                                </div>
                            ) : (
                                saves.map(save => (
                                    <div key={save.id} style={{ display: 'flex', alignItems: 'center', padding: '16px', border: '2px solid var(--charcoal-900)', backgroundColor: '#ffffff', gap: '16px', boxShadow: '4px 4px 0px var(--charcoal-900)' }}>
                                        <div style={{ width: 44, height: 44, background: 'var(--charcoal-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-400)', flexShrink: 0 }}>
                                            <Save size={20} strokeWidth={3} />
                                        </div>
                                        
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--charcoal-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{save.name}</h4>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: 'var(--charcoal-600)', marginTop: '8px', fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase' }}>
                                                <span>{new Date(save.updatedAt).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})} • {new Date(save.updatedAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                                                {save.periode && (
                                                    <span style={{ backgroundColor: 'var(--amber-400)', color: 'var(--charcoal-900)', padding: '2px 8px', border: '1px solid var(--charcoal-900)', fontWeight: 800 }}>{save.periode}</span>
                                                )}
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--charcoal-700)', marginTop: '6px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                                <span>R {save.roomCount}</span>
                                                <span style={{width: 4, height: 4, background: 'var(--charcoal-900)'}}></span>
                                                <span>A {save.assetCount}</span>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                                            <button 
                                                onClick={() => handleLoad(save)}
                                                disabled={loading}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', fontWeight: 900, fontFamily: 'var(--font-sora)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 16px', backgroundColor: 'var(--charcoal-900)', color: 'var(--amber-400)', border: '2px solid var(--charcoal-900)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, transition: 'all 0.1s' }}
                                                onMouseOver={e=>{e.currentTarget.style.backgroundColor='var(--amber-400)'; e.currentTarget.style.color='var(--charcoal-900)'}}
                                                onMouseOut={e=>{e.currentTarget.style.backgroundColor='var(--charcoal-900)'; e.currentTarget.style.color='var(--amber-400)'}}
                                            >
                                                LOAD
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(save)}
                                                disabled={loading}
                                                title="Hapus permanen"
                                                style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '6px', color: 'var(--red-600)', backgroundColor: 'transparent', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, textTransform: 'uppercase' }}
                                            >
                                                HAPUS DATA
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
