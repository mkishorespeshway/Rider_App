const Ride = require("../models/Ride");
const User = require("../models/User");

// 🚖 Create Ride
exports.createRide = async (req, res) => {
  try {
    const { pickup, drop, pickupCoords, dropCoords } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const ride = new Ride({
      riderId: req.user._id, // user who books
      pickup,
      drop,
      pickupCoords,
      dropCoords,
      status: "pending",
    });

    await ride.save();

    // 🔥 notify all riders who can accept rides
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
    const rideId = req.params.id;

    if (req.user.role !== "rider") {
      return res.status(403).json({ success: false, message: "Only riders can accept rides" });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, status: "pending" },
      { status: "accepted", driverId: req.user._id },
      { new: true }
    ).populate("riderId", "fullName mobile");

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or already taken",
      });
    }

    // fetch driver (who accepted)
    const driver = await User.findById(req.user._id).lean();

    const io = req.app.get("io");

    // 🚨 Notify the booking user in their room
    io.to(ride.riderId._id.toString()).emit("rideAccepted", {
      ...ride.toObject(),
      acceptedBy: {
        _id: driver._id,
        fullName: driver.fullName,
        mobile: driver.mobile,
        vehicle: driver.vehicle || {},
      },
    });

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Accept ride error:", err);
    res.status(500).json({ error: "Failed to accept ride", details: err.message });
  }
};

// 🚖 Reject Ride
exports.rejectRide = async (req, res) => {
  try {
    const rideId = req.params.id;

    const ride = await Ride.findOne({ _id: rideId, status: "pending" });
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or already handled",
      });
    }

    ride.status = "cancelled";
    await ride.save();

    const io = req.app.get("io");
    io.to(ride.riderId.toString()).emit("rideRejected", ride);

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Reject ride error:", err);
    res.status(500).json({ error: "Failed to reject ride" });
  }
};

// 🚖 Get all pending rides
exports.getPendingRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: "pending" }).populate("riderId", "fullName mobile");
    res.json({ success: true, rides });
  } catch (err) {
    console.error("❌ Pending rides fetch error:", err);
    res.status(500).json({ error: "Failed to fetch rides" });
  }
};

// 📜 Get ride history
exports.getRideHistory = async (req, res) => {
  try {
    const rides = await Ride.find({ riderId: req.user._id });
    res.json({ success: true, rides });
  } catch (err) {
    console.error("❌ Ride history error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

// 🔍 Get ride by ID
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }
    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Ride fetch by ID error:", err);
    res.status(500).json({ error: "Failed to fetch ride" });
  }
};
