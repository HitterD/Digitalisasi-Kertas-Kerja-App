import React from 'react';

function DeleteRoomConfirmModal({ roomName, assetCount, sourceLabel, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 60, position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="wa-card" style={{ padding: 0, width: '100%', maxWidth: '420px', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--charcoal-900)', margin: 0 }}>Hapus ruangan dari kertas kerja?</h2>
        </div>
        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--charcoal-600)', marginBottom: '16px', lineHeight: 1.5 }}>
            Anda akan menghapus ruangan <strong>{roomName}</strong> dari sesi opname saat ini.
            <br/><span style={{ fontSize: '12px' }}>Berisi <strong>{assetCount || 0}</strong> aset ({sourceLabel || 'Manual/Lokal'}).</span>
          </p>
          <div style={{ padding: '16px', background: 'var(--danger-50)', border: '1px solid var(--danger-200)', borderRadius: '12px', color: 'var(--danger-700)', fontSize: '12px', fontWeight: 700, lineHeight: 1.5 }}>
            Data SQL/server tidak akan berubah. Ruangan ini hanya dihapus dari kertas kerja lokal Anda.
          </div>
        </div>
        <div style={{ padding: '16px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onCancel} className="wa-btn-ghost">
            Batal
          </button>
          <button onClick={onConfirm} className="wa-btn" style={{ background: 'var(--danger-50)', color: 'var(--danger-700)', borderColor: 'var(--danger-200)' }}>
            Hapus dari Kertas Kerja
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteRoomConfirmModal;
