import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  getRoomName,
  getRoomProgressText,
  getRoomSearchText,
  getRoomStatus,
  getRoomStatusDescription,
  getRoomStatusMeta,
} from '../utils/opnameRoomNav';

export default function RoomStatusSelect({ rooms, progress, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const activeRoom = safeRooms[value];
  const activeProgress = progress?.[value];
  const activeStatus = getRoomStatus(activeProgress);
  const activeStatusMeta = getRoomStatusMeta(activeStatus);
  const activeRoomName = activeRoom ? getRoomName(activeRoom, value) : 'Tidak ada ruangan';
  const activeProgressText = getRoomProgressText(activeProgress);
  const isDisabled = safeRooms.length === 0;

  const roomOptions = useMemo(() => (
    safeRooms.map((room, index) => {
      const roomProgress = progress?.[index];
      const status = getRoomStatus(roomProgress);
      const statusMeta = getRoomStatusMeta(status);
      const roomName = getRoomName(room, index);

      return {
        index,
        roomName,
        progress: roomProgress,
        progressText: getRoomProgressText(roomProgress),
        searchText: getRoomSearchText({ room, index, progress: roomProgress }),
        status,
        statusMeta,
        description: getRoomStatusDescription(roomProgress, status),
      };
    })
  ), [progress, safeRooms]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roomOptions;
    return roomOptions.filter((option) => option.searchText.includes(query));
  }, [roomOptions, search]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  function handleToggle() {
    if (isDisabled) return;
    setIsOpen((current) => !current);
  }

  function handleSelect(index) {
    onChange(index);
    setIsOpen(false);
    setSearch('');
  }

  return (
    <div className="room-status-select" ref={wrapperRef}>
      <button
        type="button"
        className={`room-status-select__trigger room-status-select__trigger--${activeStatus}`}
        aria-label="Pilih ruangan opname"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={isDisabled}
        onClick={handleToggle}
      >
        <span className={`room-status-select__icon room-status-select__icon--${activeStatus}`} aria-hidden="true">
          {activeStatusMeta.icon}
        </span>
        <span className="room-status-select__main">
          <span className="room-status-select__eyebrow">
            {isDisabled ? 'Ruangan' : `Ruangan ${value + 1} dari ${safeRooms.length}`}
          </span>
          <span className="room-status-select__name" title={activeRoomName}>{activeRoomName}</span>
        </span>
        {!isDisabled && (
          <>
            <span className={`room-status-select__badge room-status-select__badge--${activeStatus}`}>
              {activeStatusMeta.label}
            </span>
            <span className="room-status-select__progress">{activeProgressText}</span>
          </>
        )}
        <ChevronDown className={isOpen ? 'room-status-select__chevron open' : 'room-status-select__chevron'} size={16} />
      </button>

      {isOpen && (
        <div className="room-status-select__popover">
          <div className="room-status-select__search">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              role="searchbox"
              aria-label="Cari ruangan"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama / nomor / status ruangan…"
              autoFocus
            />
            <span className="room-status-select__count">{safeRooms.length} ruang</span>
          </div>

          <div className="room-status-select__list" role="listbox" aria-label="Daftar ruangan opname">
            {filteredOptions.length === 0 ? (
              <div className="room-status-select__empty">Ruangan tidak ditemukan</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.index === value;

                return (
                  <button
                    key={option.index}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`room-status-select__option room-status-select__option--${option.status}${isSelected ? ' is-selected' : ''}`}
                    title={`${option.index + 1}. ${option.roomName}`}
                    onClick={() => handleSelect(option.index)}
                  >
                    <span className={`room-status-select__option-icon room-status-select__option-icon--${option.status}`} aria-hidden="true">
                      {option.statusMeta.icon}
                    </span>
                    <span className="room-status-select__option-main">
                      <span className="room-status-select__option-name">{option.index + 1}. {option.roomName}</span>
                      <span className="room-status-select__option-desc">{option.description}</span>
                    </span>
                    <span className={`room-status-select__badge room-status-select__badge--${option.status}`}>
                      {option.statusMeta.label}
                    </span>
                    <span className="room-status-select__option-progress">{option.progressText}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
