import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * Branded replacement for window.confirm(). Destructive by default, since that
 * is what the panel uses it for. Handles the things a native dialog gives you
 * for free and a div does not: Escape to cancel, focus moved into the dialog
 * and trapped, focus restored on close, and the page behind locked from
 * scrolling. Cancel is focused first — never the button that destroys data.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger', // 'danger' | 'neutral'
  onConfirm,
  onCancel,
}) {
  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement;
    const timer = setTimeout(() => cancelRef.current?.focus(), 0);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;
      // Keep tabbing inside the dialog.
      const focusable = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (restoreFocusRef.current instanceof HTMLElement) restoreFocusRef.current.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  const danger = tone === 'danger';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                danger ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-brand-navy'
              }`}
              aria-hidden="true"
            >
              {danger ? <AlertTriangle size={20} /> : <X size={20} />}
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="confirm-title" className="text-base font-extrabold text-brand-navy leading-snug">
                {title}
              </h3>
              <p id="confirm-message" className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-500">
                {message}
              </p>
            </div>
          </div>

          {detail && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <p className="font-mono text-[13px] font-bold text-brand-navy truncate">{detail.primary}</p>
              {detail.secondary && (
                <p className="text-[11px] font-semibold text-slate-500 truncate">{detail.secondary}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-steel focus-visible:ring-offset-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              danger
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-600'
                : 'bg-brand-navy hover:bg-brand-steel focus-visible:ring-brand-steel'
            }`}
          >
            {danger && <Trash2 size={14} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
