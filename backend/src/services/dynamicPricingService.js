const axios = require('axios');
const mongoose = require('mongoose');
const DynamicPricing = require('../models/dynamicPricing');
const Ride = require('../models/Ride');

// Weather API configuration (using OpenWeatherMap as an example)
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'your_weather_api_key';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Traffic API configuration (using TomTom as an example)
const TRAFFIC_API_KEY = process.env.TRAFFIC_API_KEY || 'your_traffic_api_key';
const TRAFFIC_API_URL = 'https://api.tomtom.com/traffic/services/4/flowSegmentData';

class DynamicPricingService {
  /**
   * Calculate the final price based on various factors
   * @param {Object} location - { latitude, longitude }
   * @param {Number} distance - Distance in kilometers
   * @param {Number} basePrice - Base price for the ride (fallback)
   * @param {String} vehicleType - Selected vehicle type (bike|auto|car|suv|parcel)
   * @param {Number|null} ratePerKm - Optional explicit per-km rate
   * @returns {Object} - Final price details
   */
  async calculateDynamicPrice(location, distance, basePrice = 25, vehicleType = "", ratePerKm = null) {
    try {
      // Get real-time data
      const weatherData = await this.getWeatherData(location);
      const trafficData = await this.getTrafficData(location);
      const demandData = await this.getDemandData(location);
      const timeMultiplier = this.getTimeBasedMultiplier();

      // Calculate multipliers
      const weatherMultiplier = this.calculateWeatherMultiplier(weatherData);
      const trafficMultiplier = this.calculateTrafficMultiplier(trafficData);
      const demandMultiplier = this.calculateDemandMultiplier(demandData);

      // Calculate zone multiplier based on recent analytics for this area
      const zoneId = this.computeZoneId(location);
      const zoneMultiplier = await this.getZoneMultiplier(zoneId);

      // Calculate combined multiplier (disabled for upfront fares)
      // Rapido-style upfront fare: disable surge; keep multipliers informational only
      const combinedMultiplier = 1.0;

      // Resolve per-km rate by vehicle type when provided
      const resolvedPerKm = (ratePerKm != null && Number(ratePerKm) > 0)
        ? Number(ratePerKm)
        : this.resolveRatePerKm(vehicleType);

      // Calculate base price according to selected vehicle type when available
      const distancePrice = Number(
        (resolvedPerKm ? (distance * resolvedPerKm) : (basePrice + (distance * 5)))
      .toFixed(2));
      // Upfront fare equals base distance price; no surge applied
      const finalPrice = Number(distancePrice.toFixed(2));

      // Save pricing data for analytics
      await this.savePricingData(location, {
        basePrice,
        weatherMultiplier,
        trafficMultiplier,
        demandMultiplier,
        timeMultiplier,
        combinedMultiplier
      });

      return {
        basePrice: distancePrice,
        finalPrice,
        surgeMultiplier: combinedMultiplier,
        factors: {
          weather: 'Normal',
          traffic: 'Normal',
          demand: 'Normal',
          time: 'Normal'
        }
      };
    } catch (error) {
      console.error('Error calculating dynamic price:', error);
      // Fallback to base price calculation if APIs fail
      const resolvedPerKm = (ratePerKm != null && Number(ratePerKm) > 0)
        ? Number(ratePerKm)
        : this.resolveRatePerKm(vehicleType);
      const distancePrice = Number(
        (resolvedPerKm ? (distance * resolvedPerKm) : (basePrice + (distance * 5)))
      .toFixed(2));
      return {
        basePrice: distancePrice,
        finalPrice: distancePrice,
        surgeMultiplier: 1.0,
        factors: {
          weather: 'Normal (fallback)',
          traffic: 'Normal (fallback)',
          demand: 'Normal (fallback)',
          time: 'Normal (fallback)'
        }
      };
    }
  }

  // Resolve per-km rate based on vehicle type
  resolveRatePerKm(vehicleType) {
    switch ((vehicleType || '').toLowerCase()) {
      case 'bike':
        return 10;
      case 'auto':
        return 15;
      case 'car':
      case 'suv':
        return 20;
      case 'parcel':
        return 12;
      default:
        return null; // fall back to basePrice + 5/km
    }
  }

  /**
   * Get weather data from external API
   * @param {Object} location - { latitude, longitude }
   * @returns {Object} - Weather data
   */
  async getWeatherData(location) {
    try {
      // In production, use actual API call
      // const response = await axios.get(WEATHER_API_URL, {
      //   params: {
      //     lat: location.latitude,
      //     lon: location.longitude,
      //     appid: WEATHER_API_KEY,
      //     units: 'metric'
      //   }
      // });
      // return response.data;

      // For development/demo, return mock data
      return this.getMockWeatherData(location);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return { main: { temp: 25 }, weather: [{ main: 'Clear' }] };
    }
  }

