const mongoose = require("mongoose");

const parcelSchema = new mongoose.Schema(
  {
    senderName: { type: String, required: true },
    senderMobile: { type: String, required: true },
    receiverName: { type: String, required: true },
    receiverMobile: { type: String, required: true },
    parcelCategory: { type: String, required: true },
    requiredVehicleType: { type: String, default: null },
    parcelDetails: String,
    pickupAddress: String,
    dropAddress: String,
    pickup: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    drop: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    documents: [
      {
        url: String,
        mimetype: String,
        public_id: String,
        originalName: String,
        size: Number,
      },
    ],
    // Visibility and tracking for rider document access
    documentsVisibleToRider: { type: Boolean, default: false },
    docsCopiedAt: { type: Date, default: null },
    docsCopiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // New fields for OTP-based flow
    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    parcelOtp: { type: String, default: null },
    // Assigned rider after OTP verification
    assignedRider: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      fullName: { type: String, default: null },
      mobile: { type: String, default: null },
      vehicleType: { type: String, default: null },
      vehicleNumber: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Parcel", parcelSchema);
