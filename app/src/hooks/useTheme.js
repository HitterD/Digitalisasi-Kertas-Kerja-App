import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'kkd-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem(STORAGE_KEY) || 'system';
}

function resolveTheme(theme) {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-theme-pref', theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [resolved, setResolved] = useState(() => resolveTheme(getInitialTheme()));

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // localStorage unavailable
    }
    setResolved(resolveTheme(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      applyTheme('system');
      setResolved(resolveTheme('system'));
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((next) => setThemeState(next), []);
  const toggle = useCallback(
    () => setThemeState((t) => (resolveTheme(t) === 'dark' ? 'light' : 'dark')),
    []
  );

  return { theme, resolved, setTheme, toggle };
}
