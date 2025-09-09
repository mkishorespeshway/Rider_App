const Payment = require('../models/Payment');
const { createPayment } = require('../services/payment.service');

exports.initiate = async (req, res, next) => {
  try {
    const { rideId, amount } = req.body;
    const resp = await createPayment({ rideId, amount });
    const payment = await Payment.create({ rideId, amount, provider: resp.provider, providerRef: resp.providerRef, status: resp.status });
    res.json({ ok: true, payment });
  } catch (err) { next(err); }
};
