const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "active"],
      default: "pending", // new riders are pending by default
    },
    documents: [
      {
        type: { type: String }, // license, RC, etc.
        url: { type: String },
        verified: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", driverSchema);
