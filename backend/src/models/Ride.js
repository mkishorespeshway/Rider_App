const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

const rideSchema = new mongoose.Schema(
  {
    _id: { type: Number }, // auto-incremented ride ID
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ Fix here
    pickup: { type: String, required: true },
    drop: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "cancelled"],
      default: "pending",
    },
    etaMinutes: { type: Number, default: null },
  },
  { timestamps: true }
);


// Auto-increment rideId
rideSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "rideId" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this._id = counter.seq;
  }
  next();
});

module.exports = mongoose.model("Ride", rideSchema);
