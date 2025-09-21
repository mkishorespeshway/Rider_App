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
router.post("/user/register", registerUser);
router.post("/user/login", loginUser);

// === Rider routes ===
router.post("/rider/register", registerRider);
router.post("/rider/login", loginRider);

// === Admin routes ===
router.post("/admin/login", loginAdmin);

module.exports = router;
