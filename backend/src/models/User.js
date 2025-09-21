const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  filename: String,
  path: String,
  mimetype: String,
  size: Number,
});

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true },
  role: { type: String, default: "user" },
  otp: { type: String },
  otpExpires: { type: Date },
  documents: [documentSchema],
  loginCount: { type: Number, default: 0 },
  lastLogin: { type: Date },
  approvalStatus: { type: String, default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
