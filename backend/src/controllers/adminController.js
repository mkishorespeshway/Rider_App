// backend/controllers/adminController.js
const mongoose = require("mongoose");
const User = require("../models/User");
const Captain = require("../models/Captain");
const Ride = require("../models/Ride");

// Helper to build ride query that works with various ride schemas
const buildCaptainRideQuery = (captainId) => {
  const id = mongoose.Types.ObjectId(captainId);
  return { $or: [{ driverId: id }, { captain: id }, { captainId: id }, { driver: id }] };
};

// ===== Overview =====
exports.getOverview = async (req, res) => {
  try {
    const [usersCount, captainsCount, pendingCaptainsCount, ridesCount] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Captain.countDocuments({ status: "approved" }),
      Captain.countDocuments({ status: "pending" }),
      Ride.countDocuments(),
    ]);

    res.json({ usersCount, captainsCount, pendingCaptainsCount, ridesCount });
  } catch (err) {
    console.error("admin.getOverview:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===== Users =====
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("_id fullName email mobile role createdAt");
    res.json({ success: true, users });
  } catch (err) {
    console.error("admin.getUsers:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===== Captains =====
exports.getCaptains = async (req, res) => {
  try {
    const captains = await Captain.find({ status: "approved" }).select("-__v");
    res.json({ success: true, captains });
  } catch (err) {
    console.error("admin.getCaptains:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getPendingCaptains = async (req, res) => {
  try {
    const pending = await Captain.find({ status: "pending" }).select("-__v");
    res.json({ success: true, pendingCaptains: pending });
  } catch (err) {
    console.error("admin.getPendingCaptains:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===== Rides =====
exports.getRides = async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate("riderId", "fullName email mobile")
      .populate("driverId", "fullName email")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, rides });
  } catch (err) {
    console.error("admin.getRides:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getCaptainRides = async (req, res) => {
  try {
    const captainId = req.params.id;
    const rides = await Ride.find(buildCaptainRideQuery(captainId))
      .populate("riderId", "fullName email mobile")
      .populate("driverId", "fullName email")
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, rides });
  } catch (err) {
    console.error("admin.getCaptainRides:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===== Approve / Reject Helper =====
const updateCaptainStatus = async (id, status) => {
  const updateFields = { status };
  if (status === "approved") updateFields.approvedAt = new Date();
  if (status === "rejected") updateFields.rejectedAt = new Date();

  return await Captain.findByIdAndUpdate(id, updateFields, { new: true });
};

exports.approveCaptain = async (req, res) => {
  try {
    const updated = await updateCaptainStatus(req.params.id, "approved");
    if (!updated) return res.status(404).json({ success: false, message: "Captain not found" });
    res.json({ success: true, captain: updated });
  } catch (err) {
    console.error("admin.approveCaptain:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.rejectCaptain = async (req, res) => {
  try {
    const updated = await updateCaptainStatus(req.params.id, "rejected");
    if (!updated) return res.status(404).json({ success: false, message: "Captain not found" });
    res.json({ success: true, captain: updated });
  } catch (err) {
    console.error("admin.rejectCaptain:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
