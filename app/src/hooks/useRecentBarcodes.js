import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'barcode-recent';

function readFromStorage(max) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, max) : [];
  } catch (e) {
    return [];
  }
}

function writeToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    // localStorage unavailable
  }
}

export function useRecentBarcodes(max = 5) {
  const [recent, setRecent] = useState(() => readFromStorage(max));

  useEffect(() => {
    writeToStorage(recent);
  }, [recent]);

  const add = useCallback(
    (barcode) => {
      const code = String(barcode || '').trim();
      if (!code) return;
      setRecent((prev) => {
        const filtered = prev.filter((b) => b !== code);
        return [code, ...filtered].slice(0, max);
      });
    },
    [max]
  );

  const clear = useCallback(() => setRecent([]), []);

  return { recent, add, clear };
}
