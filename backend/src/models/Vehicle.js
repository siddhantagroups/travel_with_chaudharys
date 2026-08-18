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
    // 'Volvo AC Seater' and 'Sleeper Coach' are retired from the UI but kept
    // here so vehicles already stored under them still validate on save.
    // Removing a value from this list breaks every existing document using it.
    enum: [
      'School Bus',
      'Mini Bus',
      'Seater Bus',
      'AC Coach',
      'Tempo Traveller',
      'Luxury SUV / Cab',
      'Volvo AC Seater',
      'Sleeper Coach'
    ]
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
