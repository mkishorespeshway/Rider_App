const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Ride has a numeric _id (auto-increment). Store rideId as Number to match.
  rideId: { type: Number, ref: 'Ride', required: true },
  amount: Number,
  currency: { type: String, default: 'INR' },
  provider: String,
  providerRef: String,
  method: { type: String, enum: ['upi','card','wallet'], default: 'upi' },
  status: { type: String, enum: ['initiated','success','failed'], default: 'initiated' },
  // Razorpay fields
  orderId: { type: String },
  paymentId: { type: String },
  signature: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);

