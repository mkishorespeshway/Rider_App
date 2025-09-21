// backend/controllers/adminController.js
const mongoose = require("mongoose");
const User = require("../models/User");
const Captain = require("../models/Captain");
const Ride = require("../models/Ride");

// Helper to build ride query that works whether your Ride uses driverId or captain/captainId
function buildCaptainRideQuery(captainId) {
  const id = mongoose.Types.ObjectId(captainId);
  return {
    $or: [
      { driverId: id },
      { captain: id },
      { captainId: id },
      { driver: id }
    ]
  };
}

exports.getOverview = async (req, res) => {
  try {
    const usersCount = await User.countDocuments({ role: "user" });
    const captainsCount = await Captain.countDocuments({ status: "approved" });
    const pendingCaptainsCount = await Captain.countDocuments({ status: "pending" });
    const ridesCount = await Ride.countDocuments();
    return res.json({ usersCount, captainsCount, pendingCaptainsCount, ridesCount });
  } catch (err) {
    console.error("admin.getOverview:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("_id fullName email mobile role createdAt");
    return res.json(users);
  } catch (err) {
    console.error("admin.getUsers:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getCaptains = async (req, res) => {
  try {
    const captains = await Captain.find({ status: "approved" }).select("-__v");
    return res.json(captains);
  } catch (err) {
    console.error("admin.getCaptains:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getPendingCaptains = async (req, res) => {
  try {
    const pending = await Captain.find({ status: "pending" }).select("-__v");
    return res.json(pending);
  } catch (err) {
    console.error("admin.getPendingCaptains:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getRides = async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate("riderId", "fullName email mobile")
      .populate("driverId", "fullName email")
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json(rides);
  } catch (err) {
    console.error("admin.getRides:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.getCaptainRides = async (req, res) => {
  try {
    const captainId = req.params.id;
    const query = buildCaptainRideQuery(captainId);
    const rides = await Ride.find(query)
      .populate("riderId", "fullName email mobile")
      .populate("driverId", "fullName email")
      .sort({ createdAt: -1 })
      .limit(200);
    return res.json(rides);
  } catch (err) {
    console.error("admin.getCaptainRides:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.approveCaptain = async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await Captain.findByIdAndUpdate(id, { status: "approved", approvedAt: new Date() }, { new: true });
    if (!updated) return res.status(404).json({ error: "Captain not found" });
    return res.json({ success: true, captain: updated });
  } catch (err) {
    console.error("admin.approveCaptain:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.rejectCaptain = async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await Captain.findByIdAndUpdate(id, { status: "rejected", rejectedAt: new Date() }, { new: true });
    if (!updated) return res.status(404).json({ error: "Captain not found" });
    return res.json({ success: true, captain: updated });
  } catch (err) {
    console.error("admin.rejectCaptain:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
