import { useReducer, useCallback } from 'react';

const initialState = {
    fileName: '',
    rooms: [],
    currentRoomIndex: 0,
    isLoaded: false,
};

// DRY helper: update a specific asset list within a room
function updateRoomAssetList(state, roomIndex, listKey, updater) {
    const rooms = [...state.rooms];
    const room = { ...rooms[roomIndex] };
    room[listKey] = updater([...room[listKey]]);
    rooms[roomIndex] = room;
    return { ...state, rooms };
}

function opnameReducer(state, action) {
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
                ...action.payload,
                isLoaded: true,
            };
        case 'SET_ROOM_INDEX':
            return { ...state, currentRoomIndex: action.payload };
        case 'TOGGLE_ASSET_CHECK': {
            const { roomIndex, assetIndex } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'assets', (assets) => {
                assets[assetIndex] = { ...assets[assetIndex], isChecked: !assets[assetIndex].isChecked };
                return assets;
            });
        }
        case 'UPDATE_ASSET_FIELD': {
            const { roomIndex, assetIndex, field, value } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'assets', (assets) => {
                assets[assetIndex] = { ...assets[assetIndex], [field]: value };
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
                },
            ];
            rooms[roomIndex] = room;
            return { ...state, rooms };
        }
        case 'UPDATE_NO_BARCODE_ASSET': {
            const { roomIndex, assetIndex, field, value } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'noBarcodeAssets', (assets) => {
                assets[assetIndex] = { ...assets[assetIndex], [field]: value };
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
                },
            ];
            rooms[roomIndex] = room;
            return { ...state, rooms };
        }
        case 'UPDATE_NOT_AT_LOCATION_ASSET': {
            const { roomIndex, assetIndex, field, value } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'notAtLocationAssets', (assets) => {
                assets[assetIndex] = { ...assets[assetIndex], [field]: value };
                return assets;
            });
        }
        case 'REMOVE_NOT_AT_LOCATION_ASSET': {
            const { roomIndex, assetIndex } = action.payload;
            return updateRoomAssetList(state, roomIndex, 'notAtLocationAssets', (assets) => {
                return assets.filter((_, i) => i !== assetIndex);
            });
        }
        case 'SET_SIGNATURE': {
            const { roomIndex, type, data } = action.payload;
            const rooms = [...state.rooms];
            const room = { ...rooms[roomIndex] };
            room.signatures = { ...room.signatures, [type]: data };
            rooms[roomIndex] = room;
            return { ...state, rooms };
        }
        case 'MERGE_ROOMS': {
            const newRooms = action.payload.sheets;
            const existingRooms = [...state.rooms];
            
            newRooms.forEach(newRoom => {
                const isExist = existingRooms.some(r => r.meta.roomName === newRoom.meta.roomName);
                if (!isExist) {
                    existingRooms.push(newRoom);
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
            return {
                ...state,
                rooms: [...state.rooms, newRoom],
            };
        }
        case 'CROSS_ROOM_CHECK': {
            // Optimasi Algoritma: O(1) Reducer Re-Render Prevention + Early Break
            const { sourceRoomIndex, barcode, sourceRoomName } = action.payload;
            if (!barcode || !barcode.trim()) return state;

            const trimmedBarcode = barcode.trim();
            const rooms = [...state.rooms];
            let foundMatch = false;

            for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
                if (rIdx === sourceRoomIndex) continue;

                const room = rooms[rIdx];
                const matchIndex = room.assets.findIndex(a => a.barcode && a.barcode.trim() === trimmedBarcode);

                if (matchIndex !== -1) {
                    const updatedRoom = { ...room };
                    const updatedAssets = [...room.assets];
                    updatedAssets[matchIndex] = {
                        ...updatedAssets[matchIndex],
                        isChecked: true,
                        adaTidakAda: 'Ada',
                        kondisi: 'Salah Ruangan',
                        keterangan: `Salah Ruangan - ditemukan di ${sourceRoomName || 'ruangan lain'}`,
                    };
                    updatedRoom.assets = updatedAssets;
                    rooms[rIdx] = updatedRoom;
                    foundMatch = true;
                    break; // Early exit CPU optimization
                }
            }

            // Reference equality preservation prevents unnecessary React DOM diffing
            return foundMatch ? { ...state, rooms } : state;
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
    const setSignature = useCallback((roomIndex, type, data) => dispatch({ type: 'SET_SIGNATURE', payload: { roomIndex, type, data } }), []);
    const mergeRooms = useCallback((data) => dispatch({ type: 'MERGE_ROOMS', payload: data }), []);
    const addCustomRoom = useCallback((roomMeta) => dispatch({ type: 'ADD_CUSTOM_ROOM', payload: roomMeta }), []);
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
        setSignature,
        mergeRooms,
        addCustomRoom,
        crossRoomCheck,
    };
}
