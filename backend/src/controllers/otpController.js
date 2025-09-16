// backend/src/controllers/otpController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const sendOtpUtil = require("../utils/sendOtp");
require("dotenv").config();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 🔹 POST /api/otp/send
async function send(req, res) {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number" });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found. Please register first." });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + OTP_TTL_MS);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const result = await sendOtpUtil(mobile, otp);

    console.log(`📌 OTP for +91${mobile}: ${otp} (expires ${otpExpires.toISOString()})`);

    if (!result.ok) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Check SMS provider config.",
      });
    }

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ OTP send error:", err.message || err);
    return res.status(500).json({ success: false, message: "Server error. Try again later." });
  }
}

// 🔹 POST /api/otp/verify
async function verify(req, res) {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: "Mobile and OTP are required" });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found. Please register first." });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ success: false, message: "OTP not sent or expired" });
    }

    if (new Date() > user.otpExpires) {
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // ✅ OTP verified
    user.otp = null;
    user.otpExpires = null;
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const token = jwt.sign(
      { id: user._id, fullName: user.fullName, role: user.role, mobile: user.mobile },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ OTP verified for ${mobile}. Role: ${user.role}`);

    return res.status(200).json({
      success: true,
      data: { token, role: user.role },
      message: "Login successful (OTP)",
    });
  } catch (err) {
    console.error("❌ OTP verify error:", err.message || err);
    return res.status(500).json({ success: false, message: "Server error. Try again later." });
  }
}

module.exports = { send, verify };
