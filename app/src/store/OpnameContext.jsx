import { createContext, useContext, useEffect } from 'react';
import { useOpnameState } from './useOpnameState';
import { useOpnameStorage } from './useOpnameStorage';
import { useOpnameSync } from './useOpnameSync';
import { useOpnameAutoSync } from '../hooks/useOpnameAutoSync';
import { useOpnameSseSync } from '../hooks/useOpnameSseSync';
import { ensureSyncTarget } from '../utils/opnameSyncPullTarget';
import { apiUrl, fetchWithAuth } from '../utils/apiConfig';

const OpnameContext = createContext(null);

export function OpnameProvider({ children }) {
    const stateHook = useOpnameState();
    const { state, dispatch } = stateHook;

    const storageHook = useOpnameStorage({
        state,
        dispatch
    });

    const syncHook = useOpnameSync({
        state,
        storage: storageHook,
    });

    const autoSync = useOpnameAutoSync({
        state,
        dispatch,
        isEnabled: state.isLoaded
            && state.rooms.length > 0
            && !!state.sync,
    });

    useEffect(() => {
        if (state.isLoaded && state.rooms.length > 0 && !state.sync) {
            const { sync, target } = ensureSyncTarget(state);
            dispatch({ type: 'INIT_SYNC', payload: sync });
            
            // Auto-push the session to the server so Android can pull it
            // This happens only once when a new file/data is loaded and sync is null
            const sessionPayload = syncHook.exportSession();
            const payload = {
                ...sessionPayload,
                state: {
                    ...sessionPayload.state,
                    sync,
                },
            };
            
            const params = `?period=${encodeURIComponent(target.period)}&sessionId=${encodeURIComponent(target.sessionId)}`;
            fetchWithAuth(apiUrl(`/api/sync/session${params}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }).catch(err => {
                console.error('[OpnameContext] Failed to auto-push session:', err);
            });
        }
    }, [state, dispatch, syncHook]);

    useOpnameSseSync({
        isEnabled: state.isLoaded
            && state.rooms.length > 0
            && !!state.sync,
        onSyncEvent: autoSync.remoteSync,
    });

    return (
        <OpnameContext.Provider
            value={{
                ...stateHook,
                ...storageHook,
                ...syncHook,
                syncStatus: autoSync.syncStatus,
                manualSync: autoSync.manualSync,
                syncLastError: autoSync.lastError,
            }}
        >
            {children}
        </OpnameContext.Provider>
    );
}

export function useOpname() {
    const context = useContext(OpnameContext);
    if (!context) {
        throw new Error('useOpname must be used within OpnameProvider');
    }
    return context;
}
