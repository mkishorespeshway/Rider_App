const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  loginCount: { type: Number, default: 0 },
  lastLogin: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
