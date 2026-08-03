import { normalizeSignatures } from './signatures';

/**
 * Merge engine for APP1 Opname sync — last-write-wins per field.
 * Pure function, no side effects.
 */

/** Fields that participate in last-write-wins merge. */
const MERGEABLE_FIELDS = [
  'isChecked', 'kondisi', 'keterangan', 'adaTidakAda',
  'namaAset', 'noPO', 'tipe', 'bulanPerolehan', 'tahunPerolehan',
];

const SIGNATURE_FIELDS = ['roleLabel', 'name', 'image', 'locked'];

function getRoomKey(room) {
  return room.sheetName || room.meta?.roomName || '';
}

/**
 * Merge a single item (asset / noBarcodeAsset / notAtLocationAsset) field by field.
 * @returns {{ merged: object, conflicts: Conflict[] }}
 */
function mergeItem(localItem, remoteItem, roomKey, assetKey) {
  const conflicts = [];
  const merged = { ...localItem };

  for (const field of MERGEABLE_FIELDS) {
    const localVal = localItem[field];
    const remoteVal = remoteItem[field];

    // If values are equal, no merge needed
    if (localVal === remoteVal) continue;

    const localTs = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
    const remoteTs = remoteItem.updatedAt ? new Date(remoteItem.updatedAt).getTime() : 0;

    // Only one side has changes
    if (remoteTs && !localTs) {
      merged[field] = remoteVal;
      merged.updatedAt = remoteItem.updatedAt;
    } else if (localTs && !remoteTs) {
      // keep local (already in merged)
    } else if (localTs && remoteTs) {
      // Both changed — last write wins
      const winner = remoteTs >= localTs ? 'remote' : 'local';
      if (winner === 'remote') {
        merged[field] = remoteVal;
        merged.updatedAt = remoteItem.updatedAt;
      }
      conflicts.push({
        roomKey,
        assetKey,
        field,
        localUpdatedAt: localItem.updatedAt,
        remoteUpdatedAt: remoteItem.updatedAt,
        winner,
      });
    }
  }

  return { merged, conflicts };
}

/**
 * Merge a list of items (assets, noBarcodeAssets, notAtLocationAssets).
 * Match by barcode (assets) or id (no-barcode/not-at-location).
 * @param {Array} localList
 * @param {Array} remoteList
 * @param {string} roomKey
 * @param {'barcode'|'id'} matchKey
 * @returns {{ merged: Array, conflicts: Conflict[] }}
 */
function mergeItemList(localList, remoteList, roomKey, matchKey) {
  const allConflicts = [];

  const remoteMap = new Map();
  for (const item of remoteList) {
    const key = String(item[matchKey] || '').trim();
    if (key) remoteMap.set(key, item);
  }

  const merged = [];
  const seen = new Set();

  // Merge items present in local
  for (const item of localList) {
    const key = String(item[matchKey] || '').trim();
    if (key && remoteMap.has(key)) {
      const { merged: mergedItem, conflicts } = mergeItem(item, remoteMap.get(key), roomKey, key);
      merged.push(mergedItem);
      allConflicts.push(...conflicts);
      seen.add(key);
    } else {
      merged.push(item);
      if (key) seen.add(key);
    }
  }

  // Append items only in remote
  for (const item of remoteList) {
    const key = String(item[matchKey] || '').trim();
    if (key && !seen.has(key)) {
      merged.push(item);
    }
  }

  return { merged, conflicts: allConflicts };
}

function mergeSignatures(localList, remoteList) {
  const hasRemote = Array.isArray(remoteList)
    ? remoteList.length > 0
    : remoteList && typeof remoteList === 'object' && Object.keys(remoteList).length > 0;
  if (!hasRemote) return localList;

  const localSignatures = normalizeSignatures(localList);
  const remoteSignatures = normalizeSignatures(remoteList);
  const remoteMap = new Map(remoteSignatures.map((item) => [item.id, item]));

  return localSignatures.map((localItem) => {
    const remoteItem = remoteMap.get(localItem.id);
    if (!remoteItem) return localItem;

    const localTs = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
    const remoteTs = remoteItem.updatedAt ? new Date(remoteItem.updatedAt).getTime() : 0;
    if (localTs && (!remoteTs || localTs > remoteTs)) return localItem;

    const merged = { ...localItem };
    for (const field of SIGNATURE_FIELDS) {
      if (remoteItem[field] !== undefined) merged[field] = remoteItem[field];
    }
    if (remoteItem.updatedAt) merged.updatedAt = remoteItem.updatedAt;
    return merged;
  }).concat(remoteSignatures.filter((remoteItem) => !localSignatures.some((localItem) => localItem.id === remoteItem.id)));
}

/**
 * Merge full opname result: local state + remote state → merged state + conflict log.
 * @param {object} local — { rooms: Room[] }
 * @param {object} remote — { rooms: Room[] }
 * @returns {{ merged: object, conflicts: Conflict[] }}
 */
export function mergeOpnameResult(local, remote) {
  const allConflicts = [];

  const remoteRoomMap = new Map();
  for (const room of (remote.rooms || [])) {
    remoteRoomMap.set(getRoomKey(room), room);
  }

  const mergedRooms = [];
  const seenRooms = new Set();

  // Process rooms present in local
  for (const localRoom of (local.rooms || [])) {
    const roomKey = getRoomKey(localRoom);
    seenRooms.add(roomKey);

    if (remoteRoomMap.has(roomKey)) {
      const remoteRoom = remoteRoomMap.get(roomKey);

      const assets = mergeItemList(localRoom.assets || [], remoteRoom.assets || [], roomKey, 'barcode');
      const noBarcodes = mergeItemList(localRoom.noBarcodeAssets || [], remoteRoom.noBarcodeAssets || [], roomKey, 'id');
      const notAtLoc = mergeItemList(localRoom.notAtLocationAssets || [], remoteRoom.notAtLocationAssets || [], roomKey, 'id');

      allConflicts.push(...assets.conflicts, ...noBarcodes.conflicts, ...notAtLoc.conflicts);

      mergedRooms.push({
        ...localRoom,
        meta: { ...localRoom.meta, ...remoteRoom.meta },
        assets: assets.merged,
        noBarcodeAssets: noBarcodes.merged,
        notAtLocationAssets: notAtLoc.merged,
        signatures: mergeSignatures(localRoom.signatures, remoteRoom.signatures),
      });
    } else {
      mergedRooms.push(localRoom);
    }
  }

  // Append rooms only in remote
  for (const remoteRoom of (remote.rooms || [])) {
    if (!seenRooms.has(getRoomKey(remoteRoom))) {
      mergedRooms.push(remoteRoom);
    }
  }

  return {
    merged: { ...local, rooms: mergedRooms },
    conflicts: allConflicts,
  };
}
