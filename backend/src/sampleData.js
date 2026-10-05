/*
  Sample data shared by the local in-memory database (server.js) and
  scripts/live-data.js, so both always show the same fleet and accounts.
*/

/*
  The sample fleet: twenty vehicles for local development only.

  Loaded by seedMockData() in server.js into the in-memory DB used when
  MongoDB is unreachable. The real database never gets these vehicles; the
  owner's fleet is only what he enters in the admin panel.
*/
export const VEHICLE_SEED = [
  { plateNumber: 'HR-49-A-1001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Baddi International School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
  { plateNumber: 'HR-49-A-1002', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Baddi International School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
  { plateNumber: 'HR-49-A-1003', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Baddi International School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
  { plateNumber: 'HR-49-A-1004', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Baddi International School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
  { plateNumber: 'HR-49-A-1005', modelName: 'Force Traveller School 20S', type: 'School Bus', capacity: 20, assignedTo: 'Baddi International School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },

  { plateNumber: 'HR-49-B-2001', modelName: 'Eicher Skyline Pro Staff', type: 'Mini Bus', capacity: 32, assignedTo: 'Eicher Parwanoo', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
  { plateNumber: 'HR-49-B-2002', modelName: 'Eicher Skyline Pro Staff', type: 'Mini Bus', capacity: 32, assignedTo: 'Eicher Parwanoo', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
  { plateNumber: 'HR-49-B-2003', modelName: 'Force Traveller 26S', type: 'Mini Bus', capacity: 26, assignedTo: 'Eicher Parwanoo', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },

  { plateNumber: 'HR-49-C-3001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Eicher School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
  { plateNumber: 'HR-49-C-3002', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Eicher School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },

  { plateNumber: 'HR-49-D-4001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'DAV School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
  { plateNumber: 'HR-49-D-4002', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'DAV School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
  { plateNumber: 'HR-49-D-4003', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'DAV School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },
  { plateNumber: 'HR-49-D-4004', modelName: 'Force Traveller School 20S', type: 'School Bus', capacity: 20, assignedTo: 'DAV School', features: ['Air Conditioning', 'CCTV', 'GPS Tracking'] },

  // Public rental fleet — what the "Rent Our Vehicles" section shows.
  {
    plateNumber: 'HR-49-E-5001',
    modelName: 'Toyota Innova Crysta',
    type: 'Luxury SUV / Cab',
    capacity: 7,
    assignedTo: 'Available for Public Booking',
    features: ['Air Conditioning', 'GPS Tracking', 'Leather Seats', 'Luggage Carrier', 'USB Charger']
  },
  {
    plateNumber: 'HR-49-E-5002',
    modelName: 'Seater Bus',
    type: 'Seater Bus',
    capacity: 45,
    assignedTo: 'Available for Public Booking',
    features: ['Air Conditioning', 'CCTV', 'GPS Tracking', 'USB Charging Port', 'Reclining Seats']
  },
  {
    plateNumber: 'HR-49-F-6001',
    modelName: 'AC Luxury Mini Coach',
    type: 'AC Coach',
    capacity: 32,
    assignedTo: 'Available for Public Booking',
    features: ['Air Conditioning', 'WiFi', 'CCTV', 'GPS Tracking', 'Reclining Seats', 'USB Charger']
  },
  {
    plateNumber: 'HR-49-F-6002',
    modelName: 'Tata Deluxe Seater Bus',
    type: 'Seater Bus',
    capacity: 50,
    assignedTo: 'Available for Public Booking',
    features: ['CCTV', 'GPS Tracking', 'Push-Back Seats', 'Luggage Carrier']
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
    modelName: 'Force Traveller 26',
    type: 'Tempo Traveller',
    capacity: 26,
    assignedTo: 'Available for Public Booking',
    features: ['Air Conditioning', 'GPS Tracking', 'Push-Back Seats', 'USB Charger', 'Luggage Carrier']
  }
];

/*
  Six months of sample accounts, ending this month: each client's monthly
  billing plus typical fuel, salary, repair and toll costs.

  vehicleRef(id) turns a sample vehicle id ('v3' = VEHICLE_SEED[2]) into the
  entry's { vehicle, vehiclePlate }. Locally that is the in-memory vehicle; on
  the live site (scripts/live-data.js) only the plate, as the sample fleet is
  never stored there.
*/
export const sampleLedger = (vehicleRef) => {
  const now = new Date();
  const billing = {
    'Baddi International School': 185000,
    'Eicher Parwanoo': 120000,
    'Eicher School': 76000,
    'DAV School': 142000,
  };
  const out = [];

  for (let back = 5; back >= 0; back--) {
    const i = 5 - back;
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() - back;
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    // The current month only has entries up to today.
    const day = (d) => Math.min(d, lastDay, back === 0 ? now.getUTCDate() : 31);
    const on = (d) => new Date(Date.UTC(y, m, day(d))).toISOString();
    const add = (e) => out.push({
      client: '', note: '', vehicle: null, vehiclePlate: '', fleet: '', ...e,
      ...(e.vehicle ? vehicleRef(e.vehicle) : {}),
    });

    Object.entries(billing).forEach(([client, amount]) =>
      add({ kind: 'income', category: 'Client billing', amount, date: on(1), client }));
    if (i % 2 === 0) add({ kind: 'income', category: 'Other income', amount: 18000 + i * 2500, date: on(14), note: 'Wedding party booking' });

    add({ kind: 'expense', category: 'Fuel', amount: 162000 + i * 4300 - (i % 3) * 6100, date: on(28), note: 'Diesel — whole fleet' });
    add({ kind: 'expense', category: 'Fuel', amount: 8400 + i * 350, date: on(9), vehicle: 'v16', note: 'Top-up before Delhi run' });
    add({ kind: 'expense', category: 'Urea', amount: 6200 + i * 150, date: on(15), note: 'AdBlue cans' });
    add({ kind: 'expense', category: 'Driver salaries', amount: 168000, date: on(30) });
    add({
      kind: 'expense', category: 'Maintenance & repairs',
      amount: [14500, 38200, 9800, 22600, 6900, 31400][i], date: on(11),
      vehicle: ['v3', 'v7', 'v12', 'v1', 'v18', 'v9'][i],
      note: ['Brake pads', 'Clutch plate replaced', 'Tyre puncture & alignment', 'Engine service', 'Wipers & lights', 'Gearbox repair'][i],
    });
    add({ kind: 'expense', category: 'Tolls & taxes', amount: 11200 + i * 300, date: on(20), fleet: 'Eicher Parwanoo', note: 'Parwanoo barrier tolls' });
    if (i === 2) add({ kind: 'expense', category: 'Insurance & permits', amount: 46500, date: on(5), vehicle: 'v5', note: 'Insurance renewal' });
  }

  return out;
};
