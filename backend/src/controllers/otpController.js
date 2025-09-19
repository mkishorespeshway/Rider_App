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
