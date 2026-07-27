import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travelwithchaudharys';
  console.log(`Connecting to MongoDB at: ${mongoURI}`);

  const options = {
    serverSelectionTimeoutMS: 2000, // Timeout fast for diagnostic fallback
  };

  try {
    await mongoose.connect(mongoURI, options);
    console.log('MongoDB Connected Successfully!');
    process.env.USE_MOCK_DB = 'false';
  } catch (err) {
    console.log('--------------------------------------------------');
    console.log('⚠️  WARNING: MongoDB is not running on localhost:27017.');
    console.log('👉 Running in-memory Mock Database Mode for demo.');
    console.log('👉 All bookings, reassignments, and CRUD will work in-memory.');
    console.log('--------------------------------------------------');
    process.env.USE_MOCK_DB = 'true';
  }
};

export default connectDB;
