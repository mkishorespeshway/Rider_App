const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/role.middleware');
const driversCtrl = require('../controllers/drivers.controller');

// driver-specific routes
router.get('/me', auth, role(['driver']), driversCtrl.getDriverProfile);
router.put('/me', auth, role(['driver']), driversCtrl.updateDriver);
router.post('/me/location', auth, role(['driver']), driversCtrl.setLocation);

// admin can list drivers
router.get('/', auth, role(['admin']), driversCtrl.listDrivers);

module.exports = router;
