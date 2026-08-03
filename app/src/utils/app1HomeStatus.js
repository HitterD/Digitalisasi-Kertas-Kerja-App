const getSize = (value) => {
  if (!value) return 0;
  if (typeof value.size === 'number') return value.size;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object') return Object.keys(value).length;
  return 0;
};

export function getSavedSessionSummary(state) {
  const rooms = Array.isArray(state?.rooms) ? state.rooms : [];
  const assetCount = rooms.reduce((total, room) => total + (Array.isArray(room.assets) ? room.assets.length : 0), 0);
  const roomCount = rooms.length;

  return {
    hasSession: roomCount > 0,
    roomCount,
    assetCount,
    fileName: state?.fileName || '',
    label: roomCount > 0 ? `${roomCount} RUANGAN` : 'BELUM ADA SESI',
  };
}

export function getDatabaseReadiness({ masterDb, historyDb, hasSyncError = false } = {}) {
  const masterCount = getSize(masterDb);
  const historyCount = getSize(historyDb);
  const hasMaster = masterCount > 0;
  const hasHistory = historyCount > 0;

  if (hasSyncError) {
    return {
      key: 'error',
      label: 'GAGAL TERHUBUNG',
      tone: 'danger',
      masterCount,
      historyCount,
      masterLabel: hasMaster ? 'MASTER OK' : 'MASTER PERLU SYNC',
      historyLabel: hasHistory ? 'HISTORY OK' : 'HISTORY PERLU SYNC',
    };
  }

  if (hasMaster && hasHistory) {
    return {
      key: 'ready',
      label: 'SQL READY',
      tone: 'success',
      masterCount,
      historyCount,
      masterLabel: 'MASTER OK',
      historyLabel: 'HISTORY OK',
    };
  }

  if (hasMaster || hasHistory) {
    return {
      key: 'partial',
      label: hasMaster ? 'HISTORY PERLU SYNC' : 'MASTER PERLU SYNC',
      tone: 'warning',
      masterCount,
      historyCount,
      masterLabel: hasMaster ? 'MASTER OK' : 'MASTER PERLU SYNC',
      historyLabel: hasHistory ? 'HISTORY OK' : 'HISTORY PERLU SYNC',
    };
  }

  return {
    key: 'needs-sync',
    label: 'PERLU SYNC',
    tone: 'warning',
    masterCount,
    historyCount,
    masterLabel: 'MASTER PERLU SYNC',
    historyLabel: 'HISTORY PERLU SYNC',
  };
}

export function getApp1HeroCta({ hasSession }) {
  return hasSession
    ? { label: 'Lanjutkan Opname', target: 'opname' }
    : { label: 'Mulai Opname', target: 'prepare' };
}
