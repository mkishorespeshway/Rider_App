const mongoose = require("mongoose");
 
// Counter schema for auto-increment
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);
 
// Ride schema
const rideSchema = new mongoose.Schema(
  {
    _id: { type: Number }, // auto-incremented ride ID
 
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
 
    // Driver who accepted the ride
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
   
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
 
    pickup: { type: String, required: true },
    drop: { type: String, required: true },
 
    pickupCoords: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    dropCoords: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    // Zone identifiers for pricing auditability
    pickupZoneId: { type: String, default: null },
    dropZoneId: { type: String, default: null },
 
    // Dynamic pricing fields
    distance: { type: Number, required: true, default: 0 }, // in kilometers
    basePrice: { type: Number, required: true, default: 25 }, // base fare in rupees
   
    // Pricing factors
    pricingFactors: {
      weatherMultiplier: { type: Number, default: 1.0 },
      trafficMultiplier: { type: Number, default: 1.0 },
      demandMultiplier: { type: Number, default: 1.0 },
      timeMultiplier: { type: Number, default: 1.0 },
    },
   
    // Final calculated price
    finalPrice: { type: Number, required: true, default: 0 },
   
    // Payment details
    paymentMethod: {
      type: String,
      enum: ["COD", "online"],
      default: "COD"
    },
    detailedPaymentMethod: {
      type: String,
      enum: ["upi", "card", "wallet", ""],
      default: ""
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending"
    },
 
    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
      default: "pending",
    },

    // Riders who have locally rejected this ride (hidden only for them)
    rejectedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
 
    etaMinutes: { type: Number, default: null },
 
    requestedVehicleType: {
      type: String,
      enum: ["bike", "auto", "car", "suv", "parcel", ""],
      default: "",
    },
    // Per-ride OTP shown to user; must match to start ride
    rideOtp: { type: String, default: null },
  },
  { timestamps: true }
);
 
// Auto-increment rideId
rideSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        "rideId",
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      this._id = counter.seq;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});
 
module.exports = mongoose.model("Ride", rideSchema);
 
 