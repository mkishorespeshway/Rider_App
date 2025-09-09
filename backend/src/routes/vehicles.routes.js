const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const vehiclesCtrl = require('../controllers/vehicles.controller');

router.post('/', auth, role(['driver']), vehiclesCtrl.addVehicle);
router.get('/me', auth, role(['driver']), vehiclesCtrl.listByDriver);
router.get('/', auth, role(['admin']), vehiclesCtrl.listAll);
router.put('/:id', auth, role(['driver', 'admin']), vehiclesCtrl.updateVehicle);

module.exports = router;
