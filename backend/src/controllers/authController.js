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

    // ✅ Only check mobile uniqueness
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

    console.log("✅ New user signed up:", newUser.mobile);

    return res.status(201).json({
      success: true,
      data: newUser,
      message: "Signup successful",
    });
  } catch (err) {
    console.error("❌ Signup error:", err.message || err);

    // Handle Mongo duplicate key error
    if (err.code === 11000 && err.keyValue?.mobile) {
      return res.status(400).json({
        success: false,
        errorField: "mobile",
        message: "Mobile number already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// 🔹 Login controller (OTP verified earlier)
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

    // 🔹 Issue JWT (valid for 7 days)
    const token = jwt.sign(
      { id: user._id, fullName: user.fullName, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ Login successful for ${mobile}`);

    return res.status(200).json({
      success: true,
      data: { user, token },
      message: "Login successful",
    });
  } catch (err) {
    console.error("❌ Login error:", err.message || err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
