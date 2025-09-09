const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

// Driver: add a new vehicle
exports.addVehicle = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const vehicle = await Vehicle.create({ driverId: driver._id, ...req.body });
    res.json({ ok: true, vehicle });
  } catch (err) {
    next(err);
  }
};

// Driver: list own vehicles
exports.listByDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const vehicles = await Vehicle.find({ driverId: driver._id });
    res.json({ ok: true, vehicles });
  } catch (err) {
    next(err);
  }
};

// Admin: list all vehicles
exports.listAll = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find()
      .populate('driverId')
      .limit(200)
      .sort({ createdAt: -1 });
    res.json({ ok: true, vehicles });
  } catch (err) {
    next(err);
  }
};

// Driver/Admin: update a vehicle
exports.updateVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findByIdAndUpdate(id, req.body, { new: true });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    res.json({ ok: true, vehicle });
  } catch (err) {
    next(err);
  }
};
