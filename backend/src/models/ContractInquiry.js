import mongoose from 'mongoose';

const contractInquirySchema = new mongoose.Schema({
  orgName: {
    type: String,
    required: true,
    trim: true
  },
  // Only Organisation, Phone and Vehicle Type are marked required on the public
  // enquiry form. These three must therefore be optional here: when they were
  // required, an enquiry filled in exactly as the form asks was rejected by
  // Mongoose on production and the lead was lost. A phone number is enough to
  // follow up on — do not re-add `required` without also changing the form.
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
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
    default: 1
  },
  vehicleType: {
    type: String,
    required: true,
    trim: true
  },
  routeDescription: {
    type: String,
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
  },

  // A sample or test enquiry from before the site went live. Set by
  // scripts/live-data.js, never through the API; hidden from the dashboard
  // unless "Show sample data" is on in Site Settings.
  sample: { type: Boolean },
}, { timestamps: true });

// The admin list is newest first.
contractInquirySchema.index({ createdAt: -1 });

export default mongoose.model('ContractInquiry', contractInquirySchema);
