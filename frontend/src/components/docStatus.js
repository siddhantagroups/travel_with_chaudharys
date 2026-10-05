/*
  The five statutory documents and how an expiry date is classed (expired /
  due soon / valid / not added). Kept apart from ComplianceBoard so the
  dashboard can show its renewal badge without loading the whole Vehicle
  Documents tab.
*/

export const DOCS = [
  { key: 'fitness',   label: 'Fitness (Passing)', short: 'Fitness',   months: 12, hasNumber: true },
  { key: 'permit',    label: 'Permit',            short: 'Permit',    months: 60, hasNumber: true },
  { key: 'insurance', label: 'Insurance',         short: 'Insurance', months: 12, hasNumber: true, hasProvider: true },
  { key: 'puc',       label: 'PUC (Pollution)',   short: 'PUC',       months: 6 },
  { key: 'roadTax',   label: 'Road Tax',          short: 'Road Tax',  months: 12 },
];

const DAY = 24 * 60 * 60 * 1000;
export const WINDOW = 30; // days of warning before an expiry counts as "needs renewal"

// Compare on calendar days so a certificate expiring today reads as 0 days
// left all day, rather than flipping to expired at midday.
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
};

export const statusOf = (dateStr) => {
  const days = daysUntil(dateStr);
  if (days === null) return { id: 'unset',   label: 'Not added', days: null };
  if (days < 0)      return { id: 'expired', label: 'Expired',   days };
  if (days <= 15)    return { id: 'urgent',  label: 'Due soon',  days };
  if (days <= WINDOW) return { id: 'soon',   label: 'Due soon',  days };
  return { id: 'valid', label: 'Valid', days };
};
