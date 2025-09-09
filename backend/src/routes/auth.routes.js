const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');

router.post('/send-otp', authCtrl.sendOtp);
router.post('/verify-otp', authCtrl.verifyOtp);

module.exports = router;
