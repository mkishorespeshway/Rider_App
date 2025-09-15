// backend/src/routes/otpRoutes.js
const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");

router.post("/send", otpController.send);
router.post("/verify", otpController.verify);

module.exports = router;
