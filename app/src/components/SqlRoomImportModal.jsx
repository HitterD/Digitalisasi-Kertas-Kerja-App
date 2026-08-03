import React, { useState, useEffect } from 'react';
import SqlRoomPicker from './SqlRoomPicker';
import OwnerCategorySelector from './OwnerCategorySelector';
import AssetImportReviewTable from './AssetImportReviewTable';
import { buildImportPreview, mapSqlAssetToOpnameAsset } from '../utils/sqlRoomImport';
import { apiUrl, fetchWithAuth } from '../utils/apiConfig';

function SqlRoomImportModal({ isOpen, onClose, onImport, existingRooms }) {
  const [step, setStep] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedRoom(null);
      setSelectedCategory(null);
      setAssets([]);
      setError(null);
    }
  }, [isOpen]);

  const fetchAssets = async () => {
    if (!selectedRoom || !selectedCategory) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/db/rooms/${encodeURIComponent(selectedRoom.NAMA_RUANGAN)}/assets?owner=${encodeURIComponent(selectedCategory)}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        const previewData = buildImportPreview(data.data || [], selectedCategory);
        
        // Re-construct single array of classified assets for state
        const allClassified = [
          ...previewData.includeList,
          ...previewData.reviewList,
          ...previewData.excludeList
        ];
        
        setAssets(allClassified);
        setStep(3);
      } else {
        setError(data.error || 'Failed to fetch assets');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetDecision = (barcodeAsset, decision) => {
    setAssets(prev => prev.map(a => a.BARCODE_ASSET === barcodeAsset ? { 
      ...a, 
      _classification: { ...a._classification, importDecision: decision } 
    } : a));
  };

  const handleBatchDecision = (decision) => {
    setAssets(prev => prev.map(a => {
      // Only change those currently in 'review' state
      if (a._classification.importDecision === 'review') {
        return { 
          ...a, 
          _classification: { ...a._classification, importDecision: decision } 
        };
      }
      return a;
    }));
  };

  const handleImport = () => {
    const assetsToImport = assets.filter(a => a._classification.importDecision === 'include');

    const mappedAssets = assetsToImport.map(mapSqlAssetToOpnameAsset);

    const roomData = {
      roomName: selectedRoom.NAMA_RUANGAN,
      picName: selectedRoom.PIC_RUANGAN,
      period: 'PERIODE OPNAME KINI',
      area: '',
      date: new Date().toLocaleDateString('id-ID'),
      isSqlImported: true,
      sqlCategory: selectedCategory,
      assets: mappedAssets
    };

    onImport({
      ...roomData,
      appendIfExist: true
    });
    onClose();
  };

  const canProceedToReview = selectedRoom && selectedCategory;
  const reviewListCount = assets.filter(a => a._classification.importDecision === 'review').length;
  const includeListCount = assets.filter(a => a._classification.importDecision === 'include').length;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 60, position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="wa-card" style={{ padding: 0, width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white', borderRadius: '24px' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--charcoal-900)', margin: 0 }}>
            Import Ruangan dari SQL Server
          </h2>
          <button 
            onClick={onClose}
            className="wa-btn-ghost"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            &times;
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'var(--bg-surface)', position: 'relative' }}>
          {error && (
            <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', borderRadius: '12px', color: 'var(--danger-700)', fontSize: '14px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Error: {error}</span>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--danger-700)', cursor: 'pointer' }}>&times;</button>
            </div>
          )}

          {step < 3 && (
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ flex: 1 }}>
                <SqlRoomPicker 
                  onSelectRoom={setSelectedRoom} 
                  selectedRoom={selectedRoom}
                  existingRooms={existingRooms}
                />
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
                <OwnerCategorySelector 
                  onSelect={setSelectedCategory}
                  selected={selectedCategory}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--charcoal-900)', margin: 0 }}>Review: {selectedRoom?.NAMA_RUANGAN}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--charcoal-600)', margin: '4px 0 0 0' }}>Kategori import: <strong style={{ color: 'var(--blue-700)' }}>{selectedCategory}</strong></p>
                </div>
                <button 
                  onClick={() => setStep(1)}
                  className="wa-btn-ghost"
                >
                  Kembali Edit
                </button>
              </div>

              <AssetImportReviewTable 
                assets={assets}
                selectedCategory={selectedCategory}
                onAssetDecision={handleAssetDecision}
                onBatchDecision={handleBatchDecision}
              />
            </div>
          )}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
          {step < 3 ? (
            <button 
              onClick={fetchAssets}
              disabled={!canProceedToReview || loading}
              className="wa-btn"
              style={{ background: (canProceedToReview && !loading) ? 'var(--terracotta-500)' : 'var(--charcoal-200)', color: (canProceedToReview && !loading) ? 'white' : 'var(--charcoal-500)', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: 700 }}
            >
              {loading ? 'Memuat Aset...' : 'Lanjut Review Aset'}
            </button>
          ) : (
            <button 
              onClick={handleImport}
              disabled={reviewListCount > 0 || includeListCount === 0}
              className="wa-btn"
              style={{ background: (reviewListCount === 0 && includeListCount > 0) ? 'var(--terracotta-500)' : 'var(--charcoal-200)', color: (reviewListCount === 0 && includeListCount > 0) ? 'white' : 'var(--charcoal-500)', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: 700 }}
              title={reviewListCount > 0 ? 'Selesaikan review aset ambigu dulu' : includeListCount === 0 ? 'Pilih minimal 1 aset untuk diimport' : 'Import sekarang'}
            >
              Import {includeListCount} Aset {selectedCategory}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SqlRoomImportModal;
