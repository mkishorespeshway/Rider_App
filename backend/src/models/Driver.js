const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  licenseNumber: String,
  vehicleTypes: [String],
  status: { type: String, enum: ['pending','approved','suspended'], default: 'pending' },
  documents: [String],
  currentLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  isOnline: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);

