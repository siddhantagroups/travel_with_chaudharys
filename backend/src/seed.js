import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './db.js';
import Vehicle from './models/Vehicle.js';
import Route from './models/Route.js';
import Booking from './models/Booking.js';
import ContractInquiry from './models/ContractInquiry.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to DB
    await connectDB();

    // Clear existing data
    await Vehicle.deleteMany({});
    await Route.deleteMany({});
    await Booking.deleteMany({});
    await ContractInquiry.deleteMany({});
    console.log('Cleared existing database collections.');

    // Seed Vehicles
    const vehicles = [
      // Baddi International School (5 buses)
      { plateNumber: 'HR-49-A-1001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Baddi International School' },
      { plateNumber: 'HR-49-A-1002', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Baddi International School' },
      { plateNumber: 'HR-49-A-1003', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Baddi International School' },
      { plateNumber: 'HR-49-A-1004', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Baddi International School' },
      { plateNumber: 'HR-49-A-1005', modelName: 'Force Traveller School 20S', type: 'School Bus', capacity: 20, assignedTo: 'Baddi International School' },

      // Eicher Parwanoo (3 mini buses)
      { plateNumber: 'HR-49-B-2001', modelName: 'Eicher Skyline Pro Staff', type: 'Mini Bus', capacity: 32, assignedTo: 'Eicher Parwanoo' },
      { plateNumber: 'HR-49-B-2002', modelName: 'Eicher Skyline Pro Staff', type: 'Mini Bus', capacity: 32, assignedTo: 'Eicher Parwanoo' },
      { plateNumber: 'HR-49-B-2003', modelName: 'Force Traveller 26S', type: 'Mini Bus', capacity: 26, assignedTo: 'Eicher Parwanoo' },

      // Eicher School (2 school buses)
      { plateNumber: 'HR-49-C-3001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'Eicher School' },
      { plateNumber: 'HR-49-C-3002', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'Eicher School' },

      // DAV School (4 school buses)
      { plateNumber: 'HR-49-D-4001', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'DAV School' },
      { plateNumber: 'HR-49-D-4002', modelName: 'Tata Starbus school 50S', type: 'School Bus', capacity: 50, assignedTo: 'DAV School' },
      { plateNumber: 'HR-49-D-4003', modelName: 'Eicher Starline 40S', type: 'School Bus', capacity: 40, assignedTo: 'DAV School' },
      { plateNumber: 'HR-49-D-4004', modelName: 'Force Traveller School 20S', type: 'School Bus', capacity: 20, assignedTo: 'DAV School' },

      // Available for Public Booking
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

    const seededVehicles = await Vehicle.insertMany(vehicles);
    console.log(`Seeded ${seededVehicles.length} vehicles.`);

    // Find the available vehicles to link with routes
    const volvo1 = seededVehicles.find(v => v.plateNumber === 'HR-49-E-5001');
    const volvo2 = seededVehicles.find(v => v.plateNumber === 'HR-49-E-5002');
    const sleeper1 = seededVehicles.find(v => v.plateNumber === 'HR-49-F-6001');
    const mini1 = seededVehicles.find(v => v.plateNumber === 'HR-49-B-2003'); // Borrowed or re-assigned
    const suv1 = seededVehicles.find(v => v.plateNumber === 'HR-49-G-7001');

    // Seed Routes
    const routes = [
      { departure: 'Pinjor', destination: 'Delhi', departureTime: '06:00 AM', arrivalTime: '11:30 AM', price: 850, vehicle: volvo1._id },
      { departure: 'Pinjor', destination: 'Delhi', departureTime: '09:30 PM', arrivalTime: '03:00 AM', price: 950, vehicle: sleeper1._id },
      { departure: 'Pinjor', destination: 'Chandigarh', departureTime: '09:00 AM', arrivalTime: '10:00 AM', price: 150, vehicle: volvo2._id },
      { departure: 'Pinjor', destination: 'Baddi', departureTime: '07:30 AM', arrivalTime: '08:30 AM', price: 100, vehicle: mini1._id },
      { departure: 'Pinjor', destination: 'Chandigarh', departureTime: '02:00 PM', arrivalTime: '03:00 PM', price: 250, vehicle: suv1._id },
      { departure: 'Delhi', destination: 'Pinjor', departureTime: '01:00 PM', arrivalTime: '06:30 PM', price: 850, vehicle: volvo1._id },
      { departure: 'Chandigarh', destination: 'Pinjor', departureTime: '11:00 AM', arrivalTime: '12:00 PM', price: 150, vehicle: volvo2._id },
      { departure: 'Baddi', destination: 'Pinjor', departureTime: '05:30 PM', arrivalTime: '06:30 PM', price: 100, vehicle: mini1._id }
    ];

    const seededRoutes = await Route.insertMany(routes);
    console.log(`Seeded ${seededRoutes.length} routes.`);

    // Seed a couple of mock bookings
    const sampleRoute = seededRoutes[0]; // Pinjor to Delhi at 6:00 AM
    const sampleRoute2 = seededRoutes[2]; // Pinjor to Chandigarh at 9:00 AM

    const bookings = [
      {
        route: sampleRoute._id,
        date: new Date().toISOString().split('T')[0], // Today
        seatNumbers: [5, 6],
        passengerName: 'Anil Kumar',
        passengerAge: 38,
        passengerEmail: 'anil.kumar@gmail.com',
        passengerPhone: '+91 9876543210',
        paymentId: 'pay_MOCK123456',
        paymentStatus: 'Paid',
        amountPaid: 1700
      },
      {
        route: sampleRoute2._id,
        date: new Date().toISOString().split('T')[0],
        seatNumbers: [12],
        passengerName: 'Deepa Sharma',
        passengerAge: 27,
        passengerEmail: 'deepa.sharma@yahoo.com',
        passengerPhone: '+91 9999888877',
        paymentId: 'pay_MOCK789012',
        paymentStatus: 'Paid',
        amountPaid: 150
      }
    ];

    await Booking.insertMany(bookings);
    console.log('Seeded sample bookings.');

    // Seed a couple of mock contract inquiries
    const inquiries = [
      {
        orgName: 'DAV Public School Pinjor',
        contactPerson: 'Principal Devendra Singh',
        email: 'info@davpinjor.edu.in',
        phone: '+91 1733 222123',
        requiredFleetSize: 4,
        vehicleType: 'School Bus',
        routeDescription: 'Daily student pickup from Kalka, Pinjor, and surrounding sectors to DAV School campus.',
        status: 'Approved',
        notes: 'Contracts signed for the academic year 2026-2027. Service operational.'
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
        notes: 'Ongoing multi-year industrial shift transport contract.'
      },
      {
        orgName: 'Baddi University of Emerging Sciences',
        contactPerson: 'Dean Academic Affairs Dr. Raj Kumar',
        email: 'academics@baddiuniv.ac.in',
        phone: '+91 9812345678',
        requiredFleetSize: 2,
        vehicleType: 'Volvo AC Seater',
        routeDescription: 'Premium shuttle service for staff and students from Panchkula and Pinjor to Baddi University.',
        status: 'Pending',
        notes: 'In negotiation. Requesting a pilot run for 1 month.'
      }
    ];

    await ContractInquiry.insertMany(inquiries);
    console.log('Seeded sample contract inquiries.');

    console.log('Database Seeding Completed Successfully.');
    process.exit(0);
  } catch (err) {
    console.error(`Error seeding database: ${err.message}`);
    process.exit(1);
  }
};

seedData();
