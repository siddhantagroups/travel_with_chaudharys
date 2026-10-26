import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import connectDB from './db.js';
import { VEHICLE_SEED, sampleLedger } from './sampleData.js';
import authRouter, { requireAdmin, readAdmin, reportAuthConfig } from './auth.js';
import { securityLog, sendError, text, integer, number, email, phone, oneOf, isObjectId, collect } from './security.js';

// Models
import Vehicle from './models/Vehicle.js';
import Route from './models/Route.js';
import Booking from './models/Booking.js';
import ContractInquiry from './models/ContractInquiry.js';
import Client from './models/Client.js';
import LedgerEntry, { LEDGER_CATEGORIES } from './models/LedgerEntry.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Behind Nginx, so trust exactly one proxy hop. Without this the rate limiters
// below would see Nginx's IP for every request and throttle all visitors as one.
app.set('trust proxy', 1);

// Don't advertise the stack to anyone scanning for Express-specific exploits.
app.disable('x-powered-by');

// Query strings parse to plain strings only — no nested objects, so a value
// like ?routeId[$ne]=x can never reach a database query as an operator.
app.set('query parser', 'simple');

// Security headers for every API response. The API only returns JSON, so its
// Content-Security-Policy allows nothing at all. (The website's own pages are
// served by Nginx — see deploy/nginx-security.conf for their headers.)
// noSniff, frameguard, HSTS and referrerPolicy are named explicitly so a future
// helmet upgrade can't quietly drop them.
app.use(
  helmet({
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    noSniff: true,
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

/*
  CORS. The website calls a relative "/api" on its own domain (Nginx in
  production, the Vite proxy in development), so no cross-origin request is
  legitimate and by default none is allowed. ALLOWED_ORIGINS (comma separated)
  can name extra trusted origins if ever needed.
*/
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length) {
  app.use(
    cors({
      credentials: true,
      origin: (origin, cb) =>
        // No Origin header = same-origin or a server-side call; allow it.
        !origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(null, false),
    })
  );
}

// Compress every API response (Brotli or gzip, whichever the browser
// accepts). Nginx then passes it through as-is.
app.use(compression({ threshold: 1024 }));

/*
  Public data (fleet, routes, client names) is read by every visitor but only
  changes when the owner edits it, so the JSON is kept in memory and rebuilt
  after any change. Admin requests and the in-memory dev database bypass it.
*/
const publicCache = new Map();
app.use((req, res, next) => {
  if (req.method !== 'GET' && /^\/api\/(vehicles|routes|clients|settings)/.test(req.path)) {
    res.on('finish', () => { if (res.statusCode < 400) publicCache.clear(); });
  }
  next();
});
const cached = async (key, load) => {
  if (process.env.USE_MOCK_DB === 'true') return load();
  if (!publicCache.has(key)) publicCache.set(key, await load());
  return publicCache.get(key);
};

// A booking or enquiry is a few hundred bytes; the default 100kb is already
// generous. Capping it stops a large body from tying up the process.
app.use(express.json({ limit: '32kb' }));

// Sign-in throttling: 10 failed attempts per IP per 15 minutes, then locked
// for the rest of the window. Counts failures only, so a working admin is
// never locked out by their own successful logins. A wrong password also
// waits ~0.5s before answering (see auth.js), slowing any guessing further.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    securityLog('login_locked', req);
    res.status(options.statusCode).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
  },
});

// Public write endpoints (bookings, enquiries) — stops a script flooding the
// owner's inbox or seat map, while staying far above real human usage.
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    securityLog('rate_limited', req, { limiter: 'public_write' });
    res.status(options.statusCode).json({ error: 'Too many requests. Please try again shortly.' });
  },
});

// Every API endpoint: a ceiling no real visitor or admin comes near, which
// stops scraping and request floods.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    securityLog('rate_limited', req, { limiter: 'api' });
    res.status(options.statusCode).json({ error: 'Too many requests. Please slow down.' });
  },
});
app.use('/api', apiLimiter);

// Request logger — quiet in production, where pm2 would otherwise write a line
// per request forever and the noise buries real errors.
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Database Connection and Auto-Seeding
await connectDB();

// Site-wide settings (persisted in memory; survives until server restart)
let siteSettings = {
  services: {
    buses:    { enabled: false, message: 'Bus booking is currently unavailable. Please check back soon or contact us directly.' },
    cabs:     { enabled: false, message: 'Cab booking is currently unavailable. Please check back soon or contact us directly.' },
    traveler: { enabled: false, message: 'Traveller booking is currently unavailable. Please check back soon or contact us directly.' },
  },
  // Admin panel tabs the owner can switch on when needed. Hidden by default
  // because the business doesn't run intercity routes or seat sales yet.
  sections: {
    routes:   false,
    bookings: false,
    // Sample records (marked sample: true) stay out of the dashboard unless
    // this is on. Never affects the public site: the rental section still
    // lists the sample vehicles. Admin-only — not sent to visitors.
    sampleData: false,
  }
};

// Filters for the dashboard's lists while sample data is switched off.
const hideSamples = () => !siteSettings.sections.sampleData;
const NOT_SAMPLE = { sample: { $ne: true } };
const sampleFilter = () => (hideSamples() ? NOT_SAMPLE : {});
const dropSamples = (list) => (hideSamples() ? list.filter((x) => !x.sample) : list);

