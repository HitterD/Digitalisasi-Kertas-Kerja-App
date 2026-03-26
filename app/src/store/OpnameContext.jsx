import { createContext, useContext } from 'react';
import { useOpnameState } from './useOpnameState';
import { useOpnameStorage } from './useOpnameStorage';
import { useOpnameSync } from './useOpnameSync';

const OpnameContext = createContext(null);

export function OpnameProvider({ children }) {
    const stateHook = useOpnameState();

    const storageHook = useOpnameStorage({
        state: stateHook.state,
        dispatch: stateHook.dispatch
    });

    const syncHook = useOpnameSync({
        state: stateHook.state,
        storage: storageHook,
    });

    return (
        <OpnameContext.Provider
            value={{
                ...stateHook,
                ...storageHook,
                ...syncHook,
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
