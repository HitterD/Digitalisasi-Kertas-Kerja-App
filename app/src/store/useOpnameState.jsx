import { useReducer, useCallback } from 'react';
import { getDefaultSignatures } from '../utils/signatures';

export const initialState = {
    fileName: '',
    rooms: [],
    currentRoomIndex: 0,
    isLoaded: false,
    sync: null, // SyncMetadata — null until session created
    localUpdateCount: 0,
};

// DRY helper: update a specific asset list within a room
function updateRoomAssetList(state, roomIndex, listKey, updater) {
    const rooms = [...state.rooms];
    const room = { ...rooms[roomIndex] };
    room[listKey] = updater([...room[listKey]]);
    rooms[roomIndex] = room;
    return { ...state, rooms, localUpdateCount: (state.localUpdateCount || 0) + 1 };
}

export function opnameReducer(state, action) {
    switch (action.type) {
        case 'SET_DATA':
            return {
                ...state,
                fileName: action.payload.fileName,
                rooms: action.payload.sheets,
                currentRoomIndex: 0,
                isLoaded: true,
            };
        case 'LOAD_SAVED':
            return {
                ...initialState,
                ...action.payload,
                isLoaded: true,
            };
        case 'SET_ROOM_INDEX':
            return { ...state, currentRoomIndex: action.payload };
        case 'TOGGLE_ASSET_CHECK': {
            const { roomIndex, assetIndex } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'assets', (assets) => {
                assets[assetIndex] = { ...assets[assetIndex], isChecked: !assets[assetIndex].isChecked, updatedAt: new Date().toISOString() };
                return assets;
            });
        }
        case 'UPDATE_ASSET_FIELD': {
            const { roomIndex, assetIndex, field, value } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'assets', (assets) => {
                assets[assetIndex] = { ...assets[assetIndex], [field]: value, updatedAt: new Date().toISOString() };
                return assets;
            });
        }
        case 'AUTOFILL_ASSET': {
            const { roomIndex, assetIndex, data } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'assets', (assets) => {
                assets[assetIndex] = {
                    ...assets[assetIndex],
                    namaAset: data.namaAset || assets[assetIndex].namaAset,
                    noPO: data.noPO || assets[assetIndex].noPO,
                    tipe: data.tipe || assets[assetIndex].tipe,
                    bulanPerolehan: data.bulanPerolehan || assets[assetIndex].bulanPerolehan,
                    tahunPerolehan: data.tahunPerolehan || assets[assetIndex].tahunPerolehan,
                    keterangan: data.keterangan || assets[assetIndex].keterangan,
                    updatedAt: new Date().toISOString(),
                };
                return assets;
            });
        }
        case 'ADD_NO_BARCODE_ASSET': {
            const { roomIndex } = action.payload;
            const rooms = [...state.rooms];
            const room = { ...rooms[roomIndex] };
            room.noBarcodeAssets = [
                ...room.noBarcodeAssets,
                {
                    id: `nobarcode-${Date.now()}`,
                    no: '',
                    barcode: '(NO BARCODE)',
                    namaAset: '',
                    noPO: '',
                    tipe: '',
                    bulanPerolehan: '',
                    tahunPerolehan: '',
                    adaTidakAda: 'Ada',
                    kondisi: '',
                    keterangan: '',
                    isChecked: true,
                    updatedAt: new Date().toISOString(),
                },
            ];
            rooms[roomIndex] = room;
            return { ...state, rooms, localUpdateCount: (state.localUpdateCount || 0) + 1 };
        }
        case 'UPDATE_NO_BARCODE_ASSET': {
            const { roomIndex, assetIndex, field, value } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'noBarcodeAssets', (assets) => {
                assets[assetIndex] = { ...assets[assetIndex], [field]: value, updatedAt: new Date().toISOString() };
                return assets;
            });
        }
        case 'REMOVE_NO_BARCODE_ASSET': {
            const { roomIndex, assetIndex } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'noBarcodeAssets', (assets) => {
                return assets.filter((_, i) => i !== assetIndex);
            });
        }
        case 'ADD_NOT_AT_LOCATION_ASSET': {
            const { roomIndex, roomName } = action.payload;
            const rooms = [...state.rooms];
            const room = { ...rooms[roomIndex] };
            room.notAtLocationAssets = [
                ...room.notAtLocationAssets,
                {
                    id: `notatloc-${Date.now()}`,
                    no: '',
                    barcode: '',
                    namaAset: '',
                    noPO: '',
                    tipe: '',
                    bulanPerolehan: '',
                    tahunPerolehan: '',
                    adaTidakAda: 'Ada',
                    kondisi: '',
                    keterangan: `Salah Ruangan - ditemukan di ${roomName || 'ruangan ini'}`,
                    isChecked: true,
                    updatedAt: new Date().toISOString(),
                },
            ];
            rooms[roomIndex] = room;
            return { ...state, rooms, localUpdateCount: (state.localUpdateCount || 0) + 1 };
        }
        case 'UPDATE_NOT_AT_LOCATION_ASSET': {
            const { roomIndex, assetIndex, field, value } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'notAtLocationAssets', (assets) => {
                assets[assetIndex] = { ...assets[assetIndex], [field]: value, updatedAt: new Date().toISOString() };
                return assets;
            });
        }
        case 'REMOVE_NOT_AT_LOCATION_ASSET': {
            const { roomIndex, assetIndex } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'notAtLocationAssets', (assets) => {
                return assets.filter((_, i) => i !== assetIndex);
            });
        }
        case 'UPDATE_SIGNATURES': {
            const { roomIndex, data } = action.payload;
            const rooms = [...state.rooms];
            const room = { ...rooms[roomIndex] };
            room.signatures = data;
            rooms[roomIndex] = room;
            return { ...state, rooms, localUpdateCount: (state.localUpdateCount || 0) + 1 };
        }
        case 'MERGE_ROOMS': {
            const newRooms = action.payload.sheets;
            const existingRooms = [...state.rooms];
            
            newRooms.forEach(newRoom => {
                const existingRoomIndex = existingRooms.findIndex(r => 
                    r.meta.roomName === newRoom.meta.roomName && 
                    r.meta.period === newRoom.meta.period
                );
                if (existingRoomIndex === -1) {
                    existingRooms.push(newRoom);
                } else {
                    const oldRoom = existingRooms[existingRoomIndex];
                    
                    const oldAssetsMap = new Map();
                    oldRoom.assets.forEach(a => {
                        if (a.barcode) oldAssetsMap.set(String(a.barcode).trim(), a);
                    });
                    
                    // KEEP all old assets exactly as they are to prevent ANY data loss
                    const mergedAssets = [...oldRoom.assets];
                    
                    // ONLY APPEND new assets from the server that don't exist locally
                    newRoom.assets.forEach(newAsset => {
                        if (newAsset.barcode) {
                            const barcodeStr = String(newAsset.barcode).trim();
                            if (!oldAssetsMap.has(barcodeStr)) {
                                mergedAssets.push(newAsset);
                            }
                        } else {
                            mergedAssets.push(newAsset);
                        }
                    });
                    
                    existingRooms[existingRoomIndex] = {
                        ...oldRoom,
                        assets: mergedAssets
                    };
                }
            });

            return {
                ...state,
                fileName: action.payload.fileName,
                rooms: existingRooms,
                isLoaded: true,
            };
        }
        case 'ADD_CUSTOM_ROOM': {
            const meta = action.payload;
            const newRoom = {
                sheetName: meta.roomName,
                meta: {
                    title: 'RUANGAN CUSTOM',
                    area: meta.area || '',
                    roomName: meta.roomName,
                    period: meta.period || '',
                    picName: meta.picName || '',
                    date: meta.date || new Date().toLocaleDateString('id-ID'),
                },
                assets: [],
                noBarcodeAssets: [],
                notAtLocationAssets: [],
                signatures: getDefaultSignatures(),
                isCustomRoom: true,
            };
            return {
                ...state,
                rooms: [...state.rooms, newRoom],
            };
        }
        case 'REMOVE_ROOM_LOCAL': {
            const { roomIndex } = action.payload;
            const newRooms = state.rooms.filter((_, idx) => idx !== roomIndex);
            let newIndex = state.currentRoomIndex;
            if (newRooms.length === 0) {
                newIndex = 0;
            } else if (newIndex >= newRooms.length) {
                newIndex = newRooms.length - 1;
            } else if (roomIndex < newIndex) {
                newIndex--;
            }
            return {
                ...state,
                rooms: newRooms,
                currentRoomIndex: newIndex
            };
        }
        case 'ADD_SQL_IMPORTED_ROOM': {
            const { roomName, category, sourceRoom, assets, appendIfExist } = action.payload;
            const sheetName = `${roomName} — ${category}`;

            // Check if exist
            const existingIndex = state.rooms.findIndex(r => r.meta.roomName === sheetName && r.meta.period === (state.rooms[0]?.meta?.period || ''));
            
            if (existingIndex !== -1 && appendIfExist) {
                // Append logic
                const oldRoom = state.rooms[existingIndex];
                const oldAssetsMap = new Map();
                oldRoom.assets.forEach(a => { if (a.barcode) oldAssetsMap.set(String(a.barcode).trim(), a); });
                
                const mergedAssets = [...oldRoom.assets];
                assets.forEach(newAsset => {
                    if (newAsset.barcode && !oldAssetsMap.has(String(newAsset.barcode).trim())) {
                        mergedAssets.push(newAsset);
                    }
                });
                
                const newRooms = [...state.rooms];
                newRooms[existingIndex] = { ...oldRoom, assets: mergedAssets };
                return {
                    ...state,
                    rooms: newRooms,
                    currentRoomIndex: existingIndex
                };
            }

            const newRoom = {
                sheetName: sheetName,
                meta: {
                    title: 'RUANGAN SQL IMPORT',
                    area: '',
                    roomName: sheetName,
                    period: state.rooms[0]?.meta?.period || '',
                    picName: sourceRoom?.picRuangan || '',
                    date: new Date().toLocaleDateString('id-ID'),
                    source: 'sql-room-import',
                    sourceRoomName: sourceRoom?.namaRuangan || '',
                    sourceRoomId: sourceRoom?.ruanganId || '',
                    ownerCategory: category
                },
                assets,
                noBarcodeAssets: [],
                notAtLocationAssets: [],
                signatures: getDefaultSignatures(),
                isCustomRoom: false,
                isSqlImportedRoom: true
            };
            return {
                ...state,
                rooms: [...state.rooms, newRoom],
                currentRoomIndex: state.rooms.length // go to new room
            };
        }
        case 'CROSS_ROOM_CHECK': {
            // Optimasi Algoritma: O(1) Reducer Re-Render Prevention + Early Break
            const { sourceRoomIndex, barcode, sourceRoomName } = action.payload;
            const barcodeStr = barcode !== null && barcode !== undefined ? String(barcode) : '';
            if (!barcodeStr || !barcodeStr.trim()) return state;

            const trimmedBarcode = barcodeStr.trim();
            const rooms = [...state.rooms];
            let foundMatch = false;

            for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
                if (rIdx === sourceRoomIndex) continue;

                const room = rooms[rIdx];
                const matchIndex = room.assets.findIndex(a => a.barcode && String(a.barcode).trim() === trimmedBarcode);

                if (matchIndex !== -1) {
                    const updatedRoom = { ...room };
                    const updatedAssets = [...room.assets];
                    updatedAssets[matchIndex] = {
                        ...updatedAssets[matchIndex],
                        isChecked: true,
                        adaTidakAda: 'Ada',
                        kondisi: 'Salah Ruangan',
                        keterangan: `Salah Ruangan - ditemukan di ${sourceRoomName || 'ruangan lain'}`,
                        updatedAt: new Date().toISOString(),
                    };
                    updatedRoom.assets = updatedAssets;
                    rooms[rIdx] = updatedRoom;
                    foundMatch = true;
                    break; // Early exit CPU optimization
                }
            }

            // Reference equality preservation prevents unnecessary React DOM diffing
            return foundMatch ? { ...state, rooms, localUpdateCount: (state.localUpdateCount || 0) + 1 } : state;
        }
        case 'INIT_SYNC': {
            return { ...state, sync: action.payload };
        }
        case 'UPDATE_SYNC_STATUS': {
            if (!state.sync) return state;
            return {
                ...state,
                sync: { ...state.sync, ...action.payload },
            };
        }
        case 'UPDATE_LOCAL_CHANGE_AT': {
            if (!state.sync) return state;
            return {
                ...state,
                sync: { ...state.sync, lastLocalChangeAt: new Date().toISOString() },
            };
        }
        case 'APPLY_SYNC_MERGE': {
            const { rooms, lastSyncedAt } = action.payload;
            return {
                ...state,
                rooms,
                sync: state.sync ? {
                    ...state.sync,
                    lastSyncedAt,
                    status: 'idle',
                    failureCount: 0,
                    lastError: '',
                } : null,
            };
        }
        case 'RESET':
            return { ...initialState, isLoaded: true };
        default:
            return state;
    }
}