// What visitors may see of a vehicle: no compliance documents, and no hint
// of which vehicles are samples.
const PUBLIC_VEHICLE_FIELDS = '-documents -sample';

// Mock In-Memory Databases (pre-populated)
let mockVehicles = [];
let mockRoutes = [];
let mockBookings = [];
let mockInquiries = [];
let mockLedger = [];
let mockClients = [
  { _id: 'c1', name: 'Baddi International School', kind: 'School', contactPerson: '', phone: '' },
  { _id: 'c2', name: 'Eicher Parwanoo', kind: 'Company', contactPerson: '', phone: '' },
  { _id: 'c3', name: 'Eicher School', kind: 'School', contactPerson: '', phone: '' },
  { _id: 'c4', name: 'DAV School', kind: 'School', contactPerson: '', phone: '' },
];


/*
  Sample compliance dates for local development only — relative to today so the
  screen always has an expired, an urgent and a healthy row to look at. These
  are NOT part of VEHICLE_SEED: a real database must start with empty document
  fields so the owner enters the true dates from his own certificates, rather
  than inheriting invented ones that look authoritative.
*/
const devDocuments = (index) => {
  const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
  const offsets = [-40, -6, 9, 22, 48, 120, 260, 400];
  const pick = (step) => inDays(offsets[(index * 3 + step) % offsets.length]);
  return {
    fitness:   { number: `FC-${1000 + index}`, expiresOn: pick(0) },
    permit:    { number: `PR-${2000 + index}`, expiresOn: pick(1) },
    insurance: { number: `POL-${3000 + index}`, provider: 'New India Assurance', expiresOn: pick(2) },
    puc:       { expiresOn: pick(3) },
    roadTax:   { expiresOn: pick(4) },
  };
};

// Dev only: the sample accounts (sampleData.js) against the in-memory fleet.
// The live site only gets them on purpose, via scripts/live-data.js.
const devLedger = () => sampleLedger((id) => ({
  vehicle: id,
  vehiclePlate: mockVehicles.find((v) => v._id === id)?.plateNumber || '',
})).map((e, idx) => ({ _id: `l${idx + 1}`, createdAt: e.date, ...e, sample: true }));

const seedMockData = () => {
  // Mock records need a stable synthetic id; MongoDB assigns its own _id.
  // Marked like the live site's data: there the school and company samples
  // were replaced by real buses, and only the rental vehicles (kept for the
  // home page), the accounts, the booking and the enquiries are samples.
  mockVehicles = VEHICLE_SEED.map((v, i) => ({
    _id: `v${i + 1}`, ...v, documents: devDocuments(i),
    ...(v.assignedTo === 'Available for Public Booking' ? { sample: true } : {}),
  }));
  mockLedger = devLedger();

  mockRoutes = [
    { _id: 'r1', departure: 'Pinjor', destination: 'Baddi', departureTime: '07:30 AM', arrivalTime: '08:30 AM', price: 100, vehicle: 'v8' },
    { _id: 'r2', departure: 'Pinjor', destination: 'Chandigarh', departureTime: '09:00 AM', arrivalTime: '10:00 AM', price: 150, vehicle: 'v16' },
    { _id: 'r3', departure: 'Pinjor', destination: 'Delhi', departureTime: '06:00 AM', arrivalTime: '11:30 AM', price: 850, vehicle: 'v15' },
    { _id: 'r4', departure: 'Pinjor', destination: 'Delhi', departureTime: '09:30 PM', arrivalTime: '03:00 AM', price: 950, vehicle: 'v17' },
    { _id: 'r5', departure: 'Pinjor', destination: 'Chandigarh', departureTime: '02:00 PM', arrivalTime: '03:00 PM', price: 250, vehicle: 'v19' },
    { _id: 'r6', departure: 'Delhi', destination: 'Pinjor', departureTime: '01:00 PM', arrivalTime: '06:30 PM', price: 850, vehicle: 'v15' },
    { _id: 'r7', departure: 'Chandigarh', destination: 'Pinjor', departureTime: '11:00 AM', arrivalTime: '12:00 PM', price: 150, vehicle: 'v16' },
    { _id: 'r8', departure: 'Baddi', destination: 'Pinjor', departureTime: '05:30 PM', arrivalTime: '06:30 PM', price: 100, vehicle: 'v8' }
  ];

  mockBookings = [
    {
      _id: 'b1',
      route: 'r2',
      date: new Date().toISOString().split('T')[0],
      seatNumbers: [5, 6],
      passengerName: 'Anil Kumar',
      passengerAge: 38,
      passengerEmail: 'anil.kumar@gmail.com',
      passengerPhone: '+91 9876543210',
      paymentId: 'pay_MOCK123456',
      paymentStatus: 'Paid',
      amountPaid: 1700,
      sample: true
    }
  ];

  mockInquiries = [
    {
      _id: 'i1',
      orgName: 'DAV Public School Pinjor',
      contactPerson: 'Principal Devendra Singh',
      email: 'info@davpinjor.edu.in',
      phone: '+91 1733 222123',
      requiredFleetSize: 4,
      vehicleType: 'School Bus',
      routeDescription: 'Daily student pickup from Kalka, Pinjor, and DAV campus.',
      status: 'Approved',
      notes: 'Active contract.',
      sample: true
    },
    {
      _id: 'i2',
      orgName: 'Eicher Parwanoo',
      contactPerson: 'HR Manager Amit Saini',
      email: 'hr.parwanoo@eicher.co.in',
      phone: '+91 9888012345',
      requiredFleetSize: 3,
      vehicleType: 'Mini Bus',
      routeDescription: 'Employee shift pickups and drops between Baddi, Pinjor, and Parwanoo factory.',
      status: 'Approved',
      notes: 'Active contract.',
      sample: true
    }
  ];
};

