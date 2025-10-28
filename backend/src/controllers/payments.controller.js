const Payment = require('../models/Payment');
const Ride = require('../models/Ride');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const AdminSettings = require('../models/AdminSettings');
const {
  createOrder,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  isMockMode,
  isTestKey,
} = require('../services/payment.service');

// Public: expose merchant UPI details for user payments
exports.merchant = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne({ key: 'admin' });
    const bank = settings?.bankDetails || {};
    return res.json({
      success: true,
      bankDetails: {
        holderName: bank.holderName || null,
        upiVpa: bank.upiVpa || null,
      },
    });
  } catch (err) {
    console.error('Get merchant details error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Initiate Razorpay order using ride's finalPrice
exports.initiate = async (req, res, next) => {
  try {
    const { rideId, method = 'upi', currency = 'INR' } = req.body;
    if (!rideId) {
      return res.status(400).json({ ok: false, message: 'rideId is required' });
    }

    const ride = await Ride.findById(rideId);
    const amount = Number(ride?.finalPrice || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid ride amount' });
    }

    // Enforce LIVE payments only
    const keyId = process.env.RAZORPAY_KEY_ID || null;
    if (!keyId || isMockMode || isTestKey) {
      return res.status(400).json({ ok: false, message: 'Live payments disabled: configure LIVE Razorpay keys.' });
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

    return res.json({ ok: true, order, key: process.env.RAZORPAY_KEY_ID || null });
  } catch (err) {
    next(err);
  }
};

// Mark payment as completed via Cash (COD)
exports.cash = async (req, res, next) => {
  try {
    const { rideId } = req.body;
    if (!rideId) {
      return res.status(400).json({ ok: false, message: 'rideId is required' });
    }

    // Update ride payment status and method
    await Ride.findByIdAndUpdate(rideId, {
      $set: { paymentStatus: 'completed', paymentMethod: 'COD', detailedPaymentMethod: '' },
    });

    // Record a payment entry for audit purposes using locked finalPrice
    const rideDoc = await Ride.findById(rideId);
    const grossCash = Number(rideDoc?.finalPrice || 0);
    await Payment.create({
      rideId,
      amount: grossCash,
      currency: 'INR',
      provider: 'cash',
      method: 'upi', // schema may enforce enum; using 'upi' to comply
      status: 'success',
      orderId: `cash-${rideId}-${Date.now()}`,
    });

    // For cash payments: deduct 10% admin commission from rider wallet
    try {
      const ride = rideDoc || (await Ride.findById(rideId));
      const gross = Number(ride?.finalPrice || 0);
      const adminShare = Math.round(gross * 0.1);
      const riderUserId = ride?.driverId || ride?.captainId || null;
      if (riderUserId && adminShare > 0) {
        let wallet = await Wallet.findOne({ riderId: riderUserId });
        if (!wallet) wallet = await Wallet.create({ riderId: riderUserId, balance: 0, lockedBalance: 0, bankDetails: {} });
        // Allow negative balance to reflect dues; UI will prompt recharge beyond threshold
        wallet.balance = Number(wallet.balance || 0) - adminShare;
        await wallet.save();
        await WalletTransaction.create({
          riderId: riderUserId,
          type: 'debit',
          amount: adminShare,
          description: 'Admin commission (cash) 10% deducted',
          meta: { rideId, gross },
        });
      }
    } catch (walletErr) {
      console.error('Wallet debit error (cash):', walletErr.message);
    }

    return res.json({ ok: true });
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

    const paymentDoc = await Payment.findOneAndUpdate(
      { rideId, orderId },
      { $set: { paymentId, signature, status: 'success' } }
    );
    const ride = await Ride.findByIdAndUpdate(
      rideId,
      { $set: { paymentStatus: 'completed', paymentMethod: 'online' } },
      { new: true }
    );

    // Credit rider wallet with 90% (admin 10% cut)
    try {
      const amount = Number(paymentDoc?.amount || ride?.finalPrice || 0);
      const adminShare = Math.round(amount * 0.1);
      const riderShare = amount - adminShare;
      const riderUserId = ride?.driverId || ride?.captainId || null;
      if (riderUserId && riderShare > 0) {
        let wallet = await Wallet.findOne({ riderId: riderUserId });
        if (!wallet) wallet = await Wallet.create({ riderId: riderUserId, balance: 0, lockedBalance: 0, bankDetails: {} });
        wallet.balance += riderShare;
        await wallet.save();
        await WalletTransaction.create({
          riderId: riderUserId,
          type: 'credit',
          amount: riderShare,
          description: 'Ride earning (online) after 10% admin cut',
          meta: { rideId, gross: amount, adminShare },
        });
      }
    } catch (walletErr) {
      console.error('Wallet credit error (online):', walletErr.message);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Verification error:', err.message);
    return res.status(400).json({ ok: false, message: 'Verification failed: LIVE keys required' });
  }
};

// Manual confirmation: mark payment completed as ONLINE without Razorpay verification
// This is useful for flows like UPI intent/collect where the rider confirms completion.
exports.manualOnline = async (req, res, next) => {
  try {
    const { rideId } = req.body;
    if (!rideId) {
      return res.status(400).json({ ok: false, message: 'rideId is required' });
    }

    // Update ride payment status and method
    const ride = await Ride.findByIdAndUpdate(
      rideId,
      { $set: { paymentStatus: 'completed', paymentMethod: 'online', detailedPaymentMethod: 'upi' } },
      { new: true }
    );

    // Record a payment entry for audit purposes
    try {
      const gross = Number(ride?.finalPrice || 0);
      await Payment.create({
        rideId,
        amount: gross,
        currency: 'INR',
        provider: 'manual',
        method: 'upi',
        status: 'success',
        orderId: `manual-${rideId}-${Date.now()}`,
      });
    } catch (pErr) {
      console.warn('Manual online payment record error:', pErr.message);
    }

    // Credit rider wallet with 90% (admin 10% cut)
    try {
      const gross = Number(ride?.finalPrice || 0);
      const adminShare = Math.round(gross * 0.1);
      const riderShare = gross - adminShare;
      const riderUserId = ride?.driverId || ride?.captainId || null;
      if (riderUserId && riderShare > 0) {
        let wallet = await Wallet.findOne({ riderId: riderUserId });
        if (!wallet) wallet = await Wallet.create({ riderId: riderUserId, balance: 0, lockedBalance: 0, bankDetails: {} });
        wallet.balance += riderShare;
        await wallet.save();
        await WalletTransaction.create({
          riderId: riderUserId,
          type: 'credit',
          amount: riderShare,
          description: 'Ride earning (online) after 10% admin cut',
          meta: { rideId, gross, adminShare },
        });
      }
    } catch (pErr) {
      console.error('Wallet credit error (online):', pErr.message);
    }

    return res.json({ ok: true });
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

    return res.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).json({ ok: false, message: 'Webhook processing failed' });
  }
};