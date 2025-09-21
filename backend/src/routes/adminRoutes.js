const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Ride = require("../models/Ride");
const adminAuth = require("../middleware/adminAuth"); // ✅ admin auth

// 🔹 Admin Overview
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
      users: usersCount,
      riders: ridersCount,
      captains: ridersCount, // approved riders = captains
      pendingCaptains: pendingCaptainsCount,
      rides: ridesCount,
    });
  } catch (err) {
    console.error("Overview error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Get all users
router.get("/users", adminAuth, async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-otp -otpExpires");
    res.json({ users });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Approved captains
router.get("/captains", adminAuth, async (req, res) => {
  try {
    const captains = await User.find({
      role: "rider",
      approvalStatus: "approved",
    }).select("-otp -otpExpires");
    res.json({ captains });
  } catch (err) {
    console.error("Get captains error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Pending captains
router.get("/pending-captains", adminAuth, async (req, res) => {
  try {
    const pendingCaptains = await User.find({
      role: "rider",
      approvalStatus: "pending",
    }).select("-otp -otpExpires");
    res.json({ pendingCaptains });
  } catch (err) {
    console.error("Get pending captains error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Approve captain + generate OTP
router.post("/captain/:id/approve", adminAuth, async (req, res) => {
  try {
    const captain = await User.findById(req.params.id);
    if (!captain) return res.status(404).json({ message: "Captain not found" });

    captain.approvalStatus = "approved";
    captain.otp = Math.floor(100000 + Math.random() * 900000).toString();
    captain.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await captain.save();

    console.log(`📲 OTP for captain ${captain.mobile}: ${captain.otp}`);
    res.json({ message: "Captain approved and OTP generated" });
  } catch (err) {
    console.error("Approve captain error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Reject captain
router.post("/captain/:id/reject", adminAuth, async (req, res) => {
  try {
    const captain = await User.findById(req.params.id);
    if (!captain) return res.status(404).json({ message: "Captain not found" });

    captain.approvalStatus = "rejected";
    await captain.save();
    res.json({ message: "Captain rejected" });
  } catch (err) {
    console.error("Reject captain error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 All rides
router.get("/rides", adminAuth, async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate("riderId", "fullName")
      .populate("captainId", "fullName")
      .sort({ createdAt: -1 });

    res.json({ rides });
  } catch (err) {
    console.error("Get rides error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