// The real database is never seeded: the owner's dashboard starts empty and
// holds only what he enters. (It used to fill an empty MongoDB with the sample
// fleet, clients, routes, a booking and enquiries on every start — so emptying
// it brought the samples straight back.) Sample data is for local
// development only, in the in-memory mock database.
if (process.env.USE_MOCK_DB !== 'false') {
  seedMockData();
}

// --- API ROUTES ---

// Authentication (login, Google sign-in, session, sign-out, config).
// The sign-in limiter guards only the two endpoints that check credentials.
app.use(['/api/auth/login', '/api/auth/google'], loginLimiter);
app.use('/api/auth', authRouter);

// Ids: Mongo ObjectIds on the real database, short synthetic ids in the
// in-memory development database.
const validId = (id) =>
  process.env.USE_MOCK_DB === 'true' ? typeof id === 'string' && /^[\w-]{1,40}$/.test(id) : isObjectId(id);

const PUBLIC_POOL = 'Available for Public Booking';
const MAINTENANCE = 'Maintenance';
const VEHICLE_TYPES = Vehicle.schema.path('type').enumValues;

// Strips internal compliance records from a vehicle before it is shown publicly.
const publicVehicle = (v) => {
  if (!v) return v;
  const obj = typeof v.toObject === 'function' ? v.toObject() : { ...v };
  delete obj.documents;
  delete obj.sample;
  return obj;
};

const clientNameExists = async (name) => {
  if (process.env.USE_MOCK_DB === 'true') return mockClients.some((c) => c.name === name);
  return !!(await Client.exists({ name }));
};

// Vehicle create / edit. `partial` keeps fields the request leaves out.
const cleanVehicleInput = async (body = {}) => {
  const checked = collect({
    plateNumber: text(body.plateNumber, { label: 'Plate number', max: 20, required: true }),
    modelName: text(body.modelName, { label: 'Model', max: 60, required: true }),
    type: oneOf(body.type, VEHICLE_TYPES, { label: 'Vehicle type' }),
    capacity: integer(body.capacity, { label: 'Seats', min: 1, max: 100, required: true }),
    assignedTo: text(body.assignedTo || PUBLIC_POOL, { label: 'Assigned to', max: 120, required: true }),
  });
  if (checked.error) return checked;
  const v = checked.values;
  if (!/^[A-Za-z0-9 -]+$/.test(v.plateNumber)) return { error: 'Plate number can only contain letters, numbers, spaces and dashes.' };
  v.plateNumber = v.plateNumber.toUpperCase();
  if (v.assignedTo !== PUBLIC_POOL && v.assignedTo !== MAINTENANCE && !(await clientNameExists(v.assignedTo))) {
    return { error: 'Choose a client from the list.' };
  }
  if (body.features !== undefined) {
    if (!Array.isArray(body.features) || body.features.length > 15 || body.features.some((f) => typeof f !== 'string' || f.length > 40)) {
      return { error: 'Features are not valid.' };
    }
    v.features = body.features.map((f) => f.trim()).filter(Boolean);
  }
  return { values: v };
};

// Route create / edit (Route Manager).
const cleanRouteInput = async (body = {}) => {
  const TIME = /^\d{1,2}:\d{2}(\s?[AaPp][Mm])?$/;
  const checked = collect({
    departure: text(body.departure, { label: 'From', max: 60, required: true }),
    destination: text(body.destination, { label: 'To', max: 60, required: true }),
    departureTime: text(body.departureTime, { label: 'Departure time', max: 10, required: true }),
    arrivalTime: text(body.arrivalTime, { label: 'Arrival time', max: 10, required: true }),
    price: number(body.price, { label: 'Fare', min: 0, max: 100000, required: true }),
  });
  if (checked.error) return checked;
  const v = checked.values;
  if (!TIME.test(v.departureTime) || !TIME.test(v.arrivalTime)) return { error: 'Times must look like 07:30 AM.' };
  const vehicleId = typeof body.vehicle === 'object' && body.vehicle ? body.vehicle._id : body.vehicle;
  if (!validId(vehicleId)) return { error: 'Choose a vehicle.' };
  const exists = process.env.USE_MOCK_DB === 'true'
    ? mockVehicles.some((x) => x._id === vehicleId)
    : !!(await Vehicle.exists({ _id: vehicleId }));
  if (!exists) return { error: 'That vehicle no longer exists.' };
  v.vehicle = vehicleId;
  return { values: v };
};


