const Zone = require('../models/Zone');
const axios = require('axios');

/**
 * Service for tracking real-time demand and supply across zones
 */
class DemandSupplyService {
  /**
   * Update rider and driver counts in a zone
   * @param {String} zoneId - ID of the zone
   * @param {Number} riderDelta - Change in rider count (+1 for new rider, -1 for completed ride)
   * @param {Number} driverDelta - Change in driver count (+1 for available driver, -1 for busy driver)
   */
  async updateZoneCounts(zoneId, riderDelta = 0, driverDelta = 0) {
    try {
      const zone = await Zone.findById(zoneId);
      if (!zone) {
        throw new Error(`Zone with ID ${zoneId} not found`);
      }

      // Update counts
      const activeRiders = Math.max(0, zone.currentStatus.activeRiders + riderDelta);
      const availableDrivers = Math.max(0, zone.currentStatus.availableDrivers + driverDelta);

      await zone.updateStatus({
        activeRiders,
        availableDrivers
      });

      // Recalculate pricing for the zone
      await this.recalculateZonePricing(zone);

      return zone;
    } catch (error) {
      console.error('Error updating zone counts:', error);
      throw error;
    }
  }

  /**
   * Update a driver's location and adjust zone counts
   * @param {String} driverId - ID of the driver
   * @param {Object} location - { longitude, latitude }
   * @param {Boolean} isAvailable - Whether the driver is available for rides
   */
  async updateDriverLocation(driverId, location, isAvailable) {
    try {
      // Find the zone containing this location
      const zone = await Zone.findZoneByLocation(location.longitude, location.latitude);
      if (!zone) {
        throw new Error('No zone found for this location');
      }

      // Get driver's previous zone if any
      const previousZoneId = await this.getDriverPreviousZone(driverId);

      // If driver moved to a new zone, update both zones
      if (previousZoneId && previousZoneId !== zone._id.toString()) {
        // Remove from previous zone
        await this.updateZoneCounts(previousZoneId, 0, -1);
        
        // Add to new zone if available
        if (isAvailable) {
          await this.updateZoneCounts(zone._id, 0, 1);
        }
        
        // Update driver's zone in database
        await this.updateDriverZone(driverId, zone._id);
      } 
      // If new driver or same zone but availability changed
      else if (!previousZoneId || isAvailable) {
        await this.updateZoneCounts(zone._id, 0, isAvailable ? 1 : -1);
        
        // Update driver's zone in database if new
        if (!previousZoneId) {
          await this.updateDriverZone(driverId, zone._id);
        }
      }

      return zone;
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }

  /**
   * Update a rider's location and adjust zone counts
   * @param {String} riderId - ID of the rider
   * @param {Object} location - { longitude, latitude }
   * @param {Boolean} isActive - Whether the rider is actively looking for a ride
   */
  async updateRiderLocation(riderId, location, isActive) {
    try {
      // Find the zone containing this location
      const zone = await Zone.findZoneByLocation(location.longitude, location.latitude);
      if (!zone) {
        throw new Error('No zone found for this location');
      }

      // Get rider's previous zone if any
      const previousZoneId = await this.getRiderPreviousZone(riderId);

      // If rider moved to a new zone, update both zones
      if (previousZoneId && previousZoneId !== zone._id.toString()) {
        // Remove from previous zone
        await this.updateZoneCounts(previousZoneId, -1, 0);
        
        // Add to new zone if active
        if (isActive) {
          await this.updateZoneCounts(zone._id, 1, 0);
        }
        
        // Update rider's zone in database
        await this.updateRiderZone(riderId, zone._id);
      } 
      // If new rider or same zone but activity changed
      else if (!previousZoneId || isActive) {
        await this.updateZoneCounts(zone._id, isActive ? 1 : -1, 0);
        
        // Update rider's zone in database if new
        if (!previousZoneId) {
          await this.updateRiderZone(riderId, zone._id);
        }
      }

      return zone;
    } catch (error) {
      console.error('Error updating rider location:', error);
      throw error;
    }
  }

  /**
   * Update weather and traffic conditions for a zone
   * @param {String} zoneId - ID of the zone
   */
  async updateZoneConditions(zoneId) {
    try {
      const zone = await Zone.findById(zoneId);
      if (!zone) {
        throw new Error(`Zone with ID ${zoneId} not found`);
      }

      // Get center point of zone for API calls
      const centerPoint = this.calculateZoneCenter(zone.boundaries.coordinates[0]);

      // Get weather data
      const weatherCondition = await this.fetchWeatherCondition(centerPoint);
      
      // Get traffic data
      const trafficLevel = await this.fetchTrafficLevel(centerPoint);

      // Update zone status
      await zone.updateStatus({
        weatherCondition,
        trafficLevel
      });

      // Recalculate pricing for the zone
      await this.recalculateZonePricing(zone);

      return zone;
    } catch (error) {
      console.error('Error updating zone conditions:', error);
      throw error;
    }
  }

  /**
   * Recalculate surge pricing for a zone based on current conditions
   * @param {Object} zone - Zone document
   */
  async recalculateZonePricing(zone) {
    try {
      // Base multiplier starts at 1.0 (no surge)
      let surgeMultiplier = 1.0;
      
      // Weather factor (0.0 - 0.7 additional)
      const weatherFactor = this.calculateWeatherFactor(zone.currentStatus.weatherCondition);
      
      // Traffic factor (0.0 - 0.6 additional)
      const trafficFactor = this.calculateTrafficFactor(zone.currentStatus.trafficLevel);
      
      // Demand-supply factor (0.0 - 1.0 additional)
      const demandFactor = this.calculateDemandFactor(zone.currentStatus.demandSupplyRatio);
      
      // Time factor (0.0 - 0.4 additional)
      const timeFactor = this.calculateTimeFactor();
      
      // Calculate combined multiplier
      surgeMultiplier += weatherFactor + trafficFactor + demandFactor + timeFactor;
      
      // Cap at maximum surge (3.0x)
      surgeMultiplier = Math.min(Math.max(surgeMultiplier, 1.0), 3.0);
      
      // Round to 1 decimal place for user-friendly display
      surgeMultiplier = Math.round(surgeMultiplier * 10) / 10;
      
      // Update zone with new surge multiplier
      zone.currentStatus.currentSurgeMultiplier = surgeMultiplier;
      await zone.save();
      
      return surgeMultiplier;
    } catch (error) {
      console.error('Error recalculating zone pricing:', error);
      throw error;
    }
  }

  /**
   * Calculate weather factor for surge pricing
   * @param {String} weatherCondition - Current weather condition
   * @returns {Number} - Weather factor (0.0 - 0.7)
   */
  calculateWeatherFactor(weatherCondition) {
    switch (weatherCondition) {
      case 'thunderstorm':
        return 0.7; // Severe weather
      case 'rain':
        return 0.5; // Rainy
      case 'snow':
        return 0.6; // Snowy
      case 'extreme':
        return 0.7; // Extreme weather
      case 'cloudy':
        return 0.1; // Cloudy
      default:
        return 0.0; // Clear weather, no surge
    }
  }

  /**
   * Calculate traffic factor for surge pricing
   * @param {String} trafficLevel - Current traffic level
   * @returns {Number} - Traffic factor (0.0 - 0.6)
   */
  calculateTrafficFactor(trafficLevel) {
    switch (trafficLevel) {
      case 'severe':
        return 0.6; // Severe traffic
      case 'heavy':
        return 0.4; // Heavy traffic
      case 'moderate':
        return 0.2; // Moderate traffic
      default:
        return 0.0; // Light traffic, no surge
    }
  }

  /**
   * Calculate demand-supply factor for surge pricing
   * @param {Number} ratio - Demand-supply ratio
   * @returns {Number} - Demand factor (0.0 - 1.0)
   */
  calculateDemandFactor(ratio) {
    if (ratio >= 5.0) {
      return 1.0; // Extreme demand
    } else if (ratio >= 3.0) {
      return 0.7; // Very high demand
    } else if (ratio >= 2.0) {
      return 0.4; // High demand
    } else if (ratio >= 1.5) {
      return 0.2; // Moderate demand
    } else {
      return 0.0; // Normal or low demand
    }
  }

  /**
   * Calculate time factor for surge pricing based on current time
   * @returns {Number} - Time factor (0.0 - 0.4)
   */
  calculateTimeFactor() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Check if it's a weekday (Monday to Friday)
    const isWeekday = day >= 1 && day <= 5;
    
    // Morning rush hour (7 AM to 10 AM on weekdays)
    if (isWeekday && hour >= 7 && hour < 10) {
      return 0.3;
    }
    
    // Evening rush hour (5 PM to 8 PM on weekdays)
    if (isWeekday && hour >= 17 && hour < 20) {
      return 0.4;
    }
    
    // Late night (11 PM to 5 AM)
    if (hour >= 23 || hour < 5) {
      return 0.2;
    }
    
    return 0.0; // Normal hours, no surge
  }

