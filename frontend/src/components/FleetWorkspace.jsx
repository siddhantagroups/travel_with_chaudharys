import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Bus, Plus, Trash2, Edit2, Landmark, Users, MapPin,
  FileText, ChevronRight, X, ArrowLeft, CheckCircle2, Info, Clock, Tag
} from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

const PUBLIC = 'Available for Public Booking';
const MAINTENANCE = 'Maintenance';

// Must stay within the enum on the Vehicle model, or saves fail validation.
const VEHICLE_TYPES = ['School Bus', 'Mini Bus', 'Seater Bus', 'AC Coach', 'Tempo Traveller', 'Luxury SUV / Cab'];

// Plates get typed with and without spaces/dashes — match on the bare characters.
const bare = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);

function assignmentTone(assignedTo) {
  if (assignedTo === PUBLIC) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (assignedTo === MAINTENANCE) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-indigo-50 text-indigo-700 border-indigo-200';
}

export default function FleetWorkspace({
  vehicles, routes, bookings, assignments, notify,
  onAddVehicle, onUpdateVehicle, onDeleteVehicle,
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
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const fit = () => {
      if (window.innerWidth < 1024) { el.style.height = ''; return; }
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

  // Assignment can be changed straight from the detail view — the common job.
  const reassign = async (value) => {
    if (!selected || value === selected.assignedTo) return;
    const result = await onUpdateVehicle(selected._id, { ...selected, assignedTo: value });
    if (result?.ok === false) {
      notify?.('Could not reassign that vehicle', result.error, 'error');
      return;
    }
    flashSaved();
    notify?.('Vehicle reassigned', `${selected.plateNumber} now runs for ${value}.`);
  };

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

  const field = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-brand-steel focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-steel/20';
  const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500';

  // On a laptop the two columns fill the screen and scroll inside themselves, so
  // the vehicle's details are read without scrolling the page. Height is set by
  // the effect above; below lg the columns stack and flow naturally.
  return (
    <div ref={gridRef} className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(300px,380px)_1fr] lg:overflow-hidden">
      {/* ---------------- Left: find a vehicle ---------------- */}
      <div className={`lg:flex lg:h-full lg:min-h-0 lg:flex-col ${selected || mode === 'create' ? 'hidden lg:flex' : ''}`}>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex lg:h-full lg:min-h-0 lg:flex-col">
          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plate, model or school"
                aria-label="Search vehicles"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm font-semibold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:border-brand-steel focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-steel/20"
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
                  {a === PUBLIC ? 'Public' : a === 'All' ? 'All' : a}
                  <span className={filter === a ? 'ml-1 text-white/70' : 'ml-1 text-slate-400'}>{counts[a] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
            {results.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-500">No vehicle matches “{query || filter}”.</p>
                <p className="mt-1 text-xs text-slate-400">Try the plate number, model, or the school it runs for.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.map((v) => (
                  <li key={v._id}>
                    <button
                      onClick={() => openVehicle(v)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        v._id === selectedId ? 'bg-brand-steel/[0.07]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-brand-navy">
                        <Bus size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[13px] font-bold text-brand-navy">{v.plateNumber}</span>
                        <span className="block truncate text-[11px] font-semibold text-slate-500">
                          {v.modelName} · {v.capacity} seats
                        </span>
                      </span>
                      <span className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold sm:inline ${assignmentTone(v.assignedTo)}`}>
                        {v.assignedTo === PUBLIC ? 'Public' : v.assignedTo}
                      </span>
                      <ChevronRight size={15} className="shrink-0 text-slate-300" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-100 p-3">
            <button
              onClick={startCreate}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-navy py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-steel"
            >
              <Plus size={15} /> Add vehicle
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- Right: everything about it ---------------- */}
      <div className={`lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1 ${!selected && mode !== 'create' ? 'hidden lg:block' : ''}`}>
        {mode === 'create' || (selected && mode === 'edit') ? (
          <form onSubmit={submitDraft} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-brand-navy">
                {mode === 'create' ? 'Add a vehicle' : `Edit ${selected.plateNumber}`}
              </h3>
              <button
                type="button"
                onClick={() => { setMode('view'); setDraft(null); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                  {assignments.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button type="submit" className="rounded-xl bg-brand-navy px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-steel">
                {mode === 'create' ? 'Add to fleet' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('view'); setDraft(null); }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : selected ? (
          <div className="space-y-4">
            {/* Identity + actions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <button
                onClick={() => setSelectedId(null)}
                className="mb-4 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-brand-navy lg:hidden"
              >
                <ArrowLeft size={13} /> All vehicles
              </button>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white">
                    <Bus size={22} />
                  </span>
                  <div>
                    <h3 className="font-mono text-xl font-extrabold tracking-tight text-brand-navy">{selected.plateNumber}</h3>
                    <p className="text-sm font-semibold text-slate-500">{selected.modelName}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(selected)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-brand-steel hover:text-brand-navy"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setPendingDelete(selected)}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3.5 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: <Tag size={14} />, label: 'Type', value: selected.type },
                  { icon: <Users size={14} />, label: 'Seats', value: selected.capacity },
                  { icon: <MapPin size={14} />, label: 'Routes', value: routesFor(selected).length },
                  { icon: <Clock size={14} />, label: 'Bookings', value: bookingsFor(selected).length },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center gap-1.5 text-slate-400">{s.icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-800">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Where it's assigned — changeable in place */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-extrabold text-brand-navy">
                  <Landmark size={16} className="text-brand-steel" /> Assigned to
                </h4>
                {saved && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 size={13} /> Saved
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${assignmentTone(selected.assignedTo)}`}>
                  {selected.assignedTo}
                </span>
                <span className="text-xs font-semibold text-slate-400">change to</span>
                <select
                  value={selected.assignedTo}
                  onChange={(e) => reassign(e.target.value)}
                  aria-label="Change assignment"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-brand-steel focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-steel/20"
                >
                  {assignments.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Routes this vehicle runs */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="flex items-center gap-2 text-sm font-extrabold text-brand-navy">
                <MapPin size={16} className="text-brand-steel" /> Routes served
              </h4>
              {routesFor(selected).length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  {selected.assignedTo === PUBLIC
                    ? 'No intercity route uses this bus yet. Add one from the Routes tab.'
                    : `Running for ${selected.assignedTo}, so it carries no public routes.`}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {routesFor(selected).map((r) => (
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

            {/* Placeholder for the ECO lookup — deliberately empty, not invented */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6">
              <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-600">
                <FileText size={16} className="text-slate-400" /> Registration &amp; documents
              </h4>
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                <Info size={14} className="mt-px shrink-0 text-slate-400" />
                RC, insurance and permit details will appear here once the ECO vehicle API is connected. The lookup will
                use this plate: <span className="ml-1 font-mono font-bold text-slate-700">{selected.plateNumber}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <div>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Search size={22} />
              </span>
              <p className="mt-4 text-sm font-bold text-slate-600">Pick a vehicle to see everything about it</p>
              <p className="mt-1 text-xs text-slate-500">
                Search by plate, model or the school it runs for. You'll get its assignment, routes and bookings in one place.
              </p>
            </div>
          </div>
        )}
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
    </div>
  );
}
