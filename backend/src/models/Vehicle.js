const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  vehicleType: String,
  make: String,
  model: String,
  registrationNumber: String,
  capacity: Number,
  luggageSpace: String,
  images: [String]
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);

