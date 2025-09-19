const Ride = require("../models/Ride");
const Counter = require("../models/Counter");

// ✅ Create a ride
exports.createRide = async (req, res) => {
  try {
    const { pickup, drop } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Auto-increment ride ID
    const counter = await Counter.findByIdAndUpdate(
      { _id: "rideId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const ride = new Ride({
      _id: counter.seq, // numeric ID
      riderId: req.user._id, // ✅ use riderId to match schema
      pickup,
      drop,
      status: "pending",
    });

    await ride.save();
    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Error creating ride:", err);
    res.status(500).json({ error: "Failed to create ride" });
  }
};

// ✅ Get ride history for logged-in user
exports.getRideHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const rides = await Ride.find({ riderId: req.user._id });
    res.json({ success: true, rides });
  } catch (err) {
    console.error("❌ Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch ride history" });
  }
};

// ✅ Get a single ride by ID
exports.getRideById = async (req, res) => {
  try {
    const rideId = parseInt(req.params.id, 10);

    if (isNaN(rideId)) {
      return res.status(400).json({ success: false, message: "Invalid ride ID" });
    }

    const ride = await Ride.findOne({ _id: rideId });

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    // Optional: only allow owner to fetch
    if (ride.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Error fetching ride:", err);
    res.status(500).json({ error: "Failed to load ride" });
  }
};
