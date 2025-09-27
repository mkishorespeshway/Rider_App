const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rides.controller");
const authMiddleware = require("../middleware/authMiddleware");

// 🚖 Create a ride
router.post("/create", authMiddleware, rideController.createRide);

// 📜 Get ride history for logged-in rider
router.get("/history", authMiddleware, rideController.getRideHistory);

// 🚖 Get all pending rides (to be accepted)
router.get("/pending", authMiddleware, rideController.getPendingRides);

// 🚖 Accept a ride
router.post("/:id/accept", authMiddleware, rideController.acceptRide);

// 🚖 Reject a ride
router.post("/:id/reject", authMiddleware, rideController.rejectRide);

// 🔍 Get a single ride by ID
router.get("/:id", authMiddleware, rideController.getRideById);

module.exports = router;
