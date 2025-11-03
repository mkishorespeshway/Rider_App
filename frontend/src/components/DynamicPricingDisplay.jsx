import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Ensure env base (e.g., http://localhost:5002) is always prefixed with '/api'
const API_BASE = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
const API_URL = `${API_BASE}/api`;

const DynamicPricingDisplay = ({ pickup, destination, distance, durationMins, normalDurationMins, onPriceCalculated }) => {
  const [priceDetails, setPriceDetails] = useState(null);
  const [zoneInfo, setZoneInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to normalize coordinates to { latitude, longitude } numbers
  const normalizeCoords = (pt) => {
    if (!pt) return null;
    const lat = Number(pt.latitude ?? pt.lat);
    const lng = Number(pt.longitude ?? pt.lng);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { latitude: lat, longitude: lng };
  };

  useEffect(() => {
    if (pickup && (pickup.latitude ?? pickup.lat) && (pickup.longitude ?? pickup.lng)) {
      // Always fetch zone info using normalized coordinates
      const normalizedPickup = normalizeCoords(pickup);
      if (normalizedPickup) {
        fetchZoneInfo(normalizedPickup);
      }
      calculatePrice();
    }
  }, [pickup, destination, distance, durationMins, normalDurationMins]);

  const formatCoord = (n) => {
    if (typeof n !== 'number') return n;
    return n.toFixed(5);
  };

  const fetchZoneInfo = async (location) => {
    try {
      setLoading(true);
      // Fetch area-wise factors (includes zone id, bounds, center)
      const response = await axios.get(`${API_URL}/pricing/factors`, {
        params: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      });
      setZoneInfo(response.data);
    } catch (err) {
      console.warn('Pricing factors/zone info warning:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = async () => {
    // Guard and normalize inputs before hitting API
    const normPickup = normalizeCoords(pickup);
    const normDest = normalizeCoords(destination);
    const distNum = Number(distance);

    if (!normPickup || !normDest || !isFinite(distNum)) {
      setError('Please select valid pickup and destination, and ensure the route is calculated.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(`${API_URL}/pricing/calculate`, {
        pickup: normPickup,
        destination: normDest,
        distance: distNum,
        // Future: include durations if backend uses them
        estimatedDurationMins: durationMins,
        normalDurationMins
      });
      
      setPriceDetails(response.data);
      
      if (onPriceCalculated) {
        onPriceCalculated(response.data);
      }
    } catch (err) {
      console.warn('Price calculation warning:', err?.response?.data || err.message);
      // Graceful fallback to basic fare if API fails
      const fallbackBase = Number((25 + (isFinite(distNum) ? distNum : 0) * 5).toFixed(2));
      const fallback = {
        basePrice: fallbackBase,
        finalPrice: fallbackBase,
        surgeMultiplier: 1.0,
        factors: {
          weather: 'Normal (fallback)',
          traffic: 'Normal (fallback)',
          demand: 'Normal (fallback)',
          time: 'Normal (fallback)'
        }
      };
      setPriceDetails(fallback);
      if (onPriceCalculated) {
        onPriceCalculated(fallback);
      }
      // Do not show error UI when fallback is displayed
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="animate-pulse flex flex-col space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
        <p>{error}</p>
        <button 
          onClick={calculatePrice}
          className="mt-2 text-sm font-medium text-red-700 hover:text-red-900"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!priceDetails) {
    return null;
  }

  const deltaMins = (durationMins != null && normalDurationMins != null) ? Math.max(durationMins - normalDurationMins, 0) : null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">

      {/* Visible zone metadata block */}
      {zoneInfo?.zone && (
        <div className="mb-3 border border-indigo-200 bg-indigo-50 rounded-md p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-indigo-700">Area: {zoneInfo.zone.id}</span>
            <span className="text-xs text-indigo-700">Center: {formatCoord(zoneInfo.zone.center?.lat)}, {formatCoord(zoneInfo.zone.center?.lng)}</span>
          </div>
          <div className="mt-1 text-xs text-indigo-700">
            Bounds: [ {formatCoord(zoneInfo.zone.bounds?.minLat)}, {formatCoord(zoneInfo.zone.bounds?.minLng)} ] → [ {formatCoord(zoneInfo.zone.bounds?.maxLat)}, {formatCoord(zoneInfo.zone.bounds?.maxLng)} ]
          </div>
        </div>
      )}

      {/* Route metrics */}
      {(distance || durationMins || normalDurationMins) && (
        <div className="mb-3 border border-gray-200 bg-gray-50 rounded-md p-3">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Route:</span>
            <span className="ml-2">
              {distance ? `${distance} km` : ''}
              {(distance && (durationMins || normalDurationMins)) ? ' • ' : ''}
              {durationMins ? `ETA ${durationMins} mins` : ''}
              {(durationMins && normalDurationMins) ? ` • Normal ${normalDurationMins} mins` : ''}
              {deltaMins != null ? ` • +${deltaMins} mins` : ''}
            </span>
          </div>
          {zoneInfo && (
            <div className="mt-2 text-xs text-gray-600">
              <p className="font-medium">Impacting conditions:</p>
              <ul className="mt-1 ml-5 list-disc">
                {zoneInfo.currentTraffic && (
                  <li>Traffic: {zoneInfo.currentTraffic} (×{(zoneInfo.trafficMultiplier ?? 1).toFixed ? zoneInfo.trafficMultiplier.toFixed(2) : zoneInfo.trafficMultiplier || 1})</li>
                )}
                {zoneInfo.currentWeather && (
                  <li>Weather: {zoneInfo.currentWeather} (×{(zoneInfo.weatherMultiplier ?? 1).toFixed ? zoneInfo.weatherMultiplier.toFixed(2) : zoneInfo.weatherMultiplier || 1})</li>
                )}
                {zoneInfo.demandSupplyRatio != null && (
                  <li>Demand: ratio {zoneInfo.demandSupplyRatio} (×{(zoneInfo.demandMultiplier ?? 1).toFixed ? zoneInfo.demandMultiplier.toFixed(2) : zoneInfo.demandMultiplier || 1})</li>
                )}
                {zoneInfo.isPeakHour && (
                  <li>Peak hour (×{(zoneInfo.timeMultiplier ?? 1).toFixed ? zoneInfo.timeMultiplier.toFixed(2) : zoneInfo.timeMultiplier || 1})</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
      

      {priceDetails.surgeMultiplier > 1 && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 mb-3">
          <div className="flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-yellow-700">Dynamic pricing is active</span>
          </div>
          
          <p className="text-sm text-yellow-600">
            Fare is {Math.round((priceDetails.surgeMultiplier - 1) * 100)}% higher due to current conditions in your area
          </p>
          
          {zoneInfo && (
            <div className="mt-2 text-xs text-yellow-700">
              <p className="font-medium">Current conditions in {zoneInfo.zone?.id ? `Zone ${zoneInfo.zone.id}` : 'your area'}:</p>
              <ul className="mt-1 ml-5 list-disc">
                {zoneInfo.currentWeather && zoneInfo.currentWeather !== 'clear' && (
                  <li>Weather: {zoneInfo.currentWeather}</li>
                )}
                {zoneInfo.currentTraffic && zoneInfo.currentTraffic !== 'light' && (
                  <li>Traffic: {zoneInfo.currentTraffic}</li>
                )}
                {zoneInfo.demandSupplyRatio && zoneInfo.demandSupplyRatio > 1.5 && (
                  <li>High demand in this area</li>
                )}
                {zoneInfo.isPeakHour && (
                  <li>Peak hour pricing</li>
                )}
              </ul>
            </div>
          )}
          
          <div className="mt-2 text-xs text-yellow-600 flex justify-between items-center">
            <span>Prices may drop soon</span>
            <button className="text-yellow-700 font-medium underline">Notify me when lower</button>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-3">
-        <span className="font-semibold">Total fare:</span>
+        <span className="font-semibold">Upfront fare:</span>
         <span className="font-bold text-xl">₹{priceDetails.finalPrice.toFixed(2)}</span>
       </div>
       
-      <p className="text-xs text-gray-500 mt-2">
-        Fare calculated by our automated pricing system
-      </p>
+      <p className="text-xs text-gray-500 mt-2">
+        Upfront fare locked at booking and matches payment
+      </p>
    </div>
  );
};

// Helper function to check if current time is rush hour
function isRushHour() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Check if it's a weekday (Monday to Friday)
  const isWeekday = day >= 1 && day <= 5;
  
  // Morning rush hour (7 AM to 10 AM on weekdays)
  if (isWeekday && hour >= 7 && hour < 10) {
    return true;
  }
  
  // Evening rush hour (5 PM to 8 PM on weekdays)
  if (isWeekday && hour >= 17 && hour < 20) {
    return true;
  }
  
  return false;
}

export default DynamicPricingDisplay;