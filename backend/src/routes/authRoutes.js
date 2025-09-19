const express = require("express");
const router = express.Router();
const {
  signupUser,
  signupRider,
  loginUser,
  loginRider,
} = require("../controllers/authController");
const otpController = require("../controllers/otpController");

// 🔹 User & Rider signup/login
router.post("/signup-user", signupUser);
router.post("/signup-rider", signupRider);
router.post("/login-user", loginUser);
router.post("/login-rider", loginRider);

// 🔹 OTP (shared)
router.post("/otp/send", otpController.send);
router.post("/otp/verify", otpController.verify);

module.exports = router;
