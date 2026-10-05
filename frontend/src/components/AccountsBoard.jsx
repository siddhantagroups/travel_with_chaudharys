import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, ArrowDownLeft, ArrowUpRight, Wallet,
  TrendingUp, TrendingDown, Repeat,
} from 'lucide-react';
import { Sheet, SheetHeader } from './Sheet';
import { PUBLIC, assignmentLabel } from './assignmentLabels';

/*
  Accounts — the owner's money in and out, entered by hand.

  The first screen answers the only three questions that matter at a glance —
  how much came in, how much went out, what is left — plus one bar showing
  where the money went. That summary always sits above the fold on a phone.
  Everything else (by client, by expense type, by vehicle, every entry, the
  month-by-month record for the year) is below it, reached by scrolling.

  Totals are computed here from the entries; nothing derived is stored.
*/

const INCOME_CATEGORIES = ['Client billing', 'Other income'];
const EXPENSE_CATEGORIES = [
  'Fuel', 'Maintenance & repairs', 'Urea', 'Driver salaries',
  'Insurance & permits', 'Tolls & taxes', 'Other expense',
];

// One fixed colour per spending type, so a type keeps its colour whatever else
// is on screen. This order, with profit last, passes the palette validator for
// colour-blind separation between neighbouring segments. The three lighter
// hues always appear beside a written label and share, never on their own.
const EXPENSE_COLOR = {
  'Fuel': '#eb6834',
  'Maintenance & repairs': '#2a78d6',
  'Urea': '#008300', // must stay after Maintenance — beside Fuel it fails the colour-blind check
  'Driver salaries': '#4a3aa7',
  'Insurance & permits': '#e87ba4',
  'Tolls & taxes': '#eda100',
  'Other expense': '#a8a29e',
};
const PROFIT_COLOR = '#1baf7a';

const SHORT_LABEL = {
  'Fuel': 'Fuel',
  'Maintenance & repairs': 'Maintenance',
  'Urea': 'Urea',
  'Driver salaries': 'Salaries',
  'Insurance & permits': 'Insurance',
  'Tolls & taxes': 'Tolls & taxes',
  'Other expense': 'Other',
};

// Vehicles not on contract form their own fleet alongside each client's.
const fleetName = assignmentLabel;

// What an expense was spent on, in words: one vehicle's plate, a named
// fleet, or all vehicles.
const spentOn = (e) => {
  if (e.vehiclePlate) return { key: `v:${e.vehiclePlate}`, label: e.vehiclePlate, vehicle: true };
  if (e.fleet === PUBLIC) return { key: `f:${e.fleet}`, label: 'Vehicles not on contract', vehicle: false };
  if (e.fleet) return { key: `f:${e.fleet}`, label: `${fleetName(e.fleet)} fleet`, vehicle: false };
  return { key: 'all', label: 'All vehicles', vehicle: false };
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = MONTHS.map((m) => m.slice(0, 3));

const pad2 = (n) => String(n).padStart(2, '0');
const monthKeyOf = (y, m) => `${y}-${pad2(m + 1)}`;
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// Indian grouping: ₹4,50,000. Paise are kept in the data, rounded for display.
const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
// Dates arrive as ISO strings at UTC midnight of the chosen day — read the
// date part directly so the day never shifts with the time zone.
const dayLabel = (iso) => {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MON[Number(m) - 1]}`;
};
const pctOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function summarize(entries) {
  const s = { income: 0, expense: 0, byCategory: {}, bySource: {}, bySpentOn: {}, count: entries.length };
  for (const e of entries) {
    if (e.kind === 'income') {
      s.income += e.amount;
      const source = e.category === 'Client billing' ? (e.client || 'Client billing') : 'Other income';
      s.bySource[source] = (s.bySource[source] || 0) + e.amount;
    } else {
      s.expense += e.amount;
      s.byCategory[e.category] = (s.byCategory[e.category] || 0) + e.amount;
      const on = spentOn(e);
      s.bySpentOn[on.key] = { ...on, amount: (s.bySpentOn[on.key]?.amount || 0) + e.amount };
    }
  }
  s.profit = s.income - s.expense;
  return s;
}

const byAmount = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

/* ------------------------------------------------------------------ */
/* Summary: three figures + where the money went                        */
/* ------------------------------------------------------------------ */

// Change against the previous period, with an arrow so it never relies on
// colour alone. Hidden when there is nothing to compare with.
function Delta({ now, before, upIsGood, label }) {
  if (!before) return null;
  const change = ((now - before) / Math.abs(before)) * 100;
  if (!Number.isFinite(change)) return null;
  const rounded = Math.round(change);
  if (rounded === 0) return <span className="text-slate-500">Same as {label}</span>;
  const up = rounded > 0;
  const good = up === upIsGood;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 ${good ? 'text-emerald-700' : 'text-rose-600'}`}>
      <Icon size={12} strokeWidth={2.5} /> {Math.abs(rounded)}% vs {label}
    </span>
  );
}