// Site settings â€” public read, admin write
app.get('/api/settings', (req, res) => {
  if (readAdmin(req)) return res.json(siteSettings);
  const { sampleData, ...sections } = siteSettings.sections;
  res.json({ ...siteSettings, sections });
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const { services, sections } = req.body || {};
  if (services) {
    for (const key of ['buses', 'cabs', 'traveler']) {
      if (services[key]) {
        if (typeof services[key].enabled === 'boolean') siteSettings.services[key].enabled = services[key].enabled;
        if (typeof services[key].message === 'string') siteSettings.services[key].message = services[key].message.trim().slice(0, 300);
      }
    }
  }
  if (sections) {
    for (const key of ['routes', 'bookings', 'sampleData']) {
      if (typeof sections[key] === 'boolean') siteSettings.sections[key] = sections[key];
    }
  }
  res.json(siteSettings);
});

// Public: occupied seat numbers for a route on a date (no passenger PII exposed).
app.get('/api/occupied-seats', async (req, res) => {
  try {
    const { routeId, date } = req.query;
    if (!validId(routeId) || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'routeId and date are required.' });
    }
    if (process.env.USE_MOCK_DB === 'true') {
      const taken = mockBookings
        .filter((b) => b.route === routeId && b.date === date)
        .reduce((acc, b) => acc.concat(b.seatNumbers), []);
      return res.json({ occupied: taken });
    }
    const existing = await Booking.find({ route: routeId, date }).select('seatNumbers -_id').lean();
    const taken = existing.reduce((acc, b) => acc.concat(b.seatNumbers), []);
    res.json({ occupied: taken });
  } catch (err) {
    sendError(res, err);
  }
});

// Helper to populate vehicle in mock route
const populateMockRoute = (route) => {
  if (!route) return null;
  const vehicle = publicVehicle(mockVehicles.find(v => v._id === route.vehicle));
  return { ...route, vehicle };
};

// Helper to populate route & vehicle in mock booking
const populateMockBooking = (booking) => {
  if (!booking) return null;
  const routeRaw = mockRoutes.find(r => r._id === booking.route);
  const route = populateMockRoute(routeRaw);
  return { ...booking, route };
};

// 1. VEHICLES CRUD
app.get('/api/vehicles', async (req, res) => {
  try {
    // Ordered by plate, not by createdAt. The seed inserts every vehicle in one
    // insertMany, so their timestamps are identical and `createdAt: -1` returned
    // them in an arbitrary order that differed from the local mock list — the
    // public fleet appeared shuffled, and re-adding a vehicle moved it. Plate
    // order is stable, matches VEHICLE_SEED, and is identical on both paths.
    // This endpoint is PUBLIC — the fleet section on the home page reads it.
    // Document expiry dates and certificate numbers are internal compliance
    // records and must never be served here. The admin panel reads them from
    // /api/vehicles/compliance, which is behind requireAdmin.
    // A signed-in admin also gets each vehicle's sample flag, so the dashboard
    // can leave samples out while the public sections keep listing them.
    const admin = !!readAdmin(req);
    if (process.env.USE_MOCK_DB === 'true') {
      const list = [...mockVehicles]
        .sort((a, b) => a.plateNumber.localeCompare(b.plateNumber))
        .map(({ documents, sample, ...pub }) => (admin && sample ? { ...pub, sample } : pub));
      return res.json(list);
    }
    const vehicles = admin
      ? await Vehicle.find().select('-documents').sort({ plateNumber: 1 }).lean()
      : await cached('vehicles', () => Vehicle.find().select(PUBLIC_VEHICLE_FIELDS).sort({ plateNumber: 1 }).lean());
    res.json(vehicles);
  } catch (err) {
    sendError(res, err);
  }
});

/*
  Compliance — statutory document expiry per vehicle. Admin only, because the
  response carries certificate and policy numbers.
*/
const DOC_KEYS = ['fitness', 'permit', 'insurance', 'puc', 'roadTax'];

app.get('/api/vehicles/compliance', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const list = dropSamples([...mockVehicles])
        .sort((a, b) => a.plateNumber.localeCompare(b.plateNumber))
        .map((v) => ({
          _id: v._id,
          plateNumber: v.plateNumber,
          modelName: v.modelName,
          type: v.type,
          assignedTo: v.assignedTo,
          documents: v.documents || {}
        }));
      return res.json(list);
    }
    const vehicles = await Vehicle.find(sampleFilter())
      .select('plateNumber modelName type assignedTo documents')
      .sort({ plateNumber: 1 })
      .lean();
    res.json(vehicles);
  } catch (err) {
    sendError(res, err);
  }
});

