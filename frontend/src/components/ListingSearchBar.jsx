import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

// Compact, editable search bar shown on the listing page so users can refine
// their search (from / to / date / seats) without returning to the hero.
export default function ListingSearchBar({ routes, initial, onApply }) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [date, setDate] = useState(initial.date);
  const [seats, setSeats] = useState(initial.seats || 1);

  const fromOptions = Array.from(new Set(routes.map((r) => r.departure)));
  const toOptions = Array.from(new Set(routes.filter((r) => r.departure === from).map((r) => r.destination)));

  // Keep "to" valid when "from" changes
  useEffect(() => {
    if (toOptions.length && !toOptions.includes(to)) setTo(toOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  const submit = (e) => {
    e.preventDefault();
    onApply({ from, to, date, seats: parseInt(seats, 10) || 1, bookingType: 'oneway' });
  };

  const field = 'w-full bg-transparent font-bold text-brand-navy text-sm focus:outline-none appearance-none cursor-pointer';

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-2xl p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2 shadow-xl"
    >
      {/* From */}
      <div className="flex-1 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors">
        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">From</label>
        <select value={from} onChange={(e) => setFrom(e.target.value)} className={field}>
          {fromOptions.map((o) => (<option key={o} value={o}>{o}</option>))}
        </select>
      </div>

      <div className="hidden md:block w-px self-stretch my-1 bg-slate-200"></div>

      {/* To */}
      <div className="flex-1 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors">
        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">To</label>
        <select value={to} onChange={(e) => setTo(e.target.value)} className={field}>
          {toOptions.length ? toOptions.map((o) => (<option key={o} value={o}>{o}</option>)) : (<option value={to}>{to}</option>)}
        </select>
      </div>

      <div className="hidden md:block w-px self-stretch my-1 bg-slate-200"></div>

      {/* Date */}
      <div className="flex-1 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors">
        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Travel Date</label>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent font-bold text-brand-navy text-sm focus:outline-none"
        />
      </div>

      <div className="hidden md:block w-px self-stretch my-1 bg-slate-200"></div>

      {/* Seats */}
      <div className="px-3 py-1.5 rounded-xl">
        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Seats</label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSeats((s) => Math.max(1, s - 1))} className="w-6 h-6 rounded-full bg-slate-100 font-black text-slate-600 hover:bg-slate-200 text-xs">-</button>
          <span className="font-bold text-brand-navy text-sm w-4 text-center">{seats}</span>
          <button type="button" onClick={() => setSeats((s) => Math.min(6, s + 1))} className="w-6 h-6 rounded-full bg-slate-100 font-black text-slate-600 hover:bg-slate-200 text-xs">+</button>
        </div>
      </div>

      {/* Update */}
      <button
        type="submit"
        className="px-6 py-3 rounded-xl bg-brand-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-brand-navy/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
      >
        <Search size={16} />
        <span>Update</span>
      </button>
    </form>
  );
}
