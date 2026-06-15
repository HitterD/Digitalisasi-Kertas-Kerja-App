import { useState } from 'react';
import { Download } from 'lucide-react';

/**
 * PreviewModal
 * Modal to preview Excel data before downloading.
 * 
 * @param {boolean} isOpen - Modal visibility state
 * @param {function} onClose - Callback to close modal
 * @param {Object} previewData - Payload containing sheets and room info
 * @param {function} onDownload - Callback to trigger excel download
 */
const PreviewModal = ({ isOpen, onClose, previewData, onDownload }) => {
    const [activeTab, setActiveTab] = useState('temuan');

    if (!isOpen || !previewData) return null;

    const renderTemuanTable = () => (
        <div className="asset-table-wrapper" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="asset-table" style={{ fontSize: '13px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>NO</th>
                        <th style={{ width: 150, textAlign: 'center' }}>Barcoding</th>
                        <th style={{ minWidth: 250 }}>NAMA ASET SESUAI SISTEM BARCODE</th>
                        <th style={{ minWidth: 250 }}>KETIDAK SESUAIAN SPESIFIKASI / LOKASI RUANGAN LAPANGAN</th>
                        <th colSpan={2} style={{ width: 100 }}>KONDISI FISIK ASET</th>
                        <th style={{ minWidth: 350 }}>KETERANGAN KONDISI ASSET/LOKASI SAAT INI</th>
                        <th style={{ width: 150 }}>TARGET PENYELESAIAN</th>
                        <th style={{ width: 250 }}>ACTION</th>
                        <th style={{ width: 150 }}>VERIFIKASI PUSAT</th>
                    </tr>
                </thead>
                <tbody>
                    {previewData.sheets.temuan.map((row, i) => (
                        <tr key={i} style={{ backgroundColor: row.bgColor, color: '#000' }}>
                            <td style={{ textAlign: 'center' }}>{row.no}</td>
                            <td style={{ textAlign: 'center' }}>{row.barcode}</td>
                            <td>{row.namaAsset}</td>
                            <td>{row.ketidaksesuaian}</td>
                            <td colSpan={2}></td>
                            <td>{row.keterangan}</td>
                            <td>{row.target}</td>
                            <td>{row.action}</td>
                            <td></td>
                        </tr>
                    ))}
                    {previewData.sheets.temuan.length === 0 && (
                        <tr><td colSpan={10} style={{ textAlign: 'center' }}>Tidak ada temuan di ruangan ini</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    const renderRecouncilTable = () => (
        <div className="asset-table-wrapper" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="asset-table" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>NO</th>
                        <th style={{ width: 120 }}>Oracle Asset</th>
                        <th style={{ width: 150, textAlign: 'center' }}>Barcode</th>
                        <th style={{ width: 150 }}>No PO / Ref Number</th>
                        <th style={{ minWidth: 250 }}>Nama Asset</th>
                        <th style={{ minWidth: 200 }}>Ruangan Opname</th>
                        <th style={{ minWidth: 200 }}>Ruangan Master</th>
                        <th style={{ width: 100, textAlign: 'center' }}>Kondisi</th>
                        <th style={{ minWidth: 350 }}>Keterangan</th>
                        <th style={{ minWidth: 200 }}>Action</th>
                        <th>Col K</th><th>Col L</th><th>Col M</th><th>Col N</th><th>Col O</th><th>Col P</th><th>Col Q</th>
                    </tr>
                </thead>
                <tbody>
                    {previewData.sheets.recouncil.map((row, i) => (
                        <tr key={i} style={{ backgroundColor: row.bgColor || '#fff', color: '#000' }}>
                            <td style={{ textAlign: 'center' }}>{row.no}</td>
                            <td>{row.oracleId}</td>
                            <td style={{ textAlign: 'center' }}>{row.barcode}</td>
                            <td>{row.noPo}</td>
                            <td>{row.namaAsset}</td>
                            <td>{row.ruanganOpname}</td>
                            <td>{row.ruanganMaster}</td>
                            <td style={{ textAlign: 'center' }}>{row.kondisi}</td>
                            <td>{row.keterangan}</td>
                            <td>{row.action}</td>
                            <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderMatTable = () => (
        <div className="asset-table-wrapper" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="asset-table" style={{ fontSize: '13px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                        <th style={{ width: 150, textAlign: 'center' }}>Barcode</th>
                        <th style={{ width: 120 }}>PIC Ruangan</th>
                        <th style={{ minWidth: 250 }}>Nama Asset</th>
                        <th style={{ minWidth: 200 }}>Nama Ruangan Asal</th>
                        <th style={{ minWidth: 200 }}>Nama Ruangan Tujuan</th>
                        <th style={{ width: 100, textAlign: 'center' }}>Kondisi Asset</th>
                        <th style={{ minWidth: 350 }}>Keterangan</th>
                        <th style={{ minWidth: 250 }}>Saran Div. ICT (Pusat)</th>
                    </tr>
                </thead>
                <tbody>
                    {previewData.sheets.mat.map((row, i) => (
                        <tr key={i} style={{ backgroundColor: row.bgColor, color: '#000' }}>
                            <td style={{ textAlign: 'center' }}>{row.barcode}</td>
                            <td>{row.pic}</td>
                            <td>{row.namaAsset}</td>
                            <td>{row.ruanganMaster}</td>
                            <td>{row.ruanganOpname}</td>
                            <td style={{ textAlign: 'center' }}>{row.kondisi}</td>
                            <td>{row.keterangan}</td>
                            <td>{row.saran}</td>
                        </tr>
                    ))}
                    {previewData.sheets.mat.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center' }}>Tidak ada form MAT yang perlu dibuat</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    const activeTabStyle = {
        padding: '10px 16px', borderBottom: '2px solid var(--terracotta-500)', color: 'var(--charcoal-900)', fontWeight: 600, cursor: 'pointer'
    };
    const inactiveTabStyle = {
        padding: '10px 16px', color: 'rgba(26, 26, 26, 0.55)', cursor: 'pointer', borderBottom: '2px solid transparent'
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="wa-card" style={{ width: '90%', maxWidth: 1400, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(26, 26, 26, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--charcoal-900)' }}>Preview Excel - Ruangan {previewData.room}</h2>
                        <span style={{ fontSize: '0.875rem', color: 'rgba(26, 26, 26, 0.6)' }}>PIC: {previewData.pic || '-'} | Tgl Opname: {previewData.tglOpname || '-'}</span>
                    </div>
                </div>

                {/* Body = Tabs + Content */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(26, 26, 26, 0.06)', backgroundColor: 'transparent', padding: '0 24px' }}>
                    <div style={activeTab === 'temuan' ? activeTabStyle : inactiveTabStyle} onClick={() => setActiveTab('temuan')}>FORM TEMUAN HASIL OPNAME</div>
                    <div style={activeTab === 'recouncil' ? activeTabStyle : inactiveTabStyle} onClick={() => setActiveTab('recouncil')}>Recouncil</div>
                    <div style={activeTab === 'mat' ? activeTabStyle : inactiveTabStyle} onClick={() => setActiveTab('mat')}>HASIL_MAT</div>
                </div>

                <div style={{ flex: 1, overflow: 'hidden', padding: 24 }}>
                    {activeTab === 'temuan' && renderTemuanTable()}
                    {activeTab === 'recouncil' && renderRecouncilTable()}
                    {activeTab === 'mat' && renderMatTable()}
                </div>

                {/* Footer Controls */}
                <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(26, 26, 26, 0.06)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="wa-btn-ghost" onClick={onClose}>Tutup Preview</button>
                    <button className="wa-btn wa-btn-terracotta" onClick={onDownload}>
                        <Download size={16} /> Download Excel Form
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
