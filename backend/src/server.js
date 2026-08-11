import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import authRouter, { requireAdmin } from './auth.js';

// Models
import Vehicle from './models/Vehicle.js';
import Route from './models/Route.js';
import Booking from './models/Booking.js';
import ContractInquiry from './models/ContractInquiry.js';
import Client from './models/Client.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Database Connection and Auto-Seeding
await connectDB();

// Site-wide settings (persisted in memory; survives until server restart)
let siteSettings = {
  services: {
    buses:    { enabled: false, message: 'Bus booking is currently unavailable. Please check back soon or contact us directly.' },
    cabs:     { enabled: false, message: 'Cab booking is currently unavailable. Please check back soon or contact us directly.' },
    traveler: { enabled: false, message: 'Traveller booking is currently unavailable. Please check back soon or contact us directly.' },
  }
};

// Mock In-Memory Databases (pre-populated)
let mockVehicles = [];
let mockRoutes = [];
let mockBookings = [];
let mockInquiries = [];
let mockClients = [
  { _id: 'c1', name: 'Baddi International School', kind: 'School', contactPerson: '', phone: '' },
  { _id: 'c2', name: 'Eicher Parwanoo', kind: 'Company', contactPerson: '', phone: '' },
  { _id: 'c3', name: 'Eicher School', kind: 'School', contactPerson: '', phone: '' },
  { _id: 'c4', name: 'DAV School', kind: 'School', contactPerson: '', phone: '' },
];