export function useOpnameState() {
    const [state, dispatch] = useReducer(opnameReducer, initialState);

    const setData = useCallback((data) => dispatch({ type: 'SET_DATA', payload: data }), []);
    const setRoomIndex = useCallback((index) => dispatch({ type: 'SET_ROOM_INDEX', payload: index }), []);
    const toggleAssetCheck = useCallback((roomIndex, assetIndex) => dispatch({ type: 'TOGGLE_ASSET_CHECK', payload: { roomIndex, assetIndex } }), []);
    const updateAssetField = useCallback((roomIndex, assetIndex, field, value) => dispatch({ type: 'UPDATE_ASSET_FIELD', payload: { roomIndex, assetIndex, field, value } }), []);
    const autofillAsset = useCallback((roomIndex, assetIndex, data) => dispatch({ type: 'AUTOFILL_ASSET', payload: { roomIndex, assetIndex, data } }), []);
    const addNoBarcodeAsset = useCallback((roomIndex) => dispatch({ type: 'ADD_NO_BARCODE_ASSET', payload: { roomIndex } }), []);
    const updateNoBarcodeAsset = useCallback((roomIndex, assetIndex, field, value) => dispatch({ type: 'UPDATE_NO_BARCODE_ASSET', payload: { roomIndex, assetIndex, field, value } }), []);
    const removeNoBarcodeAsset = useCallback((roomIndex, assetIndex) => dispatch({ type: 'REMOVE_NO_BARCODE_ASSET', payload: { roomIndex, assetIndex } }), []);
    const addNotAtLocationAsset = useCallback((roomIndex, roomName) => dispatch({ type: 'ADD_NOT_AT_LOCATION_ASSET', payload: { roomIndex, roomName } }), []);
    const updateNotAtLocationAsset = useCallback((roomIndex, assetIndex, field, value) => dispatch({ type: 'UPDATE_NOT_AT_LOCATION_ASSET', payload: { roomIndex, assetIndex, field, value } }), []);
    const removeNotAtLocationAsset = useCallback((roomIndex, assetIndex) => dispatch({ type: 'REMOVE_NOT_AT_LOCATION_ASSET', payload: { roomIndex, assetIndex } }), []);
    const updateSignatures = useCallback((roomIndex, data) => dispatch({ type: 'UPDATE_SIGNATURES', payload: { roomIndex, data } }), []);
    const mergeRooms = useCallback((data) => dispatch({ type: 'MERGE_ROOMS', payload: data }), []);
    const addCustomRoom = useCallback((roomMeta) => dispatch({ type: 'ADD_CUSTOM_ROOM', payload: roomMeta }), []);
    const removeRoomLocal = useCallback((roomIndex) => dispatch({ type: 'REMOVE_ROOM_LOCAL', payload: { roomIndex } }), []);
    const addSqlImportedRoom = useCallback((payload) => dispatch({ type: 'ADD_SQL_IMPORTED_ROOM', payload }), []);
    const crossRoomCheck = useCallback((sourceRoomIndex, barcode, sourceRoomName) => dispatch({ type: 'CROSS_ROOM_CHECK', payload: { sourceRoomIndex, barcode, sourceRoomName } }), []);

    // Internal use for testing/loading
    const dispatchRaw = useCallback((action) => dispatch(action), []);

    return {
        state,
        dispatch: dispatchRaw,
        setData,
        setRoomIndex,
        toggleAssetCheck,
        updateAssetField,
        autofillAsset,
        addNoBarcodeAsset,
        updateNoBarcodeAsset,
        removeNoBarcodeAsset,
        addNotAtLocationAsset,
        updateNotAtLocationAsset,
        removeNotAtLocationAsset,
        updateSignatures,
        mergeRooms,
        addCustomRoom,
        removeRoomLocal,
        addSqlImportedRoom,
        crossRoomCheck,
    };
}