// Update one document type on one vehicle. Scoped deliberately narrowly: the
// compliance screen should never be able to change a vehicle's plate or seats.
app.put('/api/vehicles/:id/documents/:docType', requireAdmin, async (req, res) => {
  try {
    const { id, docType } = req.params;
    if (!DOC_KEYS.includes(docType)) {
      return res.status(400).json({ error: 'Unknown document type.' });
    }
    if (!validId(id)) return res.status(404).json({ error: 'Vehicle not found.' });

    const { expiresOn, number, provider } = req.body || {};

    // An empty expiresOn clears the date — that is how the owner undoes a typo.
    let parsed = null;
    if (expiresOn) {
      parsed = new Date(expiresOn);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'expiresOn is not a valid date.' });
      }
    }

    if (parsed && (parsed.getUTCFullYear() < 2000 || parsed.getUTCFullYear() > 2100)) {
      return res.status(400).json({ error: 'expiresOn is not a valid date.' });
    }

    const entry = { expiresOn: parsed };
    if (number !== undefined) {
      const t = text(number, { label: 'Certificate number', max: 60 });
      if (t.error) return res.status(400).json({ error: t.error });
      entry.number = t.value;
    }
    if (provider !== undefined) {
      const t = text(provider, { label: 'Insurer', max: 80 });
      if (t.error) return res.status(400).json({ error: t.error });
      entry.provider = t.value;
    }

    if (process.env.USE_MOCK_DB === 'true') {
      const v = mockVehicles.find((x) => x._id === id);
      if (!v) return res.status(404).json({ error: 'Vehicle not found.' });
      v.documents = { ...(v.documents || {}) };
      v.documents[docType] = { ...(v.documents[docType] || {}), ...entry };
      return res.json(v);
    }

    const updated = await Vehicle.findByIdAndUpdate(
      id,
      { $set: Object.fromEntries(Object.entries(entry).map(([k, val]) => [`documents.${docType}.${k}`, val])) },
      { new: true, runValidators: true }
    ).select('plateNumber modelName type assignedTo documents');

    if (!updated) return res.status(404).json({ error: 'Vehicle not found.' });
    res.json(updated);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/vehicles', requireAdmin, async (req, res) => {
  try {
    const { values, error } = await cleanVehicleInput(req.body);
    if (error) return res.status(400).json({ error });
    if (process.env.USE_MOCK_DB === 'true') {
      if (mockVehicles.some((v) => v.plateNumber === values.plateNumber)) {
        return res.status(409).json({ error: 'A vehicle with that plate number already exists.' });
      }
      const newV = {
        _id: 'v_' + Math.random().toString(36).substring(2, 9),
        features: [],
        ...values
      };
      mockVehicles.unshift(newV);
      return res.status(201).json(newV);
    }
    const vehicle = new Vehicle(values);
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/vehicles/:id', requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Vehicle not found' });
    const { values, error } = await cleanVehicleInput(req.body);
    if (error) return res.status(400).json({ error });
    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockVehicles.findIndex(v => v._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });
      if (mockVehicles.some((v, i) => i !== idx && v.plateNumber === values.plateNumber)) {
        return res.status(409).json({ error: 'A vehicle with that plate number already exists.' });
      }
      mockVehicles[idx] = { ...mockVehicles[idx], ...values };
      return res.json(mockVehicles[idx]);
    }
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      values,
      { new: true, runValidators: true }
    );
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/vehicles/:id', requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Vehicle not found' });
    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockVehicles.findIndex(v => v._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });
      const deleted = mockVehicles.splice(idx, 1)[0];
      return res.json({ message: 'Vehicle deleted successfully', vehicle: deleted });
    }
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted successfully', vehicle });
  } catch (err) {
    sendError(res, err);
  }
});


// 1b. CLIENTS CRUD â€” schools and companies under contract
// Public: the names and kinds (the website groups the fleet by them). Contact
// people and phone numbers are personal data — only a signed-in admin gets them.
app.get('/api/clients', async (req, res) => {
  try {
    const admin = !!readAdmin(req);
    const shape = (c) => (admin ? c : { _id: c._id, name: c.name, kind: c.kind });
    if (process.env.USE_MOCK_DB === 'true') {
      return res.json(mockClients.map(shape));
    }
    const clients = admin
      ? await Client.find().sort({ name: 1 }).lean()
      : await cached('clients', () => Client.find().sort({ name: 1 }).select('name kind').lean());
    res.json(clients);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/clients', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const checked = collect({
      name: text(body.name, { label: 'Name', max: 120, required: true }),
      contactPerson: text(body.contactPerson, { label: 'Contact person', max: 80 }),
      phone: phone(body.phone, { label: 'Phone' }),
    });
    if (checked.error) return res.status(400).json({ error: checked.error });
    const { name, contactPerson, phone: clientPhone } = checked.values;
    const kind = body.kind === 'Company' ? 'Company' : 'School';

    if (process.env.USE_MOCK_DB === 'true') {
      if (mockClients.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return res.status(409).json({ error: 'A client with that name already exists.' });
      }
      const newC = {
        _id: 'c_' + Math.random().toString(36).substring(2, 9),
        name, kind,
        contactPerson,
        phone: clientPhone
      };
      mockClients.push(newC);
      return res.status(201).json(newC);
    }

    const exists = await Client.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (exists) return res.status(409).json({ error: 'A client with that name already exists.' });

    const client = new Client({ name, kind, contactPerson, phone: clientPhone });
    await client.save();
    res.status(201).json(client);
  } catch (err) {
    sendError(res, err);
  }
});

