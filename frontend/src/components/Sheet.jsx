import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, X } from 'lucide-react';

/*
  Bottom sheet on a phone, centred panel on a tablet or laptop. Shared by the
  admin tabs (Vehicle Documents, Accounts) so every pop-up behaves the same:
  tap outside or press Escape to close.
*/
export function Sheet({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Portalled to <body>: the admin tab content sits in its own stacking
  // context, which would otherwise leave the sticky header above the sheet.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>,
    document.body
  );
}

export function SheetHeader({ title, subtitle, onBack, onClose }) {
  return (
    <div className="sticky top-0 z-10 bg-white flex items-center gap-2 px-4 sm:px-5 py-4 border-b border-slate-100">
      {onBack && (
        <button onClick={onBack} aria-label="Back" className="-ml-1 w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center">
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold text-brand-navy truncate">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 truncate">{subtitle}</div>}
      </div>
      <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center">
        <X size={18} className="text-slate-500" />
      </button>
    </div>
  );
}
