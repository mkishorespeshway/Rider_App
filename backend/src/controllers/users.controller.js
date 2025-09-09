const User = require('../models/User');

exports.me = async (req, res, next) => {
  try {
    res.json({ ok: true, user: req.user });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ ok: true, user });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const users = await User.find().limit(100);
    res.json({ ok: true, users });
  } catch (err) { next(err); }
};

