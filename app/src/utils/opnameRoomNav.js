export const ROOM_NAV_ELLIPSIS = 'ellipsis';

const DEFAULT_SIDE_WINDOW = 2;
const SMALL_ROOM_COUNT_LIMIT = 7;

const ROOM_STATUS_META = {
  done: { label: 'Selesai', icon: '✓' },
  progress: { label: 'Proses', icon: '…' },
  empty: { label: 'Belum', icon: '○' },
};

function clampIndex(index, totalRooms) {
  if (totalRooms <= 0) return 0;
  return Math.min(Math.max(index, 0), totalRooms - 1);
}

function createRoomItem(index) {
  return { type: 'room', index };
}

function createEllipsisItem(key) {
  return { type: ROOM_NAV_ELLIPSIS, key };
}

function normalizeProgress(progress) {
  return {
    checked: Number.isFinite(progress?.checked) ? progress.checked : 0,
    total: Number.isFinite(progress?.total) ? progress.total : 0,
  };
}

export function getRoomStatus(progress) {
  const { checked, total } = normalizeProgress(progress);
  if (total <= 0 || checked <= 0) return 'empty';
  if (checked >= total) return 'done';
  return 'progress';
}

export function getRoomName(room, index) {
  return room?.meta?.roomName || room?.sheetName || `Ruangan ${index + 1}`;
}

export function getRoomProgressText(progress) {
  const { checked, total } = normalizeProgress(progress);
  return `${checked}/${total}`;
}

export function getRoomStatusMeta(status) {
  return ROOM_STATUS_META[status] || ROOM_STATUS_META.empty;
}

export function getRoomStatusDescription(progress, status) {
  const { checked, total } = normalizeProgress(progress);

  if (total <= 0) return 'Belum ada aset di ruangan ini';
  if (status === 'done') return 'Semua aset sudah teropname';
  if (status === 'progress') return `${Math.max(total - checked, 0)} aset belum dicek`;
  return 'Belum mulai opname';
}

export function getRoomSearchText({ room, index, progress }) {
  const status = getRoomStatus(progress);
  const statusMeta = getRoomStatusMeta(status);
  const roomName = getRoomName(room, index);
  const progressText = getRoomProgressText(progress);

  return [
    String(index + 1),
    roomName,
    status,
    statusMeta.label,
    progressText,
  ].join(' ').toLowerCase();
}

export function getVisibleRoomItems(currentIndex, totalRooms, sideWindow = DEFAULT_SIDE_WINDOW) {
  if (totalRooms <= 0) return [];

  if (totalRooms <= SMALL_ROOM_COUNT_LIMIT) {
    return Array.from({ length: totalRooms }, (_, index) => createRoomItem(index));
  }

  const activeIndex = clampIndex(currentIndex, totalRooms);
  const start = Math.max(0, activeIndex - sideWindow);
  const end = Math.min(totalRooms - 1, activeIndex + sideWindow);
  const items = [createRoomItem(0)];

  if (start > 1) {
    items.push(createEllipsisItem('start'));
  }

  const visibleStart = Math.max(1, start);
  const visibleEnd = Math.min(totalRooms - 2, end);

  for (let index = visibleStart; index <= visibleEnd; index += 1) {
    items.push(createRoomItem(index));
  }

  if (end < totalRooms - 2) {
    items.push(createEllipsisItem('end'));
  }

  items.push(createRoomItem(totalRooms - 1));
  return items;
}
