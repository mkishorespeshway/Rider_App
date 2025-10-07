const crypto = require('crypto');
const Razorpay = require('razorpay');

// Initialize Razorpay or mock
let razorpay;
const keyId = process.env.RAZORPAY_KEY_ID || null;
const keySecret = process.env.RAZORPAY_KEY_SECRET || null;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || null;
const isMockMode = !(keyId && keySecret);

if (keyId && keySecret) {
  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  console.log('✅ Razorpay configured');
} else {
  console.warn('⚠️ Razorpay keys missing — using mock instance (payments disabled)');
  razorpay = {
    orders: {
      create: async (options) => {
        console.log('🧪 Mock Razorpay order created:', options);
        return {
          id: `mock_order_${Date.now()}`,
          amount: options.amount,
          currency: options.currency,
          status: 'created',
        };
      },
    },
  };
}

// Create a Razorpay order (amount in INR; converted to paise)
async function createOrder({ rideId, amount, currency = 'INR' }) {
  const paiseAmount = Math.round(Number(amount) * 100);
  const order = await razorpay.orders.create({
    amount: paiseAmount,
    currency,
    receipt: `ride_${rideId}`,
    payment_capture: 1,
    notes: { rideId: String(rideId) },
  });
  return order; // contains id, amount, currency, status
}

// Verify Checkout signature returned to frontend
function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  if (isMockMode) {
    // Dev-only: accept any signature when keys are missing
    return true;
  }
  if (!keySecret) {
    throw new Error('Razorpay key secret not configured');
  }
  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(`${orderId}|${paymentId}`);
  const expectedSignature = hmac.digest('hex');
  return expectedSignature === signature;
}

// Verify Webhook signature
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (isMockMode) {
    // Dev-only: accept any webhook signature when keys are missing
    return true;
  }
  if (!webhookSecret) {
    throw new Error('Razorpay webhook secret not configured');
  }
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const digest = hmac.update(rawBody).digest('hex');
  return digest === signatureHeader;
}

module.exports = {
  razorpay,
  createOrder,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  isMockMode,
};
