const express = require("express");
const router = express.Router();
const User = require("../models/User");

// ✅ Get all riders (only admin)
router.get("/riders", async (req, res) => {
  try {
    const riders = await User.find({ role: "rider" }).select("-otp -otpExpires");
    res.json({ success: true, riders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching riders" });
  }
});

// ✅ Approve rider
router.post("/approve/:id", async (req, res) => {
  try {
    const rider = await User.findById(req.params.id);
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    rider.approvalStatus = "approved";
    await rider.save();

    res.json({ success: true, message: "Rider approved" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error approving rider" });
  }
});

// ✅ Reject rider
router.post("/reject/:id", async (req, res) => {
  try {
    const rider = await User.findById(req.params.id);
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    rider.approvalStatus = "rejected";
    await rider.save();

    res.json({ success: true, message: "Rider rejected" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error rejecting rider" });
  }
});

module.exports = router;
