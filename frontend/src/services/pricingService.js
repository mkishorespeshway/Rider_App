import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Service to handle pricing calculations
const PricingService = {
  // Calculate ride price based on pickup, destination and distance
  calculatePrice: async (pickup, destination, distance, basePrice) => {
    try {
      const response = await axios.post(`${API_URL}/pricing/calculate`, {
        pickup,
        destination,
        distance,
        basePrice
      });
      
      return response.data;
    } catch (error) {
      console.error('Error calculating price:', error);
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
      console.error('Error getting pricing factors:', error);
      throw error;
    }
  }
};

export default PricingService;