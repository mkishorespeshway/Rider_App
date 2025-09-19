const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true, unique: true },
    role: {
      type: String,
<<<<<<< HEAD
      enum: ["user", "rider", "admin"], // ✅ allow rider too
=======
      enum: ["user", "rider"], // only user and rider allowed
>>>>>>> aced6b199b083cb320663ecabeb739aba4129a5a
      default: "user",
    },
    otp: { type: String, default: null },        // latest OTP
    otpExpires: { type: Date, default: null },   // expiry of latest OTP
    loginCount: { type: Number, default: 0 },
    lastLogin: { type: Date, default: null },

    // ✅ New fields for document verification
    documents: {
      licenseNumber: String,
      rcNumber: String,
      insuranceNumber: String,
      aadharFrontNumber: String,
      aadharBackNumber: String,
      licenseImage: String,
      rcImage: String,
      insuranceImage: String,
      aadharFront: String,
      aadharBack: String,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "not_uploaded"],
      default: "not_uploaded",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
