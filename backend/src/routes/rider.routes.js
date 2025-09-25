// backend/src/routes/rider.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/authMiddleware");

// Uploads folder
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup - memory storage for Cloudinary upload
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Only PNG, JPEG, PDF allowed"));
    cb(null, true);
  },
});


// Signup (rider)
router.post(
  "/signup",
  upload.fields([
    { name: "aadharFront", maxCount: 1 },
    { name: "aadharBack", maxCount: 1 },
    { name: "license", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "rc", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { fullName, email, mobile, role } = req.body;

      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ success: false, message: "Rider already exists" });

      const files = req.files || {};
     const documents = {};

      Object.keys(files).forEach((key) => {
      documents[key] = {
      url: `/uploads/${files[key][0].filename}`, // relative path to serve later
      mimetype: files[key][0].mimetype,
      size: files[key][0].size,
      filename: files[key][0].filename,
      };
      });


      const rider = new User({
        fullName,
        email,
        mobile,
        role: role || "rider",
        loginCount: 0,
        approvalStatus: "pending",
        documents,
      });

      await rider.save();

      res.json({ success: true, message: "Rider registered successfully. Please wait for admin approval.", rider });
    } catch (err) {
      console.error("❌ Rider signup error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Check approval (public)
router.get("/check-approval", async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) return res.status(400).json({ approved: false, message: "Mobile number required" });

    const rider = await User.findOne({ mobile, role: "rider" });
    if (!rider) return res.status(404).json({ approved: false, message: "Rider not found" });

    return res.json({ approved: rider.approvalStatus === "approved" });
  } catch (err) {
    console.error("❌ Check approval error:", err);
    res.status(500).json({ approved: false, message: "Server error" });
  }
});

// Protected status (Dashboard)
router.get("/status", authMiddleware, async (req, res) => {
  try {
    // req.user was attached by authMiddleware
    const rider = await User.findById(req.user._id).select("-password");
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });
    res.json({ success: true, user: rider });
  } catch (err) {
    console.error("❌ Rider status error:", err);
    res.status(500).json({ success: false, message: "Server error fetching rider status" });
  }
});

module.exports = router;
