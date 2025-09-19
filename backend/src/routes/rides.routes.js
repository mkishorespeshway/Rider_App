const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rides.controller"); // ✅ check file name carefully
const authMiddleware = require("../middleware/authMiddleware");

// 🚖 Create a ride
router.post("/create", authMiddleware, rideController.createRide);

// 📜 Get ride history for logged-in user
router.get("/history", authMiddleware, rideController.getRideHistory);

// 🔍 Get a single ride by ID
router.get("/:id", authMiddleware, rideController.getRideById);

module.exports = router;
