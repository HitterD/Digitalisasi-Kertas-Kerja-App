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
        <div className="modal-overlay" style={{ zIndex: 9999, position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="wa-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(26, 26, 26, 0.06)' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--charcoal-900)' }}>
                        <div style={{ width: 36, height: 36, background: 'rgba(201, 100, 66, 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--terracotta-500)', borderRadius: '10px' }}>
                            <Save size={18} strokeWidth={2.5} />
                        </div>
                        Data Opname
                    </h2>
                    <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0', width: 36, height: 36, color: 'var(--charcoal-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.backgroundColor='rgba(26,26,26,0.05)'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor='transparent'; }}>
                        <X size={20} strokeWidth={2.5}/>
                    </button>
                </div>

                {/* Soft Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(26, 26, 26, 0.06)', backgroundColor: 'transparent' }}>
                    <button
                        style={{ flex: 1, padding: '14px 16px', fontWeight: 600, fontSize: '13px', outline: 'none', cursor: 'pointer', border: 'none', background: 'transparent', color: activeTab === 'save' ? 'var(--charcoal-900)' : 'rgba(26, 26, 26, 0.55)', transition: 'all 0.15s ease', borderBottom: activeTab === 'save' ? '2px solid var(--terracotta-500)' : '2px solid transparent' }}
                        onClick={() => setActiveTab('save')}
                    >
                        Simpan (Save)
                    </button>
                    <button
                        style={{ flex: 1, padding: '14px 16px', fontWeight: 600, fontSize: '13px', outline: 'none', cursor: 'pointer', border: 'none', background: 'transparent', color: activeTab === 'load' ? 'var(--charcoal-900)' : 'rgba(26, 26, 26, 0.55)', transition: 'all 0.15s ease', borderBottom: activeTab === 'load' ? '2px solid var(--terracotta-500)' : '2px solid transparent' }}
                        onClick={() => setActiveTab('load')}
                    >
                        Muat Ulang (Load)
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: '300px' }}>
                    
                    {error && (
                        <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: 'rgba(220, 38, 38, 0.06)', color: '#991B1B', border: '1px solid rgba(220, 38, 38, 0.15)', borderRadius: 'var(--radius-md, 10px)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
                            <AlertCircle size={18} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {activeTab === 'save' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* New Save Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--charcoal-900)' }}>Simpan sebagai file baru</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                    <input
                                        type="text"
                                        value={saveName}
                                        onChange={e => setSaveName(e.target.value)}
                                        placeholder="Ketik nama untuk di-save..."
                                        style={{ flex: 1, padding: '10px 14px', border: '1px solid rgba(26, 26, 26, 0.12)', borderRadius: 'var(--radius-md, 10px)', fontSize: '14px', outline: 'none', backgroundColor: '#fff', color: 'var(--charcoal-900)', fontWeight: 500 }}
                                        disabled={loading}
                                    />
                                    <button
                                        onClick={handleSaveNew}
                                        disabled={loading || !saveName.trim()}
                                        className="wa-btn wa-btn-terracotta"
                                        style={{ padding: '0 20px', fontSize: '13px', cursor: (loading || !saveName.trim()) ? 'not-allowed' : 'pointer', opacity: (loading || !saveName.trim()) ? 0.6 : 1 }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: '1px', backgroundColor: 'rgba(26, 26, 26, 0.06)', width: '100%' }}></div>

                            {/* Overwrite List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--charcoal-900)', margin: 0 }}>Timpa (overwrite) file tersimpan</h3>
                                {loading && saves.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '13px', color: 'rgba(26, 26, 26, 0.55)' }}>Mengambil data...</div>
                                ) : saves.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '13px', color: 'rgba(26, 26, 26, 0.55)', backgroundColor: '#fff', border: '1px dashed rgba(26, 26, 26, 0.12)', borderRadius: 'var(--radius-md, 10px)' }}>Belum ada data tersimpan.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {saves.map(save => (
                                            <div key={save.id} className="wa-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', gap: '12px' }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--charcoal-900)' }}>{save.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'rgba(26, 26, 26, 0.55)', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 500 }}>
                                                        <span>{new Date(save.updatedAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} • {new Date(save.updatedAt).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}</span>
                                                        <span style={{width: 4, height: 4, background: 'rgba(26, 26, 26, 0.4)', borderRadius: '50%'}}></span>
                                                        <span>{save.roomCount} Area</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleOverwrite(save)}
                                                    disabled={loading}
                                                    className="wa-btn"
                                                    style={{ flexShrink: 0, fontSize: '12px', padding: '8px 14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                                                >
                                                    Timpa
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'load' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {loading && saves.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: '13px', color: 'rgba(26, 26, 26, 0.55)' }}>Memuat data...</div>
                            ) : saves.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', color: 'var(--charcoal-900)', backgroundColor: '#fff', border: '1px dashed rgba(26, 26, 26, 0.12)', borderRadius: 'var(--radius-md, 10px)', textAlign: 'center' }}>
                                    <div style={{ width: 48, height: 48, background: 'rgba(201, 100, 66, 0.10)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--terracotta-500)' }}>
                                        <Download size={24} strokeWidth={2.5} />
                                    </div>
                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--charcoal-900)' }}>Belum ada data</p>
                                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', lineHeight: 1.6, maxWidth: '240px', color: 'rgba(26, 26, 26, 0.6)' }}>Simpan progres di tab "Simpan" agar tidak hilang.</p>
                                </div>
                            ) : (
                                saves.map(save => (
                                    <div key={save.id} className="wa-card" style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: '12px' }}>
                                        <div style={{ width: 40, height: 40, background: 'rgba(201, 100, 66, 0.10)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--terracotta-500)', flexShrink: 0 }}>
                                            <Save size={18} strokeWidth={2.5} />
                                        </div>

                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <h4 style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--charcoal-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{save.name}</h4>

                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'rgba(26, 26, 26, 0.6)', marginTop: '6px', fontWeight: 500 }}>
                                                <span>{new Date(save.updatedAt).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})} • {new Date(save.updatedAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                                                {save.periode && (
                                                    <span style={{ backgroundColor: 'rgba(201, 100, 66, 0.10)', color: 'var(--terracotta-500)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>{save.periode}</span>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(26, 26, 26, 0.6)', marginTop: '4px', fontWeight: 600 }}>
                                                <span>{save.roomCount} R</span>
                                                <span style={{width: 3, height: 3, background: 'rgba(26, 26, 26, 0.4)', borderRadius: '50%'}}></span>
                                                <span>{save.assetCount} A</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => handleLoad(save)}
                                                disabled={loading}
                                                className="wa-btn wa-btn-terracotta"
                                                style={{ fontSize: '12px', padding: '6px 12px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                                            >
                                                Load
                                            </button>
                                            <button
                                                onClick={() => handleDelete(save)}
                                                disabled={loading}
                                                title="Hapus permanen"
                                                style={{ fontSize: '11px', fontWeight: 600, padding: '4px', color: 'rgba(220, 38, 38, 0.85)', backgroundColor: 'transparent', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                                            >
                                                Hapus data
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
