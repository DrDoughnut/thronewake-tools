import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemDescription?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  itemDescription,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="op-modal-backdrop op-modal-backdrop--confirm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div className="op-modal op-modal--compact" onClick={(e) => e.stopPropagation()}>
        <div className="op-modal__header">
          <div className="op-modal__title-wrap">
            <span className="op-modal__icon">⚠️</span>
            <div>
              <h2 id="confirm-delete-title" className="op-modal__title">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="op-modal-close"
            onClick={onCancel}
            aria-label="Cancel deletion"
          >
            ✕
          </button>
        </div>

        <div className="op-modal__body">
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.5 }}>
            {message}
          </p>
          {itemDescription && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'hsl(220, 20%, 8%)',
                border: '1px solid hsl(220, 16%, 18%)',
                fontSize: '12.5px',
                color: 'var(--text-dim)',
                wordBreak: 'break-word',
              }}
            >
              <strong>Target:</strong> {itemDescription}
            </div>
          )}
        </div>

        <div className="op-modal__footer" style={{ gap: '10px' }}>
          <button
            type="button"
            className="pill pill--secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="pill op-remove-danger"
            onClick={onConfirm}
            autoFocus
          >
            🗑️ {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  const isTest =
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
    (typeof globalThis !== 'undefined' && (globalThis as Record<string, any>).process?.env?.NODE_ENV === 'test');

  if (isTest) {
    return modalContent;
  }

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
