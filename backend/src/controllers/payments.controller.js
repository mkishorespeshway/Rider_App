const Payment = require('../models/Payment');
const Ride = require('../models/Ride');
const { createOrder, verifyCheckoutSignature, verifyWebhookSignature, isMockMode } = require('../services/payment.service');

exports.initiate = async (req, res, next) => {
  try {
    const { rideId, amount, method = 'upi', currency = 'INR' } = req.body;
    if (!rideId || !amount) {
      return res.status(400).json({ ok: false, message: 'rideId and amount are required' });
    }

    // Create Razorpay order
    const order = await createOrder({ rideId, amount, currency });

    // Persist initial payment record
    await Payment.create({
      rideId,
      amount,
      currency,
      provider: 'razorpay',
      method,
      status: 'initiated',
      orderId: order.id,
    });

    return res.json({ ok: true, order, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    next(err);
  }
};

// Verify Razorpay Checkout signature and mark payment success/failed
exports.verify = async (req, res, next) => {
  try {
    const { rideId, orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ ok: false, message: 'Invalid verification payload' });
    }

    const verified = verifyCheckoutSignature({ orderId, paymentId, signature });

    if (!verified) {
      await Payment.findOneAndUpdate(
        { rideId, orderId },
        { $set: { paymentId, signature, status: 'failed' } }
      );
      return res.status(400).json({ ok: false, message: 'Signature verification failed' });
    }

    await Payment.findOneAndUpdate(
      { rideId, orderId },
      { $set: { paymentId, signature, status: 'success' } }
    );
    await Ride.findByIdAndUpdate(rideId, { $set: { paymentStatus: 'completed' } });

    return res.json({ ok: true, mock: isMockMode });
  } catch (err) {
    next(err);
  }
};

// Razorpay webhook handler (uses raw body)
exports.webhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body; // Buffer from express.raw middleware

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return res.status(400).json({ ok: false, message: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    const paymentEntity = event?.payload?.payment?.entity;

    if (paymentEntity && paymentEntity.order_id) {
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const status = paymentEntity.status === 'captured' ? 'success' : 'failed';

      await Payment.findOneAndUpdate(
        { orderId },
        { $set: { paymentId, status } }
      );
    }

    return res.json({ ok: true, mock: isMockMode });
  } catch (err) {
    next(err);
  }
};
