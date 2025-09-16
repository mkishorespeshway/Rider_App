// backend/src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: false, lowercase: true },
    mobile: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["user", "rider"],   // ✅ only allow these two
      default: "user",
    },
    otp: { type: String },
    otpExpires: { type: Date },
    lastLogin: { type: Date },
    loginCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
