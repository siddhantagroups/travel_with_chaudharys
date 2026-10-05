import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChevronRight, X, Search, Check, Bell, Edit2,
  ShieldCheck, Shield, FileText, Leaf, Landmark, CalendarDays,
} from 'lucide-react';
import PlateBadge from './PlateBadge';
import FilterButton from './FilterButton';
import { Sheet, SheetHeader } from './Sheet';
import { assignmentLabel, byContractFirst } from './assignmentLabels';
// Document list and expiry rules live in docStatus.js (small, shared with the
// dashboard's tab badge); re-exported here for existing imports.
import { DOCS, WINDOW, daysUntil, statusOf } from './docStatus';
export { DOCS, daysUntil, statusOf };

/*
  Vehicle documents — fitness, permit, insurance, PUC and road tax.

  Laid out like My Fleet so it reads the same way: vehicles down the left,
  the chosen one's five documents on the right, the top vehicle open by
  default. Everything expired or due soon is gathered behind the Renewal
  alerts button at the top — the owner works through renewals from there one
  tap at a time, instead of scrolling past a long list to reach the vehicles.

  Colour is reserved for meaning: red expired, amber due soon, green valid,
  grey not added.
*/

const needsRenewal = (id) => id === 'expired' || id === 'urgent' || id === 'soon';

