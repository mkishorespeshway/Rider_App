const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Ride = require("../models/Ride");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ Admin login (static credentials)
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    const token = jwt.sign(
      { id: "admin-id-001", username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );
    return res.json({ success: true, token, role: "admin" });
  }

  return res.status(401).json({ success: false, message: "Invalid admin credentials" });
});

// ✅ Overview counts
router.get("/overview", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const [users, riders, captains, pendingCaptains, rides] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "rider" }),
      User.countDocuments({ role: "rider", approvalStatus: "approved" }),
      User.countDocuments({ role: "rider", approvalStatus: "pending" }),
      Ride.countDocuments(),
    ]);

    res.json({ users, riders, captains, pendingCaptains, rides });
  } catch (err) {
    console.error("Overview error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get all users
router.get("/users", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const users = await User.find({ role: "user" }).select("-otp -otpExpires");
    res.json({ users });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Approved captains
router.get("/captains", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const captains = await User.find({ role: "rider", approvalStatus: "approved" });
    res.json({ captains });
  } catch (err) {
    console.error("Get captains error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Pending captains
router.get("/pending-captains", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const pendingCaptains = await User.find({ role: "rider", approvalStatus: "pending" });
    res.json({ pendingCaptains });
  } catch (err) {
    console.error("Get pending captains error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Approve captain
router.post("/captain/:id/approve", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

    const captain = await User.findById(req.params.id);
    if (!captain) return res.status(404).json({ message: "Captain not found" });

    captain.approvalStatus = "approved";
    await captain.save();
    res.json({ message: "Captain approved" });
  } catch (err) {
    console.error("Approve captain error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Reject captain
router.post("/captain/:id/reject", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

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

// ✅ All rides
router.get("/rides", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });

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
