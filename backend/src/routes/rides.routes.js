const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const ridesCtrl = require('../controllers/rides.controller');

// Rider creates ride
router.post('/', auth, role(['rider']), ridesCtrl.createRide);
router.get('/me', auth, role(['rider']), ridesCtrl.listForRider);

// Driver endpoints
router.get('/driver', auth, role(['driver']), ridesCtrl.listForDriver);
router.post('/:id/accept', auth, role(['driver']), ridesCtrl.acceptRide);
router.post('/:id/start', auth, role(['driver']), ridesCtrl.startRide);
router.post('/:id/complete', auth, role(['driver']), ridesCtrl.completeRide);

// Shared
router.get('/:id', auth, ridesCtrl.getRide);
router.post('/:id/cancel', auth, ridesCtrl.cancelRide);

module.exports = router;
