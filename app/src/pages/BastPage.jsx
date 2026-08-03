import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, FileCheck, Plus, Trash2, Download, Save, RefreshCw,
    Search, CheckCircle, Clock, Edit, FileText, UserCheck, ShieldCheck,
    Layers, PackageCheck, AlertCircle
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import SignaturePadModal from '../components/SignaturePadModal';
import { generateBastPdf } from '../utils/generateBastPdf';
import { saveBastDocuments, loadBastDocuments, loadMasterData } from '../utils/db';

export default function BastPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('form'); // 'form' | 'history'

    // BAST Form State
    const [noBast, setNoBast] = useState('');
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [lokasi, setLokasi] = useState('PT Santos Jaya Abadi');
    const [statusDoc, setStatusDoc] = useState('Completed');

    // Pihak 1 (Yang Menyerahkan)
    const [pihak1, setPihak1] = useState({
        nama: '',
        nik: '',
        jabatan: 'Staff ICT',
        dept: 'ICT',
        ttd: null,
    });

    // Pihak 2 (Yang Menerima)
    const [pihak2, setPihak2] = useState({
        nama: '',
        nik: '',
        jabatan: '',
        dept: '',
        ttd: null,
    });

    // Mengetahui (Head / Supervisor)
    const [mengetahui, setMengetahui] = useState({
        nama: 'Head of ICT',
        jabatan: 'ICT Manager',
        ttd: null,
    });

    // Items List
    const [items, setItems] = useState([
        {
            id: 1,
            barcode: '',
            namaBarang: '',
            merkType: '',
            serialNumber: '',
            qty: 1,
            kondisi: 'Baik',
            keterangan: '',
        }
    ]);

    const [catatan, setCatatan] = useState('1. Barang yang diserahterimakan dalam keadaan fisik dan fungsi normal.\n2. Penerima bertanggung jawab atas pemeliharaan dan keamanan aset ICT tersebut.');

    // Signature Modal State
    const [sigModal, setSigModal] = useState({
        isOpen: false,
        target: null, // 'pihak1' | 'pihak2' | 'mengetahui'
        title: '',
    });

    // Asset Selector Modal
    const [assetModalOpen, setAssetModalOpen] = useState(false);
    const [masterAssets, setMasterAssets] = useState([]);
    const [assetSearchQuery, setAssetSearchQuery] = useState('');

    // Documents History List
    const [bastHistory, setBastHistory] = useState([]);
    const [historySearch, setHistorySearch] = useState('');
    const [editingId, setEditingId] = useState(null);

    // Initial Load & Auto-generate No. BAST
    useEffect(() => {
        loadHistory();
        loadMasterDataList();
        generateAutoNoBast();
    }, []);

    const generateAutoNoBast = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const randomNum = Math.floor(100 + Math.random() * 900);
        setNoBast(`BAST/ICT/${year}/${month}/${randomNum}`);
    };

    const loadHistory = async () => {
        try {
            const list = await loadBastDocuments();
            setBastHistory(list || []);
        } catch (e) {
            console.error('Failed loading BAST history:', e);
        }
    };

    const loadMasterDataList = async () => {
        try {
            const data = await loadMasterData();
            if (data && data.entries) {
                const arr = Object.values(data.entries);
                setMasterAssets(arr);
            }
        } catch (e) {
            console.error('Failed loading Master Data for BAST:', e);
        }
    };

    // Item Handler
    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            {
                id: Date.now(),
                barcode: '',
                namaBarang: '',
                merkType: '',
                serialNumber: '',
                qty: 1,
                kondisi: 'Baik',
                keterangan: '',
            }
        ]);
    };

    const handleRemoveItem = (id) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    // Pick Asset from Master Data Modal
    const handleSelectAsset = (asset) => {
        const lastItem = items[items.length - 1];
        const isLastEmpty = !lastItem.barcode && !lastItem.namaBarang;

        const newItem = {
            id: isLastEmpty ? lastItem.id : Date.now(),
            barcode: asset.barcode || asset['BARCODE ASET'] || asset['BARCODE'] || '',
            namaBarang: asset.namaAset || asset['NAMA ASET'] || asset['DESCRIPTION'] || '',
            merkType: asset.merk || asset['MERK'] || asset['TIPE'] || '',
            serialNumber: asset.serialNumber || asset['SERIAL NUMBER'] || asset['SN'] || '',
            qty: 1,
            kondisi: 'Baik',
            keterangan: asset.lokasi || asset['NAMA RUANGAN'] || '',
        };

        if (isLastEmpty) {
            setItems(prev => prev.map(i => i.id === lastItem.id ? newItem : i));
        } else {
            setItems(prev => [...prev, newItem]);
        }

        setAssetModalOpen(false);
    };

    // Signature Modal Handlers
    const openSignature = (target, title) => {
        setSigModal({
            isOpen: true,
            target,
            title,
        });
    };

    const handleSaveSignature = (dataUrl) => {
        if (sigModal.target === 'pihak1') {
            setPihak1(prev => ({ ...prev, ttd: dataUrl }));
        } else if (sigModal.target === 'pihak2') {
            setPihak2(prev => ({ ...prev, ttd: dataUrl }));
        } else if (sigModal.target === 'mengetahui') {
            setMengetahui(prev => ({ ...prev, ttd: dataUrl }));
        }
    };

    // Form Reset
    const handleResetForm = () => {
        setEditingId(null);
        generateAutoNoBast();
        setTanggal(new Date().toISOString().split('T')[0]);
        setLokasi('PT Santos Jaya Abadi');
        setStatusDoc('Completed');
        setPihak1({ nama: '', nik: '', jabatan: 'Staff ICT', dept: 'ICT', ttd: null });
        setPihak2({ nama: '', nik: '', jabatan: '', dept: '', ttd: null });
        setMengetahui({ nama: 'Head of ICT', jabatan: 'ICT Manager', ttd: null });
        setItems([{ id: 1, barcode: '', namaBarang: '', merkType: '', serialNumber: '', qty: 1, kondisi: 'Baik', keterangan: '' }]);
    };

    // Save BAST Document
    const handleSaveDocument = async (downloadPdf = false) => {
        if (!pihak1.nama || !pihak2.nama) {
            alert('Harap isi Nama Pihak Pertama dan Nama Pihak Kedua!');
            return;
        }

        const docPayload = {
            id: editingId || `bast_${Date.now()}`,
            noBast,
            tanggal,
            lokasi,
            status: statusDoc,
            pihak1,
            pihak2,
            mengetahui,
            items,
            catatan,
            updatedAt: new Date().toISOString(),
        };

        const existingIndex = bastHistory.findIndex(doc => doc.id === docPayload.id);
        let updatedHistory = [];

        if (existingIndex >= 0) {
            updatedHistory = [...bastHistory];
            updatedHistory[existingIndex] = docPayload;
        } else {
            updatedHistory = [docPayload, ...bastHistory];
        }

        setBastHistory(updatedHistory);
        await saveBastDocuments(updatedHistory);

        if (downloadPdf) {
            generateBastPdf(docPayload);
        }

        alert(editingId ? 'Dokumen BAST berhasil diperbarui!' : 'Dokumen BAST berhasil disimpan!');
    };

    // Load Document for Editing
    const handleEditDocument = (doc) => {
        setEditingId(doc.id);
        setNoBast(doc.noBast);
        setTanggal(doc.tanggal);
        setLokasi(doc.lokasi);
        setStatusDoc(doc.status || 'Completed');
        setPihak1(doc.pihak1 || { nama: '', nik: '', jabatan: 'Staff ICT', dept: 'ICT', ttd: null });
        setPihak2(doc.pihak2 || { nama: '', nik: '', jabatan: '', dept: '', ttd: null });
        setMengetahui(doc.mengetahui || { nama: 'Head of ICT', jabatan: 'ICT Manager', ttd: null });
        setItems(doc.items || []);
        setCatatan(doc.catatan || '');
        setActiveTab('form');
    };

    // Delete Document
    const handleDeleteDocument = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus dokumen BAST ini?')) return;
        const updated = bastHistory.filter(doc => doc.id !== id);
        setBastHistory(updated);
        await saveBastDocuments(updated);
    };

    // Filtered Assets for Modal
    const filteredMasterAssets = masterAssets.filter(a => {
        const query = assetSearchQuery.toLowerCase();
        const barcode = (a.barcode || a['BARCODE ASET'] || a['BARCODE'] || '').toLowerCase();
        const nama = (a.namaAset || a['NAMA ASET'] || a['DESCRIPTION'] || '').toLowerCase();
        return barcode.includes(query) || nama.includes(query);
    }).slice(0, 30);

    // Filtered History List
    const filteredHistory = bastHistory.filter(doc => {
        const query = historySearch.toLowerCase();
        const no = (doc.noBast || '').toLowerCase();
        const p1 = (doc.pihak1?.nama || '').toLowerCase();
        const p2 = (doc.pihak2?.nama || '').toLowerCase();
        return no.includes(query) || p1.includes(query) || p2.includes(query);
    });

    return (
        <div style={{ minHeight: '100vh', fontFamily: 'var(--font-sora)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Header */}
            <header className="wa-app-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Link to="/" aria-label="Kembali ke Menu Utama" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        <ArrowLeft size={18} />
                    </Link>
                    <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, background: 'var(--accent-soft)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileCheck size={18} color="var(--accent)" />
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                                Berita Acara Serah Terima (BAST)
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>
                                MOD 06 · DOCUMENTATION SYSTEM
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="wa-pill">
                        <button
                            type="button"
                            className={`wa-pill-item ${activeTab === 'form' ? 'active' : ''}`}
                            onClick={() => setActiveTab('form')}
                        >
                            <Plus size={14} /> Buat BAST
                        </button>
                        <button
                            type="button"
                            className={`wa-pill-item ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            <FileText size={14} /> Riwayat ({bastHistory.length})
                        </button>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: '24px 28px', maxWidth: 1280, margin: '0 auto' }}>
                {activeTab === 'form' ? (
                    <div>
                        {/* Action Bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 20,
                            padding: '14px 20px',
                            background: 'var(--bg-surface)',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {editingId ? 'Edit Dokumen BAST' : 'Form Dokumen BAST Baru'}
                                </span>
                                {editingId && (
                                    <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                        (Modifikasi #{editingId})
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={handleResetForm} className="wa-btn-ghost" style={{ fontSize: 12 }}>
                                    <RefreshCw size={14} /> Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSaveDocument(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 14px',
                                        borderRadius: 6,
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Save size={14} /> Simpan Draft
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSaveDocument(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 16px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: 'var(--accent)',
                                        color: '#ffffff',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <Download size={14} /> Simpan & Cetak PDF
                                </button>
                            </div>
                        </div>

                        {/* Document Meta Section */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: 16,
                            marginBottom: 20,
                            padding: 20,
                            background: 'var(--bg-surface)',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600, display: 'block', marginBottom: 4 }}>NOMOR BAST</label>
                                <input
                                    type="text"
                                    value={noBast}
                                    onChange={(e) => setNoBast(e.target.value)}
                                    className="wa-input"
                                    style={{ width: '100%', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600, display: 'block', marginBottom: 4 }}>TANGGAL SERAH TERIMA</label>
                                <input
                                    type="date"
                                    value={tanggal}
                                    onChange={(e) => setTanggal(e.target.value)}
                                    className="wa-input"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600, display: 'block', marginBottom: 4 }}>LOKASI / UNIT</label>
                                <input
                                    type="text"
                                    value={lokasi}
                                    onChange={(e) => setLokasi(e.target.value)}
                                    className="wa-input"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600, display: 'block', marginBottom: 4 }}>STATUS DOKUMEN</label>
                                <select
                                    value={statusDoc}
                                    onChange={(e) => setStatusDoc(e.target.value)}
                                    className="wa-input"
                                    style={{ width: '100%' }}
                                >
                                    <option value="Completed">Completed (Final)</option>
                                    <option value="Draft">Draft</option>
                                </select>
                            </div>
                        </div>

                        {/* Parties Section (Pihak 1 & Pihak 2) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                            {/* Pihak Pertama */}
                            <div style={{
                                padding: 20,
                                background: 'var(--bg-surface)',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <UserCheck size={16} color="var(--accent)" />
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                                        PIHAK PERTAMA (Yang Menyerahkan)
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>NIK / NIP</label>
                                        <input
                                            type="text"
                                            value={pihak1.nik}
                                            onChange={(e) => setPihak1({ ...pihak1, nik: e.target.value })}
                                            placeholder="Contoh: 1029384"
                                            className="wa-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nama Lengkap *</label>
                                        <input
                                            type="text"
                                            value={pihak1.nama}
                                            onChange={(e) => setPihak1({ ...pihak1, nama: e.target.value })}
                                            placeholder="Contoh: Budi Santoso"
                                            className="wa-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Jabatan</label>
                                        <input
                                            type="text"
                                            value={pihak1.jabatan}
                                            onChange={(e) => setPihak1({ ...pihak1, jabatan: e.target.value })}
                                            className="wa-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Departemen</label>
                                        <input
                                            type="text"
                                            value={pihak1.dept}
                                            onChange={(e) => setPihak1({ ...pihak1, dept: e.target.value })}
                                            className="wa-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                {/* Signature Box Slot */}
                                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--border)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>Tanda Tangan Digital Pihak 1:</div>
                                    {pihak1.ttd ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 4, background: '#ffffff', width: 120, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <img src={pihak1.ttd} alt="TTD Pihak 1" style={{ maxHeight: 42, maxWidth: 110 }} />
                                            </div>
                                            <button type="button" onClick={() => openSignature('pihak1', 'Tanda Tangan Pihak Pertama')} className="wa-btn-ghost" style={{ fontSize: 11 }}>
                                                Ubah TTD
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => openSignature('pihak1', 'Tanda Tangan Pihak Pertama')}
                                            style={{
                                                padding: '8px 14px',
                                                borderRadius: 6,
                                                border: '1px dashed var(--accent)',
                                                background: 'var(--accent-soft)',
                                                color: 'var(--accent)',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            + Bubuhkan Tanda Tangan
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Pihak Kedua */}
                            <div style={{
                                padding: 20,
                                background: 'var(--bg-surface)',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <ShieldCheck size={16} color="var(--accent)" />
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                                        PIHAK KEDUA (Yang Menerima)
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>NIK / NIP</label>
                                        <input
                                            type="text"
                                            value={pihak2.nik}
                                            onChange={(e) => setPihak2({ ...pihak2, nik: e.target.value })}
                                            placeholder="Contoh: 1045921"
                                            className="wa-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nama Lengkap *</label>
                                        <input
                                            type="text"
                                            value={pihak2.nama}
                                            onChange={(e) => setPihak2({ ...pihak2, nama: e.target.value })}
                                            placeholder="Contoh: Ani Rahmawati"
                                            className="wa-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Jabatan</label>
                                        <input
                                            type="text"
                                            value={pihak2.jabatan}
                                            onChange={(e) => setPihak2({ ...pihak2, jabatan: e.target.value })}
                                            placeholder="Contoh: Supervisor Finance"
                                            className="wa-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Departemen</label>
                                        <input
                                            type="text"
                                            value={pihak2.dept}
                                            onChange={(e) => setPihak2({ ...pihak2, dept: e.target.value })}
                                            placeholder="Contoh: Finance & Accounting"
                                            className="wa-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                {/* Signature Box Slot */}
                                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--border)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>Tanda Tangan Digital Pihak 2:</div>
                                    {pihak2.ttd ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 4, background: '#ffffff', width: 120, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <img src={pihak2.ttd} alt="TTD Pihak 2" style={{ maxHeight: 42, maxWidth: 110 }} />
                                            </div>
                                            <button type="button" onClick={() => openSignature('pihak2', 'Tanda Tangan Pihak Kedua')} className="wa-btn-ghost" style={{ fontSize: 11 }}>
                                                Ubah TTD
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => openSignature('pihak2', 'Tanda Tangan Pihak Kedua')}
                                            style={{
                                                padding: '8px 14px',
                                                borderRadius: 6,
                                                border: '1px dashed var(--accent)',
                                                background: 'var(--accent-soft)',
                                                color: 'var(--accent)',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            + Bubuhkan Tanda Tangan
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Asset Items Table */}
                        <div style={{
                            padding: 20,
                            background: 'var(--bg-surface)',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)',
                            marginBottom: 20
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <PackageCheck size={18} color="var(--accent)" />
                                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Daftar Aset / Barang yang Diserahterimakan ({items.length})
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button
                                        type="button"
                                        onClick={() => setAssetModalOpen(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '6px 12px',
                                            borderRadius: 6,
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Search size={14} /> Pilih dari Master Aset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '6px 14px',
                                            borderRadius: 6,
                                            border: 'none',
                                            background: 'var(--accent)',
                                            color: '#ffffff',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={14} /> Tambah Baris Manual
                                    </button>
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                                            <th style={{ padding: 10, textAlign: 'center', width: 40 }}>NO</th>
                                            <th style={{ padding: 10, textAlign: 'left', width: 140 }}>BARCODE / KODE</th>
                                            <th style={{ padding: 10, textAlign: 'left' }}>NAMA ASET / BARANG *</th>
                                            <th style={{ padding: 10, textAlign: 'left', width: 130 }}>MERK / TYPE</th>
                                            <th style={{ padding: 10, textAlign: 'left', width: 130 }}>SERIAL NUMBER</th>
                                            <th style={{ padding: 10, textAlign: 'center', width: 60 }}>QTY</th>
                                            <th style={{ padding: 10, textAlign: 'left', width: 120 }}>KONDISI</th>
                                            <th style={{ padding: 10, textAlign: 'left' }}>KETERANGAN</th>
                                            <th style={{ padding: 10, textAlign: 'center', width: 50 }}>#</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: 8, textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>{index + 1}</td>
                                                <td style={{ padding: 8 }}>
                                                    <input
                                                        type="text"
                                                        value={item.barcode}
                                                        onChange={(e) => handleItemChange(item.id, 'barcode', e.target.value)}
                                                        placeholder="Code/Barcode"
                                                        className="wa-input"
                                                        style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 11 }}
                                                    />
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    <input
                                                        type="text"
                                                        value={item.namaBarang}
                                                        onChange={(e) => handleItemChange(item.id, 'namaBarang', e.target.value)}
                                                        placeholder="Contoh: Laptop HP ProBook G8"
                                                        className="wa-input"
                                                        style={{ width: '100%', fontSize: 12 }}
                                                    />
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    <input
                                                        type="text"
                                                        value={item.merkType}
                                                        onChange={(e) => handleItemChange(item.id, 'merkType', e.target.value)}
                                                        placeholder="Core i5 / 16GB"
                                                        className="wa-input"
                                                        style={{ width: '100%', fontSize: 11 }}
                                                    />
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    <input
                                                        type="text"
                                                        value={item.serialNumber}
                                                        onChange={(e) => handleItemChange(item.id, 'serialNumber', e.target.value)}
                                                        placeholder="S/N 5CD921XXXX"
                                                        className="wa-input"
                                                        style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 11 }}
                                                    />
                                                </td>
                                                <td style={{ padding: 8, textAlign: 'center' }}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.qty}
                                                        onChange={(e) => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 1)}
                                                        className="wa-input"
                                                        style={{ width: '100%', textAlign: 'center' }}
                                                    />
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    <select
                                                        value={item.kondisi}
                                                        onChange={(e) => handleItemChange(item.id, 'kondisi', e.target.value)}
                                                        className="wa-input"
                                                        style={{ width: '100%', fontSize: 11 }}
                                                    >
                                                        <option value="Baik">Baik</option>
                                                        <option value="Rusak Ringan">Rusak Ringan</option>
                                                        <option value="Rusak Berat">Rusak Berat</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    <input
                                                        type="text"
                                                        value={item.keterangan}
                                                        onChange={(e) => handleItemChange(item.id, 'keterangan', e.target.value)}
                                                        placeholder="Kelengkapan (Charger, Mouse)"
                                                        className="wa-input"
                                                        style={{ width: '100%', fontSize: 11 }}
                                                    />
                                                </td>
                                                <td style={{ padding: 8, textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        disabled={items.length <= 1}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: items.length <= 1 ? 'var(--text-tertiary)' : 'var(--danger-500, #ef4444)',
                                                            cursor: items.length <= 1 ? 'not-allowed' : 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Catatan & Approval Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                            {/* Catatan Syarat Ketentuan */}
                            <div style={{
                                padding: 20,
                                background: 'var(--bg-surface)',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                                    Catatan / Syarat & Ketentuan BAST
                                </label>
                                <textarea
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    rows={4}
                                    className="wa-input"
                                    style={{ width: '100%', fontSize: 12, lineHeight: 1.5 }}
                                />
                            </div>

                            {/* Mengetahui / Head of ICT Signature */}
                            <div style={{
                                padding: 20,
                                background: 'var(--bg-surface)',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                                    MENGETAHUI (Head of ICT)
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nama Atasan / Supervisor</label>
                                    <input
                                        type="text"
                                        value={mengetahui.nama}
                                        onChange={(e) => setMengetahui({ ...mengetahui, nama: e.target.value })}
                                        className="wa-input"
                                        style={{ width: '100%', fontSize: 12 }}
                                    />
                                </div>

                                {mengetahui.ttd ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                                        <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 4, background: '#ffffff', width: 110, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <img src={mengetahui.ttd} alt="TTD Mengetahui" style={{ maxHeight: 38, maxWidth: 100 }} />
                                        </div>
                                        <button type="button" onClick={() => openSignature('mengetahui', 'Tanda Tangan Mengetahui')} className="wa-btn-ghost" style={{ fontSize: 11 }}>
                                            Ubah
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => openSignature('mengetahui', 'Tanda Tangan Mengetahui')}
                                        style={{
                                            marginTop: 6,
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: 6,
                                            border: '1px dashed var(--border)',
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + TTD Mengetahui
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* History Documents Tab */
                    <div style={{
                        padding: 20,
                        background: 'var(--bg-surface)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                Riwayat & Dokumen BAST Tersimpan ({filteredHistory.length})
                            </div>
                            <div style={{ width: 320 }}>
                                <input
                                    type="text"
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    placeholder="Cari Nomor BAST / Nama Pihak..."
                                    className="wa-input"
                                    style={{ width: '100%', fontSize: 12 }}
                                />
                            </div>
                        </div>

                        {filteredHistory.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                                <FileText size={36} strokeWidth={1.5} style={{ marginBottom: 10, opacity: 0.5 }} />
                                <div style={{ fontSize: 14 }}>Belum ada dokumen BAST yang tersimpan.</div>
                                <button type="button" onClick={() => setActiveTab('form')} className="wa-btn-ghost" style={{ marginTop: 12 }}>
                                    + Buat BAST Baru
                                </button>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                                            <th style={{ padding: 12, textAlign: 'left' }}>NOMOR BAST</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>TANGGAL</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>PIHAK 1 (PENYERAH)</th>
                                            <th style={{ padding: 12, textAlign: 'left' }}>PIHAK KEDUA (PENERIMA)</th>
                                            <th style={{ padding: 12, textAlign: 'center' }}>JUMLAH BARANG</th>
                                            <th style={{ padding: 12, textAlign: 'center' }}>STATUS</th>
                                            <th style={{ padding: 12, textAlign: 'center' }}>AKSI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHistory.map((doc) => (
                                            <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                                                    {doc.noBast}
                                                </td>
                                                <td style={{ padding: 12, color: 'var(--text-secondary)' }}>
                                                    {doc.tanggal}
                                                </td>
                                                <td style={{ padding: 12 }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.pihak1?.nama || '-'}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{doc.pihak1?.dept || '-'}</div>
                                                </td>
                                                <td style={{ padding: 12 }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.pihak2?.nama || '-'}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{doc.pihak2?.dept || '-'}</div>
                                                </td>
                                                <td style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {doc.items?.length || 0} Aset
                                                </td>
                                                <td style={{ padding: 12, textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '2px 8px',
                                                        borderRadius: 12,
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        background: doc.status === 'Completed' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                                                        color: doc.status === 'Completed' ? '#22c55e' : '#d97706'
                                                    }}>
                                                        {doc.status || 'Completed'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: 12, textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => generateBastPdf(doc)}
                                                            title="Unduh PDF BAST"
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: 4,
                                                                border: '1px solid var(--border)',
                                                                background: 'var(--bg-input)',
                                                                color: 'var(--text-primary)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditDocument(doc)}
                                                            title="Edit Dokumen"
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: 4,
                                                                border: '1px solid var(--border)',
                                                                background: 'var(--bg-input)',
                                                                color: 'var(--accent)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDocument(doc.id)}
                                                            title="Hapus Dokumen"
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: 4,
                                                                border: '1px solid var(--border)',
                                                                background: 'var(--bg-input)',
                                                                color: 'var(--danger-500, #ef4444)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Signature Modal */}
            <SignaturePadModal
                isOpen={sigModal.isOpen}
                title={sigModal.title}
                onClose={() => setSigModal({ ...sigModal, isOpen: false })}
                onSave={handleSaveSignature}
            />

            {/* Asset Picker Modal */}
            {assetModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    padding: 16
                }}>
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        borderRadius: 12,
                        width: '100%',
                        maxWidth: 640,
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>Pilih Aset dari Master Data</div>
                            <button type="button" onClick={() => setAssetModalOpen(false)} className="wa-btn-ghost">Tutup</button>
                        </div>
                        <div style={{ padding: 16 }}>
                            <input
                                type="text"
                                value={assetSearchQuery}
                                onChange={(e) => setAssetSearchQuery(e.target.value)}
                                placeholder="Cari Barcode atau Nama Aset..."
                                className="wa-input"
                                style={{ width: '100%', fontSize: 13 }}
                                autoFocus
                            />
                        </div>
                        <div style={{ overflowY: 'auto', padding: '0 16px 16px', flex: 1 }}>
                            {filteredMasterAssets.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                    Tidak ada data aset yang cocok dengan kata kunci.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {filteredMasterAssets.map((asset, i) => {
                                        const barcode = asset.barcode || asset['BARCODE ASET'] || asset['BARCODE'] || '-';
                                        const nama = asset.namaAset || asset['NAMA ASET'] || asset['DESCRIPTION'] || 'Tanpa Nama';
                                        const merk = asset.merk || asset['MERK'] || asset['TIPE'] || '-';
                                        const sn = asset.serialNumber || asset['SERIAL NUMBER'] || asset['SN'] || '-';

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => handleSelectAsset(asset)}
                                                style={{
                                                    padding: 12,
                                                    borderRadius: 8,
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-input)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{nama}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                                                        Barcode: {barcode} | Merk: {merk} | S/N: {sn}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: 4,
                                                        border: 'none',
                                                        background: 'var(--accent)',
                                                        color: '#ffffff',
                                                        fontSize: 11,
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    Pilih
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
