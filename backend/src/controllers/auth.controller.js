const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const { sendOtp, verifyOtp } = require('../services/otp.service');

exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'phone required' });
    const info = await sendOtp(phone);
    res.json({ ok: true, info });
  } catch (err) { next(err); }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, code, name, type } = req.body;
    if (!phone || !code) return res.status(400).json({ message: 'phone and code required' });
    const ok = await verifyOtp(phone, code);
    if (!ok) return res.status(400).json({ message: 'Invalid OTP' });

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone, name: name || '', type: type || 'rider' });
    } else {
      // if user exists but role changed to driver, update type
      if(type && user.type !== type) user.type = type;
      if(name) user.name = name;
      await user.save();
    }

    if (user.type === 'driver') {
      let drv = await Driver.findOne({ userId: user._id });
      if (!drv) {
        drv = await Driver.create({ userId: user._id, status: 'pending' });
      }
    }

    const token = jwt.sign({ id: user._id, type: user.type }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    res.json({ ok: true, token, user });
  } catch (err) { next(err); }
};

