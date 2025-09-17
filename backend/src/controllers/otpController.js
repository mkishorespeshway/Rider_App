// backend/src/controllers/otpController.js
const mongoose = require("mongoose");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const sendOtpUtil = require("../utils/sendOtp");
require("dotenv").config();
 
const OTP_TTL_MS =
  parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10) * 60 * 1000; // configurable
 
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
 
// POST /api/otp/send
async function send(req, res) {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number" });
    }
 
    const user = await User.findOne({ mobile });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found. Please register first." });
    }
 
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + OTP_TTL_MS);
 
    let saveErr = null;
    try {
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
      console.log(`✅ user.save() succeeded for mobile=${mobile}`);
    } catch (err) {
      saveErr = err;
      console.error("❌ user.save() failed:", err?.message || err);
    }
 
    let afterSave = await User.findOne({ mobile }).lean();
    console.log("📝 After save (first read):", {
      _id: afterSave?._id,
      mobile: afterSave?.mobile,
      otp: afterSave?.otp,
      otpExpires: afterSave?.otpExpires,
      dbName: mongoose.connection && mongoose.connection.name,
    });
 
    if (!afterSave || String(afterSave.otp) !== String(otp)) {
      console.warn("⚠️ OTP not found after save; performing forced updateOne()");
      const upd = await User.updateOne({ mobile }, { $set: { otp, otpExpires } });
      console.log("🔁 updateOne result:", upd);
      afterSave = await User.findOne({ mobile }).lean();
      console.log("📝 After forced update (second read):", {
        _id: afterSave?._id,
        mobile: afterSave?.mobile,
        otp: afterSave?.otp,
        otpExpires: afterSave?.otpExpires,
      });
    }
 
    const result = await sendOtpUtil(mobile, otp);
    if (!result || !result.ok) {
      console.error(
        "Twilio/sendOtpUtil error (logged but not blocking):",
        result?.error || result
      );
      return res.status(200).json({
        success: true,
        message: "OTP generated & stored. SMS provider failed — check server logs.",
      });
    }
 
    console.log(`📩 OTP sent via provider for +91${mobile}`);
    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ OTP send error:", err?.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Try again later." });
  }
}
 
// POST /api/otp/verify
async function verify(req, res) {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile and OTP are required" });
    }
 
    const user = await User.findOne({ mobile });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found. Please register first." });
    }
 
    if (!user.otp || !user.otpExpires) {
      return res
        .status(400)
        .json({ success: false, message: "OTP not sent or expired" });
    }
 
    if (new Date() > user.otpExpires) {
      // expired → keep OTP in DB for record, only mark it expired
      return res.status(400).json({ success: false, message: "OTP expired" });
    }
 
    if (String(user.otp) !== String(otp)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });
    }
 
    // ✅ OTP valid → update metadata but DO NOT clear OTP
    await User.updateOne(
      { mobile },
      { $set: { lastLogin: new Date() }, $inc: { loginCount: 1 } }
    );
 
    const token = jwt.sign(
      {
        id: user._id,
        fullName: user.fullName,
        role: user.role,
        mobile: user.mobile,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
 
    console.log(
      `✅ OTP verified for +91${mobile}. User ${user._id}, role=${user.role}`
    );
 
    return res.status(200).json({
      success: true,
      data: { token, role: user.role },
      message: "Login successful (OTP)",
    });
  } catch (err) {
    console.error("❌ OTP verify error:", err?.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Try again later." });
  }
}
 
module.exports = { send, verify };