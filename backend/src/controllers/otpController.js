<<<<<<< HEAD
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// 🔹 Send OTP
exports.send = async (req, res) => {
  try {
    const { mobile, role } = req.body;

    if (!mobile || !role) {
      return res.status(400).json({ success: false, message: "Mobile and role are required" });
    }

    const user = await User.findOne({ mobile, role });
    if (!user) {
      return res.status(404).json({ success: false, message: `No ${role} account found for this mobile` });
    }

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    console.log(`📲 OTP for ${mobile} (${role}): ${otp}`);

    return res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ OTP Send Error:", err);
    res.status(500).json({ success: false, message: "Server error while sending OTP" });
  }
};

// 🔹 Verify OTP
exports.verify = async (req, res) => {
  try {
    const { mobile, otp, role } = req.body;

    if (!mobile || !otp || !role) {
      return res.status(400).json({ success: false, message: "Mobile, OTP, and role are required" });
    }

    const user = await User.findOne({ mobile, role });
    if (!user) {
      return res.status(404).json({ success: false, message: `No ${role} account found` });
    }

    // check OTP
    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // Rider-specific approval check
    if (role === "rider" && user.approvalStatus === "pending") {
      return res.status(403).json({ success: false, message: "Rider account pending admin approval" });
    }
    if (role === "rider" && user.approvalStatus === "rejected") {
      return res.status(403).json({ success: false, message: "Rider account has been rejected" });
    }

    // ✅ Generate token
    const token = jwt.sign(
      { id: user._id, fullName: user.fullName, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // reset OTP so it can’t be reused
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    console.log(`✅ ${role} login successful: ${mobile}`);

    return res.json({
      success: true,
      data: { token, role: user.role },
      message: "Login successful",
    });
  } catch (err) {
    console.error("❌ OTP Verify Error:", err);
    res.status(500).json({ success: false, message: "Server error while verifying OTP" });
  }
};
=======
const mongoose = require("mongoose");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const sendOtpUtil = require("../utils/sendOtp");
require("dotenv").config();

const OTP_TTL_MS = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10) * 60 * 1000;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 🔹 Send OTP
async function send(req, res) {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number" });
    }

    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + OTP_TTL_MS);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Optional: send OTP via SMS provider
    const result = await sendOtpUtil(mobile, otp);
    console.log(`OTP for ${mobile}: ${otp}`, result?.ok ? "Sent" : "Failed");

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// 🔹 Verify OTP
async function verify(req, res) {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ success: false, message: "Mobile & OTP required" });

    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.otp || !user.otpExpires) return res.status(400).json({ success: false, message: "OTP not sent or expired" });
    if (new Date() > user.otpExpires) return res.status(400).json({ success: false, message: "OTP expired" });
    if (String(user.otp) !== String(otp)) return res.status(400).json({ success: false, message: "Invalid OTP" });

    // Update login metadata
    await User.updateOne({ mobile }, { $set: { lastLogin: new Date() }, $inc: { loginCount: 1 } });

    const token = jwt.sign({ id: user._id, fullName: user.fullName, role: user.role, mobile: user.mobile }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.status(200).json({ success: true, data: { token, role: user.role }, message: "Login successful (OTP)" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { send, verify };
>>>>>>> aced6b199b083cb320663ecabeb739aba4129a5a
