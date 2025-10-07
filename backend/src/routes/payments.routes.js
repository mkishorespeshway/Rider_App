const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const paymentsCtrl = require('../controllers/payments.controller');

// Initiate order
router.post('/initiate', authMiddleware, paymentsCtrl.initiate);

// Verify checkout (called from frontend after payment success)
router.post('/verify', authMiddleware, paymentsCtrl.verify);

// Razorpay webhook (must use raw body middleware in server.js)
router.post('/webhook', paymentsCtrl.webhook);

module.exports = router;
