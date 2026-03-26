import { useState, useEffect, useRef, useCallback } from 'react';
import {
    saveOpnameData, loadOpnameData,
    saveMasterDb, loadMasterDb,
    saveHistoryDb, loadHistoryDb,
    saveMasterData, loadMasterData,
    saveHistoryData, loadHistoryData,
} from '../utils/db';
import { parseMasterDatabase } from '../utils/masterDbParser';
import { parseHistoryDatabase } from '../utils/historyDbParser';

const STORAGE_KEY = 'current-opname';
const SAVE_DEBOUNCE_MS = 500;

export function useOpnameStorage({ state, dispatch }) {
    const [masterDb, setMasterDbState] = useState(null);
    const [masterDbFileName, setMasterDbFileNameState] = useState('');
    const [masterDbBuffer, setMasterDbBuffer] = useState(null);

    const [historyDb, setHistoryDbState] = useState(null);
    const [historyDbFileName, setHistoryDbFileNameState] = useState('');
    const [historyDbBuffer, setHistoryDbBuffer] = useState(null);

    const [masterDbSource, setMasterDbSourceState] = useState('');
    const [historyDbSource, setHistoryDbSourceState] = useState('');
    const [masterDbSyncTime, setMasterDbSyncTimeState] = useState(null);
    const [historyDbSyncTime, setHistoryDbSyncTimeState] = useState(null);

    useEffect(() => {
        loadOpnameData(STORAGE_KEY).then((saved) => {
            if (saved) {
                dispatch({ type: 'LOAD_SAVED', payload: saved });
            } else {
                dispatch({ type: 'RESET' });
            }
        });

        loadMasterData().then((jsonSaved) => {
            if (jsonSaved && jsonSaved.entries) {
                try {
                    const lookup = new Map(Object.entries(jsonSaved.entries));
                    setMasterDbState(lookup);
                    setMasterDbFileNameState(jsonSaved.fileName || '');
                    setMasterDbSourceState(jsonSaved.source || '');
                    setMasterDbSyncTimeState(jsonSaved.syncTime || null);
                } catch (e) {
                    console.warn('Failed to load master DB JSON:', e);
                }
            } else {
                loadMasterDb().then((saved) => {
                    if (saved && saved.buffer) {
                        try {
                            const lookup = parseMasterDatabase(saved.buffer);
                            setMasterDbState(lookup);
                            setMasterDbFileNameState(saved.fileName || '');
                            setMasterDbBuffer(saved.buffer);
                            setMasterDbSourceState('file');
                        } catch (e) {
                            console.warn('Failed to load saved master DB:', e);
                        }
                    }
                });
            }
        });

        loadHistoryData().then((jsonSaved) => {
            if (jsonSaved && jsonSaved.entries) {
                try {
                    const historyMap = new Map(Object.entries(jsonSaved.entries));
                    setHistoryDbState(historyMap);
                    setHistoryDbFileNameState(jsonSaved.fileName || '');
                    setHistoryDbSourceState(jsonSaved.source || '');
                    setHistoryDbSyncTimeState(jsonSaved.syncTime || null);
                } catch (e) {
                    console.warn('Failed to load history DB JSON:', e);
                }
            } else {
                loadHistoryDb().then((saved) => {
                    if (saved && saved.buffer) {
                        try {
                            const lookup = parseHistoryDatabase(saved.buffer);
                            setHistoryDbState(lookup);
                            setHistoryDbFileNameState(saved.fileName || '');
                            setHistoryDbBuffer(saved.buffer);
                            setHistoryDbSourceState('file');
                        } catch (e) {
                            console.warn('Failed to load saved history DB:', e);
                        }
                    }
                });
            }
        });
    }, [dispatch]);

    const saveTimerRef = useRef(null);
    useEffect(() => {
        if (state.isLoaded && state.rooms.length > 0) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                saveOpnameData(STORAGE_KEY, state);
            }, SAVE_DEBOUNCE_MS);
        }
        return () => clearTimeout(saveTimerRef.current);
    }, [state]);

    const resetData = useCallback(async () => {
        const { deleteOpnameData } = await import('../utils/db');
        await deleteOpnameData(STORAGE_KEY);
        dispatch({ type: 'RESET' });
    }, [dispatch]);

    const setMasterDb = useCallback((lookup, buffer, fileName) => {
        setMasterDbState(lookup);
        setMasterDbBuffer(buffer);
        if (buffer && fileName) {
            saveMasterDb(buffer, fileName);
        }
        if (lookup && fileName) {
            saveMasterData(lookup, fileName, buffer ? 'file' : 'server', new Date().toISOString());
        }
    }, []);

    const setHistoryDb = useCallback((lookup, buffer, fileName) => {
        setHistoryDbState(lookup);
        setHistoryDbBuffer(buffer);
        if (buffer && fileName) {
            saveHistoryDb(buffer, fileName);
        }
        if (lookup && fileName) {
            saveHistoryData(lookup, fileName, buffer ? 'file' : 'server', new Date().toISOString());
        }
    }, []);

    const importData = useCallback((importedState) => {
        const payload = { ...importedState, isLoaded: true };
        saveOpnameData(STORAGE_KEY, payload);
        dispatch({ type: 'LOAD_SAVED', payload });
    }, [dispatch]);

    return {
        masterDb, masterDbFileName, setMasterDb, setMasterDbFileName: setMasterDbFileNameState, masterDbBuffer,
        historyDb, historyDbFileName, setHistoryDb, setHistoryDbFileName: setHistoryDbFileNameState, historyDbBuffer,
        masterDbSource, historyDbSource, masterDbSyncTime, historyDbSyncTime,
        setMasterDbSource: setMasterDbSourceState,
        setHistoryDbSource: setHistoryDbSourceState,
        setMasterDbSyncTime: setMasterDbSyncTimeState,
        setHistoryDbSyncTime: setHistoryDbSyncTimeState,
        resetData,
        importData,
    };
}
