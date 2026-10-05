import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronRight, Building2, Phone, User, Trash2, Bus, Wrench, ArrowLeftRight, Armchair } from 'lucide-react';
import { PUBLIC, MAINTENANCE, assignmentLabel } from './assignmentLabels';

/*
  Clients — the schools and companies the fleet works for.

  One screen, laid out like My Fleet and Vehicle Documents: a slim bar with
  the three counts and Add client, then clients down the left and the chosen
  one's details on the right, the first client open by default. The frame
  fills the screen exactly; the list and the chosen client's vehicles each
  scroll inside themselves, so the page itself never needs scrolling.
*/

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const seatsOf = (list) => list.reduce((t, v) => t + (Number(v.capacity) || 0), 0);

function SchoolIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  );
}

// The icon for a group — school, company, free vehicles or the workshop.
function GroupIcon({ g, size = 18 }) {
  if (g.value === PUBLIC) return <Bus size={size} aria-hidden="true" />;
  if (g.value === MAINTENANCE) return <Wrench size={size} aria-hidden="true" />;
  if (g.client?.kind === 'Company') return <Building2 size={size} aria-hidden="true" />;
  return <SchoolIcon width={size} height={size} />;
}

// Phone: a small button that opens the phone's own list of choices — the
// native <select> sits invisibly over it. Picking an option acts at once.
function PickButton({ icon, label, placeholder, options, onPick, className, ariaLabel, disabled }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center gap-1.5 ${className}`}>
      {icon}
      <span>{label}</span>
      {/* 16px text stops iOS Safari zooming the page when the list opens */}
      <select
        value=""
        disabled={disabled}
        onChange={(e) => { if (e.target.value) onPick(e.target.value); }}
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full cursor-pointer text-base opacity-0 disabled:cursor-default"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </span>
  );
}

export default function ClientsBoard({
  vehicles, clients, assignments, onUpdateVehicle, notify, onAddClient, onRemoveClient,
}) {
  const [selectedValue, setSelectedValue] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [addId, setAddId] = useState('');
  const gridRef = useRef(null);
  const phoneDetailsRef = useRef(null); // phone: the chosen client's card

  const groups = assignments.map((value) => ({
    value,
    client: clients.find((c) => c.name === value) || null,
    list: vehicles.filter((v) => v.assignedTo === value),
  }));
  const contractGroups = groups.filter((g) => g.value !== PUBLIC && g.value !== MAINTENANCE);
  const otherGroups = groups.filter((g) => g.value === PUBLIC || g.value === MAINTENANCE);
  const onContract = contractGroups.reduce((t, g) => t + g.list.length, 0);
  const freeCount = groups.find((g) => g.value === PUBLIC)?.list.length || 0;

  // Always something selected — the first client, or "Not on contract" when
  // there are no clients yet.
  const selected = groups.find((g) => g.value === selectedValue) || contractGroups[0] || otherGroups[0] || null;
  useEffect(() => { setAddId(''); }, [selected?.value]);

  // Fill the screen from wherever the frame starts (same as My Fleet), so
  // nothing on this tab needs the page to scroll.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;

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

  const move = async (vehicle, to) => {
    if (to === vehicle.assignedTo) return;
    setBusyId(vehicle._id);
    const result = await onUpdateVehicle(vehicle._id, { ...vehicle, assignedTo: to });
    setBusyId(null);
    if (result?.ok === false) {
      notify?.('Could not move that vehicle', result.error, 'error');
    } else {
      notify?.('Vehicle moved', `${vehicle.plateNumber} → ${assignmentLabel(to)}`);
    }
  };

  const addTo = async (g) => {
    const vehicle = vehicles.find((v) => v._id === addId);
    if (!vehicle || !g) return;
    await move(vehicle, g.value);
    setAddId('');
  };

  const kindLabel = (g) => {
    if (g.value === PUBLIC) return 'Free vehicles';
    if (g.value === MAINTENANCE) return 'In the workshop';
    return g.client?.kind || 'Client';
  };

  // One row in the left-hand list. Clients sit on a faint navy tint with a
  // navy edge and an "On contract" mark; the free and workshop groups stay plain.
  const renderRow = (g) => {
    const on = selected?.value === g.value;
    const isClient = Boolean(g.client);
    return (
      <li key={g.value}>
        <button
          onClick={() => setSelectedValue(g.value)}
          aria-pressed={on}
          className={`flex w-full items-center gap-3 border-l-[3px] py-2.5 pl-2.5 pr-2 text-left transition-colors md:px-4 ${
            on
              ? 'border-brand-navy bg-brand-steel/[0.11]'
              : isClient
                ? 'border-brand-steel/40 hover:bg-white/70'
                : 'border-transparent hover:bg-slate-50'
          }`}
        >
          <span
            className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg md:flex ${
              on ? 'bg-brand-navy text-white' : isClient ? 'bg-brand-steel/15 text-brand-navy' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <GroupIcon g={g} size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-[13px] leading-snug text-brand-navy md:truncate md:text-sm ${isClient ? 'font-extrabold' : 'font-bold'}`}>{assignmentLabel(g.value)}</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              {isClient && (
                <>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span className="hidden font-bold text-emerald-700 md:inline">On contract ·</span>
                </>
              )}
              {plural(g.list.length, 'vehicle')}
            </span>
          </span>
          <ChevronRight size={15} className={`hidden shrink-0 md:block ${on ? 'text-brand-navy' : 'text-slate-300'}`} />
        </button>
      </li>
    );
  };


  /* ================= Phone =================
     Three cards, top to bottom:
     1. The counts in one slim row, then every client (icon, name, how many
        vehicles and seats) and the groups not with a client.
     2. The chosen client: name, Vehicles / Seats tiles, contact with a Call
        button.
     3. Its vehicles, each with a small Move button, and Add vehicle.
     Tapping a client brings its card into view. */
  const openOnPhone = (g) => {
    setSelectedValue(g.value);
    requestAnimationFrame(() => phoneDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const phoneRow = (g) => {
    const on = selected?.value === g.value;
    const isClient = Boolean(g.client);
    return (
      <li key={g.value}>
        <button
          onClick={() => openOnPhone(g)}
          aria-pressed={on}
          className={`flex w-full items-center gap-3 border-l-[3px] px-3 py-2.5 text-left transition-colors ${
            on ? 'border-brand-navy bg-brand-steel/[0.08]' : 'border-transparent active:bg-slate-50'
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              on ? 'bg-brand-navy text-white' : isClient ? 'bg-brand-steel/10 text-brand-navy' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <GroupIcon g={g} size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[13px] leading-snug ${isClient ? 'font-extrabold text-brand-navy' : 'font-bold text-slate-600'}`}>
              {assignmentLabel(g.value)}
            </span>
            <span className="block text-[11px] font-semibold text-slate-500">
              {plural(g.list.length, 'vehicle')}{isClient && ` · ${seatsOf(g.list)} seats`}
            </span>
          </span>
          <ChevronRight size={15} className={`shrink-0 ${on ? 'text-brand-navy' : 'text-slate-300'}`} />
        </button>
      </li>
    );
  };

  const phoneTile = 'min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5';

  const phoneView = (
    <div className="space-y-3 md:hidden">
      {/* 1. Counts + the clients */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 p-3">
          <dl className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-slate-100">
            {[
              { label: 'Clients', value: contractGroups.length, tone: 'text-brand-navy' },
              { label: 'On contract', value: onContract },
              { label: 'Free', value: freeCount },
            ].map((x) => (
              <div key={x.label} className="min-w-0 px-2 first:pl-0">
                <dd className={`text-lg font-extrabold leading-none ${x.tone || 'text-slate-900'}`}>{x.value}</dd>
                <dt className="mt-1 truncate text-[10px] font-semibold text-slate-500">{x.label}</dt>
              </div>
            ))}
          </dl>
          <button
            onClick={onAddClient}
            aria-label="Add client"
            className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-brand-navy px-2.5 text-xs font-bold text-white active:bg-brand-steel min-[360px]:px-3"
          >
            <Plus size={15} /><span className="max-[359px]:hidden">Add</span>
          </button>
        </div>

        <div className="max-h-[26rem] overflow-y-auto border-t border-slate-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {contractGroups.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-slate-500">No clients yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">{contractGroups.map(phoneRow)}</ul>
          )}
          <p className="border-y border-slate-100 bg-slate-50/70 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Not with a client
          </p>
          <ul className="divide-y divide-slate-100">{otherGroups.map(phoneRow)}</ul>
        </div>
      </section>

      {selected && (
        <div ref={phoneDetailsRef} className="scroll-mt-24 space-y-3">
          {/* 2. The chosen client */}
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  selected.client ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <GroupIcon g={selected} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kindLabel(selected)}</p>
                <h3 className="text-[15px] font-extrabold leading-snug text-brand-navy">{assignmentLabel(selected.value)}</h3>
              </div>
              {selected.client && (
                <button
                  onClick={() => onRemoveClient(selected.value)}
                  aria-label="Remove this client"
                  title="Remove this client"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 active:bg-rose-50 active:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2">
              {[
                { icon: <Bus />, label: 'Vehicles', value: selected.list.length },
                { icon: <Armchair />, label: 'Seats', value: seatsOf(selected.list) },
              ].map((t) => (
                <div key={t.label} className={`${phoneTile} flex items-center gap-2.5`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-brand-steel ring-1 ring-slate-200 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
                    {t.icon}
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t.label}</dt>
                    <dd className="text-base font-extrabold leading-tight text-slate-900">{t.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {selected.client && (selected.client.contactPerson || selected.client.phone) && (
              <div className={`${phoneTile} mt-2 flex items-center gap-2.5`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-400 ring-1 ring-slate-200" aria-hidden="true">
                  <User size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Contact</p>
                  <p className="text-[13px] font-bold leading-snug text-slate-800">{selected.client.contactPerson || selected.client.phone}</p>
                </div>
                {selected.client.phone && (
                  <a
                    href={`tel:${selected.client.phone}`}
                    aria-label={`Call ${selected.client.phone}`}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white active:bg-emerald-700"
                  >
                    <Phone size={14} /> Call
                  </a>
                )}
              </div>
            )}

            {selected.value === PUBLIC && (
              <p className="mt-2.5 text-[11px] font-semibold leading-relaxed text-slate-500">
                Listed on your website under “Rent Our Vehicles for Private Trips &amp; Tours”.
              </p>
            )}
          </section>

          {/* 3. Its vehicles */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
              <h4 className="text-sm font-extrabold text-brand-navy">
                Vehicles <span className="font-bold text-slate-400">{selected.list.length}</span>
              </h4>
              <PickButton
                icon={<Plus size={14} />}
                label="Add vehicle"
                placeholder={selected.value === MAINTENANCE ? 'Send a vehicle here…' : 'Add a vehicle…'}
                ariaLabel={selected.value === PUBLIC ? 'Take a vehicle off contract' : selected.value === MAINTENANCE ? 'Send a vehicle for maintenance' : 'Add a vehicle to this client'}
                disabled={Boolean(busyId)}
                options={vehicles
                  .filter((v) => v.assignedTo !== selected.value)
                  .map((v) => ({ value: v._id, label: `${v.plateNumber} · now: ${assignmentLabel(v.assignedTo)}` }))}
                onPick={(id) => { const v = vehicles.find((x) => x._id === id); if (v) move(v, selected.value); }}
                className="h-8 rounded-lg border border-brand-steel/30 bg-brand-steel/[0.06] px-2.5 text-xs font-bold text-brand-navy"
              />
            </div>

            {selected.list.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs font-semibold text-slate-500">No vehicles here yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {selected.list.map((v) => (
                  <li key={v._id} className="flex items-center gap-2.5 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[13px] font-bold text-brand-navy">{v.plateNumber}</p>
                      <p className="truncate text-[11px] font-semibold text-slate-500">{v.modelName} · {v.capacity} seats</p>
                    </div>
                    <PickButton
                      icon={<ArrowLeftRight size={13} />}
                      label={busyId === v._id ? 'Moving…' : 'Move'}
                      placeholder="Move to…"
                      ariaLabel={`Move ${v.plateNumber} to`}
                      disabled={busyId === v._id}
                      options={assignments.filter((a) => a !== v.assignedTo).map((a) => ({ value: a, label: assignmentLabel(a) }))}
                      onPick={(to) => move(v, to)}
                      className="h-8 rounded-lg border border-slate-200 px-2.5 text-[11px] font-bold text-slate-600"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );

  const sectionLabel = 'px-3 py-2.5 text-[10px] font-bold leading-4 uppercase tracking-wider text-slate-500 md:px-4 md:py-3';

  return (
    <div className="space-y-3 md:space-y-4">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cbSwap { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }
        .cb-swap { animation: cbSwap 260ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .cb-swap { animation: none; } }
      ` }} />

      {phoneView}

      {/* ---------------- Tablet & laptop: summary bar — three counts + Add client ---------------- */}
      <section className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 shadow-sm md:flex">
        <dl className="flex min-w-0 flex-1 items-center divide-x divide-slate-200">
          {[
            { label: 'Clients', value: contractGroups.length, tone: 'text-brand-navy' },
            { label: 'On contract', value: onContract, unit: 'vehicles' },
            { label: 'Not on contract', value: freeCount, unit: 'vehicles' },
          ].map((s) => (
            <div key={s.label} className="flex min-w-0 flex-col px-2.5 first:pl-0 md:flex-row md:items-baseline md:gap-2 md:px-5">
              <dd className={`text-lg font-extrabold leading-tight md:text-xl ${s.tone || 'text-slate-900'}`}>{s.value}</dd>
              <dt className="truncate text-[11px] font-semibold text-slate-500 md:text-xs">
                {s.label}
                {s.unit && <span className="hidden lg:inline"> ({s.unit})</span>}
              </dt>
            </div>
          ))}
        </dl>
        <button
          onClick={onAddClient}
          aria-label="Add client"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-brand-navy px-3 text-xs font-bold text-white transition-colors hover:bg-brand-steel md:h-10 md:px-4 md:text-sm"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Add client</span>
        </button>
      </section>

      {/* ---------------- The frame: list left, details right ---------------- */}
      <div
        ref={gridRef}
        className="hidden overflow-hidden md:grid md:grid-cols-[minmax(250px,290px)_1fr] md:gap-5 lg:grid-cols-[minmax(300px,380px)_1fr]"
      >
        {/* Left: every client, then the vehicles not with one. */}
        <nav aria-label="Clients" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-h-0 flex-1 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
            {/* The clients sit together on a very light blue, so they read as
                one group apart from the vehicles not with a client below. */}
            <div className="bg-[#f1f6fb]">
              <p className="flex items-center justify-between border-b border-brand-steel/10 px-3 py-2.5 text-[10px] font-bold leading-4 uppercase tracking-wider text-brand-navy md:px-4 md:py-3">
                <span><span className="md:hidden">Clients</span><span className="hidden md:inline">Clients we work with</span></span>
                <span className="rounded-full bg-brand-steel/15 px-2 text-[10px] font-bold leading-4">{contractGroups.length}</span>
              </p>
              {contractGroups.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-500 md:px-4">No clients yet.</p>
              ) : (
                <ul className="divide-y divide-brand-steel/10">{contractGroups.map(renderRow)}</ul>
              )}
            </div>
            <p className={`${sectionLabel} border-y border-slate-100 bg-slate-50/70`}>Not with a client</p>
            <ul className="divide-y divide-slate-100">{otherGroups.map(renderRow)}</ul>
          </div>
        </nav>

        {/* Right: the chosen client. */}
        {selected ? (
          <section
            key={selected.value}
            aria-label={`${assignmentLabel(selected.value)} details`}
            className="cb-swap flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            {/* Who they are and how to reach them — all in one band. */}
            <header className="shrink-0 border-b border-slate-100 p-3 md:px-6 md:py-4">
              <div className="flex items-start gap-3">
                <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-steel/10 text-brand-navy md:flex">
                  <GroupIcon g={selected} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kindLabel(selected)}</p>
                  <h3 className="text-base font-extrabold leading-snug text-brand-navy md:text-lg">{assignmentLabel(selected.value)}</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    {plural(selected.list.length, 'vehicle')} · {seatsOf(selected.list)} seats
                  </p>
                </div>
                {selected.client && (
                  <button
                    onClick={() => onRemoveClient(selected.value)}
                    aria-label="Remove this client"
                    title="Remove this client"
                    className="flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 md:h-9 md:w-auto md:rounded-xl md:px-3"
                  >
                    <Trash2 size={14} />
                    <span className="hidden text-xs font-bold md:inline">Remove</span>
                  </button>
                )}
              </div>

              {selected.client && (selected.client.contactPerson || selected.client.phone) && (
                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold md:ml-14 md:text-sm">
                  {selected.client.contactPerson && (
                    <span className="flex min-w-0 items-center gap-1.5 text-slate-700">
                      <User size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate">{selected.client.contactPerson}</span>
                    </span>
                  )}
                  {selected.client.phone && (
                    <a href={`tel:${selected.client.phone}`} className="flex items-center gap-1.5 text-brand-steel hover:underline">
                      <Phone size={14} className="shrink-0" />{selected.client.phone}
                    </a>
                  )}
                </div>
              )}
              {selected.value === PUBLIC && (
                <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500 md:ml-14">
                  Listed on your website under “Rent Our Vehicles for Private Trips &amp; Tours”.
                </p>
              )}
            </header>

            {/* Bring a vehicle here from anywhere else — always in view. */}
            <div className="shrink-0 border-b border-slate-100 p-3 md:px-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                  aria-label={selected.value === PUBLIC ? 'Take a vehicle off contract' : selected.value === MAINTENANCE ? 'Send a vehicle for maintenance' : 'Add a vehicle to this client'}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-700 focus:border-brand-steel focus:outline-none sm:text-sm"
                >
                  <option value="">
                    {selected.value === PUBLIC ? 'Take a vehicle off contract…' : selected.value === MAINTENANCE ? 'Send a vehicle for maintenance…' : 'Add a vehicle to this client…'}
                  </option>
                  {vehicles.filter((v) => v.assignedTo !== selected.value).map((v) => (
                    <option key={v._id} value={v._id}>{v.plateNumber} · now: {assignmentLabel(v.assignedTo)}</option>
                  ))}
                </select>
                <button
                  onClick={() => addTo(selected)}
                  disabled={!addId || Boolean(busyId)}
                  className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-navy px-5 text-sm font-bold text-white transition-colors hover:bg-brand-steel disabled:opacity-40"
                >
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>

            {/* Its vehicles — this part scrolls when the list is long. */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:px-6 md:py-4">
              {selected.list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                  No vehicles here yet.
                </p>
              ) : (
                <ul className="grid gap-2 xl:grid-cols-2">
                  {selected.list.map((v) => (
                    <li key={v._id} className="rounded-xl border border-slate-200 px-3 py-2.5 sm:flex sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold text-brand-navy">{v.plateNumber}</p>
                        <p className="truncate text-xs text-slate-500">{v.modelName} · {v.capacity} seats</p>
                      </div>
                      <select
                        value={v.assignedTo}
                        disabled={busyId === v._id}
                        onChange={(e) => move(v, e.target.value)}
                        aria-label={`Move ${v.plateNumber} to`}
                        title="Move to"
                        className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-base font-semibold text-slate-700 focus:border-brand-steel focus:outline-none sm:mt-0 sm:w-44 sm:shrink-0 sm:text-xs"
                      >
                        {assignments.map((a) => <option key={a} value={a}>{a === v.assignedTo ? 'Move to…' : assignmentLabel(a)}</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center">
            <p className="text-sm font-semibold text-slate-500">No clients yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
