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
 
// 🔐 Verify OTP and start ride
router.post("/:id/verify-otp", authMiddleware, rideController.verifyOtp);
 
// 📝 Set per-ride OTP (from Booking UI)
router.post("/:id/set-otp", authMiddleware, rideController.setRideOtp);
 
// 🏷️ Set requested vehicle type and notify matching riders
router.post("/:id/request-type", authMiddleware, rideController.setRequestedVehicleType);

// ✏️ Update ride details before OTP verification
router.post("/:id/update-details", authMiddleware, rideController.updateRideDetails);
 
// ✅ Complete ride (rider triggers when trip ends)
router.post("/:id/complete", authMiddleware, rideController.completeRide);
 
// 🔍 Get a single ride by ID
router.get("/:id", authMiddleware, rideController.getRideById);
 
module.exports = router;
 
 