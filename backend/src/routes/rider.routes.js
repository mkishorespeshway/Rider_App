// routes/riderRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const User = require("../models/User"); // your Rider/User model
const fs = require("fs");
const path = require("path");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Only PNG, JPEG, PDF allowed"));
    cb(null, true);
  },
});

// ================= Rider Signup + Upload Documents =================
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

      // Check if rider already exists
      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ success: false, message: "Rider already exists" });

      const files = req.files;

      // Map files to MongoDB documents array
      const documents = Object.keys(files || {}).map(key => ({
        type: key,
        filename: files[key][0].filename,
        path: files[key][0].path,
        mimetype: files[key][0].mimetype,
        size: files[key][0].size,
      }));

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

      res.json({
        success: true,
        message: "Rider registered successfully. Please wait for admin approval.",
        rider,
      });
    } catch (err) {
      console.error(err);
      if (err instanceof multer.MulterError)
        return res.status(400).json({ success: false, message: err.message });
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// ================= Check Rider Approval =================
router.get("/check-approval", async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) return res.status(400).json({ approved: false, message: "Mobile number required" });

    const rider = await User.findOne({ mobile, role: "rider" });
    if (!rider) return res.status(404).json({ approved: false, message: "Rider not found" });

    return res.json({ approved: rider.approvalStatus === "approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ approved: false, message: "Server error" });
  }
});

module.exports = router;
