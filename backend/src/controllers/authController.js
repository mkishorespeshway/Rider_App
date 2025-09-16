// backend/src/controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// 🔹 Signup controller
exports.signup = async (req, res) => {
  try {
    const { fullName, email, mobile, role } = req.body;

    if (!fullName || !email || !mobile || !role) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (!["user", "rider"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        errorField: "mobile",
        message: "Mobile number already registered",
      });
    }

    const newUser = new User({ fullName, email, mobile, role });
    await newUser.save();

    console.log("✅ New user signed up:", newUser.mobile, newUser.role);

    return res.status(201).json({
      success: true,
      data: { id: newUser._id, role: newUser.role },
      message: "Signup successful",
    });
  } catch (err) {
    console.error("❌ Signup error:", err.message || err);
    if (err.code === 11000 && err.keyValue?.mobile) {
      return res.status(400).json({
        success: false,
        errorField: "mobile",
        message: "Mobile number already registered",
      });
    }
    return res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};

// 🔹 Login controller (used only if OTP not required)
exports.login = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const token = jwt.sign(
      { id: user._id, fullName: user.fullName, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ Login successful for ${mobile} (${user.role})`);

    return res.status(200).json({
      success: true,
      data: { token, role: user.role },
      message: "Login successful",
    });
  } catch (err) {
    console.error("❌ Login error:", err.message || err);
    return res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};
  