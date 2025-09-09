const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { sendPush } = require('../services/notification.service');

// Create ride (rider only)
exports.createRide = async (req, res, next) => {
  try {
    const { origin, destination, etaMinutes } = req.body;
    const ride = await Ride.create({
      riderId: req.user._id,
      origin,
      destination,
      etaMinutes,
      status: 'requested'
    });
    // In production: find nearby drivers and notify them
    res.json({ ok: true, ride });
  } catch (err) { next(err); }
};

// Driver accepts ride
exports.acceptRide = async (req, res, next) => {
  try {
    const { id } = req.params; // ride id
    const ride = await Ride.findById(id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'requested') return res.status(400).json({ message: 'Ride not available' });

    const driver = await Driver.findOne({ userId: req.user._id });
    if(!driver) return res.status(400).json({ message: 'Driver profile not found' });

    ride.driverId = driver._id;
    ride.status = 'accepted';
    await ride.save();

    // notify rider
    const riderUser = await User.findById(ride.riderId);
    if (riderUser && riderUser.deviceToken) {
      await sendPush({ deviceToken: riderUser.deviceToken, title: 'Driver accepted', body: 'Your ride was accepted' });
    }

    res.json({ ok: true, ride });
  } catch (err) { next(err); }
};

// Start ride
exports.startRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.status = 'in-progress';
    await ride.save();
    res.json({ ok: true, ride });
  } catch (err) { next(err); }
};

// Complete ride
exports.completeRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.status = 'completed';
    await ride.save();
    res.json({ ok: true, ride });
  } catch (err) { next(err); }
};

// Cancel ride
exports.cancelRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.status = 'cancelled';
    await ride.save();
    res.json({ ok: true, ride });
  } catch (err) { next(err); }
};

// Get ride by id
exports.getRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id).populate('riderId').populate('driverId');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json({ ok: true, ride });
  } catch (err) { next(err); }
};

// List rider rides
exports.listForRider = async (req, res, next) => {
  try {
    const rides = await Ride.find({ riderId: req.user._id }).limit(100).sort({ createdAt: -1 });
    res.json({ ok: true, rides });
  } catch (err) { next(err); }
};

// List driver assigned rides
exports.listForDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if(!driver) return res.status(404).json({ message: 'Driver not found' });
    const rides = await Ride.find({ driverId: driver._id }).limit(100).sort({ createdAt: -1 });
    res.json({ ok: true, rides });
  } catch (err) { next(err); }
};
