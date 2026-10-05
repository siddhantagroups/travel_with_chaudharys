import mongoose from 'mongoose';

/*
  One line in the owner's accounts: money that came in (a client's monthly
  billing, any other income) or went out (fuel, maintenance, salaries…).
  Everything is entered by hand from the admin panel; totals, profit and the
  monthly / yearly picture are worked out from these lines when read — never
  stored — so correcting one entry corrects every total that includes it.
*/

export const LEDGER_CATEGORIES = {
  income: ['Client billing', 'Other income'],
  expense: [
    'Fuel',
    'Maintenance & repairs',
    'Urea',
    'Driver salaries',
    'Insurance & permits',
    'Tolls & taxes',
    'Other expense',
  ],
};

const ledgerEntrySchema = new mongoose.Schema({
  kind: { type: String, required: true, enum: ['income', 'expense'] },
  category: {
    type: String,
    required: true,
    enum: [...LEDGER_CATEGORIES.income, ...LEDGER_CATEGORIES.expense],
  },
  // Rupees. Up to two decimals; always positive — `kind` carries the direction.
  amount: { type: Number, required: true, min: 0.01, max: 100000000 },
  // The day it happened (or the month a bill covers). Stored as UTC midnight
  // of the date the owner picked, so the month never shifts with time zones.
  date: { type: Date, required: true },

  // Client billing: the school / company's name, kept as text so an entry
  // survives the client later being removed.
  client: { type: String, trim: true, default: '' },

  // Expenses on one vehicle. The plate is copied so history still reads
  // correctly if the vehicle is deleted.
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  vehiclePlate: { type: String, trim: true, default: '' },

  // Expenses on a group of vehicles rather than one: the name of the fleet it
  // was for — a client's fleet ("Baddi International School") or the public
  // booking fleet. Empty (with no vehicle) means all vehicles.
  fleet: { type: String, trim: true, maxlength: 120, default: '' },

  note: { type: String, trim: true, maxlength: 200, default: '' },

  // A line from the sample accounts (scripts/live-data.js add-sample-accounts),
  // never set through the API; hidden from the dashboard unless "Show sample
  // data" is on in Site Settings.
  sample: { type: Boolean },
}, { timestamps: true });

// The Accounts tab reads entries by date range, newest first (date, then entry time).
ledgerEntrySchema.index({ date: -1 });
ledgerEntrySchema.index({ date: -1, createdAt: -1 });

export default mongoose.model('LedgerEntry', ledgerEntrySchema);
