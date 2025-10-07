const dynamicPricingService = require('../services/dynamicPricingService');

/**
 * Controller for dynamic pricing related operations
 */
class DynamicPricingController {
  /**
   * Calculate dynamic price for a ride
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async calculatePrice(req, res) {
    try {
      const { 
        pickup, // { latitude, longitude }
        destination, // { latitude, longitude }
        distance, // in kilometers
        basePrice // optional base price
      } = req.body;

      if (!pickup || !pickup.latitude || !pickup.longitude) {
        return res.status(400).json({ error: 'Pickup location is required' });
      }

      if (!distance || isNaN(distance)) {
        return res.status(400).json({ error: 'Valid distance is required' });
      }

      // Calculate dynamic price
      const priceDetails = await dynamicPricingService.calculateDynamicPrice(
        pickup,
        distance,
        basePrice || 25 // Default base price if not provided
      );

      return res.status(200).json(priceDetails);
    } catch (error) {
      console.error('Error in calculatePrice controller:', error);
      return res.status(500).json({ error: 'Failed to calculate price' });
    }
  }

  /**
   * Get pricing factors for a location
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPricingFactors(req, res) {
    try {
      const { latitude, longitude } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Location coordinates are required' });
      }

      // Get weather data
      const weatherData = await dynamicPricingService.getWeatherData({ latitude, longitude });
      
      // Get traffic data
      const trafficData = await dynamicPricingService.getTrafficData({ latitude, longitude });
      
      // Get demand data
      const demandData = await dynamicPricingService.getDemandData({ latitude, longitude });
      
      // Get time multiplier
      const timeMultiplier = dynamicPricingService.getTimeBasedMultiplier();

      // Calculate individual multipliers
      const weatherMultiplier = dynamicPricingService.calculateWeatherMultiplier(weatherData);
      const trafficMultiplier = dynamicPricingService.calculateTrafficMultiplier(trafficData);
      const demandMultiplier = dynamicPricingService.calculateDemandMultiplier(demandData);

      const zoneId = dynamicPricingService.computeZoneId({ latitude, longitude });
      const zoneBounds = dynamicPricingService.getZoneBounds(zoneId);
      const zoneCenter = dynamicPricingService.getZoneCenter(zoneId);

      return res.status(200).json({
        zone: {
          id: zoneId,
          bounds: zoneBounds,
          center: zoneCenter
        },
        factors: {
          weather: {
            condition: weatherData.weather[0].main,
            temperature: weatherData.main.temp,
            multiplier: weatherMultiplier
          },
          traffic: {
            congestionLevel: trafficData.congestionLevel,
            multiplier: trafficMultiplier
          },
          demand: {
            level: demandData.demandLevel,
            ratio: demandData.ratio,
            multiplier: demandMultiplier
          },
          time: {
            multiplier: timeMultiplier,
            isPeakHour: timeMultiplier > 1
          }
        }
      });
    } catch (error) {
      console.error('Error in getPricingFactors controller:', error);
      return res.status(500).json({ error: 'Failed to get pricing factors' });
    }
  }
}

module.exports = new DynamicPricingController();