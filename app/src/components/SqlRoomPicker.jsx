import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, ChevronDown, Database, Loader2, Search, XCircle } from 'lucide-react';
import { apiUrl, fetchWithAuth } from '../utils/apiConfig';

function SqlRoomPicker({ onSelectRoom, selectedRoom, disabled }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  // localSelectedRoom is used if parent doesn't provide one
  const [localSelectedRoom, setLocalSelectedRoom] = useState(null);

  const currentSelectedRoom = selectedRoom !== undefined ? selectedRoom : localSelectedRoom;
  
  const containerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const fetchRooms = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(apiUrl('/api/db/rooms'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted && data.success) {
          setRooms(data.data || []);
        } else if (mounted) {
          setError(data.error || 'Failed to load rooms');
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchRooms();
    
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRooms = rooms.filter(r => 
    (r.NAMA_RUANGAN || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.PIC_RUANGAN || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (room) => {
    if (selectedRoom === undefined) setLocalSelectedRoom(room);
    setSearch(room.NAMA_RUANGAN);
    setIsOpen(false);
    if (onSelectRoom) onSelectRoom(room);
  };

  const handleClear = () => {
    if (selectedRoom === undefined) setLocalSelectedRoom(null);
    setSearch('');
    if (onSelectRoom) onSelectRoom(null);
  };

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          placeholder={loading ? 'Memuat ruangan SQL...' : 'Ketik nama atau kode ruang SQL...'}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (currentSelectedRoom) handleClear();
          }}
          onFocus={() => { if (!disabled) setIsOpen(true); }}
          onClick={() => { if (!disabled) setIsOpen(true); }}
          disabled={disabled}
          style={{ width: '100%', borderColor: currentSelectedRoom ? 'var(--terracotta-500)' : 'var(--border)', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text', position: 'relative', zIndex: 10 }}
        />
        {currentSelectedRoom && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            title="Hapus pilihan"
            style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--charcoal-400)', fontWeight: 'bold', cursor: 'pointer', zIndex: 20 }}
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '8px', color: 'var(--danger-600)', fontSize: '12px' }}>{error}</div>
      )}

      {isOpen && !disabled && (
        <div style={{ position: 'absolute', zIndex: 50, width: '100%', marginTop: '4px', background: 'white', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', maxHeight: '240px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--charcoal-500)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Loader2 size={16} className="animate-spin" /> Memuat data SQL...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--charcoal-500)', fontSize: '14px' }}>Tidak ada ruangan ditemukan.</div>
          ) : (
            filteredRooms.map((r, i) => (
              <div
                key={i}
                style={{ padding: '12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onClick={() => handleSelect(r)}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--charcoal-900)' }}>{r.NAMA_RUANGAN}</div>
                <div style={{ fontSize: '12px', color: 'var(--charcoal-600)', marginTop: '4px' }}>
                  {r.ASSET_COUNT} aset · PIC: {r.PIC_RUANGAN || 'Belum ada'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default SqlRoomPicker;
