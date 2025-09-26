// backend/src/routes/rider.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const cloudinary = require("cloudinary").v2;

// Cloudinary config (keys must be in .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Only PNG, JPEG, PDF allowed"));
    cb(null, true);
  },
});

// helper: upload buffer to cloudinary
const uploadToCloudinary = (fileBuffer, folder, mimetype) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(fileBuffer); // push buffer to Cloudinary
  });
};

// Rider signup
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
      if (existing) {
        return res.status(400).json({ success: false, message: "Rider already exists" });
      }

      const files = req.files || {};
      const documents = {};

      // upload each provided doc to Cloudinary
      for (const key of Object.keys(files)) {
        const file = files[key][0];
        const result = await uploadToCloudinary(file.buffer, "rider_docs", file.mimetype);

        documents[key] = {
          url: result.secure_url,
          mimetype: file.mimetype,
          public_id: result.public_id,
        };
      }

      const rider = new User({
        fullName,
        email,
        mobile,
        role: role || "rider",
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
      console.error("❌ Rider signup error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);
// ✅ Check rider approval by mobile number (no auth needed)
router.get("/check-approval/:mobile", async (req, res) => {
  try {
    const { mobile } = req.params; // get mobile from route param
    const rider = await User.findOne({ mobile, role: "rider" });

    if (!rider) {
      return res.status(404).json({ approved: false, message: "Rider not found" });
    }

    res.json({ approved: rider.approvalStatus === "approved" });
  } catch (err) {
    console.error("Check rider approval error:", err);
    res.status(500).json({ approved: false, message: "Server error" });
  }
});

// ✅ Added Rider Status Route
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });
    res.json({ success: true, rider });
  } catch (err) {
    console.error("❌ Fetch rider status error:", err);
    res.status(500).json({ success: false, message: "Server error fetching rider status" });
  }
});

module.exports = router;
