import mongoose from 'mongoose';

const contractInquirySchema = new mongoose.Schema({
  orgName: {
    type: String,
    required: true,
    trim: true
  },
  contactPerson: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  requiredFleetSize: {
    type: Number,
    required: true
  },
  vehicleType: {
    type: String,
    required: true,
    trim: true
  },
  routeDescription: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

export default mongoose.model('ContractInquiry', contractInquirySchema);
