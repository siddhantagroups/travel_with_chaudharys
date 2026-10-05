import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
  departure: {
    type: String,
    required: true,
    trim: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  departureTime: {
    type: String,
    required: true
  },
  arrivalTime: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  }
}, { timestamps: true });

// Listed newest first; looked up by vehicle when one is edited or removed.
routeSchema.index({ createdAt: -1 });
routeSchema.index({ vehicle: 1 });

export default mongoose.model('Route', routeSchema);
