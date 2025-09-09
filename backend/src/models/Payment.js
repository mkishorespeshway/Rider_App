const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
  amount: Number,
  provider: String,
  providerRef: String,
  status: { type: String, enum: ['initiated','success','failed'], default: 'initiated' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);

