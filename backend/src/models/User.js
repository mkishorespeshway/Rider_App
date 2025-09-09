const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, required: true, unique: true },
  email: String,
  passwordHash: String,
  type: { type: String, enum: ['rider','driver','admin'], default: 'rider' },
  preferredLanguage: { type: String, default: 'en' },
  isActive: { type: Boolean, default: true },
  deviceToken: String,
  rating: { type: Number, default: 5 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