// Pass ?freeVehicles=1 to release any buses on this contract back to public
// booking as part of the delete. Without it, a contract in use is refused.
app.delete('/api/clients/:id', requireAdmin, async (req, res) => {
  const freeVehicles = req.query.freeVehicles === '1' || req.query.freeVehicles === 'true';
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Client not found' });
    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockClients.findIndex(c => c._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Client not found' });

      const name = mockClients[idx].name;
      const inUse = mockVehicles.filter(v => v.assignedTo === name);
      if (inUse.length > 0 && !freeVehicles) {
        return res.status(409).json({ error: `${inUse.length} vehicle(s) are still assigned here. Move them first.` });
      }
      inUse.forEach(v => { v.assignedTo = 'Available for Public Booking'; });

      const deleted = mockClients.splice(idx, 1)[0];
      return res.json({ message: 'Client removed', client: deleted, freedVehicles: inUse.length });
    }

    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const inUse = await Vehicle.countDocuments({ assignedTo: client.name });
    if (inUse > 0 && !freeVehicles) {
      return res.status(409).json({ error: `${inUse} vehicle(s) are still assigned here. Move them first.` });
    }
    if (inUse > 0) {
      await Vehicle.updateMany({ assignedTo: client.name }, { assignedTo: 'Available for Public Booking' });
    }

    await client.deleteOne();
    res.json({ message: 'Client removed', client, freedVehicles: inUse });
  } catch (err) {
    sendError(res, err);
  }
});


// 1c. ACCOUNTS — the owner's money in and out, entered by hand. Admin only.
// Totals and profit are computed from these entries when read, never stored.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Validates a create/update body. Resolves the vehicle (when an expense is for
// one vehicle) so its plate can be stored alongside the id.
const cleanLedgerInput = async (body = {}) => {
  const kind = body.kind === 'income' || body.kind === 'expense' ? body.kind : null;
  if (!kind) return { error: 'Choose whether this is an earning or an expense.' };

  const category = String(body.category || '');
  if (!LEDGER_CATEGORIES[kind].includes(category)) return { error: 'Choose a valid category.' };

  const amount = Math.round(Number(body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter an amount greater than zero.' };
  if (amount > 100000000) return { error: 'That amount is too large.' };

  const dateStr = String(body.date || '');
  const date = DATE_ONLY.test(dateStr) ? new Date(`${dateStr}T00:00:00.000Z`) : null;
  if (!date || Number.isNaN(date.getTime())) return { error: 'Choose a valid date.' };

  const note = String(body.note || '').trim().slice(0, 200);

  let client = '';
  if (kind === 'income' && category === 'Client billing') {
    client = String(body.client || '').trim().slice(0, 120);
    if (!client) return { error: 'Choose which client this billing is from.' };
  }

  // An expense is for one vehicle, or for a fleet: a named fleet (a client's
  // buses, the public booking buses) or — with no fleet named — all vehicles.
  let vehicle = null;
  let vehiclePlate = '';
  let fleet = '';
  if (kind === 'expense' && body.vehicle) {
    const id = String(body.vehicle);
    if (process.env.USE_MOCK_DB === 'true') {
      const v = mockVehicles.find((x) => x._id === id);
      if (!v) return { error: 'That vehicle no longer exists.' };
      vehicle = v._id;
      vehiclePlate = v.plateNumber;
    } else {
      if (!mongoose.isValidObjectId(id)) return { error: 'That vehicle no longer exists.' };
      const v = await Vehicle.findById(id).select('plateNumber');
      if (!v) return { error: 'That vehicle no longer exists.' };
      vehicle = v._id;
      vehiclePlate = v.plateNumber;
    }
  } else if (kind === 'expense') {
    fleet = String(body.fleet || '').trim().slice(0, 120);
  }

  return { entry: { kind, category, amount, date, client, vehicle, vehiclePlate, fleet, note } };
};

// Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive). Newest first.
app.get('/api/ledger', requireAdmin, async (req, res) => {
  try {
    const from = DATE_ONLY.test(String(req.query.from || '')) ? new Date(`${req.query.from}T00:00:00.000Z`) : null;
    const to = DATE_ONLY.test(String(req.query.to || '')) ? new Date(`${req.query.to}T23:59:59.999Z`) : null;

    if (process.env.USE_MOCK_DB === 'true') {
      const list = dropSamples(mockLedger)
        .filter((e) => (!from || new Date(e.date) >= from) && (!to || new Date(e.date) <= to))
        .sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt)));
      return res.json(list);
    }

    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    const entries = await LedgerEntry.find({ ...(from || to ? { date: range } : {}), ...sampleFilter() })
      .sort({ date: -1, createdAt: -1 }).lean();
    res.json(entries);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/ledger', requireAdmin, async (req, res) => {
  try {
    const { entry, error } = await cleanLedgerInput(req.body);
    if (error) return res.status(400).json({ error });

    if (process.env.USE_MOCK_DB === 'true') {
      const created = {
        _id: 'l_' + Math.random().toString(36).substring(2, 9),
        ...entry,
        date: entry.date.toISOString(),
        createdAt: new Date().toISOString(),
      };
      mockLedger.push(created);
      return res.status(201).json(created);
    }

    const created = await LedgerEntry.create(entry);
    res.status(201).json(created);
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/ledger/:id', requireAdmin, async (req, res) => {
  try {
    const { entry, error } = await cleanLedgerInput(req.body);
    if (error) return res.status(400).json({ error });

    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockLedger.findIndex((e) => e._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Entry not found.' });
      mockLedger[idx] = { ...mockLedger[idx], ...entry, date: entry.date.toISOString() };
      return res.json(mockLedger[idx]);
    }

    if (!validId(req.params.id)) return res.status(404).json({ error: 'Entry not found.' });
    const updated = await LedgerEntry.findByIdAndUpdate(req.params.id, entry, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Entry not found.' });
    res.json(updated);
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/ledger/:id', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockLedger.findIndex((e) => e._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Entry not found.' });
      mockLedger.splice(idx, 1);
      return res.json({ message: 'Entry deleted' });
    }

    if (!validId(req.params.id)) return res.status(404).json({ error: 'Entry not found.' });
    const deleted = await LedgerEntry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Entry not found.' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    sendError(res, err);
  }
});


