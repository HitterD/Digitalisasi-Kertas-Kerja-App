import { useCallback } from 'react';
import { parseMasterDatabase } from '../utils/masterDbParser';
import { parseHistoryDatabase } from '../utils/historyDbParser';

export function useOpnameSync({
    state,
    storage
}) {
    const {
        masterDbFileName, masterDbBuffer, masterDbSource, masterDbSyncTime,
        historyDbFileName, historyDbBuffer, historyDbSource, historyDbSyncTime,
        setMasterDb, setMasterDbSource, setMasterDbSyncTime,
        setHistoryDb, setHistoryDbSource, setHistoryDbSyncTime,
        importData
    } = storage;

    const bufferToBase64 = (buffer) => {
        if (!buffer) return null;
        const bytes = new Uint8Array(buffer);
        const CHUNK = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
        }
        return window.btoa(binary);
    };

    const base64ToBuffer = (base64) => {
        if (!base64) return null;
        const binary = window.atob(base64);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        return bytes.buffer;
    };

    const exportSession = useCallback(() => {
        return {
            state: {
                fileName: state.fileName,
                rooms: state.rooms,
                currentRoomIndex: state.currentRoomIndex || 0,
            },
            masterDb: {
                fileName: masterDbFileName,
                bufferBase64: bufferToBase64(masterDbBuffer),
                source: masterDbSource || (masterDbBuffer ? 'file' : 'server'),
                syncTime: masterDbSyncTime,
            },
            historyDb: {
                fileName: historyDbFileName,
                bufferBase64: bufferToBase64(historyDbBuffer),
                source: historyDbSource || (historyDbBuffer ? 'file' : 'server'),
                syncTime: historyDbSyncTime,
            }
        };
    }, [state, masterDbFileName, masterDbBuffer, masterDbSource, masterDbSyncTime,
        historyDbFileName, historyDbBuffer, historyDbSource, historyDbSyncTime]);

    const importSession = useCallback((payload) => {
        if (payload.state) {
            importData(payload.state);
        }

        if (payload.masterDb && payload.masterDb.bufferBase64) {
            const buffer = base64ToBuffer(payload.masterDb.bufferBase64);
            const lookup = parseMasterDatabase(buffer);
            setMasterDb(lookup, buffer, payload.masterDb.fileName);
            setMasterDbSource(payload.masterDb.source || 'file');
            setMasterDbSyncTime(payload.masterDb.syncTime || null);
        }

        if (payload.historyDb && payload.historyDb.bufferBase64) {
            const buffer = base64ToBuffer(payload.historyDb.bufferBase64);
            const lookup = parseHistoryDatabase(buffer);
            setHistoryDb(lookup, buffer, payload.historyDb.fileName);
            setHistoryDbSource(payload.historyDb.source || 'file');
            setHistoryDbSyncTime(payload.historyDb.syncTime || null);
        }
    }, [importData, setMasterDb, setHistoryDb, setMasterDbSource, setMasterDbSyncTime, setHistoryDbSource, setHistoryDbSyncTime]);

    return { exportSession, importSession };
}
