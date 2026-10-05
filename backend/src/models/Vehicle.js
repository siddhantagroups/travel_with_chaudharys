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
  },

  /*
    Statutory document expiry dates. Every field is optional: a vehicle added
    today has none of them, and the UI shows those as "Not set" rather than
    pretending they are valid.

    Only the expiry date and a reference number are kept. The owner's name,
    address, chassis and engine numbers are deliberately NOT stored — holding
    the minimum is the simplest protection if this ever comes from an RC
    lookup, and none of it is needed to answer "what expires next".

    Status (expired / due soon / valid) is never stored. It is derived from
    these dates on read, because a stored status is wrong the next morning.
  */
  documents: {
    fitness: {
      number: { type: String, trim: true },
      expiresOn: { type: Date }
    },
    permit: {
      number: { type: String, trim: true },
      expiresOn: { type: Date }
    },
    insurance: {
      number: { type: String, trim: true },
      provider: { type: String, trim: true },
      expiresOn: { type: Date }
    },
    puc: {
      expiresOn: { type: Date }
    },
    roadTax: {
      expiresOn: { type: Date }
    }
  }
}, { timestamps: true });

// Vehicles are counted, moved and listed per client (assignedTo).
vehicleSchema.index({ assignedTo: 1 });

export default mongoose.model('Vehicle', vehicleSchema);
