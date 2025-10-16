const Ride = require('../models/Ride');
const dynamicPricingService = require('../services/dynamicPricingService');
const DynamicPricing = require('../models/dynamicPricing');

// Simple pricing controller that calculates ride prices based on real-time factors
class PricingController {
  // Calculate price based on distance and real-time factors
  async calculatePrice(req, res) {
    try {
      const { pickup, destination, distance, basePrice, vehicleType, ratePerKm } = req.body;
      
      if (!pickup || !destination || !distance) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required parameters' 
        });
      }

      // Use dynamicPricingService to calculate realistic price with multipliers
      const priceDetails = await dynamicPricingService.calculateDynamicPrice(
        { latitude: pickup.latitude || pickup.lat, longitude: pickup.longitude || pickup.lng },
        Number(distance),
        basePrice || 25,
        vehicleType || '',
        ratePerKm != null ? Number(ratePerKm) : null
      );
      
      return res.json(priceDetails);
    } catch (error) {
      console.error('Error calculating price:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to calculate price' 
      });
    }
  }

  // Get pricing factors based on current conditions
  async getPricingFactors(req, res) {
    try {
      const { latitude, longitude } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Location coordinates are required' });
      }
      // Fetch data
      const loc = { latitude: Number(latitude), longitude: Number(longitude) };
      const weatherData = await dynamicPricingService.getWeatherData(loc);
      const trafficData = await dynamicPricingService.getTrafficData(loc);
      const demandData = await dynamicPricingService.getDemandData(loc);
      const timeMultiplier = dynamicPricingService.getTimeBasedMultiplier();

      // Calculate multipliers
      const weatherMultiplier = dynamicPricingService.calculateWeatherMultiplier(weatherData);
      const trafficMultiplier = dynamicPricingService.calculateTrafficMultiplier(trafficData);
      const demandMultiplier = dynamicPricingService.calculateDemandMultiplier(demandData);

      // Compute zone info for area-wise surge display
      const zoneId = dynamicPricingService.computeZoneId(loc);
      const zoneBounds = dynamicPricingService.getZoneBounds(zoneId);
      const zoneCenter = dynamicPricingService.getZoneCenter(zoneId);

      return res.json({
        // Zone metadata for frontend UI
        zone: {
          id: zoneId,
          bounds: zoneBounds,
          center: zoneCenter
        },
        // Multipliers summary (existing fields retained for compatibility)
        weatherMultiplier,
        trafficMultiplier,
        demandMultiplier,
        timeMultiplier,
        // Current conditions snapshot
        currentWeather: weatherData.weather?.[0]?.main?.toLowerCase() || 'clear',
        currentTraffic: trafficData.congestionLevel || 'light',
        demandSupplyRatio: demandData.ratio || 1.0,
        isPeakHour: timeMultiplier > 1
      });
    } catch (error) {
      console.error('Error getting pricing factors:', error);
      return res.status(500).json({ success: false, message: 'Failed to get pricing factors' });
    }
  }

  // Get aggregated zone stats for admin/analytics
  async getZoneStats(req, res) {
    try {
      const { zoneId } = req.params;
      const windowHours = Number(req.query.hours) || 2;
      if (!zoneId) {
        return res.status(400).json({ success: false, message: 'zoneId is required' });
      }
      const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

      // Fetch recent dynamic pricing records for the zone
      const records = await DynamicPricing.find({ zoneId, createdAt: { $gte: since } }).limit(500).lean();

      // Aggregate multipliers
      const agg = {
        count: records.length,
        avgCombinedMultiplier: 0,
        avgWeatherMultiplier: 0,
        avgTrafficMultiplier: 0,
        avgDemandMultiplier: 0,
        avgTimeMultiplier: 0
      };

      if (records.length) {
        for (const r of records) {
          agg.avgCombinedMultiplier += (r.combinedMultiplier || 1);
          agg.avgWeatherMultiplier += (r.weatherMultiplier || 1);
          agg.avgTrafficMultiplier += (r.trafficMultiplier || 1);
          agg.avgDemandMultiplier += (r.demandMultiplier || 1);
          agg.avgTimeMultiplier += (r.timeMultiplier || 1);
        }
        agg.avgCombinedMultiplier = +(agg.avgCombinedMultiplier / records.length).toFixed(2);
        agg.avgWeatherMultiplier = +(agg.avgWeatherMultiplier / records.length).toFixed(2);
        agg.avgTrafficMultiplier = +(agg.avgTrafficMultiplier / records.length).toFixed(2);
        agg.avgDemandMultiplier = +(agg.avgDemandMultiplier / records.length).toFixed(2);
        agg.avgTimeMultiplier = +(agg.avgTimeMultiplier / records.length).toFixed(2);
      }

      // Determine surge level based on avg combined multiplier
      let surgeLevel = 'normal';
      if (agg.avgCombinedMultiplier >= 2.5) surgeLevel = 'extreme';
      else if (agg.avgCombinedMultiplier >= 2.0) surgeLevel = 'high';
      else if (agg.avgCombinedMultiplier >= 1.5) surgeLevel = 'moderate';

      // Ride activity within the window
      const [ridesCreated, ridesAccepted, ridesCompleted] = await Promise.all([
        Ride.countDocuments({ pickupZoneId: zoneId, createdAt: { $gte: since } }),
        Ride.countDocuments({ pickupZoneId: zoneId, status: 'accepted', createdAt: { $gte: since } }),
        Ride.countDocuments({ pickupZoneId: zoneId, status: 'completed', createdAt: { $gte: since } })
      ]);

      const bounds = dynamicPricingService.getZoneBounds(zoneId);
      const center = dynamicPricingService.getZoneCenter(zoneId);
      const zoneMultiplier = await dynamicPricingService.getZoneMultiplier(zoneId);

      return res.json({
        success: true,
        zone: { id: zoneId, bounds, center },
        windowHours,
        pricingAnalytics: { ...agg, surgeLevel, zoneMultiplier },
        activity: { ridesCreated, ridesAccepted, ridesCompleted }
      });
    } catch (error) {
      console.error('Error getting zone stats:', error);
      return res.status(500).json({ success: false, message: 'Failed to get zone stats' });
    }
  }
}

module.exports = new PricingController();