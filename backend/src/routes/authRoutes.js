const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

// ================== HELPER ==================
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "supersecretkey",
    { expiresIn: "12h" }
  );
};

const buildUserResponse = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  mobile: user.mobile,
  role: user.role,
  approvalStatus: user.approvalStatus || undefined, // only for riders
});

// ================== USER SIGNUP ==================
router.post("/signup-user", async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;

    let existing = await User.findOne({ mobile, role: "user" });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const user = new User({
      fullName,
      email,
      mobile,
      password,
      role: "user",
    });

    await user.save();
    const token = generateToken(user);

    res.json({
      success: true,
      token,
      role: "user",          // ✅ always include
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error("Signup user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================== USER LOGIN ==================
router.post("/login-user", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const user = await User.findOne({ mobile, role: "user" });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.password !== password) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      role: "user",          // ✅ always include
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error("Login user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================== RIDER SIGNUP ==================
router.post("/signup-rider", async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;

    let existing = await User.findOne({ mobile, role: "rider" });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Rider already exists" });
    }

    const rider = new User({
      fullName,
      email,
      mobile,
      password,
      role: "rider",
      approvalStatus: "pending",
    });

    await rider.save();
    const token = generateToken(rider);

    res.json({
      success: true,
      token,
      role: "rider",        // ✅ always include
      user: buildUserResponse(rider),
    });
  } catch (err) {
    console.error("Signup rider error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================== RIDER LOGIN ==================
router.post("/login-rider", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const rider = await User.findOne({ mobile, role: "rider" });
    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    if (rider.password !== password) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(rider);

    res.json({
      success: true,
      token,
      role: "rider",        // ✅ always include
      user: buildUserResponse(rider),
    });
  } catch (err) {
    console.error("Login rider error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
