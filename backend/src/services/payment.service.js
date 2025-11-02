const crypto = require('crypto');
const Razorpay = require('razorpay');

// Initialize Razorpay or mock
let razorpay;
const keyId = process.env.RAZORPAY_KEY_ID || null;
const keySecret = process.env.RAZORPAY_KEY_SECRET || null;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || null;
const isMockMode = !(keyId && keySecret);
const isTestKey = keyId ? keyId.startsWith('rzp_test') : false;

// Configure Razorpay for both LIVE and TEST keys when provided
if (keyId && keySecret) {
  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  console.log(isTestKey ? '🧪 Razorpay TEST mode configured' : '✅ Razorpay LIVE configured');
} else {
  console.warn('⚠️ Razorpay not configured — keys missing');
  razorpay = null;
}

// Create a Razorpay order (amount in INR; converted to paise)
async function createOrder({ rideId, amount, currency = 'INR' }) {
  if (!keyId || !keySecret || !razorpay) {
    throw new Error('Razorpay keys are required');
  }
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
  if (!keySecret) {
    throw new Error('Cannot verify payment without Razorpay secret');
  }
  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(`${orderId}|${paymentId}`);
  const expectedSignature = hmac.digest('hex');
  return expectedSignature === signature;
}

// Verify Webhook signature
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!webhookSecret) {
    throw new Error('Cannot verify webhook without Razorpay webhook secret');
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
  isTestKey,
};
