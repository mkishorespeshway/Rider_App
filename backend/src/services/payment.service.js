exports.createPayment = async ({ rideId, amount }) => {
  // TODO: integrate Stripe/Pay provider
  return { provider: 'mock', providerRef: `mock_${Date.now()}`, status: 'initiated' };
};
