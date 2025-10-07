const express = require('express');
const router = express.Router();
const dynamicPricingController = require('../controllers/dynamicPricingController');

// Calculate dynamic price for a ride
router.post('/calculate', dynamicPricingController.calculatePrice);

// Get pricing factors for a location
router.get('/factors', dynamicPricingController.getPricingFactors);

module.exports = router;