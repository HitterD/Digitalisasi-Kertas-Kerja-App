import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      className={`wa-premium-theme-toggle ${isDark ? 'is-dark' : 'is-light'}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="wa-theme-slider" />
      <span className="wa-theme-icon">
        <Sun size={13} strokeWidth={2.5} />
      </span>
      <span className="wa-theme-icon">
        <Moon size={13} strokeWidth={2.5} />
      </span>
    </button>
  );
}
