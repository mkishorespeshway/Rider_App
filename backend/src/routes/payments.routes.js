const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const paymentsCtrl = require('../controllers/payments.controller');

// Public merchant info for UPI payments
router.get('/merchant', paymentsCtrl.merchant);

// Initiate order
router.post('/initiate', authMiddleware, paymentsCtrl.initiate);

// Verify checkout (called from frontend after payment success)
router.post('/verify', authMiddleware, paymentsCtrl.verify);

// Cash payment (mark as completed)
router.post('/cash', authMiddleware, paymentsCtrl.cash);

// Manual confirmation for ONLINE payments (UPI intent/collect): no Razorpay verification
router.post('/manual-online', authMiddleware, paymentsCtrl.manualOnline);

// Razorpay webhook (must use raw body middleware in server.js)
router.post('/webhook', paymentsCtrl.webhook);

module.exports = router;