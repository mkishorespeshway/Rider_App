const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const paymentsCtrl = require('../controllers/payments.controller');

router.post('/initiate', auth, paymentsCtrl.initiate);

module.exports = router;
