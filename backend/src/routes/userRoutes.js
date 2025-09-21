const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ Get all normal users (exclude riders/admins)
router.get("/all", authMiddleware, async (req, res) => {
  try {
    // 🔹 Allow only admin to fetch users
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const users = await User.find({ role: "user" }).select(
      "-otp -otpExpires -__v"
    );

    res.json({ success: true, users });
  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

module.exports = router;
