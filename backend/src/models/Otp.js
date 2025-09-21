const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver", // link to Rider/Driver model
      required: true,
    },
    mobile: { type: String, required: true }, // Rider’s mobile
    otp: { type: String, required: true },    // OTP code
    otpExpires: { type: Date, required: true }, // Expiry time
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", otpSchema);
