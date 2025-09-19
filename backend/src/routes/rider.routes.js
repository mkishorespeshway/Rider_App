const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// 📂 Multer storage for docs
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.fieldname + path.extname(file.originalname)),
});
const upload = multer({ storage });

// 🔹 Upload docs (no auth, just riderId)
router.post("/upload-docs/:riderId", upload.fields([
  { name: "aadharFront", maxCount: 1 },
  { name: "aadharBack", maxCount: 1 },
  { name: "license", maxCount: 1 },
]), async (req, res) => {
  try {
    const rider = await User.findById(req.params.riderId);
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    rider.documents = {
      aadharFront: req.files["aadharFront"]?.[0]?.filename || null,
      aadharBack: req.files["aadharBack"]?.[0]?.filename || null,
      license: req.files["license"]?.[0]?.filename || null,
    };
    rider.approvalStatus = "pending";

    await rider.save();
    res.json({ success: true, message: "Documents uploaded, waiting for approval" });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, message: "Error uploading documents" });
  }
});

module.exports = router;
