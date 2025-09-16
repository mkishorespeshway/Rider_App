// backend/src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { signup, login } = require("../controllers/authController");
const otpController = require("../controllers/otpController");

// 🔹 Auth routes
router.post("/signup", signup);
router.post("/login", login);

// 🔹 OTP routes
router.post("/otp/send", otpController.send);
router.post("/otp/verify", otpController.verify);

module.exports = router;
