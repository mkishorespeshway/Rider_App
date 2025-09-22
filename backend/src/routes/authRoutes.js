const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  registerRider,
  loginRider,
  loginAdmin
} = require("../controllers/authController");

// === User routes ===
// Match frontend: /api/auth/signup-user
router.post("/signup-user", registerUser);
router.post("/login-user", loginUser); // optional if needed

// === Rider routes ===
// Match frontend: /api/auth/signup-rider
router.post("/signup-rider", registerRider);
router.post("/login-rider", loginRider);

// === Admin routes ===
router.post("/admin/login", loginAdmin);

module.exports = router;
