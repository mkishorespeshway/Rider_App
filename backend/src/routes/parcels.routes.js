const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const parcelsCtrl = require('../controllers/parcels.controller');

router.post('/', auth, parcelsCtrl.createParcel);
router.get('/', auth, parcelsCtrl.listParcels);

module.exports = router;
