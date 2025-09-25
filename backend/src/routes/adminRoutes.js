const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const adminAuth = require("../middleware/adminAuth");
const User = require("../models/User");
const Ride = require("../models/Ride");
const SOS = require("../models/SOS"); // 🚨 SOS model

// 🔹 Static admin credentials
const ADMIN_USER = {
  username: "admin",
  password: "admin123",
};

// 🔹 Admin login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER.username || password !== ADMIN_USER.password) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { username: ADMIN_USER.username, role: "admin" },
    process.env.JWT_SECRET || "supersecretkey",
    { expiresIn: "12h" }
  );

  return res.json({ success: true, token, role: "admin" });
});

// 🔹 Overview (protected)
router.get("/overview", adminAuth, async (req, res) => {
  try {
    const [usersCount, ridersCount, pendingCaptainsCount, ridesCount] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        User.countDocuments({ role: "rider", approvalStatus: "approved" }),
        User.countDocuments({ role: "rider", approvalStatus: "pending" }),
        Ride.countDocuments(),
      ]);

    res.json({
      success: true,
      data: {
        users: usersCount,
        riders: ridersCount,
        captains: ridersCount,
        pendingCaptains: pendingCaptainsCount,
        rides: ridesCount,
      },
    });
  } catch (err) {
    console.error("Overview error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Get all users
router.get("/users", adminAuth, async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-otp -otpExpires");
    if (!users) return res.status(404).json({ success: false, message: "No users found" });
    res.json({ success: true, data: users });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Get all riders
router.get("/riders", adminAuth, async (req, res) => {
  try {
    const riders = await User.find({ role: "rider" }).select("-otp -otpExpires");
    if (!riders) return res.status(404).json({ success: false, message: "No riders found" });
    res.json({ success: true, data: riders });
  } catch (err) {
    console.error("Get riders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Approved captains
router.get("/captains", adminAuth, async (req, res) => {
  try {
    const captains = await User.find({ role: "rider", approvalStatus: "approved" }).select("-otp -otpExpires");
    res.json({ success: true, data: captains });
  } catch (err) {
    console.error("Get captains error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Pending captains
router.get("/pending-captains", adminAuth, async (req, res) => {
  try {
    const pending = await User.find({ role: "rider", approvalStatus: "pending" }).select("-otp -otpExpires");
    res.json({ success: true, data: pending });
  } catch (err) {
    console.error("Get pending captains error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Approve captain
router.post("/captain/:id/approve", adminAuth, async (req, res) => {
  try {
    const captain = await User.findById(req.params.id);
    if (!captain) return res.status(404).json({ success: false, message: "Captain not found" });
    captain.approvalStatus = "approved";
    await captain.save();
    res.json({ success: true, message: "Captain approved", data: captain });
  } catch (err) {
    console.error("Approve captain error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Reject captain
router.post("/captain/:id/reject", adminAuth, async (req, res) => {
  try {
    const captain = await User.findById(req.params.id);
    if (!captain) return res.status(404).json({ success: false, message: "Captain not found" });
    captain.approvalStatus = "rejected";
    await captain.save();
    res.json({ success: true, message: "Captain rejected", data: captain });
  } catch (err) {
    console.error("Reject captain error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Get all rides
router.get("/rides", adminAuth, async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate("riderId", "fullName email mobile documents")
      .populate("captainId", "fullName email mobile documents")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: rides });
  } catch (err) {
    console.error("Get rides error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===================== 🚨 SOS ROUTES =====================

// 🔹 Get all SOS alerts
router.get("/sos-alerts", adminAuth, async (req, res) => {
  try {
    const alerts = await SOS.find()
      .populate("userId", "fullName email mobile")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: alerts });
  } catch (err) {
    console.error("Get SOS alerts error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Resolve SOS alert
router.put("/sos/:id/resolve", adminAuth, async (req, res) => {
  try {
    const sos = await SOS.findByIdAndUpdate(req.params.id, { status: "resolved" }, { new: true });
    if (!sos) return res.status(404).json({ success: false, message: "SOS not found" });
    res.json({ success: true, message: "SOS resolved", data: sos });
  } catch (err) {
    console.error("Resolve SOS error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
