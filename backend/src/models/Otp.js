// backend/src/models/Otp.js
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  mobile: { type: String, required: true },
  role: { type: String, required: true },
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Otp", otpSchema);
