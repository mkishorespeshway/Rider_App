const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["user", "rider"], // only user and rider allowed
      default: "user",
    },
    otp: { type: String, default: null },        // latest OTP
    otpExpires: { type: Date, default: null },   // expiry of latest OTP
    loginCount: { type: Number, default: 0 },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
