const mongoose = require('mongoose');

const parcelSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiverName: String,
  receiverPhone: String,
  pickup: { lat: Number, lng: Number, address: String },
  dropoff: { lat: Number, lng: Number, address: String },
  weightKg: Number,
  dimensions: String,
  status: { type: String, enum: ['requested','assigned','in-transit','delivered','cancelled'], default: 'requested' },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }
}, { timestamps: true });

module.exports = mongoose.model('Parcel', parcelSchema);

