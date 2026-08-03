import { describe, expect, it } from 'vitest';
import { initialState, opnameReducer } from '../store/useOpnameState';

function makeRoom(name, assets = []) {
  return {
    sheetName: name,
    meta: { roomName: name, period: '2026', picName: '' },
    assets,
    noBarcodeAssets: [],
    notAtLocationAssets: [],
    signatures: {},
  };
}

const sqlPayload = {
  roomName: 'RUANG SERVER',
  category: 'ICT',
  sourceRoom: {
    namaRuangan: 'RUANG SERVER',
    picRuangan: 'BUDI',
    ruanganId: 11,
  },
  assets: [
    { barcode: '1300000001', namaAset: 'Laptop', isChecked: false },
    { barcode: '1300000002', namaAset: 'Scanner', isChecked: false },
  ],
};

describe('opnameReducer SQL room import actions', () => {
  it('removes room locally and clamps current room index to previous valid room', () => {
    const state = {
      ...initialState,
      rooms: [makeRoom('A'), makeRoom('B'), makeRoom('C')],
      currentRoomIndex: 2,
      isLoaded: true,
    };

    const result = opnameReducer(state, {
      type: 'REMOVE_ROOM_LOCAL',
      payload: { roomIndex: 2 },
    });

    expect(result.rooms.map((room) => room.meta.roomName)).toEqual(['A', 'B']);
    expect(result.currentRoomIndex).toBe(1);
    expect(state.rooms).toHaveLength(3);
  });

  it('removes earlier room and shifts current room index left', () => {
    const state = {
      ...initialState,
      rooms: [makeRoom('A'), makeRoom('B'), makeRoom('C')],
      currentRoomIndex: 2,
      isLoaded: true,
    };

    const result = opnameReducer(state, {
      type: 'REMOVE_ROOM_LOCAL',
      payload: { roomIndex: 0 },
    });

    expect(result.rooms.map((room) => room.meta.roomName)).toEqual(['B', 'C']);
    expect(result.currentRoomIndex).toBe(1);
  });

  it('creates SQL imported room with category suffix and unchecked assets', () => {
    const state = {
      ...initialState,
      rooms: [makeRoom('BASE')],
      currentRoomIndex: 0,
      isLoaded: true,
    };

    const result = opnameReducer(state, {
      type: 'ADD_SQL_IMPORTED_ROOM',
      payload: sqlPayload,
    });

    expect(result.rooms).toHaveLength(2);
    expect(result.currentRoomIndex).toBe(1);
    expect(result.rooms[1]).toMatchObject({
      sheetName: 'RUANG SERVER — ICT',
      isCustomRoom: false,
      isSqlImportedRoom: true,
      meta: {
        title: 'RUANGAN SQL IMPORT',
        roomName: 'RUANG SERVER — ICT',
        source: 'sql-room-import',
        sourceRoomName: 'RUANG SERVER',
        sourceRoomId: 11,
        ownerCategory: 'ICT',
        picName: 'BUDI',
      },
    });
    expect(result.rooms[1].assets.every((asset) => asset.isChecked === false)).toBe(true);
  });

  it('appends to existing SQL imported room and dedupes barcode without mutating old room', () => {
    const existingRoom = makeRoom('RUANG SERVER — ICT', [
      { barcode: '1300000001', namaAset: 'Old laptop', isChecked: true },
    ]);
    existingRoom.meta.source = 'sql-room-import';

    const state = {
      ...initialState,
      rooms: [existingRoom],
      currentRoomIndex: 0,
      isLoaded: true,
    };

    const result = opnameReducer(state, {
      type: 'ADD_SQL_IMPORTED_ROOM',
      payload: { ...sqlPayload, appendIfExist: true },
    });

    expect(result.rooms).toHaveLength(1);
    expect(result.currentRoomIndex).toBe(0);
    expect(result.rooms[0].assets).toEqual([
      { barcode: '1300000001', namaAset: 'Old laptop', isChecked: true },
      { barcode: '1300000002', namaAset: 'Scanner', isChecked: false },
    ]);
    expect(state.rooms[0].assets).toHaveLength(1);
  });
});
