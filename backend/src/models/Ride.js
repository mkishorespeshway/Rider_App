const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: { type: String, enum: ['requested','accepted','in-progress','completed','cancelled'], default: 'requested' },
  origin: { lat: Number, lng: Number, address: String },
  destination: { lat: Number, lng: Number, address: String },
  fare: Number,
  distanceKm: Number,
  etaMinutes: Number,
  routePolyline: String,
  paymentStatus: { type: String, enum: ['pending','paid','failed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);
    
