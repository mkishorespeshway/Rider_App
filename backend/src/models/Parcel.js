const mongoose = require("mongoose");

const parcelSchema = new mongoose.Schema(
  {
    senderName: { type: String, required: true },
    senderMobile: { type: String, required: true },
    receiverName: { type: String, required: true },
    receiverMobile: { type: String, required: true },
    parcelCategory: { type: String, required: true },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Parcel", parcelSchema);
