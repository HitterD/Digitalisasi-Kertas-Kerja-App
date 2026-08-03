import { useEffect, useRef } from 'react';
import { apiUrl } from '../utils/apiConfig';

const FALLBACK_PULL_MS = 5000;

/**
 * Hook for Live Sync via Server-Sent Events (SSE).
 * Listens to /api/sync/events and triggers pull+merge when data is pushed by another client.
 *
 * @param {object} options
 * @param {boolean} options.isEnabled - whether SSE should be connected
 * @param {Function} options.onSyncEvent - callback to run when event received (usually manualSync)
 */
export function useOpnameSseSync({ isEnabled, onSyncEvent }) {
  const esRef = useRef(null);
  const onSyncEventRef = useRef(onSyncEvent);

  useEffect(() => {
    onSyncEventRef.current = onSyncEvent;
  }, [onSyncEvent]);

  useEffect(() => {
    if (!isEnabled) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }

    const es = new EventSource(apiUrl('/api/sync/events'));
    esRef.current = es;

    es.onmessage = (event) => {
      let target;
      try {
        target = JSON.parse(event.data);
      } catch {
        target = undefined;
      }
      onSyncEventRef.current?.(target);
    };

    es.onerror = () => {
      // Browser automatically attempts to reconnect on error
      // console.warn('[SSE] Connection error, auto-reconnecting...');
    };

    const fallback = setInterval(() => {
      onSyncEventRef.current?.();
    }, FALLBACK_PULL_MS);

    return () => {
      clearInterval(fallback);
      es.close();
      esRef.current = null;
    };
  }, [isEnabled]);
}
