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
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number" });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please register first.",
      });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + OTP_TTL_MS);

    // store OTP in DB
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // try to send via provider
    const result = await sendOtpUtil(mobile, otp);

    // always log OTP for dev
    console.log(
      `📌 OTP for +91${mobile}: ${otp} (expires ${otpExpires.toISOString()})`
    );

    if (!result.ok) {
      if (result.error === "Twilio not configured") {
        return res.status(500).json({
          success: false,
          message: "SMS provider not configured. Check TWILIO_ env variables.",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. See server logs for details.",
      });
    }

    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ OTP send error:", err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Try again later." });
  }
}

// 🔹 POST /api/otp/verify
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
      // clear expired otp
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // OTP valid → update login metadata
    user.otp = otp; // ✅ keep OTP stored in DB as you asked
    user.otpExpires = null;
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // Create JWT
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
      `✅ OTP verified for +91${mobile}. User ${user._id} logged in via OTP.`
    );
//cosole
    return res.status(200).json({
      success: true,
      data: { user, token },
      message: "Login successful (OTP)",
    });
    //task
    
  } catch (err) {
    console.error("❌ OTP verify error:", err.message || err);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Try again later." });
  }
}

// ✅ Proper exports
module.exports = { send, verify };
