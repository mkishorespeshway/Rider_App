const Parcel = require('../models/Parcel');

exports.createParcel = async (req, res, next) => {
  try {
    const data = req.body;
    const parcel = await Parcel.create({ senderId: req.user._id, ...data });
    res.json({ ok: true, parcel });
  } catch (err) { next(err); }
};

exports.listParcels = async (req, res, next) => {
  try {
    const parcels = await Parcel.find({ senderId: req.user._id }).limit(100).sort({ createdAt: -1 });
    res.json({ ok: true, parcels });
  } catch (err) { next(err); }
};
