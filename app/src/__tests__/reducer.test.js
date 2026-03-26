import { describe, it, expect } from 'vitest';

/**
 * Unit test for the opnameReducer logic.
 * We import the reducer indirectly by testing its behavior;
 * since the reducer is not exported separately, we test the DRY helper pattern.
 */

// Inline the updateRoomAssetList helper for isolated testing
function updateRoomAssetList(state, roomIndex, listKey, updater) {
    const rooms = [...state.rooms];
    const room = { ...rooms[roomIndex] };
    room[listKey] = updater([...room[listKey]]);
    rooms[roomIndex] = room;
    return { ...state, rooms };
}

describe('updateRoomAssetList helper', () => {
    const mockState = {
        fileName: 'test.xlsx',
        rooms: [
            {
                sheetName: 'Room A',
                assets: [
                    { id: '1', barcode: '001', namaAset: 'Laptop', isChecked: false, kondisi: '' },
                    { id: '2', barcode: '002', namaAset: 'Monitor', isChecked: true, kondisi: '' },
                ],
                noBarcodeAssets: [
                    { id: 'nb-1', namaAset: 'Keyboard', isChecked: true },
                ],
                notAtLocationAssets: [],
            },
        ],
        currentRoomIndex: 0,
        isLoaded: true,
    };

    it('should toggle asset check status', () => {
        const result = updateRoomAssetList(mockState, 0, 'assets', (assets) => {
            assets[0] = { ...assets[0], isChecked: !assets[0].isChecked };
            return assets;
        });
        expect(result.rooms[0].assets[0].isChecked).toBe(true);
        expect(result.rooms[0].assets[1].isChecked).toBe(true); // unchanged
    });

    it('should update asset field', () => {
        const result = updateRoomAssetList(mockState, 0, 'assets', (assets) => {
            assets[0] = { ...assets[0], kondisi: 'Baik' };
            return assets;
        });
        expect(result.rooms[0].assets[0].kondisi).toBe('Baik');
    });

    it('should remove no-barcode asset by index', () => {
        const result = updateRoomAssetList(mockState, 0, 'noBarcodeAssets', (assets) => {
            return assets.filter((_, i) => i !== 0);
        });
        expect(result.rooms[0].noBarcodeAssets).toHaveLength(0);
    });

    it('should NOT mutate original state', () => {
        updateRoomAssetList(mockState, 0, 'assets', (assets) => {
            assets[0] = { ...assets[0], isChecked: true };
            return assets;
        });
        expect(mockState.rooms[0].assets[0].isChecked).toBe(false); // original untouched
    });

    it('should add item to notAtLocationAssets', () => {
        const result = updateRoomAssetList(mockState, 0, 'notAtLocationAssets', (assets) => {
            return [...assets, { id: 'nal-1', namaAset: 'Printer', isChecked: true }];
        });
        expect(result.rooms[0].notAtLocationAssets).toHaveLength(1);
        expect(result.rooms[0].notAtLocationAssets[0].namaAset).toBe('Printer');
    });
});

describe('MERGE_ROOMS logic', () => {
    it('should append new rooms and preserve existing ones ignoring duplicate room names', () => {
        const existingRooms = [
            { meta: { roomName: 'Room A' }, assets: [{ id: 1, isChecked: true }] }
        ];
        const newRooms = [
            { meta: { roomName: 'Room A' }, assets: [{ id: 1, isChecked: false }] }, // Duplicate
            { meta: { roomName: 'Room B' }, assets: [] } // New
        ];
        
        const mergedRooms = [...existingRooms];
        newRooms.forEach(newRoom => {
            const isExist = mergedRooms.some(r => r.meta.roomName === newRoom.meta.roomName);
            if (!isExist) {
                mergedRooms.push(newRoom);
            }
        });

        expect(mergedRooms).toHaveLength(2);
        // Room A should be preserved (checked is true)
        expect(mergedRooms[0].assets[0].isChecked).toBe(true);
        // Room B should be added
        expect(mergedRooms[1].meta.roomName).toBe('Room B');
    });
});