  /**
   * Get traffic data from external API
   * @param {Object} location - { latitude, longitude }
   * @returns {Object} - Traffic data
   */
  async getTrafficData(location) {
    try {
      // In production, use actual API call
      // const response = await axios.get(TRAFFIC_API_URL, {
      //   params: {
      //     point: `${location.latitude},${location.longitude}`,
      //     key: TRAFFIC_API_KEY
      //   }
      // });
      // return response.data;

      // For development/demo, return mock data
      return this.getMockTrafficData(location);
    } catch (error) {
      console.error('Error fetching traffic data:', error);
      return { congestionLevel: 'low' };
    }
  }

  /**
   * Get demand data from database or cache
   * @param {Object} location - { latitude, longitude }
   * @returns {Object} - Demand data
   */
  async getDemandData(location) {
    try {
      // If MongoDB is not connected, use mock demand immediately to avoid timeouts
      if (mongoose.connection.readyState !== 1) {
        return this.getMockDemandData(location);
      }
      // In a real app, this would query your database for active riders and drivers
      // in the area to calculate demand/supply ratio
      
      // For development/demo, prefer zone-based heuristic if available
      const zoneId = this.computeZoneId(location);
      const now = new Date();
      const since = new Date(now.getTime() - 60 * 60 * 1000); // last 1h
      const recentRides = await Ride.countDocuments({ createdAt: { $gte: since }, pickupZoneId: zoneId });
      // Assume drivers online ~ recent accepted rides * 0.6 (mock heuristic)
      const recentAccepted = await Ride.countDocuments({ createdAt: { $gte: since }, status: 'accepted', pickupZoneId: zoneId });
      const estimatedDrivers = Math.max(1, Math.round(recentAccepted * 0.6));
      const ratio = estimatedDrivers ? recentRides / estimatedDrivers : recentRides; // riders/drivers
      const demandLevel = ratio > 5 ? 'extreme' : ratio > 3 ? 'high' : ratio > 1.5 ? 'moderate' : 'normal';
      return { demandLevel, ratio };
    } catch (error) {
      console.error('Error fetching demand data:', error);
      return { demandLevel: 'normal', ratio: 1.0 };
    }
  }

  /**
   * Calculate weather-based multiplier
   * @param {Object} weatherData - Weather data from API
   * @returns {Number} - Weather multiplier
   */
  calculateWeatherMultiplier(weatherData) {
    const weatherCondition = weatherData.weather[0].main.toLowerCase();
    const temperature = weatherData.main.temp;

    // Increase price during rain, snow, or extreme temperatures
    if (weatherCondition.includes('rain') || weatherCondition.includes('thunderstorm')) {
      return 1.5; // 50% increase during rain
    } else if (weatherCondition.includes('snow')) {
      return 1.7; // 70% increase during snow
    } else if (temperature > 40 || temperature < 5) {
      return 1.3; // 30% increase during extreme temperatures
    }

    return 1.0; // No increase for normal weather
  }

  /**
   * Calculate traffic-based multiplier
   * @param {Object} trafficData - Traffic data from API
   * @returns {Number} - Traffic multiplier
   */
  calculateTrafficMultiplier(trafficData) {
    const congestionLevel = trafficData.congestionLevel.toLowerCase();

    // Increase price during heavy traffic
    if (congestionLevel === 'severe') {
      return 1.6; // 60% increase during severe traffic
    } else if (congestionLevel === 'heavy') {
      return 1.4; // 40% increase during heavy traffic
    } else if (congestionLevel === 'moderate') {
      return 1.2; // 20% increase during moderate traffic
    }

    return 1.0; // No increase for light traffic
  }

  /**
   * Calculate demand-based multiplier
   * @param {Object} demandData - Demand data
   * @returns {Number} - Demand multiplier
   */
  calculateDemandMultiplier(demandData) {
    const ratio = demandData.ratio; // Riders to drivers ratio

    // Increase price during high demand
    if (ratio > 5) {
      return 2.0; // 100% increase for extreme demand
    } else if (ratio > 3) {
      return 1.5; // 50% increase for high demand
    } else if (ratio > 1.5) {
      return 1.2; // 20% increase for moderate demand
    }

    return 1.0; // No increase for normal demand
  }

  /**
   * Calculate time-based multiplier
   * @returns {Number} - Time multiplier
   */
  getTimeBasedMultiplier() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check if it's a weekday (Monday to Friday)
    const isWeekday = day >= 1 && day <= 5;

    // Morning rush hour (7 AM to 10 AM on weekdays)
    if (isWeekday && hour >= 7 && hour < 10) {
      return 1.3; // 30% increase
    }
    
    // Evening rush hour (5 PM to 8 PM on weekdays)
    if (isWeekday && hour >= 17 && hour < 20) {
      return 1.4; // 40% increase
    }
    