  /**
   * Calculate center point of a zone polygon
   * @param {Array} coordinates - Array of [longitude, latitude] coordinates
   * @returns {Object} - { longitude, latitude }
   */
  calculateZoneCenter(coordinates) {
    // Simple centroid calculation
    let sumLon = 0;
    let sumLat = 0;
    
    for (const point of coordinates) {
      sumLon += point[0];
      sumLat += point[1];
    }
    
    return {
      longitude: sumLon / coordinates.length,
      latitude: sumLat / coordinates.length
    };
  }

  /**
   * Fetch weather condition from external API
   * @param {Object} location - { longitude, latitude }
   * @returns {String} - Weather condition
   */
  async fetchWeatherCondition(location) {
    try {
      // In production, use actual API call
      // const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      //   params: {
      //     lat: location.latitude,
      //     lon: location.longitude,
      //     appid: process.env.WEATHER_API_KEY,
      //     units: 'metric'
      //   }
      // });
      
      // const weatherMain = response.data.weather[0].main.toLowerCase();
      
      // For development/demo, return mock data
      return this.getMockWeatherCondition();
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return 'clear'; // Default to clear weather
    }
  }

  /**
   * Fetch traffic level from external API
   * @param {Object} location - { longitude, latitude }
   * @returns {String} - Traffic level
   */
  async fetchTrafficLevel(location) {
    try {
      // In production, use actual API call
      // const response = await axios.get('https://api.tomtom.com/traffic/services/4/flowSegmentData', {
      //   params: {
      //     point: `${location.latitude},${location.longitude}`,
      //     key: process.env.TRAFFIC_API_KEY
      //   }
      // });
      
      // For development/demo, return mock data
      return this.getMockTrafficLevel();
    } catch (error) {
      console.error('Error fetching traffic data:', error);
      return 'light'; // Default to light traffic
    }
  }