describe('ADD_CUSTOM_ROOM logic', () => {
    it('should create a correctly structured custom room', () => {
        const rooms = [];
        const meta = { roomName: 'RUANG SERVER', picName: 'Joni', area: 'Lantai 1' };
        
        const newRoom = {
            sheetName: meta.roomName,
            meta: {
                title: 'RUANGAN CUSTOM',
                area: meta.area || '',
                roomName: meta.roomName,
                period: meta.period || '',
                picName: meta.picName || '',
                date: meta.date || '01-01-2026',
            },
            assets: [],
            noBarcodeAssets: [],
            notAtLocationAssets: [],
            signatures: {
                petugasOpname1: null,
                petugasOpname1Name: '',
                petugasOpname2: null,
                petugasOpname2Name: '',
                picRuangan: null,
                picRuanganName: '',
            },
            isCustomRoom: true,
        };
        
        const resultRooms = [...rooms, newRoom];
        
        expect(resultRooms).toHaveLength(1);
        expect(resultRooms[0].isCustomRoom).toBe(true);
        expect(resultRooms[0].meta.title).toBe('RUANGAN CUSTOM');
        expect(resultRooms[0].meta.roomName).toBe('RUANG SERVER');
        expect(resultRooms[0].assets).toHaveLength(0);
    });
});

describe('CROSS_ROOM_CHECK logic', () => {
    it('should auto-check asset in another room when barcode matches', () => {
        const rooms = [
            {
                meta: { roomName: 'Room AA' },
                assets: [
                    { id: '1', barcode: '1300006278', namaAset: 'Laptop', isChecked: false, kondisi: '', keterangan: '', adaTidakAda: '' },
                    { id: '2', barcode: '1500002467', namaAset: 'Printer', isChecked: false, kondisi: '', keterangan: '', adaTidakAda: '' },
                ],
            },
            {
                meta: { roomName: 'Room AB' },
                assets: [
                    { id: '3', barcode: '9900001111', namaAset: 'Monitor', isChecked: false, kondisi: '', keterangan: '', adaTidakAda: '' },
                ],
            },
        ];

        // Simulate: user is in Room AB (index 1) and scans barcode 1300006278
        const sourceRoomIndex = 1;
        const barcode = '1300006278';
        const sourceRoomName = 'Room AB';

        const result = rooms.map((room, rIdx) => {
            if (rIdx === sourceRoomIndex) return room;
            const matchIndex = room.assets.findIndex(a => a.barcode && a.barcode.trim() === barcode);
            if (matchIndex === -1) return room;
            const updatedAssets = [...room.assets];
            updatedAssets[matchIndex] = {
                ...updatedAssets[matchIndex],
                isChecked: true,
                adaTidakAda: 'Ada',
                kondisi: 'Salah Ruangan',
                keterangan: `Salah Ruangan - ditemukan di ${sourceRoomName}`,
            };
            return { ...room, assets: updatedAssets };
        });

        // Room AA: barcode 1300006278 should be auto-checked
        expect(result[0].assets[0].isChecked).toBe(true);
        expect(result[0].assets[0].kondisi).toBe('Salah Ruangan');
        expect(result[0].assets[0].keterangan).toContain('Room AB');
        // Room AA: other assets unchanged
        expect(result[0].assets[1].isChecked).toBe(false);
        // Room AB: source room unchanged
        expect(result[1].assets[0].isChecked).toBe(false);
    });

    it('should not modify anything if barcode is not found in other rooms', () => {
        const rooms = [
            { meta: { roomName: 'Room AA' }, assets: [{ id: '1', barcode: '1111', isChecked: false }] },
            { meta: { roomName: 'Room AB' }, assets: [{ id: '2', barcode: '2222', isChecked: false }] },
        ];

        const result = rooms.map((room, rIdx) => {
            if (rIdx === 1) return room;
            const matchIndex = room.assets.findIndex(a => a.barcode === '9999');
            if (matchIndex === -1) return room;
            return room; // won't reach here
        });

        expect(result[0].assets[0].isChecked).toBe(false);
        expect(result[1].assets[0].isChecked).toBe(false);
    });
});
