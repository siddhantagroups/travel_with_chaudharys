// Prepares the live database for showing the owner the dashboard.
//
//   npm run live-data -- status                   what is in the database now
//   npm run live-data -- clear-vehicles --yes     delete every vehicle (and the routes run on them)
//   npm run live-data -- add-sample-accounts      six months of sample accounts, ending this month
//   npm run live-data -- remove-sample-accounts   take only those sample lines out again
//
// Sample account lines are marked when added, so removing them never touches
// a line the owner entered himself. Back up first (deploy/README-security.md,
// step 4) and restart the API afterwards — it caches the fleet in memory:
//   pm2 restart twc-api
import 'dotenv/config';
import mongoose from 'mongoose';
import Vehicle from '../src/models/Vehicle.js';
import Route from '../src/models/Route.js';
import LedgerEntry from '../src/models/LedgerEntry.js';
import { VEHICLE_SEED, sampleLedger } from '../src/sampleData.js';

const [command, flag] = process.argv.slice(2);
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travelwithchaudharys';

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
} catch {
  // Unlike the API, never fall back to the in-memory sample database here.
  console.error(`Can't reach the database at ${uri.replace(/\/\/[^@/]*@/, '//***@')}. Is MongoDB running?`);
  process.exit(1);
}

const SAMPLE = { sample: true };
const counts = async () => ({
  vehicles: await Vehicle.countDocuments(),
  routes: await Route.countDocuments(),
  sampleAccounts: await LedgerEntry.collection.countDocuments(SAMPLE),
  ownAccounts: await LedgerEntry.collection.countDocuments({ sample: { $ne: true } }),
});
const restartNote = () => console.log('\nNow restart the API so the site shows it:  pm2 restart twc-api');

switch (command) {
  case 'status': {
    const c = await counts();
    console.log(`Vehicles: ${c.vehicles}\nRoutes: ${c.routes}\nAccounts lines: ${c.ownAccounts} entered, ${c.sampleAccounts} sample`);
    break;
  }

  case 'clear-vehicles': {
    const vehicles = await Vehicle.find({}, 'plateNumber assignedTo').sort({ plateNumber: 1 }).lean();
    if (!vehicles.length) { console.log('There are no vehicles to delete.'); break; }
    const routes = await Route.countDocuments({ vehicle: { $in: vehicles.map((v) => v._id) } });
    if (flag !== '--yes') {
      vehicles.forEach((v) => console.log(`  ${v.plateNumber}  (${v.assignedTo || 'unassigned'})`));
      console.log(`\nThis deletes all ${vehicles.length} vehicles above, their documents, and ${routes} route(s) that use them.`);
      console.log('Clients and accounts are kept. To go ahead:  npm run live-data -- clear-vehicles --yes');
      break;
    }
    const r = await Route.deleteMany({ vehicle: { $in: vehicles.map((v) => v._id) } });
    const v = await Vehicle.deleteMany({ _id: { $in: vehicles.map((x) => x._id) } });
    console.log(`Deleted ${v.deletedCount} vehicles and ${r.deletedCount} route(s).`);
    restartNote();
    break;
  }

  case 'add-sample-accounts': {
    if (await LedgerEntry.collection.countDocuments(SAMPLE)) {
      console.log('The sample accounts are already there. Run remove-sample-accounts first to add them afresh.');
      break;
    }
    // The sample fleet isn't stored on the live site, so a line about one
    // vehicle keeps just its plate (as a line about a deleted vehicle does).
    const entries = sampleLedger((id) => ({
      vehicle: null,
      vehiclePlate: VEHICLE_SEED[Number(id.slice(1)) - 1]?.plateNumber || '',
    }));
    const added = await LedgerEntry.insertMany(entries);
    await LedgerEntry.collection.updateMany({ _id: { $in: added.map((e) => e._id) } }, { $set: SAMPLE });
    console.log(`Added ${added.length} sample accounts lines (the last six months).`);
    restartNote();
    break;
  }

  case 'remove-sample-accounts': {
    const r = await LedgerEntry.collection.deleteMany(SAMPLE);
    console.log(`Removed ${r.deletedCount} sample accounts lines. Lines entered in the admin panel are untouched.`);
    restartNote();
    break;
  }

  default:
    console.log('Use one of: status, clear-vehicles, add-sample-accounts, remove-sample-accounts');
}

await mongoose.disconnect();
