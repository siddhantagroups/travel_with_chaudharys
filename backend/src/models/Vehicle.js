import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  plateNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  modelName: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Volvo AC Seater', 'Sleeper Coach', 'School Bus', 'Mini Bus', 'Luxury SUV / Cab']
  },
  capacity: {
    type: Number,
    required: true
  },
  // Either one of the two fixed states below, or the name of a Client the
  // owner has added. Not an enum — clients are data, not code.
  assignedTo: {
    type: String,
    required: true,
    trim: true,
    default: 'Available for Public Booking'
  },
  features: {
    type: [String],
    default: ['Air Conditioning', 'CCTV', 'GPS Tracking', 'Pushback Seats']
  }
}, { timestamps: true });

export default mongoose.model('Vehicle', vehicleSchema);