// 2. ROUTES CRUD
app.get('/api/routes', async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const populated = mockRoutes.map(populateMockRoute);
      return res.json(populated);
    }
    const routes = await cached('routes', () => Route.find().populate('vehicle', PUBLIC_VEHICLE_FIELDS).sort({ createdAt: -1 }).lean());
    res.json(routes);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/routes', requireAdmin, async (req, res) => {
  try {
    const { values, error } = await cleanRouteInput(req.body);
    if (error) return res.status(400).json({ error });
    if (process.env.USE_MOCK_DB === 'true') {
      const newR = {
        _id: 'r_' + Math.random().toString(36).substring(2, 9),
        ...values
      };
      mockRoutes.unshift(newR);
      return res.status(201).json(populateMockRoute(newR));
    }
    const newRoute = new Route(values);
    await newRoute.save();
    const populatedRoute = await Route.findById(newRoute._id).populate('vehicle', PUBLIC_VEHICLE_FIELDS);
    res.status(201).json(populatedRoute);
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/routes/:id', requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Route not found' });
    const { values, error } = await cleanRouteInput(req.body);
    if (error) return res.status(400).json({ error });
    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockRoutes.findIndex(r => r._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Route not found' });
      mockRoutes[idx] = { ...mockRoutes[idx], ...values };
      return res.json(populateMockRoute(mockRoutes[idx]));
    }
    const updatedRoute = await Route.findByIdAndUpdate(
      req.params.id,
      values,
      { new: true, runValidators: true }
    ).populate('vehicle', PUBLIC_VEHICLE_FIELDS);
    if (!updatedRoute) return res.status(404).json({ error: 'Route not found' });
    res.json(updatedRoute);
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/routes/:id', requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Route not found' });
    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockRoutes.findIndex(r => r._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Route not found' });
      const deleted = mockRoutes.splice(idx, 1)[0];
      return res.json({ message: 'Route deleted successfully', route: deleted });
    }
    const deletedRoute = await Route.findByIdAndDelete(req.params.id);
    if (!deletedRoute) return res.status(404).json({ error: 'Route not found' });
    res.json({ message: 'Route deleted successfully', route: deletedRoute });
  } catch (err) {
    sendError(res, err);
  }
});


// 3. BOOKINGS API
app.get('/api/bookings', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const populated = dropSamples(mockBookings).map(populateMockBooking);
      return res.json(populated);
    }
    const bookings = await Booking.find(sampleFilter())
      .populate({
        path: 'route',
        populate: { path: 'vehicle', select: 'plateNumber modelName type capacity assignedTo' }
      })
      .sort({ createdAt: -1 })
      .lean();
    res.json(bookings);
  } catch (err) {
    sendError(res, err);
  }
});

/*
  Public seat booking. There is no real payment gateway yet (the checkout
  screen is a simulation), so the server never takes the visitor's word for
  payment: the amount is worked out here from the fare, and every booking is
  stored as 'Pending' until the owner confirms the money arrived. Refused
  outright while bus booking is switched off in Site Settings.
*/
const cleanBookingInput = async (body = {}) => {
  const checked = collect({
    date: text(body.date, { label: 'Date', max: 10, required: true }),
    passengerName: text(body.passengerName, { label: 'Name', max: 80, required: true }),
    passengerAge: integer(body.passengerAge, { label: 'Age', min: 1, max: 120, required: true }),
    passengerEmail: email(body.passengerEmail, { label: 'Email', required: true }),
    passengerPhone: phone(body.passengerPhone, { label: 'Phone', required: true }),
    paymentId: text(body.paymentId, { label: 'Payment reference', max: 64 }),
  });
  if (checked.error) return checked;
  const v = checked.values;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || Number.isNaN(new Date(`${v.date}T00:00:00Z`).getTime())) {
    return { error: 'Choose a valid travel date.' };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (v.date < today) return { error: 'That travel date has already passed.' };

  const routeId = typeof body.route === 'object' && body.route ? body.route._id : body.route;
  if (!validId(routeId)) return { error: 'Choose a route.' };
  const route = process.env.USE_MOCK_DB === 'true'
    ? populateMockRoute(mockRoutes.find((r) => r._id === routeId))
    : await Route.findById(routeId).populate('vehicle', 'capacity');
  if (!route) return { error: 'That route no longer exists.' };

  const capacity = Number(route.vehicle?.capacity) || 60;
  const seats = body.seatNumbers;
  if (!Array.isArray(seats) || seats.length < 1 || seats.length > 10
      || seats.some((n) => !Number.isInteger(n) || n < 1 || n > capacity)
      || new Set(seats).size !== seats.length) {
    return { error: 'Choose between 1 and 10 valid seats.' };
  }

  return {
    values: {
      ...v,
      route: routeId,
      seatNumbers: seats,
      paymentId: v.paymentId || 'unverified',
      paymentStatus: 'Pending',
      amountPaid: Number(route.price) * seats.length,
    },
  };
};