// Phone: one row — label left, figure right. Tablet up: a tile.
function Figure({ icon: Icon, iconClass, label, value, valueClass = 'text-slate-900', children }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 md:block md:px-6 md:py-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon size={15} strokeWidth={2.5} />
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="shrink-0 text-right md:mt-3 md:text-left">
        <p className={`text-xl font-extrabold tracking-tight md:text-2xl lg:text-3xl ${valueClass}`}>{value}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{children}</p>
      </div>
    </div>
  );
}

function MoneyFlow({ s, periodName }) {
  if (s.income <= 0 && s.expense <= 0) {
    return <p className="text-sm text-slate-500">Nothing recorded for {periodName} yet.</p>;
  }

  const loss = s.profit < 0;
  // Profit: the bar is everything earned, split into what was spent and what
  // was kept. Loss: it is everything spent, and the overspend is called out.
  const base = loss ? s.expense : s.income;
  const segments = EXPENSE_CATEGORIES
    .filter((c) => s.byCategory[c] > 0)
    .map((c) => ({ key: c, label: SHORT_LABEL[c], value: s.byCategory[c], color: EXPENSE_COLOR[c] }));
  if (s.profit > 0) segments.push({ key: 'profit', label: 'Profit', value: s.profit, color: PROFIT_COLOR });

  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Where the money went</p>
        <p className="text-[11px] font-semibold text-slate-500">
          {loss ? `Share of ${inr(s.expense)} spent` : `Share of ${inr(s.income)} earned`}
        </p>
      </div>

      {/* 2px white gaps separate the segments — no borders drawn around them. */}
      <div
        className="mt-2 flex h-3 w-full gap-[2px]"
        role="img"
        aria-label={segments.map((x) => `${x.label} ${pctOf(x.value, base)}%`).join(', ')}
      >
        {segments.map((x, i) => (
          <div
            key={x.key}
            title={`${x.label}: ${inr(x.value)} (${pctOf(x.value, base)}%)`}
            className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === segments.length - 1 ? 'rounded-r-full' : ''}`}
            style={{ width: `${(x.value / base) * 100}%`, minWidth: 3, background: x.color }}
          />
        ))}
      </div>

      {loss && (
        <p className="mt-2 text-xs font-bold text-rose-600">Spent {inr(-s.profit)} more than was earned</p>
      )}

      {/* Phone: two tidy columns with the share on the right. Wider: one
          flowing row, each share right beside its label. */}
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:flex sm:flex-wrap sm:gap-x-6">
        {segments.map((x) => (
          <li key={x.key} className="flex min-w-0 items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: x.color }} aria-hidden="true" />
            <span className="truncate font-semibold text-slate-600">{x.label}</span>
            <span className="ml-auto shrink-0 font-bold text-slate-900 sm:ml-1">{pctOf(x.value, base)}%</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Detail cards (below the fold)                                        */
/* ------------------------------------------------------------------ */

function Card({ title, total, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-baseline justify-between gap-3 border-b border-slate-100 px-4 py-3 md:px-6">
        <h3 className="text-sm font-extrabold text-brand-navy">{title}</h3>
        {total !== undefined && <span className="text-sm font-bold text-slate-900">{total}</span>}
      </header>
      {children}
    </section>
  );
}

function EarningsCard({ s, periodName, repeat }) {
  const rows = byAmount(s.bySource);
  return (
    <Card title="Earnings" total={inr(s.income)}>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500 md:px-6">No earnings recorded for {periodName}.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map(([name, amount]) => (
            <li key={name} className="px-4 py-2.5 md:px-6">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate-700">{name}</span>
                <span className="shrink-0 font-bold tabular-nums text-slate-900">{inr(amount)}</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-slate-100">
                <div className="h-1 rounded-full bg-brand-steel" style={{ width: `${pctOf(amount, s.income)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {repeat}
    </Card>
  );
}

function ExpensesCard({ s, periodName }) {
  const categories = EXPENSE_CATEGORIES.filter((c) => s.byCategory[c] > 0);
  const targets = Object.values(s.bySpentOn).sort((a, b) => b.amount - a.amount);
  const shown = targets.slice(0, 6);
  return (
    <Card title="Expenses" total={inr(s.expense)}>
      {categories.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500 md:px-6">No expenses recorded for {periodName}.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {categories.map((c) => (
              <li key={c} className="flex items-center gap-2.5 px-4 py-2.5 text-sm md:px-6">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: EXPENSE_COLOR[c] }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{c}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">{pctOf(s.byCategory[c], s.expense)}%</span>
                <span className="w-24 shrink-0 text-right font-bold tabular-nums text-slate-900">{inr(s.byCategory[c])}</span>
              </li>
            ))}
          </ul>

          {/* Fleets and single vehicles, largest first. */}
          <p className="border-t border-slate-100 bg-slate-50/70 px-4 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:px-6">
            Spent on
          </p>
          <ul className="divide-y divide-slate-100 bg-slate-50/70">
            {shown.map((t) => (
              <li key={t.key} className="flex items-center justify-between gap-3 px-4 py-2 text-sm md:px-6">
                <span className={`min-w-0 truncate ${t.vehicle ? 'font-mono text-[13px] font-bold text-brand-navy' : 'font-semibold text-slate-600'}`}>
                  {t.label}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-slate-900">{inr(t.amount)}</span>
              </li>
            ))}
            {targets.length > shown.length && (
              <li className="px-4 py-2 text-xs text-slate-500 md:px-6">
                + {targets.length - shown.length} more (see entries below)
              </li>
            )}
          </ul>
        </>
      )}
    </Card>
  );
}

