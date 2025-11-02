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
    // Xerox print store options
    xeroxPrintOptions: {
      size: { type: String, default: null }, // A4/A3/A5
      colorMode: { type: String, default: null }, // bw/color
      sides: { type: String, default: null }, // single/double
      copies: { type: Number, default: null },
      totalPages: { type: Number, default: null },
    },
    printPriceEstimate: { type: Number, default: null },
    // Visibility and tracking for rider document access
    documentsVisibleToRider: { type: Boolean, default: false },
    docsCopiedAt: { type: Date, default: null },
    docsCopiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // New fields for OTP-based flow
    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled", "rejected"],
      default: "pending",
    },
    // Riders who have locally rejected this parcel (hidden only for them)
    rejectedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    parcelOtp: { type: String, default: null },
    // Pricing and payment
    finalPrice: { type: Number, default: null },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    paymentMethod: { type: String, enum: ["cash", "online", null], default: null },
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
