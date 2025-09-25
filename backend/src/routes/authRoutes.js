const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();
const multer = require("multer");
const bcrypt = require("bcrypt"); 
const { uploadBufferToCloudinary } = require("../controllers/authController"); 

// ================== HELPER ==================
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "supersecretkey",
    { expiresIn: "12h" }
  );
};

const buildUserResponse = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  mobile: user.mobile,
  role: user.role,
  approvalStatus: user.approvalStatus || undefined,
});

// ================== USER SIGNUP ==================
router.post("/signup-user", async (req, res) => {
  try {
    const { fullName, email, mobile } = req.body; // removed password

    if (!fullName || !email || !mobile) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await User.findOne({ mobile, role: "user" });
    if (existing) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const user = new User({
      fullName,
      email,
      mobile,
      role: "user",
    });

    await user.save();
    const token = generateToken(user);

    res.json({
      success: true,
      token,
      role: "user",
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error("Signup user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================== USER LOGIN ==================
router.post("/login-user", async (req, res) => {
  try {
    const { mobile } = req.body; // password not used at login for user

    const user = await User.findOne({ mobile, role: "user" });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      role: "user",
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error("Login user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================== RIDER SIGNUP ==================
router.post(
  "/signup-rider",
  multer().fields([
    { name: "aadharFront", maxCount: 1 },
    { name: "aadharBack", maxCount: 1 },
    { name: "license", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "rc", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { fullName, email, mobile } = req.body;
      const files = req.files || {};

      if (!fullName || !email || !mobile) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      const existing = await User.findOne({ mobile, role: "rider" });
      if (existing) return res.status(400).json({ success: false, message: "Rider already exists" });

      const fields = [
        { key: "aadharFront", name: "Aadhar Front" },
        { key: "aadharBack", name: "Aadhar Back" },
        { key: "license", name: "License" },
        { key: "panCard", name: "PAN Card" },
        { key: "rc", name: "RC" },
      ];

      const documents = [];
      for (const f of fields) {
        if (files[f.key] && files[f.key][0]) {
          try {
            const url = await uploadBufferToCloudinary(files[f.key][0].buffer);
            documents.push({ name: f.name, url });
          } catch (err) {
            console.error(`Cloudinary upload failed for ${f.key}:`, err);
          }
        }
      }

      const rider = new User({
        fullName,
        email,
        mobile,
        role: "rider",
        approvalStatus: "pending",
        documents,
      });

      await rider.save();
      const token = generateToken(rider);

      res.json({
        success: true,
        token,
        role: "rider",
        user: buildUserResponse(rider),
      });
    } catch (err) {
      console.error("Signup rider error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// ================== RIDER LOGIN ==================
router.post("/login-rider", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const rider = await User.findOne({ mobile, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    if (rider.approvalStatus !== "approved") {
      return res.status(403).json({ success: false, message: "Account not approved yet" });
    }

    const validPassword = await bcrypt.compare(password, rider.password);
    if (!validPassword) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(rider);

    res.json({
      success: true,
      token,
      role: "rider",
      user: buildUserResponse(rider),
    });
  } catch (err) {
    console.error("Login rider error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