function entryTitle(e) {
  if (e.kind === 'income') return e.category === 'Client billing' ? e.client : (e.note || 'Other income');
  return e.category;
}

function entryDetail(e) {
  if (e.kind === 'income') {
    return [e.category === 'Client billing' ? 'Client billing' : 'Other income', e.category === 'Client billing' ? e.note : '', dayLabel(e.date)];
  }
  return [spentOn(e).label, e.note, dayLabel(e.date)];
}

function EntriesCard({ entries, periodName, onEdit, onAdd }) {
  return (
    <Card title="All entries" total={`${entries.length} in ${periodName}`}>
      {entries.length === 0 ? (
        <div className="px-4 py-8 text-center md:px-6">
          <p className="text-sm text-slate-500">No entries for {periodName} yet.</p>
          <button onClick={onAdd} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-steel">
            <Plus size={14} /> Add the first entry
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((e) => (
            <li key={e._id}>
              <button
                onClick={() => onEdit(e)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-50 md:px-6"
              >
                {e.kind === 'income' ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600" aria-hidden="true">
                    <ArrowDownLeft size={15} strokeWidth={2.5} />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: EXPENSE_COLOR[e.category] }} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{entryTitle(e)}</span>
                  <span className="block truncate text-xs text-slate-500">{entryDetail(e).filter(Boolean).join(' · ')}</span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                  <span className={e.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'}>{e.kind === 'income' ? '+ ' : '− '}</span>
                  {inr(e.amount)}
                </span>
                <ChevronRight size={16} className="shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// The yearly record: one row per month, tap a month to open it.
function YearTable({ year, monthly, onOpenMonth }) {
  const now = new Date();
  const months = monthly
    .map((s, m) => ({ s, m }))
    .filter(({ s, m }) => year < now.getFullYear() || (year === now.getFullYear() && m <= now.getMonth()) || s.count > 0);
  const total = monthly.reduce((t, s) => ({ income: t.income + s.income, expense: t.expense + s.expense }), { income: 0, expense: 0 });
  const profitCls = (p) => (p < 0 ? 'text-rose-600' : 'text-emerald-700');

  return (
    <Card title={`Month by month · ${year}`}>
      {months.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500 md:px-6">Nothing recorded for {year}.</p>
      ) : (
        <table className="w-full text-right text-xs tabular-nums md:text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2 text-left md:px-6">Month</th>
              <th className="px-2 py-2">Earnings</th>
              <th className="px-2 py-2">Expenses</th>
              <th className="px-4 py-2 md:px-6">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {months.map(({ s, m }) => (
              <tr key={m} onClick={() => onOpenMonth(m)} className="cursor-pointer transition-colors hover:bg-slate-50">
                <td className="px-4 py-2.5 text-left md:px-6">
                  <button onClick={(ev) => { ev.stopPropagation(); onOpenMonth(m); }} className="font-bold text-brand-navy hover:underline">
                    <span className="md:hidden">{MON[m]}</span>
                    <span className="hidden md:inline">{MONTHS[m]}</span>
                  </button>
                </td>
                <td className="px-2 py-2.5 font-semibold text-slate-700">{s.count ? inr(s.income) : '—'}</td>
                <td className="px-2 py-2.5 font-semibold text-slate-700">{s.count ? inr(s.expense) : '—'}</td>
                <td className={`px-4 py-2.5 font-bold md:px-6 ${s.count ? profitCls(s.profit) : 'text-slate-400'}`}>
                  {s.count ? `${s.profit < 0 ? '−' : ''}${inr(Math.abs(s.profit))}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50/70 font-extrabold text-slate-900">
              <td className="px-4 py-2.5 text-left md:px-6">Total</td>
              <td className="px-2 py-2.5">{inr(total.income)}</td>
              <td className="px-2 py-2.5">{inr(total.expense)}</td>
              <td className={`px-4 py-2.5 md:px-6 ${profitCls(total.income - total.expense)}`}>
                {total.income - total.expense < 0 ? '−' : ''}{inr(Math.abs(total.income - total.expense))}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit an entry                                                  */
/* ------------------------------------------------------------------ */

function EntryForm({ entry, defaultDate, vehicles, clientNames, fleets, saving, error, onSave, onDelete }) {
  const editing = Boolean(entry?._id);
  const [kind, setKind] = useState(entry?.kind || 'income');
  const [category, setCategory] = useState(entry?.category || 'Client billing');
  const [client, setClient] = useState(entry?.client || clientNames[0] || '');
  const [scope, setScope] = useState(entry?.vehicle ? 'vehicle' : 'fleet');
  const [vehicle, setVehicle] = useState(entry?.vehicle ? String(entry.vehicle) : '');
  const [fleet, setFleet] = useState(entry?.fleet || ''); // '' = all vehicles
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [date, setDate] = useState(entry ? entry.date.slice(0, 10) : defaultDate);
  const [note, setNote] = useState(entry?.note || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const switchKind = (k) => {
    setKind(k);
    setCategory(k === 'income' ? 'Client billing' : 'Fuel');
  };

  const categories = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isBilling = kind === 'income' && category === 'Client billing';
  // Keep an entry's client selectable even if that client has since been removed.
  const clientOptions = entry?.client && !clientNames.includes(entry.client) ? [entry.client, ...clientNames] : clientNames;
  const vehicleOptions = entry?.vehicle && !vehicles.some((v) => String(v._id) === String(entry.vehicle))
    ? [{ _id: String(entry.vehicle), plateNumber: `${entry.vehiclePlate} (removed)` }, ...vehicles]
    : vehicles;
  // Same for a fleet whose client has since been removed.
  const fleetOptions = entry?.fleet && !fleets.some((f) => f.value === entry.fleet)
    ? [...fleets, { value: entry.fleet, label: `${fleetName(entry.fleet)} (removed)` }]
    : fleets;
  const amountNum = Number(amount);

  const submit = (ev) => {
    ev.preventDefault();
    onSave({
      kind,
      category,
      amount: amountNum,
      date,
      note: note.trim(),
      client: isBilling ? client : '',
      vehicle: kind === 'expense' && scope === 'vehicle' ? vehicle : '',
      fleet: kind === 'expense' && scope === 'fleet' ? fleet : '',
      needsVehicle: kind === 'expense' && scope === 'vehicle',
    });
  };

  const label = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500';
  const field = 'mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-800 focus:border-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-steel/15';
  const segBtn = (on) => `flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-bold transition-colors ${on ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`;

  return (
    <form onSubmit={submit} className="space-y-5 px-4 py-4 sm:px-5">
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {/* Earning or expense */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button type="button" aria-pressed={kind === 'income'} onClick={() => switchKind('income')} className={segBtn(kind === 'income')}>
          <ArrowDownLeft size={16} className="text-emerald-600" /> Earning
        </button>
        <button type="button" aria-pressed={kind === 'expense'} onClick={() => switchKind('expense')} className={segBtn(kind === 'expense')}>
          <ArrowUpRight size={16} className="text-rose-600" /> Expense
        </button>
      </div>

      {/* Type */}
      <div>
        <span className={label}>Type</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                category === c ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {kind === 'expense' && <span className="h-2 w-2 rounded-sm" style={{ background: EXPENSE_COLOR[c] }} aria-hidden="true" />}
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Who paid / what it was for */}
      {isBilling && (
        <label className="block">
          <span className={label}>Client</span>
          {clientOptions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Add a school or company first (Clients tab), then record its billing here.</p>
          ) : (
            <select value={client} onChange={(e) => setClient(e.target.value)} className={field}>
              {clientOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
        </label>
      )}

      {kind === 'expense' && (
        <div>
          <span className={label}>Spent on</span>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button type="button" aria-pressed={scope === 'fleet'} onClick={() => setScope('fleet')} className={segBtn(scope === 'fleet')}>Fleet</button>
            <button type="button" aria-pressed={scope === 'vehicle'} onClick={() => setScope('vehicle')} className={segBtn(scope === 'vehicle')}>One vehicle</button>
          </div>
          {scope === 'fleet' && (
            <label className="mt-3 block">
              <span className="block text-xs font-semibold text-slate-500">Which fleet</span>
              <select value={fleet} onChange={(e) => setFleet(e.target.value)} className={field}>
                {fleetOptions.map((f) => <option key={f.value || 'all'} value={f.value}>{f.label}</option>)}
              </select>
            </label>
          )}
          {scope === 'vehicle' && (
            <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} aria-label="Vehicle" className={field}>
              <option value="">Choose a vehicle…</option>
              {vehicleOptions.map((v) => <option key={v._id} value={String(v._id)}>{v.plateNumber}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Amount + date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Amount</span>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">₹</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-lg font-bold text-slate-900 focus:border-brand-steel focus:outline-none focus:ring-2 focus:ring-brand-steel/15"
            />
          </div>
          {/* Read-back in Indian grouping so a missing zero is easy to spot. */}
          <span className="mt-1 block text-xs font-semibold text-slate-500">{amountNum > 0 ? inr(amountNum) : ' '}</span>
        </label>
        <label className="block">
          <span className={label}>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} h-12`} />
        </label>
      </div>

      <label className="block">
        <span className={label}>Note <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder={kind === 'income' ? 'e.g. Wedding party booking' : 'e.g. Brake pads replaced'}
          className={`${field} placeholder:text-slate-400`}
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="h-12 w-full rounded-xl bg-brand-navy text-sm font-bold text-white transition-colors hover:bg-brand-steel disabled:opacity-60"
      >
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Add entry'}
      </button>

      {editing && (
        <div className="-mt-2 text-center">
          <button
            type="button"
            disabled={saving}
            onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
            className={`h-10 px-4 text-sm font-semibold ${confirmDelete ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600'}`}
          >
            {confirmDelete ? 'Tap again to delete this entry' : 'Delete entry'}
          </button>
        </div>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */

export default function AccountsBoard({ apiBase, authFetch, vehicles = [], clients = [] }) {
  const now = new Date();
  const [view, setView] = useState('month'); // 'month' | 'year'
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(null); // { entry } — entry null when adding
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [repeating, setRepeating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${apiBase}/ledger`);
      if (!res?.ok) throw new Error('Could not load your accounts.');
      setEntries(await res.json());
    } catch (e) {
      setError(e.message || 'Could not load your accounts.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, authFetch]);

  useEffect(() => { load(); }, [load]);

  const key = monthKeyOf(year, month);
  const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
  const prevKey = monthKeyOf(prev.y, prev.m);

  const newestFirst = (a, b) => b.date.localeCompare(a.date) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

  const monthEntries = useMemo(() => entries.filter((e) => e.date.slice(0, 7) === key).sort(newestFirst), [entries, key]);
  const prevEntries = useMemo(() => entries.filter((e) => e.date.slice(0, 7) === prevKey), [entries, prevKey]);
  const yearEntries = useMemo(() => entries.filter((e) => e.date.slice(0, 4) === String(year)), [entries, year]);
  const prevYearEntries = useMemo(() => entries.filter((e) => e.date.slice(0, 4) === String(year - 1)), [entries, year]);

  const s = useMemo(() => summarize(view === 'month' ? monthEntries : yearEntries), [view, monthEntries, yearEntries]);
  const sPrev = useMemo(() => summarize(view === 'month' ? prevEntries : prevYearEntries), [view, prevEntries, prevYearEntries]);
  const monthly = useMemo(
    () => Array.from({ length: 12 }, (_, m) => summarize(yearEntries.filter((e) => Number(e.date.slice(5, 7)) === m + 1))),
    [yearEntries]
  );

  const periodName = view === 'month' ? `${MONTHS[month]} ${year}` : String(year);
  const prevLabel = view === 'month' ? MON[prev.m] : String(year - 1);
  const activeMonths = monthly.filter((x) => x.count > 0).length || 1;

  // The arrows only stop where there is something to see: months (or years)
  // that have entries, plus the current one so this month can always be filled
  // in. Empty months in between are skipped, and nothing past today unless an
  // entry is dated there.
  const thisMonthKey = monthKeyOf(now.getFullYear(), now.getMonth());
  const monthStops = useMemo(
    () => [...new Set([thisMonthKey, ...entries.map((e) => e.date.slice(0, 7))])].sort(),
    [entries, thisMonthKey]
  );
  const yearStops = useMemo(
    () => [...new Set(monthStops.map((k) => Number(k.slice(0, 4))))].sort((a, b) => a - b),
    [monthStops]
  );
  const prevStop = view === 'month'
    ? [...monthStops].reverse().find((k) => k < key)
    : [...yearStops].reverse().find((y) => y < year);
  const nextStop = view === 'month'
    ? monthStops.find((k) => k > key)
    : yearStops.find((y) => y > year);

  const step = (dir) => {
    const to = dir < 0 ? prevStop : nextStop;
    if (to == null) return;
    if (view === 'year') { setYear(to); return; }
    const [y, m] = to.split('-').map(Number);
    setYear(y);
    setMonth(m - 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const defaultDate = isCurrentMonth ? localToday() : `${key}-01`;

  const clientNames = useMemo(() => clients.map((c) => c.name), [clients]);

  // Fleets an expense can be put against: all vehicles, each client's buses,
  // and the public booking buses — with how many vehicles each has today.
  const fleets = useMemo(() => {
    const count = (name) => vehicles.filter((v) => v.assignedTo === name).length;
    const plural = (n) => `${n} vehicle${n === 1 ? '' : 's'}`;
    return [
      { value: '', label: `All vehicles · ${plural(vehicles.length)}` },
      ...[...clientNames, PUBLIC].map((name) => ({ value: name, label: `${fleetName(name)} · ${plural(count(name))}` })),
    ];
  }, [clientNames, vehicles]);

  // "Same billing as last month" — the monthly routine in one tap.
  const lastBilling = prevEntries.filter((e) => e.kind === 'income' && e.category === 'Client billing');
  const hasBillingNow = monthEntries.some((e) => e.kind === 'income' && e.category === 'Client billing');
  const canRepeat = view === 'month' && lastBilling.length > 0 && !hasBillingNow;
  const lastBillingTotal = lastBilling.reduce((t, e) => t + e.amount, 0);

  const openAdd = () => { setFormError(''); setSheet({ entry: null }); };
  const openEdit = (entry) => { setFormError(''); setSheet({ entry }); };

  const saveEntry = async (form) => {
    if (!(form.amount > 0)) { setFormError('Enter an amount greater than zero.'); return; }
    if (!form.date) { setFormError('Choose a date.'); return; }
    if (form.kind === 'income' && form.category === 'Client billing' && !form.client) { setFormError('Choose which client this billing is from.'); return; }
    if (form.needsVehicle && !form.vehicle) { setFormError('Choose the vehicle this was spent on.'); return; }

    const editingId = sheet?.entry?._id;
    setSaving(true);
    setFormError('');
    try {
      const { needsVehicle, ...body } = form;
      const res = await authFetch(editingId ? `${apiBase}/ledger/${editingId}` : `${apiBase}/ledger`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save. Please try again.');
      setEntries((list) => (editingId ? list.map((e) => (e._id === data._id ? data : e)) : [data, ...list]));
      // Show the period the entry belongs to, so it is visibly there.
      const [y, m] = data.date.slice(0, 7).split('-').map(Number);
      setYear(y);
      if (view === 'month') setMonth(m - 1);
      setSheet(null);
    } catch (e) {
      setFormError(e.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async () => {
    const id = sheet?.entry?._id;
    if (!id) return;
    setSaving(true);
    setFormError('');
    try {
      const res = await authFetch(`${apiBase}/ledger/${id}`, { method: 'DELETE' });
      if (!res?.ok) throw new Error('Could not delete. Please try again.');
      setEntries((list) => list.filter((e) => e._id !== id));
      setSheet(null);
    } catch (e) {
      setFormError(e.message || 'Could not delete.');
    } finally {
      setSaving(false);
    }
  };

  const repeatBilling = async () => {
    setRepeating(true);
    setError('');
    const created = [];
    try {
      for (const e of lastBilling) {
        const day = Math.min(Number(e.date.slice(8, 10)), daysIn(year, month));
        const res = await authFetch(`${apiBase}/ledger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'income', category: 'Client billing', client: e.client,
            amount: e.amount, date: `${key}-${pad2(day)}`, note: e.note || '',
          }),
        });
        if (!res?.ok) throw new Error('Some billing could not be added. Please check and try again.');
        created.push(await res.json());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (created.length) setEntries((list) => [...created, ...list]);
      setRepeating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-steel" />
      </div>
    );
  }

  const profitPositive = s.profit >= 0;

  return (
    <div className="space-y-3 md:space-y-4">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button onClick={load} className="shrink-0 font-semibold underline">Retry</button>
        </div>
      )}

      {/* ---------------- Period + add ---------------- */}
      <div className="flex items-center gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white shadow-sm md:flex-none">
          <button onClick={() => step(-1)} disabled={prevStop == null} aria-label={view === 'month' ? 'Previous month' : 'Previous year'} className="flex h-11 w-9 shrink-0 items-center justify-center rounded-l-xl text-slate-500 hover:bg-slate-50 hover:text-brand-navy disabled:cursor-default disabled:text-slate-200 disabled:hover:bg-transparent">
            <ChevronLeft size={18} />
          </button>
          <span className="whitespace-nowrap px-1 text-center text-sm font-bold text-brand-navy md:min-w-[150px]">
            {view === 'month' ? (
              <>
                <span className="md:hidden">{MON[month]}</span>
                <span className="hidden md:inline">{MONTHS[month]}</span> {year}
              </>
            ) : year}
          </span>
          <button onClick={() => step(1)} disabled={nextStop == null} aria-label={view === 'month' ? 'Next month' : 'Next year'} className="flex h-11 w-9 shrink-0 items-center justify-center rounded-r-xl text-slate-500 hover:bg-slate-50 hover:text-brand-navy disabled:cursor-default disabled:text-slate-200 disabled:hover:bg-transparent">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {['month', 'year'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`h-full rounded-lg px-2.5 text-xs font-bold transition-colors sm:px-3.5 ${view === v ? 'bg-brand-navy text-white' : 'text-slate-500 hover:text-brand-navy'}`}
            >
              {v === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>

        <button
          onClick={openAdd}
          aria-label="Add entry"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand-navy px-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-steel md:ml-auto md:px-4"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add entry</span>
        </button>
      </div>

      {/* ---------------- At a glance ---------------- */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label={`Summary for ${periodName}`}>
        <div className="divide-y divide-slate-100 md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
          <Figure icon={ArrowDownLeft} iconClass="bg-emerald-50 text-emerald-600" label="Earnings" value={inr(s.income)}>
            {view === 'month'
              ? (sPrev.income ? <Delta now={s.income} before={sPrev.income} upIsGood label={prevLabel} /> : 'Money received')
              : `Avg ${inr(s.income / activeMonths)} a month`}
          </Figure>
          <Figure icon={ArrowUpRight} iconClass="bg-rose-50 text-rose-600" label="Expenses" value={inr(s.expense)}>
            {view === 'month'
              ? (sPrev.expense ? <Delta now={s.expense} before={sPrev.expense} upIsGood={false} label={prevLabel} /> : 'Money spent')
              : `Avg ${inr(s.expense / activeMonths)} a month`}
          </Figure>
          <Figure
            icon={Wallet}
            iconClass={profitPositive ? 'bg-brand-steel/10 text-brand-navy' : 'bg-rose-50 text-rose-600'}
            label={profitPositive ? 'Profit' : 'Loss'}
            value={`${profitPositive ? '' : '−'}${inr(Math.abs(s.profit))}`}
            valueClass={s.income || s.expense ? (profitPositive ? 'text-emerald-700' : 'text-rose-600') : 'text-slate-900'}
          >
            {s.income > 0
              ? `${pctOf(Math.abs(s.profit), s.income)}% of earnings ${profitPositive ? 'kept' : 'lost'}`
              : 'Earnings minus expenses'}
          </Figure>
        </div>
        <div className="border-t border-slate-100 px-4 py-3 md:px-6 md:py-4">
          <MoneyFlow s={s} periodName={periodName} />
        </div>
      </section>

      {/* ---------------- Details (scroll) ---------------- */}
      {view === 'year' && (
        <YearTable
          year={year}
          monthly={monthly}
          onOpenMonth={(m) => { setMonth(m); setView('month'); }}
        />
      )}

      <div className="grid gap-3 md:grid-cols-2 md:gap-4 md:items-start">
        <EarningsCard
          s={s}
          periodName={periodName}
          repeat={canRepeat && (
            <div className="border-t border-slate-100 px-4 py-3 md:px-6">
              <button
                onClick={repeatBilling}
                disabled={repeating}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-steel/40 px-3 py-2.5 text-xs font-bold text-brand-steel transition-colors hover:bg-brand-steel/5 disabled:opacity-60"
              >
                <Repeat size={14} />
                {repeating
                  ? 'Adding…'
                  : `Add last month's client billing · ${lastBilling.length} client${lastBilling.length === 1 ? '' : 's'} · ${inr(lastBillingTotal)}`}
              </button>
            </div>
          )}
        />
        <ExpensesCard s={s} periodName={periodName} />
      </div>

      {view === 'month' && (
        <EntriesCard entries={monthEntries} periodName={periodName} onEdit={openEdit} onAdd={openAdd} />
      )}

      {sheet && (
        <Sheet onClose={() => setSheet(null)}>
          <SheetHeader
            title={sheet.entry ? 'Edit entry' : 'Add entry'}
            subtitle={sheet.entry ? `${entryTitle(sheet.entry)} · ${dayLabel(sheet.entry.date)}` : 'Money in or money out'}
            onClose={() => setSheet(null)}
          />
          <EntryForm
            key={sheet.entry?._id || 'new'}
            entry={sheet.entry}
            defaultDate={defaultDate}
            vehicles={vehicles}
            clientNames={clientNames}
            fleets={fleets}
            saving={saving}
            error={formError}
            onSave={saveEntry}
            onDelete={deleteEntry}
          />
        </Sheet>
      )}
    </div>
  );
}
