import React, { useState, useEffect } from 'react';
import DynamicPricingDisplay from './DynamicPricingDisplay';
import { createRide, initiatePayment, verifyPayment } from '../services/api';

// Load Razorpay Checkout script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const BookRide = () => {
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [distance, setDistance] = useState(null);
  const [priceDetails, setPriceDetails] = useState(null);

  // Mock function to get user's current location
  const getCurrentLocation = () => {
    // In a real app, this would use the browser's geolocation API
    return {
      latitude: 12.9716,
      longitude: 77.5946
    };
  };

  useEffect(() => {
    // Set default pickup location as user's current location
    setPickup(getCurrentLocation());
  }, []);

  // Mock function to calculate distance between two points
  // Replace with live calculation using Google Distance Matrix API if available, otherwise Haversine fallback
  const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  const toLatLng = (p) => ({
    lat: p.latitude ?? p.lat,
    lng: p.longitude ?? p.lng,
  });
  
  const haversineDistanceKm = (a, b) => {
    if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
    const toRad = (val) => (val * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const aVal = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
    return +(R * c).toFixed(2);
  };
  
  // Avg city speed baseline (km/h)
  const BASE_SPEED_KMPH = 30;
  
  // Compute route metrics: distance (km) and duration (mins)
  const computeRouteMetrics = async (pointA, pointB) => {
    if (!pointA || !pointB) return { distanceKm: null, normalDurationMins: null, currentDurationMins: null };
    const origin = toLatLng(pointA);
    const dest = toLatLng(pointB);
  
    // Try Google Distance Matrix API if key is provided
    if (GOOGLE_API_KEY && origin.lat != null && origin.lng != null && dest.lat != null && dest.lng != null) {
      try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&mode=driving&origins=${origin.lat},${origin.lng}&destinations=${dest.lat},${dest.lng}&departure_time=now&key=${GOOGLE_API_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        const element = data?.rows?.[0]?.elements?.[0];
        if (element?.status === 'OK') {
          const distanceKm = element?.distance?.value != null ? +(element.distance.value / 1000).toFixed(2) : null;
          const normalSec = element?.duration?.value;
          const trafficSec = element?.duration_in_traffic?.value ?? normalSec;
          const normalDurationMins = normalSec != null ? Math.round(normalSec / 60) : null;
          const currentDurationMins = trafficSec != null ? Math.round(trafficSec / 60) : null;
          return { distanceKm, normalDurationMins, currentDurationMins };
        }
      } catch (err) {
        console.warn('Google Distance Matrix failed, falling back to Haversine:', err);
      }
    }
  
    // Fallback: Haversine distance and baseline duration from avg speed
    const distanceKm = haversineDistanceKm(origin, dest);
    const normalDurationMins = distanceKm != null ? Math.round((distanceKm / BASE_SPEED_KMPH) * 60) : null;
    const currentDurationMins = normalDurationMins; // no live traffic; same as normal
    return { distanceKm, normalDurationMins, currentDurationMins };
  };
  const handleDestinationChange = async (newDestination) => {
    setDestination(newDestination);

    // Calculate distance and duration when destination changes (live)
    if (pickup && newDestination) {
      const { distanceKm, normalDurationMins, currentDurationMins } = await computeRouteMetrics(pickup, newDestination);
      setDistance(distanceKm);
      setNormalDurationMins(normalDurationMins);
      setDurationMins(currentDurationMins);
    }
  };

  const handlePriceCalculated = (details) => {
    setPriceDetails(details);
  };

  // Mock destination selection
  const selectDestination = (location) => {
    handleDestinationChange({
      latitude: location.lat,
      longitude: location.lng,
      address: location.address
    });
  };

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showDetailedPayments, setShowDetailedPayments] = useState(false);
  const [detailedPaymentMethod, setDetailedPaymentMethod] = useState('upi');

  const handleBookRide = async () => {
    if (!priceDetails || !pickup || !destination || !distance) return;

    try {
      const ridePayload = {
        pickup: 'Current Location',
        drop: destination.address || 'Destination',
        pickupCoords: { lat: pickup.latitude, lng: pickup.longitude },
        dropCoords: { lat: destination.latitude, lng: destination.longitude },
        distance: distance,
        basePrice: priceDetails.basePrice,
        finalPrice: priceDetails.finalPrice,
        pricingFactors: priceDetails.pricingFactors || {},
        paymentMethod: paymentMethod === 'cash' ? 'COD' : 'online',
        detailedPaymentMethod: paymentMethod === 'cash' ? '' : detailedPaymentMethod,
      };

      const { data } = await createRide(ridePayload);
      if (!data?.success) throw new Error('Failed to create ride');

      const createdRide = data.ride;

      if (paymentMethod === 'online') {
        const amount = priceDetails.finalPrice;
        const initResp = await initiatePayment({ rideId: createdRide._id, amount, method: detailedPaymentMethod });
        const initData = initResp.data;
        if (!initData?.ok || !initData?.order?.id || !initData?.key) {
          throw new Error('Failed to initiate payment');
        }

        const loaded = await loadRazorpayScript();
        if (!loaded) {
          alert('Razorpay SDK failed to load. Please check your connection.');
          return;
        }

        const options = {
          key: initData.key,
          amount: initData.order.amount, // in paise
          currency: initData.order.currency,
          name: 'Rider App',
          description: 'Ride Payment',
          order_id: initData.order.id,
          notes: { rideId: String(createdRide._id) },
          theme: { color: '#4f46e5' },
          handler: async function (response) {
            try {
              const verifyResp = await verifyPayment({
                rideId: createdRide._id,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              if (verifyResp.data?.ok) {
                alert('✅ Payment successful and verified! Your ride is confirmed.');
              } else {
                alert('❌ Payment verification failed. Please contact support.');
              }
            } catch (err) {
              console.warn('Verification warning:', err);
              alert('❌ Error verifying payment.');
            }
          },
          modal: {
            ondismiss: function () {
              alert('Payment popup closed. You can retry from the booking screen.');
            },
          },
          prefill: {
            name: 'Customer',
            email: '',
            contact: '',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          console.warn('Payment failed:', resp.error);
          alert('❌ Payment failed. Please try another method or retry.');
        });
        rzp.open();
      } else {
        alert('Ride booked successfully! Pay with Cash on Delivery at the end of your ride.');
      }
    } catch (err) {
      console.warn('Booking warning:', err);
      alert('Failed to book ride. Please login and try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl m-4">
      <div className="p-8">
        <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold mb-4">Book a Ride</div>
        
        {/* Location inputs */}
        <div className="mb-6">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Pickup Location</label>
            <input 
              type="text" 
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Current Location"
              value="Current Location"
              readOnly
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Destination</label>
            <input 
              type="text" 
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter destination"
              onChange={(e) => {
                // In a real app, this would trigger location search
                if (e.target.value) {
                  // Mock destination for demo
                  selectDestination({
                    lat: 12.9352,
                    lng: 77.6245,
                    address: e.target.value
                  });
                }
              }}
            />
          </div>
        </div>
        
        {/* Display route metrics if available */}
        {(distance || durationMins || normalDurationMins) && (
          <div className="mb-4 text-gray-600">
            <span className="font-medium">Route:</span>
            <span className="ml-2">
              {distance ? `${distance} km` : ''}
              {(distance && (durationMins || normalDurationMins)) ? ' • ' : ''}
              {durationMins ? `ETA ${durationMins} mins` : ''}
              {(durationMins && normalDurationMins) ? ` • Normal ${normalDurationMins} mins • +${Math.max(durationMins - normalDurationMins, 0)} mins` : ''}
            </span>
          </div>
        )}
        
        {/* Payment Method Selection - Always visible with enhanced UI */}
        <div className="mb-6 border-2 border-indigo-500 rounded-lg p-4 bg-indigo-50">
          <h3 className="font-bold text-md mb-3 text-indigo-700">Select Payment Method</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div 
              className={`flex items-center p-3 rounded-lg cursor-pointer border-2 ${paymentMethod === 'cash' ? 'border-indigo-500 bg-indigo-100' : 'border-gray-200'}`}
              onClick={() => {
                setPaymentMethod('cash');
                setShowDetailedPayments(false);
              }}
            >
              <input
                id="cash"
                type="radio"
                name="paymentMethod"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={() => {
                  setPaymentMethod('cash');
                  setShowDetailedPayments(false);
                }}
                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="cash" className="ml-2 block font-medium text-gray-700 cursor-pointer">
                💵 Cash on Delivery
              </label>
            </div>
            <div 
              className={`flex items-center p-3 rounded-lg cursor-pointer border-2 ${paymentMethod === 'online' ? 'border-indigo-500 bg-indigo-100' : 'border-gray-200'}`}
              onClick={() => {
                setPaymentMethod('online');
                setShowDetailedPayments(true);
              }}
            >
              <input
                id="online"
                type="radio"
                name="paymentMethod"
                value="online"
                checked={paymentMethod === 'online'}
                onChange={() => {
                  setPaymentMethod('online');
                  setShowDetailedPayments(true);
                }}
                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="online" className="ml-2 block font-medium text-gray-700 cursor-pointer">
                💳 Online Payment
              </label>
            </div>
          </div>
          
          {/* Detailed Online Payment Options - Rapido Style */}
          {showDetailedPayments && (
            <div className="mt-4 border-t border-indigo-200 pt-4">
              <h4 className="font-medium text-sm mb-3 text-indigo-700">Choose Payment Option</h4>
              <div className="grid grid-cols-1 gap-2">
                <div 
                  className={`flex items-center p-3 rounded-lg cursor-pointer border ${detailedPaymentMethod === 'upi' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                  onClick={() => setDetailedPaymentMethod('upi')}
                >
                  <input
                    id="upi"
                    type="radio"
                    name="detailedPaymentMethod"
                    value="upi"
                    checked={detailedPaymentMethod === 'upi'}
                    onChange={() => setDetailedPaymentMethod('upi')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="upi" className="ml-2 flex justify-between w-full">
                    <span className="font-medium text-gray-700">UPI</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Instant Pay</span>
                  </label>
                </div>
                
                <div 
                  className={`flex items-center p-3 rounded-lg cursor-pointer border ${detailedPaymentMethod === 'card' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                  onClick={() => setDetailedPaymentMethod('card')}
                >
                  <input
                    id="card"
                    type="radio"
                    name="detailedPaymentMethod"
                    value="card"
                    checked={detailedPaymentMethod === 'card'}
                    onChange={() => setDetailedPaymentMethod('card')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="card" className="ml-2 flex justify-between w-full">
                    <span className="font-medium text-gray-700">Credit/Debit Card</span>
                    <span className="text-xs text-gray-500">Visa, Mastercard, RuPay</span>
                  </label>
                </div>
                
                <div 
                  className={`flex items-center p-3 rounded-lg cursor-pointer border ${detailedPaymentMethod === 'wallet' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                  onClick={() => setDetailedPaymentMethod('wallet')}
                >
                  <input
                    id="wallet"
                    type="radio"
                    name="detailedPaymentMethod"
                    value="wallet"
                    checked={detailedPaymentMethod === 'wallet'}
                    onChange={() => setDetailedPaymentMethod('wallet')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="wallet" className="ml-2 flex justify-between w-full">
                    <span className="font-medium text-gray-700">Mobile Wallet</span>
                    <span className="text-xs text-gray-500">Paytm, PhonePe, Amazon Pay</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Dynamic pricing component */}
        {pickup && destination && distance && (
          <DynamicPricingDisplay 
            pickup={pickup}
            destination={destination}
            distance={distance}
            durationMins={durationMins}
            normalDurationMins={normalDurationMins}
            onPriceCalculated={handlePriceCalculated}
          />
        )}
        
        {/* Book button with detailed payment method info */}
        <button 
          className={`w-full py-3 px-4 rounded-md font-medium text-white ${priceDetails ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
          disabled={!priceDetails}
          onClick={handleBookRide}
        >
          Book Ride for ₹{priceDetails ? priceDetails.finalPrice.toFixed(2) : '0.00'}
          {priceDetails && (
            <span className="block text-xs mt-1 font-normal">
              {paymentMethod === 'cash' ? 
                '💵 Pay with Cash on Delivery' : 
                detailedPaymentMethod === 'upi' ? '📱 Pay with UPI' : 
                detailedPaymentMethod === 'card' ? '💳 Pay with Card' : 
                '👛 Pay with Wallet'}
            </span>
          )}
        </button>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          By booking, you agree to our terms and conditions
        </p>
      </div>
    </div>
  );
};

export default BookRide;