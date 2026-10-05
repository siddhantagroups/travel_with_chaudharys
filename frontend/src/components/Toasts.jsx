import React, { useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';

/**
 * Centre-screen confirmation for admin writes. Deliberately not a corner strip:
 * a save the owner just made should land in front of them, not slide past in
 * the periphery like a background notification.
 *
 * Success dismisses itself and never blocks the page (pointer-events stay off,
 * so a click lands on whatever is underneath). Errors hold their place until
 * acknowledged, because losing a failure message is how data goes missing.
 */
function SuccessCard({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 1900);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="confirm-pop flex w-full max-w-[300px] flex-col items-center rounded-2xl border border-slate-200 bg-white/95 px-6 py-7 text-center shadow-2xl backdrop-blur-sm">
        <span className="confirm-ring flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check size={28} strokeWidth={3} className="confirm-tick" />
        </span>
        <p className="mt-4 text-[15px] font-extrabold leading-snug text-brand-navy">{toast.title}</p>
        {toast.detail && (
          <p className="mt-1.5 text-[12px] font-semibold leading-relaxed text-slate-500">{toast.detail}</p>
        )}
      </div>
    </div>
  );
}

function ErrorCard({ toast, onDismiss }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="confirm-pop w-full max-w-[320px] rounded-2xl border border-slate-200 bg-white px-6 py-7 text-center shadow-2xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertCircle size={28} />
        </span>
        <p className="mt-4 text-[15px] font-extrabold leading-snug text-brand-navy">{toast.title}</p>
        {toast.detail && (
          <p className="mt-1.5 text-[12px] font-semibold leading-relaxed text-slate-500">{toast.detail}</p>
        )}
        <button
          onClick={() => onDismiss(toast.id)}
          autoFocus
          className="mt-5 w-full rounded-xl bg-brand-navy py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-steel focus-visible:ring-offset-2"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function Toasts({ toasts, onDismiss }) {
  // Only the newest matters on screen at once — stacking centre cards would
  // just cover each other.
  const current = toasts[toasts.length - 1];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confirmPop {
          0%   { opacity: 0; transform: scale(0.92) translateY(6px); }
          60%  { opacity: 1; transform: scale(1.01); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes confirmRing {
          0%   { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confirmTick {
          0%   { transform: scale(0.4); opacity: 0; }
          70%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .confirm-pop  { animation: confirmPop 280ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .confirm-ring { animation: confirmRing 320ms cubic-bezier(0.22, 1, 0.36, 1) 60ms both; }
        .confirm-tick { animation: confirmTick 340ms cubic-bezier(0.22, 1, 0.36, 1) 160ms both; }
        @media (prefers-reduced-motion: reduce) {
          .confirm-pop, .confirm-ring, .confirm-tick { animation: none; }
        }
      ` }} />

      <div role="status" aria-live="polite" className="sr-only">
        {current ? `${current.title}. ${current.detail || ''}` : ''}
      </div>

      {current && (
        current.tone === 'error'
          ? <ErrorCard toast={current} onDismiss={onDismiss} />
          : <SuccessCard toast={current} onDismiss={onDismiss} />
      )}
    </>
  );
}
