const express = require("express");
const router = express.Router();
const Parcel = require("../models/Parcel");
const mongoose = require("mongoose");

// 📦 Create a parcel request
router.post("/", async (req, res) => {
  try {
    console.log("📥 Parcel API received:", req.body);
    console.log("📂 Using DB:", mongoose.connection.name);

    const parcel = new Parcel(req.body);
    await parcel.save();
    console.log("✅ Parcel saved with _id:", parcel._id);

    // 👉 Simulated rider assignment
    const dummyRider = {
      name: "Rahul Kumar",
      phone: "9876543210",
      vehicle: {
        type: "Bike",
        model: "Honda Activa",
        plate: "TS09AB1234",
      },
    };

    res.status(201).json({
      success: true,
      message: "Parcel created, searching for rider",
      parcel,
      rider: dummyRider,
    });
  } catch (err) {
    console.error("❌ Parcel save error:", err.message);
    res.status(500).json({ success: false, error: "Failed to create parcel" });
  }
});

// 📦 Get all parcels (for testing/admin)
router.get("/", async (req, res) => {
  try {
    const parcels = await Parcel.find().sort({ createdAt: -1 });
    res.json({ success: true, parcels });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch parcels" });
  }
});

module.exports = router;
