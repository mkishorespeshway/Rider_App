const express = require("express");
const router = express.Router();

const { signup, login } = require("../controllers/authController");
const { send, verify } = require("../controllers/otpController"); // matches exports

// 🔹 Auth routes
router.post("/signup", signup);
router.post("/login", login);

// 🔹 OTP routes
router.post("/otp/send", send);
router.post("/otp/verify", verify);

module.exports = router;
