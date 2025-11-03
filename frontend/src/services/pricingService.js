import axios from 'axios';

// Ensure env base (e.g., http://localhost:5002) is always prefixed with '/api'
const API_BASE = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
const API_URL = `${API_BASE}/api`;

// Service to handle pricing calculations
const PricingService = {
  // Calculate ride price based on pickup, destination and distance
  calculatePrice: async (pickup, destination, distance, basePrice, vehicleType = '', ratePerKm = null) => {
    try {
      const response = await axios.post(`${API_URL}/pricing/calculate`, {
        pickup,
        destination,
        distance,
        basePrice,
        vehicleType,
        ratePerKm
      });
      
      return response.data;
    } catch (error) {
      console.warn('Price calculation warning:', error);
      throw error;
    }
  },
  
  // Get pricing factors for a location
  getPricingFactors: async (location) => {
    try {
      const response = await axios.get(`${API_URL}/pricing/factors`, {
        params: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      });
      return response.data;
    } catch (error) {
      console.warn('Pricing factors warning:', error);
      throw error;
    }
  }
};

export default PricingService;