    // Late night (11 PM to 5 AM)
    if (hour >= 23 || hour < 5) {
      return 1.2; // 20% increase
    }

    return 1.0; // No increase for normal hours
  }

  // ---- Zone helpers (simple grid-based zones) ----
  /** Compute a simple grid zone id (e.g., 0.01° grid) */
  computeZoneId({ latitude, longitude }) {
    const grid = 0.01; // ~1.11km in latitude; adjust as needed
    const latIdx = Math.floor(latitude / grid);
    const lngIdx = Math.floor(longitude / grid);
    return `Z_${latIdx}_${lngIdx}`;
  }

  /** Get zone bounds for a given zoneId */
  getZoneBounds(zoneId) {
    const parts = zoneId.split('_');
    const latIdx = Number(parts[1]);
    const lngIdx = Number(parts[2]);
    const grid = 0.01;
    const minLat = latIdx * grid;
    const minLng = lngIdx * grid;
    const maxLat = (latIdx + 1) * grid;
    const maxLng = (lngIdx + 1) * grid;
    return { minLat, minLng, maxLat, maxLng };
  }

  /** Get zone center for a given zoneId */
  getZoneCenter(zoneId) {
    const b = this.getZoneBounds(zoneId);
    return { lat: (b.minLat + b.maxLat) / 2, lng: (b.minLng + b.maxLng) / 2 };
  }

  /**
   * Save pricing data for analytics
   * @param {Object} location - { latitude, longitude }
   * @param {Object} pricingData - Pricing data
   */
  async getZoneMultiplier(zoneId) {
    try {
      if (mongoose.connection.readyState !== 1) return 1.0;
      // Look back over the last 2 hours of DynamicPricing records in this zone
      const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const records = await DynamicPricing.find({ zoneId, createdAt: { $gte: since } }).limit(100).lean();
      if (!records.length) return 1.0;
      // Use a simple heuristic: higher average combinedMultiplier implies ongoing surge
      const avgCombined = records.reduce((sum, r) => sum + (r.combinedMultiplier || 1), 0) / records.length;
      // Map avgCombined to a zone-level adjustment in [0.9, 1.3]
      if (avgCombined >= 2.5) return 1.3;
      if (avgCombined >= 2.0) return 1.2;
      if (avgCombined >= 1.5) return 1.1;
      if (avgCombined <= 0.9) return 0.95;
      return 1.0;
    } catch (e) {
      console.error('getZoneMultiplier error', e);
      return 1.0;
    }
  }

  async savePricingData(location, pricingData) {
    try {
      // Skip persistence when DB is offline to avoid buffering timeouts in dev
      if (mongoose.connection.readyState !== 1) return;
      const zoneId = this.computeZoneId(location);
      const zoneBounds = this.getZoneBounds(zoneId);
      const zoneCenter = this.getZoneCenter(zoneId);
      await DynamicPricing.create({
        basePrice: pricingData.basePrice,
        weatherMultiplier: pricingData.weatherMultiplier,
        trafficMultiplier: pricingData.trafficMultiplier,
        demandMultiplier: pricingData.demandMultiplier,
        timeMultiplier: pricingData.timeMultiplier,
        combinedMultiplier: pricingData.combinedMultiplier,
        maxSurgeMultiplier: 3.0,
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        },
        zoneId,
        zoneBounds,
        zoneCenter
      });
    } catch (error) {
      console.error('Error saving pricing data:', error);
    }
  }

  // Mock data methods for development/demo
  getMockWeatherData(location) {
    // Randomly select weather condition
    const weatherConditions = ['Clear', 'Clouds', 'Rain', 'Thunderstorm', 'Snow'];
    const randomIndex = Math.floor(Math.random() * weatherConditions.length);
    const weatherCondition = weatherConditions[randomIndex];
    
    // Generate random temperature between 5 and 40 degrees
    const temperature = Math.floor(Math.random() * 35) + 5;
    
    return {
      main: { temp: temperature },
      weather: [{ main: weatherCondition }]
    };
  }

  getMockTrafficData(location) {
    // Randomly select congestion level
    const congestionLevels = ['light', 'moderate', 'heavy', 'severe'];
    const randomIndex = Math.floor(Math.random() * congestionLevels.length);
    const congestionLevel = congestionLevels[randomIndex];
    
    return { congestionLevel };
  }

  getMockDemandData(location) {
    // Generate random demand ratio between 0.5 and 6
    const ratio = Math.random() * 5.5 + 0.5;
    
    // Determine demand level based on ratio
    let demandLevel = 'normal';
    if (ratio > 3) {
      demandLevel = 'high';
    } else if (ratio > 1.5) {
      demandLevel = 'moderate';
    } else if (ratio < 1) {
      demandLevel = 'low';
    }
    
    return { demandLevel, ratio };
  }
}

module.exports = new DynamicPricingService();