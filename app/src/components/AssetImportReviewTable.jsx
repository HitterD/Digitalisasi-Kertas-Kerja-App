import React, { useState } from 'react';

function AssetImportReviewTable({ assets, selectedCategory, onAssetDecision, onBatchDecision }) {
  const [activeTab, setActiveTab] = useState('review');

  const includeList = assets.filter(a => a._classification.importDecision === 'include');
  const reviewList = assets.filter(a => a._classification.importDecision === 'review');
  const excludeList = assets.filter(a => a._classification.importDecision === 'exclude');

  const tabs = [
    { id: 'include', label: `Masuk ${selectedCategory}`, count: includeList.length },
    { id: 'review', label: 'Perlu Review', count: reviewList.length },
    { id: 'exclude', label: 'Exclude', count: excludeList.length }
  ];

  const getActiveList = () => {
    if (activeTab === 'include') return includeList;
    if (activeTab === 'review') return reviewList;
    return excludeList;
  };

  const renderBadge = (asset) => {
    const dec = asset._classification.importDecision;
    const cat = asset._classification.ownerCategory;
    
    if (dec === 'include') {
      return <span className="inline-flex px-2 py-1 text-[10px] font-black rounded-full text-blue-700 bg-blue-50 border border-blue-200 uppercase">Masuk {selectedCategory}</span>;
    }
    if (dec === 'exclude') {
      return <span className="inline-flex px-2 py-1 text-[10px] font-black rounded-full text-red-700 bg-red-50 border border-red-200 uppercase">Exclude</span>;
    }
    if (cat) {
      return <span className="inline-flex px-2 py-1 text-[10px] font-black rounded-full text-amber-700 bg-amber-50 border border-amber-200 uppercase">Perlu Konfirmasi ({cat}?)</span>;
    }
    return <span className="inline-flex px-2 py-1 text-[10px] font-black rounded-full text-amber-700 bg-amber-50 border border-amber-200 uppercase">Perlu Pilih</span>;
  };

  const renderStatusBadge = (asset) => {
    const conf = asset._classification.ownerConfidence;
    const warn = asset._classification.warning;

    if (warn) {
      return <span className="inline-flex px-2 py-1 text-[10px] font-black rounded-full text-amber-700 bg-amber-50 border border-amber-200" title={warn}>Ambiguous</span>;
    }
    if (conf === 'high') {
      return <span className="inline-flex px-2 py-1 text-[10px] font-black rounded-full text-green-700 bg-green-50 border border-green-200">High Confidence</span>;
    }
    return <span className="inline-flex px-2 py-1 text-[10px] font-black rounded-full text-gray-600 bg-gray-100 border border-gray-200">Unknown</span>;
  };

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        <div style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '12px', background: 'white' }}>
          <span style={{ display: 'block', fontSize: '20px', fontWeight: 900, color: 'var(--charcoal-900)' }}>{includeList.length}</span>
          <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--charcoal-600)', textTransform: 'uppercase' }}>Masuk {selectedCategory}</span>
        </div>
        <div style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '12px', background: 'white' }}>
          <span style={{ display: 'block', fontSize: '20px', fontWeight: 900, color: '#d97706' }}>{reviewList.length}</span>
          <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--charcoal-600)', textTransform: 'uppercase' }}>Perlu Review</span>
        </div>
        <div style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '12px', background: 'white' }}>
          <span style={{ display: 'block', fontSize: '20px', fontWeight: 900, color: '#6b7280' }}>{excludeList.length}</span>
          <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--charcoal-600)', textTransform: 'uppercase' }}>Exclude</span>
        </div>
        <div style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-surface)' }}>
          <span style={{ display: 'block', fontSize: '20px', fontWeight: 900, color: 'var(--terracotta-500)' }}>{includeList.length}</span>
          <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--terracotta-500)', textTransform: 'uppercase' }}>Total Akan Diimport</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '6px 12px', fontSize: '12px', fontWeight: 900, borderRadius: '9999px', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === t.id ? 'var(--bg-surface)' : 'white',
              color: activeTab === t.id ? 'var(--terracotta-500)' : 'var(--charcoal-500)',
              borderColor: activeTab === t.id ? 'var(--border)' : 'var(--border)'
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Toolbar for batch actions in review tab */}
      {activeTab === 'review' && reviewList.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', background: 'white', padding: '8px', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <button 
            onClick={() => onBatchDecision('include')}
            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 900, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer' }}
          >
            Masuk {selectedCategory} Semua
          </button>
          <button 
            onClick={() => onBatchDecision('exclude')}
            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 900, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer' }}
          >
            Exclude Semua
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px', fontSize: '12px', fontWeight: 900, color: 'var(--charcoal-600)', textTransform: 'uppercase', width: '15%' }}>Kode Aset</th>
              <th style={{ padding: '12px', fontSize: '12px', fontWeight: 900, color: 'var(--charcoal-600)', textTransform: 'uppercase', width: '40%' }}>Deskripsi</th>
              <th style={{ padding: '12px', fontSize: '12px', fontWeight: 900, color: 'var(--charcoal-600)', textTransform: 'uppercase', width: '20%' }}>Status / Note</th>
              <th style={{ padding: '12px', fontSize: '12px', fontWeight: 900, color: 'var(--charcoal-600)', textTransform: 'uppercase', width: '25%', textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {getActiveList().map((a, i) => {
              const dec = a._classification.importDecision;
              return (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--charcoal-900)', fontFamily: 'monospace' }}>{a.BARCODE_ASSET}</div>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--charcoal-900)', lineHeight: 1.4 }}>{a.NAMA_ASSET}</div>
                  <div style={{ fontSize: '10px', color: 'var(--charcoal-400)', marginTop: '4px', textTransform: 'uppercase' }}>SQL Owner: {a.CREATE_USER || 'N/A'}</div>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                    {renderBadge(a)}
                    {renderStatusBadge(a)}
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {activeTab === 'review' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                      <button 
                        onClick={() => onAssetDecision(a.BARCODE_ASSET, 'include')}
                        style={{ padding: '6px', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer' }}
                        title={`Masuk ${selectedCategory}`}
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => onAssetDecision(a.BARCODE_ASSET, 'exclude')}
                        style={{ padding: '6px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' }}
                        title="Exclude"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => onAssetDecision(a.BARCODE_ASSET, 'review')}
                      style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--charcoal-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Batal
                    </button>
                  )}
                </td>
              </tr>
            )})}
            {getActiveList().length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--charcoal-500)', fontWeight: 'bold' }}>
                  Tidak ada aset di tab ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Note about ambiguity */}
      {reviewList.length > 0 && (
        <div className="mt-3 p-3 bg-[#fffaf5] border border-dashed border-[#e2c9bb] rounded-xl text-xs text-[#756f68] leading-relaxed">
          <b className="text-[#b9563b] block mb-1">Catatan:</b> Anda harus menentukan status (✓ Include atau ✕ Exclude) untuk semua aset yang ada di tab "Perlu Review" sebelum dapat melakukan import. Tombol Import akan aktif setelah tab ini kosong.
        </div>
      )}
    </div>
  );
}

export default AssetImportReviewTable;
