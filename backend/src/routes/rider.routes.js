const express = require("express");
const router = express.Router();
const multer = require("multer");
const User = require("../models/User");
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

// Upload Rider documents
router.post("/upload-docs/:id", upload.array("documents", 5), async (req, res) => {
  try {
    const riderId = req.params.id;
    const files = req.files;

    if (!files || files.length === 0)
      return res.status(400).json({ success: false, message: "No documents uploaded" });

    const fileData = files.map(f => ({
      filename: f.filename,
      path: f.path,
      mimetype: f.mimetype,
      size: f.size,
    }));

    const rider = await User.findByIdAndUpdate(
      riderId,
      { $push: { documents: { $each: fileData } } },
      { new: true }
    );

    return res.json({ success: true, message: "Documents uploaded successfully", documents: rider.documents });
  } catch (err) {
    console.error(err);
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
