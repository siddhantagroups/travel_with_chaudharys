import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Bus, Plus, Trash2, Edit2, Users, MapPin,
  FileText, ChevronRight, X, CheckCircle2, Clock, Armchair, Building2,
  ArrowRight,
} from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { DOCS, DocTile } from './ComplianceBoard';
import PlateBadge from './PlateBadge';
import FilterButton from './FilterButton';

import { PUBLIC, MAINTENANCE, assignmentLabel } from './assignmentLabels';

// Must stay within the enum on the Vehicle model, or saves fail validation.
const VEHICLE_TYPES = ['School Bus', 'Mini Bus', 'Seater Bus', 'AC Coach', 'Tempo Traveller', 'Luxury SUV / Cab'];

// Plates get typed with and without spaces/dashes — match on the bare characters.
const bare = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);

function assignmentTone(assignedTo) {
  if (assignedTo === PUBLIC) return 'bg-slate-100 text-slate-600 border-slate-200';
  if (assignedTo === MAINTENANCE) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-indigo-50 text-indigo-700 border-indigo-200';
}


export default function FleetWorkspace({
  vehicles, routes, bookings, assignments, notify,
  onAddVehicle, onUpdateVehicle, onDeleteVehicle,
  // Mirror the optional dashboard sections: route and booking details only
  // appear here while Route Manager / Seat Bookings are switched on.
  showRoutes = true, showBookings = true,
  // Document dates from the Documents tab (null while loading).
  compliance = null, onOpenDocuments,
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'create'
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const gridRef = useRef(null);

  // Fill the screen exactly from wherever the grid happens to start. A fixed
  // offset broke at 1024px, where the header wraps taller than on a wide laptop.
  // Every size: list and details sit side by side and scroll inside themselves.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const fit = () => {
      const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      const topReal = el.getBoundingClientRect().top;
      // Reserve covers the page's own bottom padding plus a little breathing room.
      const availableReal = window.innerHeight - topReal - 44;
      // Style values are CSS px, which the page zoom then scales down.
      el.style.height = `${Math.max(availableReal, 380) / zoom}px`;
    };

    fit();
    window.addEventListener('resize', fit);
    const observer = new ResizeObserver(fit);
    if (el.parentElement) observer.observe(el.parentElement);
    return () => { window.removeEventListener('resize', fit); observer.disconnect(); };
  });

  const counts = useMemo(() => {
    const c = { All: vehicles.length };
    assignments.forEach((a) => { c[a] = vehicles.filter((v) => v.assignedTo === a).length; });
    return c;
  }, [vehicles, assignments]);

  const results = useMemo(() => {
    const q = query.trim();
    const qBare = bare(q);
    const qLower = q.toLowerCase();
    return vehicles.filter((v) => {
      if (filter !== 'All' && v.assignedTo !== filter) return false;
      if (!q) return true;
      return (
        bare(v.plateNumber).includes(qBare) ||
        String(v.modelName || '').toLowerCase().includes(qLower) ||
        String(v.type || '').toLowerCase().includes(qLower) ||
        String(v.assignedTo || '').toLowerCase().includes(qLower)
      );
    });
  }, [vehicles, query, filter]);

  const selected = vehicles.find((v) => v._id === selectedId) || null;

  // The details are never left blank: whenever nothing in the current list is
  // selected, the top vehicle is — on every screen size.
  useEffect(() => {
    if (mode !== 'view') return;
    if (results.length === 0) { if (selectedId) setSelectedId(null); return; }
    if (!results.some((v) => v._id === selectedId)) setSelectedId(results[0]._id);
  }, [mode, results, selectedId]);

  const routesFor = (vehicle) =>
    routes.filter((r) => idOf(r.vehicle) === vehicle._id);

  const bookingsFor = (vehicle) =>
    bookings.filter((b) => b.route && idOf(b.route.vehicle) === vehicle._id);

  const openVehicle = (v) => { setSelectedId(v._id); setMode('view'); setSaved(false); };

  const startCreate = () => {
    setSelectedId(null);
    setMode('create');
    setSaved(false);
    setDraft({ plateNumber: '', modelName: '', type: 'School Bus', capacity: 40, assignedTo: PUBLIC });
  };

  const startEdit = (v) => {
    setMode('edit');
    setSaved(false);
    setDraft({
      plateNumber: v.plateNumber, modelName: v.modelName, type: v.type,
      capacity: v.capacity, assignedTo: v.assignedTo,
    });
  };

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2200); };

  const submitDraft = async (e) => {
    e.preventDefault();
    if (!draft.plateNumber.trim() || !draft.modelName.trim()) return;
    const payload = {
      plateNumber: draft.plateNumber.trim().toUpperCase(),
      modelName: draft.modelName.trim(),
      type: draft.type,
      capacity: Number(draft.capacity) || 1,
      assignedTo: draft.assignedTo,
    };

    if (mode === 'create') {
      const result = await onAddVehicle({ ...payload, features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] });
      if (result?.ok === false) {
        notify?.('Could not add that vehicle', result.error, 'error');
        return;
      }
      setMode('view');
      setDraft(null);
      setQuery(payload.plateNumber);
      notify?.('Vehicle added to your fleet', `${payload.plateNumber} · ${payload.modelName} — ${payload.assignedTo}`);
    } else {
      const result = await onUpdateVehicle(selected._id, { ...selected, ...payload });
      if (result?.ok === false) {
        notify?.('Could not save those changes', result.error, 'error');
        return;
      }
      setMode('view');
      setDraft(null);
      flashSaved();
      notify?.('Changes saved', `${payload.plateNumber} · ${payload.modelName}`);
    }
  };

  // 16px text on phones stops iOS Safari zooming the page when a field is tapped.
  const field = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm font-semibold text-slate-800 focus:border-brand-steel focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-steel/20';
  const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500';

  const filterLabel = (a) => (a === 'All' ? 'All' : assignmentLabel(a));


  // Pieces shared by the phone layout and the tablet / laptop layout.
  const formCard = () => (
    <form onSubmit={submitDraft} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm md:p-6">
      <div className="mb-4 flex items-center justify-between gap-2 md:mb-5">
        <h3 className="min-w-0 truncate text-base font-extrabold text-brand-navy md:text-lg">
          {mode === 'create' ? 'Add a vehicle' : (
            <>
              <span className="md:hidden">Edit vehicle</span>
              <span className="hidden md:inline">Edit {selected.plateNumber}</span>
            </>
          )}
        </h3>
        <button
          type="button"
          onClick={() => { setMode('view'); setDraft(null); }}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Cancel"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
        <div>
          <label className={labelCls}>Plate number</label>
          <input
            value={draft.plateNumber}
            onChange={(e) => setDraft({ ...draft, plateNumber: e.target.value })}
            placeholder="HP 12 A 3456"
            required
            className={`${field} font-mono uppercase`}
          />
        </div>
        <div>
          <label className={labelCls}>Model</label>
          <input
            value={draft.modelName}
            onChange={(e) => setDraft({ ...draft, modelName: e.target.value })}
            placeholder="Tata Starbus"
            required
            className={field}
          />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={field}>
            {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Seats</label>
          <input
            type="number" min="1"
            value={draft.capacity}
            onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
            className={field}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Assigned to</label>
          <select value={draft.assignedTo} onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })} className={field}>
            {assignments.map((a) => <option key={a} value={a}>{assignmentLabel(a)}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-5 flex gap-2 md:mt-6">
        <button type="submit" className="flex-1 rounded-xl bg-brand-navy px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-steel md:flex-none md:px-5">
          {mode === 'create' ? 'Add to fleet' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => { setMode('view'); setDraft(null); }}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 md:px-5"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  // Routes this vehicle runs.
  const routesCard = (v) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm md:p-6">
      <h4 className="flex items-center gap-2 text-sm font-extrabold text-brand-navy">
        <MapPin size={16} className="text-brand-steel" /> Routes served
      </h4>
      {routesFor(v).length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {v.assignedTo === PUBLIC
            ? 'No intercity route uses this bus yet. Add one from the Routes tab.'
            : `Running for ${v.assignedTo}, so it carries no public routes.`}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {routesFor(v).map((r) => (
            <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="text-sm font-bold text-slate-800">{r.departure} → {r.destination}</span>
              <span className="text-xs font-semibold text-slate-500">
                {r.departureTime} – {r.arrivalTime} · ₹{r.price}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // Statutory documents — the same dates the Documents tab tracks.
  const docsCard = (v) => {
    const record = compliance?.find((c) => c._id === v._id);
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <h4 className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-brand-navy md:text-base">
            <FileText size={16} className="shrink-0 text-brand-steel md:h-[18px] md:w-[18px]" />
            <span>Documents &amp; Compliance</span>
          </h4>
          {onOpenDocuments && (
            <button
              onClick={() => onOpenDocuments(v._id)}
              className="-mr-1 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-brand-steel transition-colors hover:bg-slate-50 hover:text-brand-navy"
            >
              <span className="max-[359px]:hidden">View all</span><span className="hidden md:inline"> documents</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {compliance === null ? (
          <p className="mt-3 text-sm text-slate-400">Loading…</p>
        ) : (
          <>
          {/* A tile per document — two across on phones, one per row on
              tablets, up to three across on laptops. */}
          <div className="mt-3 grid grid-cols-2 gap-2 md:mt-4 md:grid-cols-[repeat(auto-fill,minmax(max(250px,calc((100%_-_1.5rem)/3)),1fr))] md:gap-3">
            {DOCS.map((d) => (
              <DocTile key={d.key} doc={d} value={record?.documents?.[d.key]} />
            ))}
          </div>
          </>
        )}
      </div>
    );
  };

  // Phone: tapping a vehicle in the list brings its card (below the list) into view.
  const phoneTopRef = useRef(null);
  const openFromPhoneList = (v) => {
    openVehicle(v);
    requestAnimationFrame(() => phoneTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const tileCls = 'min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 p-2';
  const infoTiles = (v) => [
    { icon: <Bus />, label: 'Type', value: v.type },
    { icon: <Armchair />, label: 'Seats', value: v.capacity },
    { icon: <Building2 />, label: 'Client', value: assignmentLabel(v.assignedTo) },
    showRoutes && { icon: <MapPin />, label: 'Routes', value: routesFor(v).length },
    showBookings && { icon: <Clock />, label: 'Bookings', value: bookingsFor(v).length },
  ].filter(Boolean);

  /*
    Phone: one column, top to bottom — search with a filter button, the
    vehicles in a short scrolling list (the chosen one highlighted) with Add
    vehicle under it, then the chosen vehicle (plate, client, Edit / Delete,
    its Type / Seats / Client tiles), then its documents, two tiles across.

    Tablet & laptop: vehicles listed down the left, the chosen one's details on
    the right, both filling the screen and scrolling inside themselves (height
    set by the effect above).
  */
  return (
    <>
    {/* ================= Phone ================= */}
    <div className="space-y-3 md:hidden">
      {/* Search + filter, then the vehicles (a short list that scrolls
          inside) and Add vehicle — all in one card. */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-2 border-b border-slate-100 p-3">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {/* 16px text stops iOS Safari zooming the page on focus */}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plate or model"
              aria-label="Search vehicles"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-base font-semibold text-slate-800 placeholder:text-sm placeholder:font-medium placeholder:text-slate-400 focus:border-brand-steel focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-steel/20"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <FilterButton
            value={filter}
            onChange={setFilter}
            ariaLabel="Show vehicles for"
            options={['All', ...assignments].map((a) => ({ value: a, label: filterLabel(a), count: counts[a] ?? 0 }))}
          />
        </div>

        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs font-semibold text-slate-500">
            {vehicles.length === 0 ? 'No vehicles yet.' : 'No vehicle matches.'}
          </p>
        ) : (
          <ul className="max-h-[13.25rem] divide-y divide-slate-100 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {results.map((v) => {
              const on = v._id === selectedId && mode !== 'create';
              return (
                <li key={v._id}>
                  <button
                    onClick={() => openFromPhoneList(v)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-2.5 border-l-[3px] py-2.5 pl-2.5 pr-3 text-left transition-colors ${
                      on ? 'border-brand-navy bg-brand-steel/[0.08]' : 'border-transparent active:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[13px] font-bold text-brand-navy">{v.plateNumber}</span>
                      <span className="block truncate text-[11px] font-semibold text-slate-500">{v.modelName} · {v.capacity} seats</span>
                    </span>
                    <span className={`max-w-[42%] shrink-0 truncate rounded-full border px-2 py-0.5 text-[10px] font-bold ${assignmentTone(v.assignedTo)}`}>
                      {assignmentLabel(v.assignedTo)}
                    </span>
                    <ChevronRight size={15} className={`shrink-0 ${on ? 'text-brand-navy' : 'text-slate-300'}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-slate-100 p-2">
          <button
            onClick={() => { startCreate(); requestAnimationFrame(() => phoneTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-navy py-2.5 text-xs font-bold text-white transition-colors active:bg-brand-steel"
          >
            <Plus size={15} /> Add vehicle
          </button>
        </div>
      </div>

      {/* The chosen vehicle (or the add / edit form) */}
      <div ref={phoneTopRef} className="scroll-mt-24">
        {mode === 'create' || (selected && mode === 'edit') ? formCard() : selected ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white min-[400px]:flex" aria-hidden="true">
                <Bus size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <PlateBadge plate={selected.plateNumber} />
                <span className={`mt-1.5 block w-fit max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-bold ${assignmentTone(selected.assignedTo)}`}>
                  {assignmentLabel(selected.assignedTo)}
                </span>
                {saved && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 size={13} /> Saved
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => startEdit(selected)}
                  aria-label="Edit vehicle"
                  className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 text-xs font-bold text-slate-700 transition-colors active:bg-slate-100 min-[360px]:px-3"
                >
                  <Edit2 size={14} /><span className="max-[359px]:hidden">Edit</span>
                </button>
                <button
                  onClick={() => setPendingDelete(selected)}
                  aria-label="Delete vehicle"
                  className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-2 text-xs font-bold text-red-600 transition-colors active:bg-red-50 min-[360px]:px-3"
                >
                  <Trash2 size={14} /><span className="max-[359px]:hidden">Delete</span>
                </button>
              </div>
            </div>

            {/* Type / Seats / Client tiles, three across. */}
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {infoTiles(selected).map((t) => (
                <div key={t.label} className={tileCls}>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-brand-steel ring-1 ring-slate-200 [&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden="true">
                      {t.icon}
                    </span>
                    <dt className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-400">{t.label}</dt>
                  </div>
                  <dd className="mt-1 break-words text-[12px] font-bold leading-snug text-slate-800">{t.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center">
            <p className="text-sm font-bold text-slate-600">
              {vehicles.length === 0 ? 'No vehicles yet' : 'No vehicle matches this search'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {vehicles.length === 0
                ? 'Add your first vehicle to see its details here.'
                : 'Try the plate number, model, or the school it runs for.'}
            </p>
          </div>
        )}
      </div>

      {selected && mode === 'view' && showRoutes && routesCard(selected)}
      {selected && mode === 'view' && docsCard(selected)}
    </div>

    {/* ================= Tablet & laptop ================= */}
    <div
      ref={gridRef}
      className="hidden overflow-hidden md:grid md:grid-cols-[minmax(250px,290px)_1fr] md:grid-rows-[minmax(0,1fr)] md:gap-5 lg:grid-cols-[minmax(300px,380px)_1fr]"
    >
      {/* ---------------- Left: the vehicles ---------------- */}
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden border-b border-slate-100 p-4 md:block">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plate, model or school"
                aria-label="Search vehicles"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-base font-semibold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-brand-steel focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-steel/20 md:text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {['All', ...assignments].map((a) => (
                <button
                  key={a}
                  onClick={() => setFilter(a)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    filter === a
                      ? 'border-brand-navy bg-brand-navy text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-steel/40 hover:text-brand-navy'
                  }`}
                >
                  {filterLabel(a)}
                  <span className={filter === a ? 'ml-1 text-white/70' : 'ml-1 text-slate-400'}>{counts[a] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
            {results.length === 0 ? (
              <div className="px-3 py-8 text-center md:px-4 md:py-10">
                <p className="text-xs font-semibold text-slate-500 md:text-sm">No vehicle matches.</p>
                <p className="mt-1 hidden text-xs text-slate-400 md:block">Try the plate number, model, or the school it runs for.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.map((v) => {
                  const on = v._id === selectedId && mode !== 'create';
                  return (
                    <li key={v._id}>
                      <button
                        onClick={() => openVehicle(v)}
                        aria-pressed={on}
                        className={`flex w-full items-center gap-3 border-l-[3px] py-3 pl-2.5 pr-2 text-left transition-colors md:border-l-0 md:px-4 ${
                          on ? 'border-brand-navy bg-brand-steel/[0.08]' : 'border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-brand-navy md:flex">
                          <Bus size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-[13px] font-bold text-brand-navy">{v.plateNumber}</span>
                          <span className="block truncate text-[11px] font-semibold text-slate-500">
                            {v.modelName}<span className="hidden md:inline"> · {v.capacity} seats</span>
                          </span>
                        </span>
                        {/* Too narrow for the tag below laptop width; the details show it. */}
                        <span className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold lg:inline ${assignmentTone(v.assignedTo)}`}>
                          {assignmentLabel(v.assignedTo)}
                        </span>
                        <ChevronRight size={15} className="hidden shrink-0 text-slate-300 md:block" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 p-2 md:p-3">
            <button
              onClick={startCreate}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-navy py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-steel"
            >
              <Plus size={15} /> Add<span className="hidden sm:inline"> vehicle</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- Right: everything about it ---------------- */}
      {/* Phones scroll by touch — no scrollbar eating into the narrow column. */}
      <div className="h-full min-h-0 min-w-0 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:pr-1">
        {mode === 'create' || (selected && mode === 'edit') ? (
          formCard()
        ) : selected ? (
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            {/* Identity + actions. Phone: plate with icon-only Edit / Delete in
                the top-right corner, then where it runs and the model below.
                Tablet up: bus mark, details, and labelled buttons on the right. */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-6">
              <div className="flex items-center gap-4">
                {/* Laptop only — phones and tablets lead with the plate itself. */}
                <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white lg:flex">
                  <Bus size={22} />
                </span>
                <div className="min-w-0 flex-1 md:flex md:items-start md:justify-between md:gap-3">
                  <div className="min-w-0">
                    {/* Where it runs sits with the plate; changed only through Edit. */}
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 md:gap-x-2.5">
                      <PlateBadge plate={selected.plateNumber} />
                      {/* Laptop: a tag beside the plate. */}
                      <span className={`hidden max-w-full truncate rounded-full border px-2.5 py-0.5 text-[11px] font-bold lg:inline-block ${assignmentTone(selected.assignedTo)}`}>
                        {assignmentLabel(selected.assignedTo)}
                      </span>

                      {/* Phone: icon-only buttons, top right beside the plate. */}
                      <div className="ml-auto flex shrink-0 gap-1 md:hidden">
                        <button
                          onClick={() => startEdit(selected)}
                          aria-label="Edit vehicle"
                          title="Edit"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors active:bg-slate-100"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setPendingDelete(selected)}
                          aria-label="Delete vehicle"
                          title="Delete"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors active:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {saved && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 size={13} /> Saved
                      </p>
                    )}
                  </div>

                  {/* Tablet & laptop: labelled buttons on the right. */}
                  <div className="hidden shrink-0 gap-2 md:flex">
                    <button
                      onClick={() => startEdit(selected)}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-700 transition-colors hover:border-brand-steel hover:text-brand-navy"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button
                      onClick={() => setPendingDelete(selected)}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Tiles on every size — two across on phones. */}
              <dl className={`mt-3 grid grid-cols-2 gap-2 md:mt-4 md:gap-3 lg:mt-5 ${
                showRoutes && showBookings ? 'md:grid-cols-3 lg:grid-cols-5' : showRoutes || showBookings ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'
              }`}>
                {/* Phone & tablet: where it runs, in a highlighted box on its own
                    row between the plate and the details (on tablet it spans
                    the tile grid). Laptops show the tag beside the plate instead.
                    The label is for screen readers only. Phone spacing: equal
                    above (the list's top margin) and below (pb-3). */}
                {/* Tablet: 16px above (the list's md:mt-4) and 16px below
                    (the grid's 12px gap + pb-1), so the box sits evenly. */}
                <div className="col-span-2 md:hidden">
                  <dt className="sr-only">Assigned to</dt>
                  {/* Box spans the full width. Name centred on small/medium
                      phones, left-aligned on large phones (400px+) and tablets. */}
                  <dd className="rounded-lg border border-brand-steel/15 bg-brand-steel/[0.06] px-3 py-1.5 text-center text-sm font-bold leading-snug text-brand-navy min-[400px]:text-left">
                    {/* Tablet has the room to say it in full. */}
                    <span className="hidden md:inline" aria-hidden="true">Assigned to </span>
                    {assignmentLabel(selected.assignedTo)}
                  </dd>
                </div>
                {/* A tile with an icon square on the left, label above value.
                    Client only on laptops — phones and tablets show it in the
                    box above. */}
                {[
                  { icon: <Bus size={17} />, label: 'Type', value: selected.type },
                  { icon: <Armchair size={17} />, label: 'Seats', value: selected.capacity },
                  { icon: <Building2 size={17} />, label: 'Client', value: assignmentLabel(selected.assignedTo), wideOnly: true },
                  showRoutes && { icon: <MapPin size={17} />, label: 'Routes', value: routesFor(selected).length },
                  showBookings && { icon: <Clock size={17} />, label: 'Bookings', value: bookingsFor(selected).length },
                ].filter(Boolean).map((s) => (
                  <div
                    key={s.label}
                    className={`min-w-0 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2 md:flex md:gap-3 md:rounded-xl md:p-3 ${s.wideOnly ? 'hidden' : 'flex'}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-brand-steel ring-1 ring-slate-200 md:h-9 md:w-9 md:rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5 md:[&>svg]:h-[17px] md:[&>svg]:w-[17px]" aria-hidden="true">
                      {s.icon}
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</dt>
                      <dd className="text-[13px] font-bold leading-snug text-slate-800 md:mt-0.5 md:truncate md:text-sm">{s.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            {showRoutes && routesCard(selected)}

            {docsCard(selected)}
          </div>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center md:min-h-[320px] md:p-10">
            <div>
              <span className="mx-auto hidden h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 md:flex">
                <Search size={22} />
              </span>
              {/* With the top vehicle opened by default, this only shows when the
                  list itself is empty. */}
              <p className="mt-4 text-sm font-bold text-slate-600">
                {vehicles.length === 0 ? 'No vehicles yet' : 'No vehicle matches this search'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {vehicles.length === 0
                  ? 'Add your first vehicle to see its details here.'
                  : 'Try the plate number, model, or the school it runs for.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove this vehicle?"
        message="It will be taken off the fleet along with its assignment. This can't be undone."
        detail={pendingDelete ? {
          primary: pendingDelete.plateNumber,
          secondary: `${pendingDelete.modelName} · ${pendingDelete.assignedTo}`,
        } : null}
        confirmLabel="Remove vehicle"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const vehicle = pendingDelete;
          setPendingDelete(null);
          const result = await onDeleteVehicle(vehicle._id);
          if (result?.ok === false) {
            notify?.('Could not remove that vehicle', result.error, 'error');
            return;
          }
          if (selectedId === vehicle._id) setSelectedId(null);
          notify?.('Vehicle removed', `${vehicle.plateNumber} is no longer in your fleet.`);
        }}
      />
    </>
  );
}
