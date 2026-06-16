import { useEffect } from 'react';

function parseShortcut(spec) {
  const parts = String(spec).toLowerCase().split('+').map((s) => s.trim());
  const result = { key: '', mod: false, ctrl: false, shift: false, alt: false };
  for (const part of parts) {
    if (part === 'mod' || part === 'cmd' || part === 'meta') {
      result.mod = true;
      result.ctrl = true; // match both
    } else if (part === 'ctrl') {
      result.ctrl = true;
    } else if (part === 'shift') {
      result.shift = true;
    } else if (part === 'alt') {
      result.alt = true;
    } else if (part === 'escape' || part === 'esc') {
      result.key = 'escape';
    } else {
      result.key = part;
    }
  }
  return result;
}

function matchShortcut(event, spec) {
  if (event.key.toLowerCase() !== spec.key) return false;
  if (spec.mod && !(event.metaKey || event.ctrlKey)) return false;
  if (spec.ctrl && !event.ctrlKey && !event.metaKey) return false;
  if (spec.shift !== event.shiftKey) return false;
  if (spec.alt !== event.altKey) return false;
  return true;
}

export function useKeyboardShortcuts(map) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = (event) => {
      for (const [spec, fn] of Object.entries(map)) {
        if (typeof fn !== 'function') continue;
        const parsed = parseShortcut(spec);
        if (matchShortcut(event, parsed)) {
          event.preventDefault();
          fn(event);
          break;
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [map]);
}
