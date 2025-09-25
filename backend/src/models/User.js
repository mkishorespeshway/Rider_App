const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true },
  password: { type: String }, // optional, will be set by admin for riders
  role: { type: String, enum: ["user", "rider", "admin"], default: "user" },
  otp: { type: String },
  otpExpires: { type: Date },

  // ✅ Keep only this version
  documents: {
    type: Object,
    default: {}
  },

  loginCount: { type: Number, default: 0 },
  lastLogin: { type: Date },
  approvalStatus: { type: String, enum: ["pending", "approved"], default: "pending" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
