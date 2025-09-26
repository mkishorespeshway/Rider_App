// backend/src/controllers/rides.controller.js
const Ride = require("../models/Ride");
const Counter = require("../models/Counter");
const Driver = require("../models/Driver");

// 🚖 Create Ride
exports.createRide = async (req, res) => {
  try {
    const { pickup, drop, pickupCoords, dropCoords } = req.body;

    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const counter = await Counter.findByIdAndUpdate(
      { _id: "rideId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const ride = new Ride({
      _id: counter.seq,
      riderId: req.user._id,
      pickup,
      drop,
      pickupCoords,
      dropCoords,
      status: "pending",
    });

    await ride.save();

    // 🔥 notify all drivers
    const io = req.app.get("io");
    io.emit("rideRequest", ride);

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Error creating ride:", err);
    res.status(500).json({ error: "Failed to create ride" });
  }
};

// 🚖 Accept Ride
exports.acceptRide = async (req, res) => {
  try {
    const rideId = parseInt(req.params.id, 10);
    const ride = await Ride.findOne({ _id: rideId, status: "pending" });
    if (!ride) return res.status(404).json({ success: false, message: "Ride not found or already taken" });

    ride.status = "accepted";
    ride.captainId = req.user._id;
    await ride.save();

    // fetch driver details
    const driver = await Driver.findById(req.user._id).lean();

    // 🔥 Notify that specific user only
    const io = req.app.get("io");
    io.to(ride.riderId.toString()).emit("rideAccepted", {
      ...ride.toObject(),
      driver: {
        _id: driver._id,
        fullName: driver.fullName,
        mobile: driver.mobile,
        vehicle: driver.vehicle || {},
      },
    });

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Accept ride error:", err);
    res.status(500).json({ error: "Failed to accept ride" });
  }
};

// 🚖 Reject Ride
exports.rejectRide = async (req, res) => {
  try {
    const rideId = parseInt(req.params.id, 10);
    const ride = await Ride.findOne({ _id: rideId, status: "pending" });
    if (!ride) return res.status(404).json({ success: false, message: "Ride not found or already handled" });

    ride.status = "cancelled";
    await ride.save();

    const io = req.app.get("io");
    io.to(ride.riderId.toString()).emit("rideRejected", ride);

    res.json({ success: true, ride });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject ride" });
  }
};

// 🚖 Get all pending rides (for drivers)
exports.getPendingRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: "pending" }).populate("riderId", "fullName mobile");
    res.json({ success: true, rides });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rides" });
  }
};

// 📜 Get ride history
exports.getRideHistory = async (req, res) => {
  try {
    const rides = await Ride.find({ riderId: req.user._id });
    res.json({ success: true, rides });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

// 🔍 Get ride by ID
exports.getRideById = async (req, res) => {
  try {
    const rideId = parseInt(req.params.id, 10);
    const ride = await Ride.findById(rideId);
    res.json({ success: true, ride });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ride" });
  }
};
