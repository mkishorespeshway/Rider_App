const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

<<<<<<< HEAD
function generateToken(user) {
  return jwt.sign(
    { id: user._id, fullName: user.fullName, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// 🔹 USER Signup
exports.signupUser = async (req, res) => {
  try {
    const { fullName, email, mobile } = req.body;
    if (!fullName || !email || !mobile) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if mobile OR email already registered
    const existing = await User.findOne({ $or: [{ mobile }, { email }] });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email or Mobile already registered" });
    }

    const newUser = new User({
      fullName,
      email,
      mobile,
      role: "user",
      approvalStatus: "approved", // users don’t need approval
    });
    await newUser.save();

    console.log("✅ User signed up:", newUser.mobile);

    return res.status(201).json({
      success: true,
      data: { id: newUser._id, role: newUser.role },
      message: "User signup successful",
    });
  } catch (err) {
    console.error("❌ signupUser error:", err);

    // Catch duplicate key errors from Mongo
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ success: false, message: `${field} already registered` });
    }

=======
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
>>>>>>> aced6b199b083cb320663ecabeb739aba4129a5a
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

<<<<<<< HEAD
// 🔹 RIDER Signup
exports.signupRider = async (req, res) => {
  try {
    const { fullName, email, mobile } = req.body;
    if (!fullName || !email || !mobile) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await User.findOne({ $or: [{ mobile }, { email }] });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email or Mobile already registered" });
    }

    const newRider = new User({
      fullName,
      email,
      mobile,
      role: "rider",
      approvalStatus: "pending", // must be approved by admin
    });
    await newRider.save();

    console.log("✅ Rider signed up:", newRider.mobile);

    return res.status(201).json({
      success: true,
      data: { id: newRider._id, role: newRider.role },
      message: "Rider signup successful (pending approval)",
    });
  } catch (err) {
    console.error("❌ signupRider error:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ success: false, message: `${field} already registered` });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🔹 USER Login
exports.loginUser = async (req, res) => {
  try {
    const { mobile } = req.body;
    const user = await User.findOne({ mobile, role: "user" });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const token = generateToken(user);
    console.log(`✅ User login: ${mobile}`);
    return res.status(200).json({ success: true, data: { token, role: user.role } });
  } catch (err) {
    console.error("❌ loginUser error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🔹 RIDER Login
exports.loginRider = async (req, res) => {
  try {
    const { mobile } = req.body;
    const rider = await User.findOne({ mobile, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    if (rider.approvalStatus === "pending") {
      return res.status(403).json({ success: false, message: "Account pending approval" });
    }

    const token = generateToken(rider);
    console.log(`✅ Rider login: ${mobile}`);
    return res.status(200).json({ success: true, data: { token, role: rider.role } });
  } catch (err) {
    console.error("❌ loginRider error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
=======
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
>>>>>>> aced6b199b083cb320663ecabeb739aba4129a5a