app.post('/api/bookings', writeLimiter, async (req, res) => {
  try {
    if (!siteSettings.services.buses.enabled) {
      return res.status(403).json({ error: 'Online booking is not available right now.' });
    }
    const { values, error } = await cleanBookingInput(req.body);
    if (error) return res.status(400).json({ error });
    const { route, date, seatNumbers } = values;

    if (process.env.USE_MOCK_DB === 'true') {
      const taken = mockBookings
        .filter(b => b.route === route && b.date === date)
        .reduce((acc, curr) => acc.concat(curr.seatNumbers), []);
      const overlap = seatNumbers.filter(s => taken.includes(s));
      if (overlap.length > 0) {
        return res.status(400).json({ error: `Seat(s) ${overlap.join(', ')} already booked for this date.` });
      }
      const newB = { _id: 'b_' + Math.random().toString(36).substring(2, 9), ...values };
      mockBookings.unshift(newB);
      return res.status(201).json(populateMockBooking(newB));
    }

    const existingBookings = await Booking.find({ route, date }).select('seatNumbers -_id').lean();
    const takenSeats = existingBookings.reduce((acc, curr) => acc.concat(curr.seatNumbers), []);
    const overlap = seatNumbers.filter(s => takenSeats.includes(s));
    if (overlap.length > 0) {
      return res.status(400).json({ error: `Seat(s) ${overlap.join(', ')} already booked for this date.` });
    }

    const booking = new Booking(values);
    await booking.save();
    const populatedBooking = await Booking.findById(booking._id).populate({
      path: 'route',
      populate: { path: 'vehicle', select: PUBLIC_VEHICLE_FIELDS }
    });
    res.status(201).json(populatedBooking);
  } catch (err) {
    sendError(res, err);
  }
});


// 4. CONTRACT INQUIRIES API
app.get('/api/inquiries', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      return res.json(dropSamples(mockInquiries));
    }
    const inquiries = await ContractInquiry.find(sampleFilter()).sort({ createdAt: -1 }).lean();
    res.json(inquiries);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/inquiries', writeLimiter, async (req, res) => {
  try {
    const body = req.body || {};

    // Bot trap: a hidden "website" field real visitors never see or fill.
    // Bots that fill every field get a normal-looking reply and nothing saved.
    if (body.website) {
      securityLog('bot_blocked', req, { form: 'inquiry' });
      return res.status(201).json({ ok: true });
    }

    // Checked before the storage split so the mock and MongoDB paths behave the same.
    const checked = collect({
      orgName: text(body.orgName, { label: 'Organisation', max: 120, required: true }),
      contactPerson: text(body.contactPerson, { label: 'Contact person', max: 80 }),
      email: email(body.email, { label: 'Email' }),
      phone: phone(body.phone, { label: 'Phone', required: true }),
      requiredFleetSize: integer(body.requiredFleetSize, { label: 'Fleet size', min: 1, max: 200 }),
      vehicleType: text(body.vehicleType, { label: 'Vehicle type', max: 40, required: true }),
      routeDescription: text(body.routeDescription, { label: 'Route', max: 1000 }),
      notes: text(body.notes, { label: 'Notes', max: 1000 }),
    });
    if (checked.error) return res.status(400).json({ error: checked.error });
    const values = { ...checked.values, requiredFleetSize: checked.values.requiredFleetSize || 1, status: 'Pending' };

    if (process.env.USE_MOCK_DB === 'true') {
      const newI = { _id: 'i_' + Math.random().toString(36).substring(2, 9), ...values };
      mockInquiries.unshift(newI);
      return res.status(201).json(newI);
    }
    const inquiry = new ContractInquiry(values);
    await inquiry.save();
    res.status(201).json(inquiry);
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/inquiries/:id', requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Inquiry not found' });
    const body = req.body || {};
    const update = {};
    if (body.status !== undefined) {
      const st = oneOf(body.status, ContractInquiry.schema.path('status').enumValues, { label: 'Status' });
      if (st.error) return res.status(400).json({ error: st.error });
      update.status = st.value;
    }
    if (body.notes !== undefined) {
      const n = text(body.notes, { label: 'Notes', max: 1000 });
      if (n.error) return res.status(400).json({ error: n.error });
      update.notes = n.value;
    }
    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockInquiries.findIndex(i => i._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Inquiry not found' });
      mockInquiries[idx] = { ...mockInquiries[idx], ...update };
      return res.json(mockInquiries[idx]);
    }
    const inquiry = await ContractInquiry.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    res.json(inquiry);
  } catch (err) {
    sendError(res, err);
  }
});


// Health check — says nothing about the internals.
app.get('/', (req, res) => {
  res.type('text/plain').send('OK');
});

// Unknown API paths get a JSON 404, not Express's HTML page.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Last-resort error handler: malformed JSON, oversized bodies and anything
// unexpected. Never sends a stack trace or internal message to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request was not valid JSON.' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'The request was too large.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// Start Server
reportAuthConfig();
// Only reachable from this machine (Nginx or the Vite dev proxy); the API is
// never meant to be hit directly. Docker sets HOST=0.0.0.0 so the frontend
// container can reach it over the compose network.
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
