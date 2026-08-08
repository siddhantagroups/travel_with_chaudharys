import mongoose from 'mongoose';

// A school or company the owner holds a contract with. These used to be a
// hardcoded enum on Vehicle.assignedTo, which meant a new contract needed a
// code change — they are now data the owner manages from the panel.
const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  kind: {
    type: String,
    required: true,
    enum: ['School', 'Company'],
    default: 'School'
  },
  contactPerson: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' }
}, { timestamps: true });

export default mongoose.model('Client', clientSchema);