const seedMockData = () => {
  mockVehicles = [
    { _id: 'v1', plateNumber: 'HR-49-A-1001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Baddi International School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
    { _id: 'v2', plateNumber: 'HR-49-A-1002', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Baddi International School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
    { _id: 'v3', plateNumber: 'HR-49-A-1003', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Baddi International School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
    { _id: 'v4', plateNumber: 'HR-49-A-1004', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Baddi International School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
    { _id: 'v5', plateNumber: 'HR-49-A-1005', modelName: 'Force Traveller School 20S', type: 'School Bus', capacity: 20, assignedTo: 'Baddi International School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },

    { _id: 'v6', plateNumber: 'HR-49-B-2001', modelName: 'Eicher Skyline Pro Staff', type: 'Mini Bus', capacity: 32, assignedTo: 'Eicher Parwanoo', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
    { _id: 'v7', plateNumber: 'HR-49-B-2002', modelName: 'Eicher Skyline Pro Staff', type: 'Mini Bus', capacity: 32, assignedTo: 'Eicher Parwanoo', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
    { _id: 'v8', plateNumber: 'HR-49-B-2003', modelName: 'Force Traveller 26S', type: 'Mini Bus', capacity: 26, assignedTo: 'Eicher Parwanoo', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },

    { _id: 'v9', plateNumber: 'HR-49-C-3001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Eicher School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
    { _id: 'v10', plateNumber: 'HR-49-C-3002', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Eicher School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },

    { _id: 'v11', plateNumber: 'HR-49-D-4001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'DAV School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
    { _id: 'v12', plateNumber: 'HR-49-D-4002', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'DAV School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
    { _id: 'v13', plateNumber: 'HR-49-D-4003', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'DAV School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
    { _id: 'v14', plateNumber: 'HR-49-D-4004', modelName: 'Force Traveller School 20S', type: 'School Bus', capacity: 20, assignedTo: 'DAV School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },

    {
      _id: 'v15',
      plateNumber: 'HR-49-E-5001',
      modelName: 'Volvo 9600 Multi-Axle Premium',
      type: 'Volvo AC Seater',
      capacity: 45,
      assignedTo: 'Available for Public Booking',
      features: ['Air Conditioning', 'WiFi', 'CCTV', 'GPS Tracking', 'USB Charging Port', 'Water Bottle', 'Reclining Seats']
    },
    {
      _id: 'v16',
      plateNumber: 'HR-49-E-5002',
      modelName: 'Volvo 9400 AC Seater',
      type: 'Volvo AC Seater',
      capacity: 45,
      assignedTo: 'Available for Public Booking',
      features: ['Air Conditioning', 'CCTV', 'GPS Tracking', 'USB Charging Port', 'Reclining Seats']
    },
    {
      _id: 'v17',
      plateNumber: 'HR-49-F-6001',
      modelName: 'Scania Metrolink AC Sleeper',
      type: 'Sleeper Coach',
      capacity: 30,
      assignedTo: 'Available for Public Booking',
      features: ['Air Conditioning', 'WiFi', 'CCTV', 'GPS Tracking', 'Blanket & Pillow', 'Reading Light', 'USB Charger']
    },
    {
      _id: 'v18',
      plateNumber: 'HR-49-F-6002',
      modelName: 'Mahindra Cruzio AC Sleeper',
      type: 'Sleeper Coach',
      capacity: 30,
      assignedTo: 'Available for Public Booking',
      features: ['Air Conditioning', 'CCTV', 'GPS Tracking', 'Reading Light']
    },
    {
      _id: 'v19',
      plateNumber: 'HR-49-G-7001',
      modelName: 'Toyota Innova Crysta',
      type: 'Luxury SUV / Cab',
      capacity: 7,
      assignedTo: 'Available for Public Booking',
      features: ['Air Conditioning', 'GPS Tracking', 'Leather Seats', 'Luggage Carrier']
    },
    {
      _id: 'v20',
      plateNumber: 'HR-49-G-7002',
      modelName: 'Maruti Suzuki Ertiga',
      type: 'Luxury SUV / Cab',
      capacity: 6,
      assignedTo: 'Available for Public Booking',
      features: ['Air Conditioning', 'GPS Tracking', 'USB Charger']
    }
  ];

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
      amountPaid: 1700
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
      notes: 'Active contract.'
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
      notes: 'Active contract.'
    }
  ];
};

// Auto-seed MongoDB if online
if (process.env.USE_MOCK_DB === 'false') {
  try {
    // Clients seed independently of vehicles so existing databases pick them up.
    if (await Client.countDocuments() === 0) {
      await Client.insertMany([
        { name: 'Baddi International School', kind: 'School' },
        { name: 'Eicher Parwanoo', kind: 'Company' },
        { name: 'Eicher School', kind: 'School' },
        { name: 'DAV School', kind: 'School' },
      ]);
      console.log('Seeded contract clients.');
    }

    const vehicleCount = await Vehicle.countDocuments();
    if (vehicleCount === 0) {
      console.log('No vehicles found in database. Auto-seeding MongoDB data...');
      
      const vSeed = [
        { plateNumber: 'HR-49-A-1001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Baddi International School' },
        { plateNumber: 'HR-49-A-1002', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Baddi International School' },
        { plateNumber: 'HR-49-A-1003', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Baddi International School' },
        { plateNumber: 'HR-49-A-1004', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Baddi International School' },
        { plateNumber: 'HR-49-A-1005', modelName: 'Force Traveller School 20S', type: 'School Bus', capacity: 20, assignedTo: 'Baddi International School' },

        { plateNumber: 'HR-49-B-2001', modelName: 'Eicher Skyline Pro Staff', type: 'Mini Bus', capacity: 32, assignedTo: 'Eicher Parwanoo' },
        { plateNumber: 'HR-49-B-2002', modelName: 'Eicher Skyline Pro Staff', type: 'Mini Bus', capacity: 32, assignedTo: 'Eicher Parwanoo' },
        { plateNumber: 'HR-49-B-2003', modelName: 'Force Traveller 26S', type: 'Mini Bus', capacity: 26, assignedTo: 'Eicher Parwanoo' },

        { plateNumber: 'HR-49-C-3001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Eicher School' },
        { plateNumber: 'HR-49-C-3002', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Eicher School' },

        { plateNumber: 'HR-49-D-4001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'DAV School' },
        { plateNumber: 'HR-49-D-4002', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'DAV School' },
        { plateNumber: 'HR-49-D-4003', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'DAV School' },
        { plateNumber: 'HR-49-D-4004', modelName: 'Force Traveller School 20S', type: 'School Bus', capacity: 20, assignedTo: 'DAV School' },

        {
          plateNumber: 'HR-49-E-5001',
          modelName: 'Volvo 9600 Multi-Axle Premium',
          type: 'Volvo AC Seater',
          capacity: 45,
          assignedTo: 'Available for Public Booking',
          features: ['Air Conditioning', 'WiFi', 'CCTV', 'GPS Tracking', 'USB Charging Port', 'Water Bottle', 'Reclining Seats']
        },
        {
          plateNumber: 'HR-49-E-5002',
          modelName: 'Volvo 9400 AC Seater',
          type: 'Volvo AC Seater',
          capacity: 45,
          assignedTo: 'Available for Public Booking',
          features: ['Air Conditioning', 'CCTV', 'GPS Tracking', 'USB Charging Port', 'Reclining Seats']
        },
        {
          plateNumber: 'HR-49-F-6001',
          modelName: 'Scania Metrolink AC Sleeper',
          type: 'Sleeper Coach',
          capacity: 30,
          assignedTo: 'Available for Public Booking',
          features: ['Air Conditioning', 'WiFi', 'CCTV', 'GPS Tracking', 'Blanket & Pillow', 'Reading Light', 'USB Charger']
        },
        {
          plateNumber: 'HR-49-F-6002',
          modelName: 'Mahindra Cruzio AC Sleeper',
          type: 'Sleeper Coach',
          capacity: 30,
          assignedTo: 'Available for Public Booking',
          features: ['Air Conditioning', 'CCTV', 'GPS Tracking', 'Reading Light']
        },
        {
          plateNumber: 'HR-49-G-7001',
          modelName: 'Toyota Innova Crysta',
          type: 'Luxury SUV / Cab',
          capacity: 7,
          assignedTo: 'Available for Public Booking',
          features: ['Air Conditioning', 'GPS Tracking', 'Leather Seats', 'Luggage Carrier']
        },
        {
          plateNumber: 'HR-49-G-7002',
          modelName: 'Maruti Suzuki Ertiga',
          type: 'Luxury SUV / Cab',
          capacity: 6,
          assignedTo: 'Available for Public Booking',
          features: ['Air Conditioning', 'GPS Tracking', 'USB Charger']
        }
      ];

      const seededVehicles = await Vehicle.insertMany(vSeed);
      
      const volvo1 = seededVehicles.find(v => v.plateNumber === 'HR-49-E-5001');
      const volvo2 = seededVehicles.find(v => v.plateNumber === 'HR-49-E-5002');
      const sleeper1 = seededVehicles.find(v => v.plateNumber === 'HR-49-F-6001');
      const mini1 = seededVehicles.find(v => v.plateNumber === 'HR-49-B-2003');
      const suv1 = seededVehicles.find(v => v.plateNumber === 'HR-49-G-7001');

      const rSeed = [
        { departure: 'Pinjor', destination: 'Baddi', departureTime: '07:30 AM', arrivalTime: '08:30 AM', price: 100, vehicle: mini1._id },
        { departure: 'Pinjor', destination: 'Chandigarh', departureTime: '09:00 AM', arrivalTime: '10:00 AM', price: 150, vehicle: volvo2._id },
        { departure: 'Pinjor', destination: 'Delhi', departureTime: '06:00 AM', arrivalTime: '11:30 AM', price: 850, vehicle: volvo1._id },
        { departure: 'Pinjor', destination: 'Delhi', departureTime: '09:30 PM', arrivalTime: '03:00 AM', price: 950, vehicle: sleeper1._id },
        { departure: 'Pinjor', destination: 'Chandigarh', departureTime: '02:00 PM', arrivalTime: '03:00 PM', price: 250, vehicle: suv1._id },
        { departure: 'Delhi', destination: 'Pinjor', departureTime: '01:00 PM', arrivalTime: '06:30 PM', price: 850, vehicle: volvo1._id },
        { departure: 'Chandigarh', destination: 'Pinjor', departureTime: '11:00 AM', arrivalTime: '12:00 PM', price: 150, vehicle: volvo2._id },
        { departure: 'Baddi', destination: 'Pinjor', departureTime: '05:30 PM', arrivalTime: '06:30 PM', price: 100, vehicle: mini1._id }
      ];
      const seededRoutes = await Route.insertMany(rSeed);

      const bSeed = [
        {
          route: seededRoutes[2]._id,
          date: new Date().toISOString().split('T')[0],
          seatNumbers: [5, 6],
          passengerName: 'Anil Kumar',
          passengerAge: 38,
          passengerEmail: 'anil.kumar@gmail.com',
          passengerPhone: '+91 9876543210',
          paymentId: 'pay_MOCK123456',
          paymentStatus: 'Paid',
          amountPaid: 1700
        }
      ];
      await Booking.insertMany(bSeed);

      const iSeed = [
        {
          orgName: 'DAV Public School Pinjor',
          contactPerson: 'Principal Devendra Singh',
          email: 'info@davpinjor.edu.in',
          phone: '+91 1733 222123',
          requiredFleetSize: 4,
          vehicleType: 'School Bus',
          routeDescription: 'Daily student pickup from Kalka, Pinjor, and DAV campus.',
          status: 'Approved',
          notes: 'Active contract.'
        },
        {
          orgName: 'Eicher Parwanoo',
          contactPerson: 'HR Manager Amit Saini',
          email: 'hr.parwanoo@eicher.co.in',
          phone: '+91 9888012345',
          requiredFleetSize: 3,
          vehicleType: 'Mini Bus',
          routeDescription: 'Employee shift pickups and drops between Baddi, Pinjor, and Parwanoo factory.',
          status: 'Approved',
          notes: 'Active contract.'
        }
      ];
      await ContractInquiry.insertMany(iSeed);
      console.log('MongoDB Auto-seeding completed successfully!');
    }
  } catch (err) {
    console.error('MongoDB Auto-seeding failed:', err.message);
  }
} else {
  // If in-memory mock mode
  seedMockData();
}

// --- API ROUTES ---

// Authentication (login, Google sign-in, session, config)
app.use('/api/auth', authRouter);

// Site settings — public read, admin write
app.get('/api/settings', (req, res) => {
  res.json(siteSettings);
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const { services } = req.body;
  if (services) {
    for (const key of ['buses', 'cabs', 'traveler']) {
      if (services[key]) {
        if (typeof services[key].enabled === 'boolean') siteSettings.services[key].enabled = services[key].enabled;
        if (typeof services[key].message === 'string') siteSettings.services[key].message = services[key].message.trim();
      }
    }
  }
  res.json(siteSettings);
});

// Public: occupied seat numbers for a route on a date (no passenger PII exposed).
app.get('/api/occupied-seats', async (req, res) => {
  try {
    const { routeId, date } = req.query;
    if (!routeId || !date) {
      return res.status(400).json({ error: 'routeId and date are required.' });
    }
    if (process.env.USE_MOCK_DB === 'true') {
      const taken = mockBookings
        .filter((b) => b.route === routeId && b.date === date)
        .reduce((acc, b) => acc.concat(b.seatNumbers), []);
      return res.json({ occupied: taken });
    }
    const existing = await Booking.find({ route: routeId, date });
    const taken = existing.reduce((acc, b) => acc.concat(b.seatNumbers), []);
    res.json({ occupied: taken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to populate vehicle in mock route
const populateMockRoute = (route) => {
  if (!route) return null;
  const vehicle = mockVehicles.find(v => v._id === route.vehicle);
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
    if (process.env.USE_MOCK_DB === 'true') {
      return res.json(mockVehicles);
    }
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const newV = {
        _id: 'v_' + Math.random().toString(36).substring(2, 9),
        ...req.body
      };
      mockVehicles.unshift(newV);
      return res.status(201).json(newV);
    }
    const { plateNumber, modelName, type, capacity, assignedTo, features } = req.body;
    const vehicle = new Vehicle({ plateNumber, modelName, type, capacity, assignedTo, features });
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/vehicles/:id', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockVehicles.findIndex(v => v._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });
      mockVehicles[idx] = { ...mockVehicles[idx], ...req.body };
      return res.json(mockVehicles[idx]);
    }
    const { plateNumber, modelName, type, capacity, assignedTo, features } = req.body;
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { plateNumber, modelName, type, capacity, assignedTo, features },
      { new: true, runValidators: true }
    );
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/vehicles/:id', requireAdmin, async (req, res) => {
  try {
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
    res.status(500).json({ error: err.message });
  }
});


// 1b. CLIENTS CRUD — schools and companies under contract
app.get('/api/clients', async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      return res.json(mockClients);
    }
    const clients = await Client.find().sort({ name: 1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const kind = req.body.kind === 'Company' ? 'Company' : 'School';
    if (!name) return res.status(400).json({ error: 'Name is required.' });

    if (process.env.USE_MOCK_DB === 'true') {
      if (mockClients.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return res.status(409).json({ error: 'A client with that name already exists.' });
      }
      const newC = {
        _id: 'c_' + Math.random().toString(36).substring(2, 9),
        name, kind,
        contactPerson: req.body.contactPerson || '',
        phone: req.body.phone || ''
      };
      mockClients.push(newC);
      return res.status(201).json(newC);
    }

    const exists = await Client.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (exists) return res.status(409).json({ error: 'A client with that name already exists.' });

    const client = new Client({ name, kind, contactPerson: req.body.contactPerson, phone: req.body.phone });
    await client.save();
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Pass ?freeVehicles=1 to release any buses on this contract back to public
// booking as part of the delete. Without it, a contract in use is refused.
app.delete('/api/clients/:id', requireAdmin, async (req, res) => {
  const freeVehicles = req.query.freeVehicles === '1' || req.query.freeVehicles === 'true';
  try {
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
    res.status(500).json({ error: err.message });
  }
});


// 2. ROUTES CRUD
app.get('/api/routes', async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const populated = mockRoutes.map(populateMockRoute);
      return res.json(populated);
    }
    const routes = await Route.find().populate('vehicle').sort({ createdAt: -1 });
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/routes', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const newR = {
        _id: 'r_' + Math.random().toString(36).substring(2, 9),
        ...req.body
      };
      mockRoutes.unshift(newR);
      return res.status(201).json(populateMockRoute(newR));
    }
    const { departure, destination, departureTime, arrivalTime, price, vehicle } = req.body;
    const newRoute = new Route({ departure, destination, departureTime, arrivalTime, price, vehicle });
    await newRoute.save();
    const populatedRoute = await Route.findById(newRoute._id).populate('vehicle');
    res.status(201).json(populatedRoute);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/routes/:id', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockRoutes.findIndex(r => r._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Route not found' });
      mockRoutes[idx] = { ...mockRoutes[idx], ...req.body };
      return res.json(populateMockRoute(mockRoutes[idx]));
    }
    const { departure, destination, departureTime, arrivalTime, price, vehicle } = req.body;
    const updatedRoute = await Route.findByIdAndUpdate(
      req.params.id,
      { departure, destination, departureTime, arrivalTime, price, vehicle },
      { new: true, runValidators: true }
    ).populate('vehicle');
    if (!updatedRoute) return res.status(404).json({ error: 'Route not found' });
    res.json(updatedRoute);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/routes/:id', requireAdmin, async (req, res) => {
  try {
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
    res.status(500).json({ error: err.message });
  }
});


// 3. BOOKINGS API
app.get('/api/bookings', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const populated = mockBookings.map(populateMockBooking);
      return res.json(populated);
    }
    const bookings = await Booking.find()
      .populate({
        path: 'route',
        populate: { path: 'vehicle' }
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { route, date, seatNumbers, passengerName, passengerAge, passengerEmail, passengerPhone, paymentId, paymentStatus, amountPaid } = req.body;
    
    if (process.env.USE_MOCK_DB === 'true') {
      // Check seat occupancy
      const existing = mockBookings.filter(b => b.route === route && b.date === date);
      const taken = existing.reduce((acc, curr) => acc.concat(curr.seatNumbers), []);
      const overlap = seatNumbers.filter(s => taken.includes(s));
      
      if (overlap.length > 0) {
        return res.status(400).json({ error: `Seat(s) ${overlap.join(', ')} already booked for this date.` });
      }

      const newB = {
        _id: 'b_' + Math.random().toString(36).substring(2, 9),
        route, date, seatNumbers, passengerName, passengerAge, passengerEmail, passengerPhone, paymentId, paymentStatus, amountPaid
      };
      mockBookings.unshift(newB);
      return res.status(201).json(populateMockBooking(newB));
    }

    // Check if seats are already booked in MongoDB
    const existingBookings = await Booking.find({ route, date });
    const takenSeats = existingBookings.reduce((acc, curr) => acc.concat(curr.seatNumbers), []);
    
    const overlap = seatNumbers.filter(s => takenSeats.includes(s));
    if (overlap.length > 0) {
      return res.status(400).json({ error: `Seat(s) ${overlap.join(', ')} already booked for this date.` });
    }

    const booking = new Booking({
      route, date, seatNumbers, passengerName, passengerAge, passengerEmail, passengerPhone, paymentId, paymentStatus, amountPaid
    });

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id).populate({
      path: 'route',
      populate: { path: 'vehicle' }
    });
    res.status(201).json(populatedBooking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// 4. CONTRACT INQUIRIES API
app.get('/api/inquiries', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      return res.json(mockInquiries);
    }
    const inquiries = await ContractInquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inquiries', async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const newI = {
        _id: 'i_' + Math.random().toString(36).substring(2, 9),
        status: 'Pending',
        ...req.body
      };
      mockInquiries.unshift(newI);
      return res.status(201).json(newI);
    }
    const { orgName, contactPerson, email, phone, requiredFleetSize, vehicleType, routeDescription, notes } = req.body;
    const inquiry = new ContractInquiry({
      orgName, contactPerson, email, phone, requiredFleetSize, vehicleType, routeDescription, notes
    });
    await inquiry.save();
    res.status(201).json(inquiry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/inquiries/:id', requireAdmin, async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true') {
      const idx = mockInquiries.findIndex(i => i._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Inquiry not found' });
      mockInquiries[idx] = { ...mockInquiries[idx], ...req.body };
      return res.json(mockInquiries[idx]);
    }
    const { status, notes } = req.body;
    const inquiry = await ContractInquiry.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true, runValidators: true }
    );
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    res.json(inquiry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Default Route
app.get('/', (req, res) => {
  res.send(`Travel With Chaudharys API is running... (Database Mode: ${process.env.USE_MOCK_DB === 'true' ? 'MOCK' : 'MONGO'})`);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
