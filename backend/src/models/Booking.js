import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true
  },
  seatNumbers: {
    type: [Number],
    required: true
  },
  passengerName: {
    type: String,
    required: true,
    trim: true
  },
  passengerAge: {
    type: Number,
    required: true
  },
  passengerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  passengerPhone: {
    type: String,
    required: true,
    trim: true
  },
  paymentId: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Failed'],
    default: 'Paid'
  },
  amountPaid: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// Seat lookups (route + travel date) and the newest-first admin list.
bookingSchema.index({ route: 1, date: 1 });
bookingSchema.index({ createdAt: -1 });

export default mongoose.model('Booking', bookingSchema);
