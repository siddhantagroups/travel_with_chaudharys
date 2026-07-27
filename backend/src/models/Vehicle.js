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
  assignedTo: {
    type: String,
    required: true,
    enum: [
      'Available for Public Booking',
      'Baddi International School',
      'Eicher Parwanoo',
      'Eicher School',
      'DAV School',
      'Maintenance'
    ],
    default: 'Available for Public Booking'
  },
  features: {
    type: [String],
    default: ['Air Conditioning', 'CCTV', 'GPS Tracking', 'Pushback Seats']
  }
}, { timestamps: true });

export default mongoose.model('Vehicle', vehicleSchema);
