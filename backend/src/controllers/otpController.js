// backend/src/controllers/otpController.js
const Otp = require("../models/Otp");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Utility: generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// 🔹 Send OTP
exports.send = async (req, res) => {
  try {
    const { mobile, role } = req.body;

    if (!mobile || !role) {
      return res.status(400).json({ success: false, message: "Mobile and role required" });
    }

    // ✅ Find user (User model handles both riders and normal users)
    const user = await User.findOne({ mobile, role });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // ✅ Rider approval check
    if (role === "rider" && user.approvalStatus !== "approved") {
      return res.status(403).json({ success: false, message: "Rider not approved yet" });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // expires in 5 minutes

    // ✅ Upsert OTP record
    const otpRecord = await Otp.findOneAndUpdate(
      { mobile, role },
      { otp, userId: user._id, otpExpires },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`📲 OTP for ${role} (${mobile}): ${otp}`);

    res.json({ success: true, message: "OTP sent successfully", otpRecord });
  } catch (err) {
    console.error("❌ OTP Send Error:", err);
    res.status(500).json({ success: false, message: "Server error sending OTP" });
  }
};

// 🔹 Verify OTP
exports.verify = async (req, res) => {
  try {
    const { mobile, otp, role } = req.body;

    if (!mobile || !otp || !role) {
      return res.status(400).json({ success: false, message: "Mobile, OTP, and role required" });
    }

    // ✅ Check OTP record
    const record = await Otp.findOne({ mobile, role });
    if (!record) return res.status(400).json({ success: false, message: "OTP not found. Please request again." });

    if (record.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });
    if (record.otpExpires && record.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // ✅ Find user
    const user = await User.findOne({ mobile, role });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // ✅ Increment loginCount
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // ✅ Sign JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secretkey", { expiresIn: "7d" });

    console.log(`✅ OTP verified, token issued, loginCount: ${user.loginCount}`);
    res.json({ success: true, token, user, otpRecord: record });
  } catch (err) {
    console.error("❌ OTP Verify Error:", err);
    res.status(500).json({ success: false, message: "Server error verifying OTP" });
  }
};
