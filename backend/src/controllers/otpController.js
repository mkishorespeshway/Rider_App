const Otp = require("../models/Otp");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const generateOtp = () =>

  
  Math.floor(100000 + Math.random() * 900000).toString();

// 🔹 Send OTP
exports.send = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile is required" });
    }
    // If DB is offline, short-circuit with mock OTP for development
    if (mongoose.connection.readyState !== 1) {
      const otp = generateOtp();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      const tempUserId = new mongoose.Types.ObjectId();
      const requestedRole = (req.body && req.body.role) || "user";
      console.log(`📲 [DEV] OTP for ${mobile}: ${otp} (DB offline, role=${requestedRole})`);
      return res.json({
        success: true,
        message: "OTP sent (mock, DB offline)",
        otpRecord: {
          mobile,
          otp,
          userId: tempUserId,
          role: requestedRole,
          otpExpires,
          mock: true,
        },
      });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.role === "rider" && user.approvalStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Rider account not approved yet",
      });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const otpRecord = await Otp.findOneAndUpdate(
      { mobile },
      { otp, userId: user._id, role: user.role, otpExpires },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`📲 OTP for ${mobile}: ${otp}`);
    res.json({ success: true, message: "OTP sent successfully", otpRecord });
  } catch (err) {
    console.error("❌ OTP Send Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error sending OTP" });
  }
};

// 🔹 Verify OTP
exports.verify = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile and OTP required" });
    }
    // If DB is offline, accept OTP in dev and issue a mock token
    if (mongoose.connection.readyState !== 1) {
      const requestedRole = (req.body && req.body.role) || "user";
      const tempUserId = new mongoose.Types.ObjectId();
      const token = jwt.sign(
        { id: tempUserId, role: requestedRole },
        process.env.JWT_SECRET || "supersecretkey",
        { expiresIn: "7d" }
      );
      console.log(`✅ [DEV] OTP verified for ${mobile} (DB offline, role=${requestedRole})`);
      return res.json({
        success: true,
        token,
        user: {
          _id: tempUserId,
          fullName: requestedRole === "rider" ? "Dev Rider" : "Dev User",
          mobile,
          email: `${mobile}@example.local`,
          role: requestedRole,
          approvalStatus: "approved",
        },
      });
    }

    const record = await Otp.findOne({ mobile });
    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request again.",
      });
    }

    if (record.otp !== otp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });
    }

    if (record.otpExpires && record.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "7d" }
    );

    console.log(
      `✅ OTP verified for ${mobile}, role: ${user.role}, loginCount: ${user.loginCount}`
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (err) {
    console.error("❌ OTP Verify Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error verifying OTP" });
  }
};

