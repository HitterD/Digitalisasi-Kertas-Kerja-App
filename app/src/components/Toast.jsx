import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import './Toast.css';

const ICONS = {
  success: CheckCircle2,
  danger: AlertCircle,
  warning: AlertTriangle,
};

export default function Toast({ type = 'success', title, message, duration = 3000, onClose }) {
  useEffect(() => {
    if (!duration || typeof onClose !== 'function') return undefined;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  const Icon = ICONS[type] || CheckCircle2;
  const iconColor =
    type === 'success' ? 'var(--success-500)' :
    type === 'danger' ? 'var(--danger-500)' :
    type === 'warning' ? 'var(--warning-500)' :
    'var(--accent)';

  return (
    <div className={`wa-toast wa-toast--${type}`} role="status">
      <Icon size={16} color={iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        {title && <div className="wa-toast__title">{title}</div>}
        {message && <div className="wa-toast__body">{message}</div>}
      </div>
      {typeof onClose === 'function' && (
        <button className="wa-toast__close" onClick={onClose} aria-label="Tutup">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
