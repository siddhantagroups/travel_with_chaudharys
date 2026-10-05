// Sample data on the live database.
//
//   npm run live-data -- status                       what is in the database now
//   npm run live-data -- mark-samples                 mark the records left from the original setup as samples
//   npm run live-data -- mark-sample <kind> <id>      mark one record (kind: vehicle, inquiry or booking)
//   npm run live-data -- unmark-sample <kind> <id>    treat it as real again
//   npm run live-data -- clear-sample-vehicles --yes  delete the sample vehicles (and the routes run on them)
//   npm run live-data -- add-sample-accounts          six months of sample accounts, ending this month
//   npm run live-data -- remove-sample-accounts       take only those sample lines out again
//
// Records marked as samples are left out of the dashboard unless "Show sample
// data" is on in Site Settings; the website's rental section still lists the
// sample vehicles. Nothing here touches a record the owner entered himself.
// Back up first (deploy/README-security.md, step 4) and restart the API
// afterwards — it caches the fleet in memory:
//   pm2 restart twc-api
import 'dotenv/config';
import mongoose from 'mongoose';
import Vehicle from '../src/models/Vehicle.js';
import Route from '../src/models/Route.js';
import Booking from '../src/models/Booking.js';
import ContractInquiry from '../src/models/ContractInquiry.js';
import LedgerEntry from '../src/models/LedgerEntry.js';
import { VEHICLE_SEED, sampleLedger } from '../src/sampleData.js';

const [command, ...args] = process.argv.slice(2);
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travelwithchaudharys';

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
} catch {
  // Unlike the API, never fall back to the in-memory sample database here.
  console.error(`Can't reach the database at ${uri.replace(/\/\/[^@/]*@/, '//***@')}. Is MongoDB running?`);
  process.exit(1);
}

const SAMPLE = { sample: true };
const REAL = { sample: { $ne: true } };
const KINDS = { vehicle: Vehicle, inquiry: ContractInquiry, booking: Booking };
const restartNote = () => console.log('\nNow restart the API so the site shows it:  pm2 restart twc-api');

// What the very first version of the site put into an empty database: the
// sample fleet, one made-up seat booking and two made-up enquiries.
const SETUP_SAMPLES = {
  vehicles: { plateNumber: { $in: VEHICLE_SEED.map((v) => v.plateNumber) } },
  bookings: { passengerName: 'Anil Kumar', paymentId: 'pay_MOCK123456' },
  inquiries: {
    $or: [
      { orgName: 'DAV Public School Pinjor', email: 'info@davpinjor.edu.in' },
      { orgName: 'Eicher Parwanoo', email: 'hr.parwanoo@eicher.co.in' },
    ],
  },
};

switch (command) {
  case 'status': {
    const line = async (label, Model) =>
      console.log(`${label}: ${await Model.countDocuments(REAL)} real, ${await Model.countDocuments(SAMPLE)} sample`);
    await line('Vehicles', Vehicle);
    await line('Accounts lines', LedgerEntry);
    await line('Enquiries', ContractInquiry);
    await line('Seat bookings', Booking);
    console.log(`Routes: ${await Route.countDocuments()}`);
    break;
  }

  case 'mark-samples': {
    const v = await Vehicle.updateMany(SETUP_SAMPLES.vehicles, { $set: SAMPLE });
    const b = await Booking.updateMany(SETUP_SAMPLES.bookings, { $set: SAMPLE });
    const i = await ContractInquiry.updateMany(SETUP_SAMPLES.inquiries, { $set: SAMPLE });
    console.log(`Marked as samples: ${v.matchedCount} vehicle(s), ${b.matchedCount} booking(s), ${i.matchedCount} enquiry(ies).`);
    restartNote();
    break;
  }

  case 'mark-sample':
  case 'unmark-sample': {
    const [kind, id] = args;
    const Model = KINDS[kind];
    if (!Model || !mongoose.isValidObjectId(id)) {
      console.log(`Use: npm run live-data -- ${command} <vehicle|inquiry|booking> <id>`);
      break;
    }
    const r = await Model.updateOne({ _id: id }, command === 'mark-sample' ? { $set: SAMPLE } : { $unset: { sample: '' } });
    console.log(r.matchedCount ? `Done: that ${kind} is now ${command === 'mark-sample' ? 'a sample' : 'real'}.` : `No ${kind} with that id.`);
    if (r.matchedCount) restartNote();
    break;
  }

  case 'clear-sample-vehicles': {
    const vehicles = await Vehicle.find(SAMPLE, 'plateNumber assignedTo').sort({ plateNumber: 1 }).lean();
    if (!vehicles.length) { console.log('There are no sample vehicles to delete.'); break; }
    const ids = vehicles.map((v) => v._id);
    const routes = await Route.countDocuments({ vehicle: { $in: ids } });
    if (args[0] !== '--yes') {
      vehicles.forEach((v) => console.log(`  ${v.plateNumber}  (${v.assignedTo || 'unassigned'})`));
      console.log(`\nThis deletes the ${vehicles.length} sample vehicles above and ${routes} route(s) that use them.`);
      console.log('The website\'s rental section then has none of them. To go ahead:  npm run live-data -- clear-sample-vehicles --yes');
      break;
    }
    const r = await Route.deleteMany({ vehicle: { $in: ids } });
    const v = await Vehicle.deleteMany({ _id: { $in: ids }, ...SAMPLE });
    console.log(`Deleted ${v.deletedCount} sample vehicles and ${r.deletedCount} route(s).`);
    restartNote();
    break;
  }

  case 'add-sample-accounts': {
    if (await LedgerEntry.countDocuments(SAMPLE)) {
      console.log('The sample accounts are already there. Run remove-sample-accounts first to add them afresh.');
      break;
    }
    // The sample fleet isn't stored on the live site, so a line about one
    // vehicle keeps just its plate (as a line about a deleted vehicle does).
    const entries = sampleLedger((id) => ({
      vehicle: null,
      vehiclePlate: VEHICLE_SEED[Number(id.slice(1)) - 1]?.plateNumber || '',
    }));
    const added = await LedgerEntry.insertMany(entries.map((e) => ({ ...e, ...SAMPLE })));
    console.log(`Added ${added.length} sample accounts lines (the last six months).`);
    restartNote();
    break;
  }

  case 'remove-sample-accounts': {
    const r = await LedgerEntry.deleteMany(SAMPLE);
    console.log(`Removed ${r.deletedCount} sample accounts lines. Lines entered in the admin panel are untouched.`);
    restartNote();
    break;
  }

  default:
    console.log('Use one of: status, mark-samples, mark-sample, unmark-sample, clear-sample-vehicles, add-sample-accounts, remove-sample-accounts');
}

await mongoose.disconnect();
