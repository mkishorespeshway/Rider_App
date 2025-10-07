import React, { useState, useEffect } from 'react';
import pricingService from '../services/pricingService';

const DynamicPricing = ({ pickup, destination, distance, onPriceCalculated }) => {
  const [priceDetails, setPriceDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Calculate price when pickup, destination or distance changes
    if (pickup && destination && distance) {
      calculatePrice();
    }
  }, [pickup, destination, distance]);

  const calculatePrice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const details = await pricingService.calculatePrice(pickup, destination, distance);
      setPriceDetails(details);
      
      // Notify parent component about the calculated price
      if (onPriceCalculated) {
        onPriceCalculated(details);
      }
    } catch (err) {
      console.error('Failed to calculate price:', err);
      setError('Unable to calculate price. Please try again.');
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

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-semibold mb-2">Ride Fare</h3>
      
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-600">Base fare:</span>
        <span>₹{priceDetails.basePrice.toFixed(2)}</span>
      </div>
      
      {priceDetails.surgeMultiplier > 1 && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 mb-3">
          <div className="flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-yellow-700">Dynamic pricing is active</span>
          </div>
          
          <p className="text-sm text-yellow-600">
            Fare is {Math.round((priceDetails.surgeMultiplier - 1) * 100)}% higher due to:
          </p>
          
          <ul className="text-sm text-yellow-600 mt-1 ml-5 list-disc">
            {priceDetails.factors.weather !== 'Normal' && (
              <li>{priceDetails.factors.weather}</li>
            )}
            {priceDetails.factors.traffic !== 'Normal' && (
              <li>{priceDetails.factors.traffic}</li>
            )}
            {priceDetails.factors.demand !== 'Normal' && (
              <li>{priceDetails.factors.demand}</li>
            )}
            {priceDetails.factors.time !== 'Normal' && (
              <li>{priceDetails.factors.time}</li>
            )}
          </ul>
        </div>
      )}
      
      <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-3">
        <span className="font-semibold">Total fare:</span>
        <span className="font-bold text-xl">₹{priceDetails.finalPrice.toFixed(2)}</span>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Fare may change if pickup or destination location changes
      </p>
    </div>
  );
};

export default DynamicPricing;