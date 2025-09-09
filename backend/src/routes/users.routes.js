const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const usersCtrl = require('../controllers/users.controller');
const role = require('../middlewares/role.middleware');


router.get('/me', auth, usersCtrl.me);
router.put('/me', auth, usersCtrl.updateProfile);

router.get('/', auth, role(['admin']), usersCtrl.list);

module.exports = router;
