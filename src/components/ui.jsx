import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from './Icon.jsx';

export const ProgressBar = ({
  value = 0,
  max = 1,
  label,
  tone = 'teal',
  showValue = false,
  valueLabel = ''
}) => {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="progress-wrap">
      {(label || showValue) && (
        <div className="progress-label">
          {label && <span>{label}</span>}
          {showValue && <span>{valueLabel || `${Math.round(percent)}%`}</span>}
        </div>
      )}
      <div
        className="progress"
        role="progressbar"
        aria-label={label || 'Progress'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <div className={`progress-bar ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

export const Pill = ({ children, tone = 'subtle', className = '' }) => (
  <span className={`pill ${tone} ${className}`.trim()}>{children}</span>
);

export const Modal = ({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = 'medium',
  hideClose = false
}) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    document.body.classList.add('modal-open');

    const dialog = dialogRef.current;
    const getFocusable = () =>
      Array.from(
        dialog?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      );
    const first = getFocusable()[0];
    first?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !hideClose) {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
      previousFocusRef.current?.focus?.();
    };
  }, [open, hideClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !hideClose) onCloseRef.current?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          {!hideClose && (
            <button className="btn icon ghost" onClick={() => onCloseRef.current?.()} aria-label="Close dialog">
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export const EmptyState = ({ title, children }) => (
  <div className="empty-state">
    <p className="strong">{title}</p>
    {children && <p className="muted">{children}</p>}
  </div>
);
