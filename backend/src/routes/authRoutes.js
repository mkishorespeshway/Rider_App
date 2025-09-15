// backend/src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { signup, login } = require("../controllers/authController");

// 🔹 Auth routes
// POST /api/auth/signup
router.post("/signup", signup);

// POST /api/auth/login
router.post("/login", login);

module.exports = router;
