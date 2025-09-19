const express = require("express");
const router = express.Router();
<<<<<<< HEAD
const {
  signupUser,
  signupRider,
  loginUser,
  loginRider,
} = require("../controllers/authController");
const otpController = require("../controllers/otpController");
=======

const { signup, login } = require("../controllers/authController");
const { send, verify } = require("../controllers/otpController"); // matches exports
>>>>>>> aced6b199b083cb320663ecabeb739aba4129a5a

// 🔹 User & Rider signup/login
router.post("/signup-user", signupUser);
router.post("/signup-rider", signupRider);
router.post("/login-user", loginUser);
router.post("/login-rider", loginRider);

<<<<<<< HEAD
// 🔹 OTP (shared)
router.post("/otp/send", otpController.send);
router.post("/otp/verify", otpController.verify);
=======
// 🔹 OTP routes
router.post("/otp/send", send);
router.post("/otp/verify", verify);
>>>>>>> aced6b199b083cb320663ecabeb739aba4129a5a

module.exports = router;
