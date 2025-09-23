// backend/src/controllers/otpController.js
const Otp = require("../models/Otp");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Utility: generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.send = async (req, res) => {
  try {
    const { mobile, role } = req.body;
    console.log("➡️ /api/otp/send body:", req.body);

    if (!mobile || !role) {
      return res.status(400).json({ success: false, message: "Mobile and role required" });
    }

    const user = await User.findOne({ mobile, role });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otp = generateOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const upsert = await Otp.findOneAndUpdate(
      { mobile, role },
      { otp, userId: user._id, otpExpires: expires },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`📲 OTP for ${role} (${mobile}): ${otp} — record id: ${upsert._id}`);

    // TODO: integrate SMS provider here. For now we return success (server logs OTP)
    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ OTP Send Error:", err);
    res.status(500).json({ success: false, message: "Server error sending OTP" });
  }
};

exports.verify = async (req, res) => {
  try {
    const { mobile, otp, role } = req.body;
    console.log("➡️ /api/otp/verify body:", req.body);

    if (!mobile || !otp || !role) {
      return res.status(400).json({ success: false, message: "Mobile, OTP, and role required" });
    }

    const record = await Otp.findOne({ mobile, role });
    if (!record) {
      return res.status(400).json({ success: false, message: "OTP not found. Please request again." });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (record.otpExpires && record.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const user = await User.findOne({ mobile, role });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Sign token with `id` (middleware expects decoded.id)
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secretkey", { expiresIn: "7d" });

    // Remove OTP after success
    await Otp.deleteOne({ mobile, role });

    console.log("✅ /api/otp/verify success for", mobile, "token issued");
    res.json({ success: true, token, user });
  } catch (err) {
    console.error("❌ OTP Verify Error:", err);
    res.status(500).json({ success: false, message: "Server error verifying OTP" });
  }
};
