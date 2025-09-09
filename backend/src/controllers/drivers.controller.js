const Driver = require('../models/Driver');
const User = require('../models/User');

exports.getDriverProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id }).populate('userId');
    if(!driver) return res.status(404).json({ message: 'Driver profile not found' });
    res.json({ ok: true, driver });
  } catch (err) { next(err); }
};

exports.updateDriver = async (req, res, next) => {
  try {
    const updates = req.body;
    let driver = await Driver.findOne({ userId: req.user._id });
    if(!driver) return res.status(404).json({ message: 'Driver profile not found' });
    Object.assign(driver, updates);
    await driver.save();
    res.json({ ok: true, driver });
  } catch (err) { next(err); }
};

exports.setLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    let driver = await Driver.findOne({ userId: req.user._id });
    if(!driver) return res.status(404).json({ message: 'Driver profile not found' });
    driver.currentLocation = { lat, lng, updatedAt: new Date() };
    await driver.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.listDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find().populate('userId').limit(200);
    res.json({ ok: true, drivers });
  } catch (err) { next(err); }
};
