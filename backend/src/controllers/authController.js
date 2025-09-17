const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// 🔹 Signup
const signup = async (req, res) => {
  try {
    const { fullName, mobile, email, role } = req.body;
    if (!fullName || !mobile) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const exists = await User.findOne({ mobile });
    if (exists) return res.status(400).json({ success: false, message: "User already exists" });

    const newUser = await User.create({ fullName, mobile, email, role });
    return res.status(201).json({ success: true, data: newUser });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🔹 Login (basic JWT without OTP)
const login = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, message: "Mobile required" });

    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.status(200).json({ success: true, data: { token, role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { signup, login };
