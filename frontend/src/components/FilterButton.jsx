import React from 'react';
import { ListFilter, ChevronDown } from 'lucide-react';

/*
  A compact filter button for phones: shows the current choice, and tapping
  it opens the phone's own list of options (a native <select> laid invisibly
  over the button), so the choices don't take up the screen until needed.

  options: [{ value, label, count }]
*/
export default function FilterButton({ value, onChange, options, ariaLabel = 'Filter' }) {
  const current = options.find((o) => o.value === value) || options[0];
  const active = value !== options[0]?.value;
  return (
    <div
      className={`relative flex h-11 min-w-0 max-w-[46%] shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[13px] font-bold transition-colors ${
        active ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      <ListFilter size={15} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{current?.label}</span>
      {current?.count != null && (
        <span className={`shrink-0 ${active ? 'text-white/70' : 'text-slate-400'}`}>{current.count}</span>
      )}
      <ChevronDown size={14} className={`shrink-0 ${active ? 'text-white/70' : 'text-slate-400'}`} aria-hidden="true" />
      {/* 16px text stops iOS Safari zooming the page when the list opens */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 text-base"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}{o.count != null ? ` (${o.count})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
