// backend/src/controllers/otpController.js
const User = require("../models/User");

// Send OTP
exports.send = async (req, res) => {
  const { mobile, role } = req.body;

  try {
    const user = await User.findOne({ mobile, role });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // Rider must be approved by admin
    if (role === "rider" && user.approvalStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Account pending admin approval. Please wait.",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP and expiration in DB
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    console.log(`📲 OTP for ${mobile} (${role}): ${otp}`);

    res.json({ success: true, message: "OTP sent successfully", otp });
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Verify OTP
exports.verify = async (req, res) => {
  const { mobile, otp, role } = req.body;

  try {
    const user = await User.findOne({ mobile, role });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (!user.otp || user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Clear OTP and update login info
    user.otp = null;
    user.otpExpires = null;
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLogin = new Date();
    await user.save();

    const { otp: _, otpExpires: __, ...userSafe } = user.toObject(); // Remove OTP fields
    res.json({ success: true, message: "OTP verified successfully", user: userSafe });
  } catch (err) {
    console.error("❌ Error verifying OTP:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
