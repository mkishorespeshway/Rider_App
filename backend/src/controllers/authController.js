const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// ==================== User ====================
exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, mobile } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "Email already registered" });

    const user = new User({ fullName, email, mobile, role: "user" });
    await user.save();

    res.json({ success: true, message: "Registration successful! Please wait for admin approval." });
  } catch (err) {
    console.error("User register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, mobile } = req.body;
    const user = await User.findOne({ email, mobile, role: "user" });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.json({ success: true, token });
  } catch (err) {
    console.error("User login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== Rider ====================
exports.registerRider = async (req, res) => {
  try {
    const { fullName, email, mobile } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "Email already registered" });

    const rider = new User({ fullName, email, mobile, role: "rider", approvalStatus: "pending" });
    await rider.save();

    res.json({ success: true, message: "Rider registered successfully! Please wait for admin approval." });
  } catch (err) {
    console.error("Rider register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.loginRider = async (req, res) => {
  try {
    const { email, mobile } = req.body;
    const rider = await User.findOne({ email, mobile, role: "rider", approvalStatus: "approved" });
    if (!rider) return res.status(401).json({ success: false, message: "Invalid credentials or not approved yet" });

    const token = jwt.sign({ id: rider._id, role: "rider" }, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.json({ success: true, token });
  } catch (err) {
    console.error("Rider login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== Admin ====================
exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // static credentials
    if (username === "admin" && password === "admin123") {
      const token = jwt.sign({ id: "admin-001", username, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "12h" });
      return res.json({ success: true, token });
    } else {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
