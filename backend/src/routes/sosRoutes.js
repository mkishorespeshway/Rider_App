const express = require("express");
const router = express.Router();
const SOS = require("../models/SOS");

// 🔹 User or Rider sends an SOS alert
router.post("/", async (req, res) => {
  try {
    const { role, id } = req.body;

    if (!role || !id) {
      return res.status(400).json({ success: false, message: "role and id are required" });
    }

    const sos = await SOS.create({
      userId: id,
      role,
      status: "active",
    });

    res.json({ success: true, message: "SOS alert created", data: sos });
  } catch (err) {
    console.error("SOS create error:", err);
    res.status(500).json({ success: false, message: "Failed to create SOS alert" });
  }
});

module.exports = router;