const fmtDate = (d) => {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const toInputValue = (d) => {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
};

const addMonths = (from, months) => { const d = new Date(from); d.setMonth(d.getMonth() + months); return d; };

const periodText = (months) =>
  months >= 12 ? `${months / 12} year${months > 12 ? 's' : ''}` : `${months} months`;

// A renewal runs on from the old expiry if it hasn't lapsed, otherwise from today.
const renewedFrom = (expiresOn, months) => {
  const base = expiresOn && daysUntil(expiresOn) > 0 ? new Date(expiresOn) : new Date();
  return toInputValue(addMonths(base, months));
};

// What the server gets for one document — only the fields that document has
// (PUC and road tax carry no certificate number or insurer).
const payloadFor = (doc, { date, number, provider }) => ({
  expiresOn: date || null,
  ...(doc.hasNumber ? { number } : {}),
  ...(doc.hasProvider ? { provider } : {}),
});

// Wording and colour for one document — the details, the alerts and the
// editor all describe a date the same way.
function docStatus(expiresOn) {
  const s = statusOf(expiresOn);
  if (s.id === 'unset') return { id: s.id, text: 'Not added', tone: 'text-slate-400' };
  if (s.id === 'expired') {
    const ago = -s.days;
    return { id: s.id, text: `Expired ${ago} day${ago === 1 ? '' : 's'} ago`, tone: 'text-rose-600' };
  }
  if (s.id === 'valid') return { id: s.id, text: 'Valid', tone: 'text-emerald-600' };
  return { id: s.id, text: s.days === 0 ? 'Expires today' : `${s.days} day${s.days === 1 ? '' : 's'} left`, tone: 'text-amber-600' };
}

// How a vehicle's five documents stand.
function tally(v) {
  const t = { expired: 0, soon: 0, missing: 0 };
  DOCS.forEach((d) => {
    const id = statusOf(v.documents?.[d.key]?.expiresOn).id;
    if (id === 'expired') t.expired += 1;
    else if (id === 'urgent' || id === 'soon') t.soon += 1;
    else if (id === 'unset') t.missing += 1;
  });
  return t;
}

// The one line under each plate in the list — only the most pressing thing.
function shortStatus(t) {
  if (t.expired) return { text: `${t.expired} expired`, tone: 'text-rose-600' };
  if (t.soon) return { text: `${t.soon} due soon`, tone: 'text-amber-600' };
  if (t.missing === DOCS.length) return { text: 'No dates added', tone: 'text-slate-400' };
  if (t.missing) return { text: `${t.missing} not added`, tone: 'text-slate-500' };
  return { text: 'All valid', tone: 'text-emerald-600' };
}

// The fuller line under the plate in the details.
function longStatus(t) {
  const parts = [
    t.expired && `${t.expired} expired`,
    t.soon && `${t.soon} due within ${WINDOW} days`,
    t.missing && `${t.missing} not added`,
  ].filter(Boolean);
  if (!parts.length) return { text: 'All documents valid', tone: 'text-emerald-600' };
  return { text: parts.join(' · '), tone: t.expired ? 'text-rose-600' : t.soon ? 'text-amber-600' : 'text-slate-500' };
}

// One document as a tile — used here and in My Fleet so both read the same.
// Two rows: the name with its status badge, then the date.
// Phones (two tiles across): icon top-left, badge in the top-right corner,
// then name, number and date full width underneath; an expired date drops
// the word "Expired" since the badge already says it.
// The badge always carries words, so colour is never the only signal.
const DOC_ICON = { fitness: ShieldCheck, permit: FileText, insurance: Shield, puc: Leaf, roadTax: Landmark };
const TILE_TONE = {
  expired: { box: 'bg-rose-50 text-rose-600 ring-rose-100', badge: 'bg-rose-50 text-rose-700 ring-rose-200', cal: 'text-rose-500' },
  soon:    { box: 'bg-amber-50 text-amber-600 ring-amber-100', badge: 'bg-amber-50 text-amber-700 ring-amber-200', cal: 'text-amber-500' },
  valid:   { box: 'bg-emerald-50 text-emerald-600 ring-emerald-100', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', cal: 'text-emerald-500' },
  unset:   { box: 'bg-slate-50 text-slate-400 ring-slate-200', badge: 'bg-slate-50 text-slate-500 ring-slate-200', cal: 'text-slate-400' },
};
function tileState(expiresOn) {
  const s = statusOf(expiresOn);
  if (s.id === 'expired') return { tone: TILE_TONE.expired, badge: 'Expired', line: fmtDate(expiresOn), linePrefix: 'Expired ' };
  if (s.id === 'urgent' || s.id === 'soon') {
    return { tone: TILE_TONE.soon, badge: s.days === 0 ? 'Expires today' : `${s.days} day${s.days === 1 ? '' : 's'} left`, line: fmtDate(expiresOn) };
  }
  if (s.id === 'valid') return { tone: TILE_TONE.valid, badge: 'Valid', line: fmtDate(expiresOn) };
  return { tone: TILE_TONE.unset, badge: 'Not added', line: 'No date added' };
}

export function DocTile({ doc, value, onClick }) {
  const v = value || {};
  const t = tileState(v.expiresOn);
  const Icon = DOC_ICON[doc.key];
  const body = (
    <>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 md:h-10 md:w-10 ${t.tone.box}`} aria-hidden="true">
        <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" />
      </span>
      <span className="block w-full min-w-0 flex-1">
        <span className="flex items-start justify-between gap-x-2 md:flex-wrap">
          <span className="min-w-0 text-[12px] font-bold leading-snug text-slate-800 md:text-sm">{doc.label}</span>
          <span className={`absolute right-2 top-2.5 shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 md:static md:px-2 md:text-[10px] ${t.tone.badge}`}>
            {t.badge}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 md:mt-1.5 md:text-xs">
          <CalendarDays size={13} className={`shrink-0 ${t.tone.cal}`} aria-hidden="true" />
          <span>{t.linePrefix && <span className="hidden md:inline">{t.linePrefix}</span>}{t.line}</span>
        </span>
      </span>
    </>
  );
  const cls = 'relative flex w-full min-w-0 flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-colors md:flex-row md:gap-3 md:p-3';
  return onClick ? (
    <button onClick={onClick} title={`Update ${doc.label}`} className={`${cls} hover:border-brand-steel/50 hover:bg-slate-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-steel/30`}>
      {body}
    </button>
  ) : (
    <div className={`${cls} hover:border-slate-300`}>{body}</div>
  );
}

/* Every expired / due-soon document across the fleet, most urgent first. */
function AlertsPanel({ due, missingTotal, nothingEntered, onPick }) {
  if (due.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        {nothingEntered ? (
          <>
            <p className="text-sm font-bold text-slate-700">No expiry dates added yet</p>
            <p className="mt-1 text-xs text-slate-500">Once dates are added, anything expiring shows here.</p>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={22} strokeWidth={3} />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-700">Nothing needs renewal</p>
            <p className="mt-1 text-xs text-slate-500">
              {missingTotal > 0
                ? `No document expires in the next ${WINDOW} days. ${missingTotal} still ${missingTotal === 1 ? 'has' : 'have'} no date.`
                : `Every document is valid for at least the next ${WINDOW} days.`}
            </p>
          </>
        )}
      </div>
    );
  }

  const groups = [
    { title: 'Expired', tone: 'text-rose-600', items: due.filter((x) => x.status.id === 'expired') },
    { title: `Due in the next ${WINDOW} days`, tone: 'text-amber-600', items: due.filter((x) => x.status.id !== 'expired') },
  ].filter((g) => g.items.length);

  return (
    <div className="pb-3">
      <p className="px-4 pt-3 text-xs text-slate-500 sm:px-5">Tap an item to see that vehicle.</p>
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className={`px-4 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-wider sm:px-5 ${g.tone}`}>
            {g.title} · {g.items.length}
          </h3>
          <ul className="divide-y divide-slate-100 border-y border-slate-100">
            {g.items.map(({ vehicle, doc }) => {
              const expiresOn = vehicle.documents?.[doc.key]?.expiresOn;
              const st = docStatus(expiresOn);
              return (
                <li key={`${vehicle._id}-${doc.key}`}>
                  <button
                    onClick={() => onPick(vehicle, doc)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-50 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[13px] font-bold text-brand-navy">{vehicle.plateNumber}</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{doc.label}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-bold ${st.tone}`}>{st.text}</p>
                      <p className="text-[11px] font-semibold text-slate-400">{fmtDate(expiresOn)}</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-slate-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/*
  All five of a vehicle's documents in one form — what the Edit button opens.
  Each keeps the one-tap "Renewed for …" fill; one Save at the bottom sends
  only the documents that actually changed.
*/
function DocumentsForm({ vehicle, saving, error, onSave, onCancel }) {
  const initial = useMemo(() => Object.fromEntries(DOCS.map((d) => {
    const c = vehicle.documents?.[d.key] || {};
    return [d.key, { date: toInputValue(c.expiresOn), number: c.number || '', provider: c.provider || '' }];
  })), [vehicle]);

  const [values, setValues] = useState(initial);
  const [details, setDetails] = useState(() => Object.fromEntries(
    DOCS.map((d) => [d.key, Boolean(initial[d.key].number || initial[d.key].provider)])
  ));
  const set = (key, patch) => setValues((v) => ({ ...v, [key]: { ...v[key], ...patch } }));

  const isChanged = (key) => {
    const a = values[key], b = initial[key];
    return a.date !== b.date || a.number !== b.number || a.provider !== b.provider;
  };
  const changed = DOCS.filter((d) => isChanged(d.key));

  const inputCls = 'w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-base text-slate-800 focus:outline-none focus:border-brand-steel focus:ring-2 focus:ring-brand-steel/15';

  return (
    <>
      {error && (
        <p className="mx-4 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:mx-5">{error}</p>
      )}

      <div className="divide-y divide-slate-100">
        {DOCS.map((d) => {
          const current = vehicle.documents?.[d.key]?.expiresOn;
          const st = docStatus(current);
          const renewed = renewedFrom(current, d.months);
          const val = values[d.key];
          return (
            <section key={d.key} className="px-4 py-4 sm:px-5">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-sm font-bold text-slate-800">
                  {d.label}
                  {isChanged(d.key) && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-brand-steel">Changed</span>}
                </h4>
                <span className={`shrink-0 text-[11px] font-bold ${st.tone}`}>{st.text}</span>
              </div>

              {/* 16px text stops iOS Safari zooming the page when the field is focused */}
              <input
                type="date"
                value={val.date}
                onChange={(e) => set(d.key, { date: e.target.value })}
                aria-label={`${d.label} expiry date`}
                className={`mt-2 ${inputCls}`}
              />

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => set(d.key, { date: renewed })}
                  className={`flex h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-3 text-xs font-semibold ${
                    val.date === renewed ? 'border-brand-steel bg-brand-steel/5 text-brand-navy' : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="truncate">Renewed for {periodText(d.months)}</span>
                  <span className="shrink-0 font-normal text-slate-500">{fmtDate(renewed)}</span>
                </button>
                {val.date && (
                  <button
                    type="button"
                    onClick={() => set(d.key, { date: '' })}
                    className="h-10 shrink-0 px-2 text-xs font-semibold text-slate-400 hover:text-rose-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {(d.hasNumber || d.hasProvider) && (
                details[d.key] ? (
                  <div className="mt-3 space-y-3">
                    {d.hasProvider && (
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold text-slate-500">Insurer</span>
                        <input
                          value={val.provider}
                          onChange={(e) => set(d.key, { provider: e.target.value })}
                          placeholder="e.g. New India Assurance"
                          className={`${inputCls} placeholder:text-slate-400`}
                        />
                      </label>
                    )}
                    {d.hasNumber && (
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                          {d.hasProvider ? 'Policy number' : 'Certificate number'}
                        </span>
                        <input
                          value={val.number}
                          onChange={(e) => set(d.key, { number: e.target.value })}
                          placeholder="Optional"
                          className={`${inputCls} placeholder:text-slate-400`}
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDetails((o) => ({ ...o, [d.key]: true }))}
                    className="mt-1 h-9 text-xs text-slate-500 hover:text-slate-700"
                  >
                    + Add certificate details
                  </button>
                )
              )}
            </section>
          );
        })}
      </div>

      {/* Stays in view while the form scrolls. */}
      <div className="sticky bottom-0 flex gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(changed.map((d) => ({ doc: d, body: payloadFor(d, values[d.key]) })))}
          disabled={saving || changed.length === 0}
          className="h-12 flex-1 rounded-xl bg-brand-navy text-sm font-semibold text-white hover:bg-brand-steel disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function ComplianceBoard({ apiBase, authFetch, onChanged, focusVehicleId, onFocusHandled, fleets = [] }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [fleet, setFleet] = useState('All'); // 'All' or an assignment value (a client, not on contract, maintenance)
  const [selectedId, setSelectedId] = useState(null);
  // { type: 'alerts' }
  // | { type: 'editAll', vehicleId }                     all five, from the Edit button
  const [sheet, setSheet] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const gridRef = useRef(null);
  const phoneTopRef = useRef(null); // phone: the chosen vehicle's card

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${apiBase}/vehicles/compliance`);
      if (!res?.ok) throw new Error('Could not load documents.');
      setVehicles(await res.json());
    } catch (e) {
      setError(e.message || 'Could not load documents.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, authFetch]);

  useEffect(() => { load(); }, [load]);

  // Fill the screen from wherever the grid starts, like My Fleet, so the list
  // and the details each scroll on their own instead of the whole page.
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

  // Vehicles in each fleet, for the filter's counts.
  const fleetCounts = useMemo(() => {
    const c = {};
    vehicles.forEach((v) => { c[v.assignedTo] = (c[v.assignedTo] || 0) + 1; });
    return c;
  }, [vehicles]);

  const results = useMemo(() => {
    const inFleet = vehicles.filter((v) => fleet === 'All' || v.assignedTo === fleet);
    const q = query.trim().toLowerCase();
    // Plates get typed with and without spaces/dashes — match on the bare characters.
    const bare = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const qBare = bare(q);
    const found = !q ? inFleet : inFleet.filter((v) =>
      (qBare && bare(v.plateNumber).includes(qBare)) ||
      `${v.modelName} ${v.assignedTo}`.toLowerCase().includes(q)
    );
    return found.sort(byContractFirst);
  }, [vehicles, query, fleet]);

  // The details are never blank: whenever nothing in the list is selected,
  // the top vehicle is.
  useEffect(() => {
    if (results.length === 0) { if (selectedId) setSelectedId(null); return; }
    if (!results.some((v) => v._id === selectedId)) setSelectedId(results[0]._id);
  }, [results, selectedId]);

  // Arriving from a vehicle in My Fleet: select that vehicle.
  useEffect(() => {
    if (!focusVehicleId || loading) return;
    if (vehicles.some((v) => v._id === focusVehicleId)) {
      setQuery('');
      setFleet('All');
      setSelectedId(focusVehicleId);
    }
    onFocusHandled?.();
  }, [focusVehicleId, loading, vehicles, onFocusHandled]);

  // Everything expired or due within the window, most urgent first.
  const due = useMemo(() => {
    const out = [];
    vehicles.forEach((v) => DOCS.forEach((d) => {
      const s = statusOf(v.documents?.[d.key]?.expiresOn);
      if (needsRenewal(s.id)) out.push({ vehicle: v, doc: d, status: s });
    }));
    return out.sort((a, b) => a.status.days - b.status.days);
  }, [vehicles]);

  const expiredCount = due.filter((x) => x.status.id === 'expired').length;
  const soonCount = due.length - expiredCount;

  // An empty alerts list only means "all good" if the dates are actually in.
  const missingTotal = useMemo(
    () => vehicles.reduce((n, v) => n + DOCS.filter((d) => !v.documents?.[d.key]?.expiresOn).length, 0),
    [vehicles]
  );
  const nothingEntered = vehicles.length > 0 && missingTotal === vehicles.length * DOCS.length;

  const selected = vehicles.find((v) => v._id === selectedId) || null;
  const editVehicle = sheet?.type === 'editAll'
    ? vehicles.find((v) => v._id === sheet.vehicleId)
    : null;

  // Tapping an alert shows that vehicle's documents (view only).
  const openFromAlerts = (vehicle) => {
    setQuery('');
    setFleet('All');
    setSelectedId(vehicle._id);
    setSheet(null);
    requestAnimationFrame(() => phoneTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const openEditAll = (vehicle) => {
    setFormError('');
    setSheet({ type: 'editAll', vehicleId: vehicle._id });
  };

  // One PUT per document; the vehicle updates on screen as each one lands.
  const putDocument = async (vehicleId, docKey, body) => {
    const res = await authFetch(`${apiBase}/vehicles/${vehicleId}/documents/${docKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res?.ok) throw new Error('Could not save. Please try again.');
    const updated = await res.json();
    setVehicles((prev) => prev.map((v) => (v._id === updated._id ? { ...v, documents: updated.documents } : v)));
  };

  // Every changed document from the Edit form.
  const saveMany = async (changes) => {
    if (!editVehicle || sheet?.type !== 'editAll') return;
    if (changes.length === 0) { setSheet(null); return; }
    setSaving(true);
    setFormError('');
    try {
      for (const { doc, body } of changes) {
        await putDocument(editVehicle._id, doc.key, body);
      }
      setSheet(null);
    } catch (e) {
      setFormError(e.message || 'Could not save.');
    } finally {
      setSaving(false);
      onChanged?.();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 py-16 flex items-center justify-center">
        <span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-brand-steel animate-spin" />
      </div>
    );
  }

  const alertCount = due.length;

  // The chosen vehicle's card and the empty state — used by both layouts.
  const selectedCard = () => {
    const summary = longStatus(tally(selected));
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-3 md:px-6 md:py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PlateBadge plate={selected.plateNumber} />
            {/* Edit: deliberately invisible — white on the white card, top
                right beside the plate — so only the person who updates the
                dates knows it is there. */}
            <button
              onClick={() => openEditAll(selected)}
              aria-label="Edit documents"
              className="ml-auto flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-xl text-white focus:outline-none"
            >
              <Edit2 size={14} />
            </button>
          </div>
          <p className={`mt-2 text-xs font-bold leading-snug md:text-sm ${summary.tone}`}>{summary.text}</p>
        </div>

        {/* A tile per document — two across on phones, one per row on
            tablets, up to three across on laptops. View only — dates are
            changed through the Edit button. */}
        <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-[repeat(auto-fill,minmax(max(250px,calc((100%_-_1.5rem)/3)),1fr))] md:gap-3 md:p-6 md:pt-5">
          {DOCS.map((d) => (
            <DocTile key={d.key} doc={d} value={selected.documents?.[d.key]} />
          ))}
        </div>
      </div>
    );
  };

  const emptyCard = (
    <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center">
      <p className="text-sm font-semibold text-slate-500">
        {vehicles.length === 0
          ? 'No vehicles yet.'
          : fleet !== 'All' && !query.trim()
            ? `No vehicles in ${assignmentLabel(fleet)} right now.`
            : 'No vehicle matches this search.'}
      </p>
    </div>
  );

  // Phone: tapping a vehicle in the list brings its card (below the list) into view.
  const openFromPhoneList = (v) => {
    setSelectedId(v._id);
    requestAnimationFrame(() => phoneTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const alertsButton = (
    <button
      onClick={() => setSheet({ type: 'alerts' })}
      aria-label={alertCount ? `Renewal alerts: ${alertCount}` : 'Renewal alerts'}
      className="ml-auto flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition-colors hover:border-brand-steel/40 md:px-4"
    >
      <Bell
        size={18}
        className={alertCount ? (expiredCount ? 'text-rose-600' : 'text-amber-600') : 'text-slate-400'}
      />
      <span className="hidden text-sm font-bold text-brand-navy sm:inline">Renewal alerts</span>
      {alertCount > 0 && (
        <span
          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${
            expiredCount ? 'bg-rose-600' : 'bg-amber-500'
          }`}
        >
          {alertCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={load} className="font-semibold underline shrink-0">Retry</button>
        </div>
      )}

      {/* ================= Phone: one column (as in My Fleet) =================
          Search, filter and alerts on one row above the vehicles (a short
          list that scrolls inside, the chosen one highlighted); then the
          chosen vehicle with its documents two across. */}
      <div className="space-y-3 md:hidden">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex gap-2 border-b border-slate-100 p-3">
            <div className="relative min-w-0 flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              {/* 16px text stops iOS Safari zooming the page on focus */}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search vehicles"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-7 text-base font-semibold text-slate-800 placeholder:text-sm placeholder:font-medium placeholder:text-slate-400 focus:border-brand-steel focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-steel/20"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <FilterButton
              value={fleet}
              onChange={setFleet}
              ariaLabel="Show vehicles from"
              options={[
                { value: 'All', label: 'All', count: vehicles.length },
                ...fleets.map((f) => ({ value: f, label: assignmentLabel(f), count: fleetCounts[f] || 0 })),
              ]}
            />
            {/* Alerts: the bell alone, its count in the corner. */}
            <button
              onClick={() => setSheet({ type: 'alerts' })}
              aria-label={alertCount ? `Renewal alerts: ${alertCount}` : 'Renewal alerts'}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white"
            >
              <Bell size={18} className={alertCount ? (expiredCount ? 'text-rose-600' : 'text-amber-600') : 'text-slate-400'} />
              {alertCount > 0 && (
                <span
                  className={`absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-white ${
                    expiredCount ? 'bg-rose-600' : 'bg-amber-500'
                  }`}
                >
                  {alertCount}
                </span>
              )}
            </button>
          </div>

          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs font-semibold text-slate-500">
              {fleet !== 'All' && !query.trim() ? 'No vehicles here.' : 'No vehicle matches.'}
            </p>
          ) : (
            <ul className="max-h-[13.25rem] divide-y divide-slate-100 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {results.map((v) => {
                const on = v._id === selectedId;
                const st = shortStatus(tally(v));
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
                        <span className="block truncate text-[11px] font-semibold text-slate-500">{v.modelName}</span>
                      </span>
                      <span className={`shrink-0 text-[11px] font-bold ${st.tone}`}>{st.text}</span>
                      <ChevronRight size={15} className={`shrink-0 ${on ? 'text-brand-navy' : 'text-slate-300'}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div ref={phoneTopRef} className="scroll-mt-24">
          {selected ? selectedCard() : emptyCard}
        </div>
      </div>

      {/* ================= Tablet & laptop ================= */}
      <div
        ref={gridRef}
        className="hidden overflow-hidden md:grid md:grid-cols-[minmax(250px,290px)_1fr] md:grid-rows-[auto_minmax(0,1fr)] md:gap-x-5 md:gap-y-4 lg:grid-cols-[minmax(300px,380px)_1fr]"
      >
        {/* ---------------- Top bar: search + renewal alerts ---------------- */}
        <div className="col-span-2 flex items-center gap-2">
          <div className="relative min-w-0 flex-1 md:w-[290px] md:flex-none lg:w-[380px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {/* 16px text stops iOS Safari zooming the page on focus */}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search vehicles"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-base font-semibold text-slate-800 shadow-sm placeholder:font-medium placeholder:text-slate-400 focus:border-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-steel/20 md:text-sm"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Show one fleet only — a client's vehicles, not on contract, or maintenance. */}
          <select
            value={fleet}
            onChange={(e) => setFleet(e.target.value)}
            aria-label="Show vehicles from"
            className={`h-11 w-[34%] min-w-0 shrink-0 rounded-xl border bg-white px-2.5 text-base font-semibold shadow-sm focus:border-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-steel/20 sm:w-auto sm:max-w-[260px] md:text-sm ${
              fleet === 'All' ? 'border-slate-200 text-slate-700' : 'border-brand-steel text-brand-navy'
            }`}
          >
            <option value="All">All vehicles ({vehicles.length})</option>
            {fleets.map((f) => (
              <option key={f} value={f}>{assignmentLabel(f)} ({fleetCounts[f] || 0})</option>
            ))}
          </select>

          {alertsButton}
        </div>

        {/* ---------------- Left: the vehicles ---------------- */}
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-h-0 flex-1 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs font-semibold text-slate-500 md:text-sm">
                {fleet !== 'All' && !query.trim() ? 'No vehicles here.' : 'No vehicle matches.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.map((v) => {
                  const on = v._id === selectedId;
                  const s = shortStatus(tally(v));
                  return (
                    <li key={v._id}>
                      <button
                        onClick={() => setSelectedId(v._id)}
                        aria-pressed={on}
                        className={`flex w-full items-center gap-3 border-l-[3px] py-3 pl-2.5 pr-2 text-left transition-colors md:border-l-0 md:px-4 ${
                          on ? 'border-brand-navy bg-brand-steel/[0.08]' : 'border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-[13px] font-bold text-brand-navy">{v.plateNumber}</span>
                          <span className={`block truncate text-[11px] font-bold ${s.tone}`}>{s.text}</span>
                        </span>
                        <ChevronRight size={15} className="hidden shrink-0 text-slate-300 md:block" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ---------------- Right: the chosen vehicle's documents ---------------- */}
        {/* Phones scroll by touch — no scrollbar eating into the narrow column. */}
        <div className="h-full min-h-0 min-w-0 overflow-y-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:pr-1">
          {selected ? selectedCard() : emptyCard}
        </div>
      </div>

      {/* ---------------- Sheets ---------------- */}
      {sheet?.type === 'alerts' && (
        <Sheet onClose={() => setSheet(null)}>
          <SheetHeader
            title="Renewal alerts"
            subtitle={alertCount
              ? [expiredCount && `${expiredCount} expired`, soonCount && `${soonCount} due in the next ${WINDOW} days`].filter(Boolean).join(' · ')
              : `Nothing due in the next ${WINDOW} days`}
            onClose={() => setSheet(null)}
          />
          <AlertsPanel due={due} missingTotal={missingTotal} nothingEntered={nothingEntered} onPick={openFromAlerts} />
        </Sheet>
      )}

      {sheet?.type === 'editAll' && editVehicle && (
        <Sheet onClose={() => setSheet(null)}>
          <SheetHeader
            title="Edit documents"
            subtitle={editVehicle.plateNumber}
            onClose={() => setSheet(null)}
          />
          <DocumentsForm
            key={editVehicle._id}
            vehicle={editVehicle}
            saving={saving}
            error={formError}
            onSave={saveMany}
            onCancel={() => setSheet(null)}
          />
        </Sheet>
      )}
    </div>
  );
}