  /**
   * Get driver's previous zone
   * @param {String} driverId - ID of the driver
   * @returns {String} - Previous zone ID or null
   */
  async getDriverPreviousZone(driverId) {
    // In a real app, this would query your database
    // For demo purposes, return null (simulating new driver)
    return null;
  }

  /**
   * Update driver's zone in database
   * @param {String} driverId - ID of the driver
   * @param {String} zoneId - ID of the zone
   */
  async updateDriverZone(driverId, zoneId) {
    // In a real app, this would update your database
    console.log(`Updated driver ${driverId} to zone ${zoneId}`);
  }

  /**
   * Get rider's previous zone
   * @param {String} riderId - ID of the rider
   * @returns {String} - Previous zone ID or null
   */
  async getRiderPreviousZone(riderId) {
    // In a real app, this would query your database
    // For demo purposes, return null (simulating new rider)
    return null;
  }

  /**
   * Update rider's zone in database
   * @param {String} riderId - ID of the rider
   * @param {String} zoneId - ID of the zone
   */
  async updateRiderZone(riderId, zoneId) {
    // In a real app, this would update your database
    console.log(`Updated rider ${riderId} to zone ${zoneId}`);
  }

  /**
   * Get mock weather condition for development/demo
   * @returns {String} - Weather condition
   */
  getMockWeatherCondition() {
    const conditions = ['clear', 'cloudy', 'rain', 'thunderstorm', 'snow', 'extreme'];
    const randomIndex = Math.floor(Math.random() * conditions.length);
    return conditions[randomIndex];
  }

  /**
   * Get mock traffic level for development/demo
   * @returns {String} - Traffic level
   */
  getMockTrafficLevel() {
    const levels = ['light', 'moderate', 'heavy', 'severe'];
    const randomIndex = Math.floor(Math.random() * levels.length);
    return levels[randomIndex];
  }
}

module.exports = new DemandSupplyService();