const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const authMiddleware = require('../middleware/authMiddleware');

// Calculate ride price
router.post('/calculate', pricingController.calculatePrice);

// Get pricing factors for a location
router.get('/factors', pricingController.getPricingFactors);

// Admin/analytics: Get zone stats (protect behind auth if desired)
router.get('/zones/:zoneId', authMiddleware, pricingController.getZoneStats);

module.exports = router;