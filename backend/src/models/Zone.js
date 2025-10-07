const mongoose = require('mongoose');

// Schema for city zones with geo-location boundaries
const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  // GeoJSON polygon representing the zone boundaries
  boundaries: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of coordinates [longitude, latitude]
      required: true
    }
  },
  // Current zone status
  currentStatus: {
    weatherCondition: {
      type: String,
      enum: ['clear', 'cloudy', 'rain', 'thunderstorm', 'snow', 'extreme'],
      default: 'clear'
    },
    trafficLevel: {
      type: String,
      enum: ['light', 'moderate', 'heavy', 'severe'],
      default: 'light'
    },
    // Active riders in this zone
    activeRiders: {
      type: Number,
      default: 0
    },
    // Available drivers in this zone
    availableDrivers: {
      type: Number,
      default: 0
    },
    // Demand-supply ratio (calculated field)
    demandSupplyRatio: {
      type: Number,
      default: 1.0
    },
    // Current surge multiplier for this zone
    currentSurgeMultiplier: {
      type: Number,
      default: 1.0,
      min: 1.0,
      max: 3.0
    },
    // Timestamp of last update
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Historical pricing data for analytics
  pricingHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    weatherCondition: String,
    trafficLevel: String,
    activeRiders: Number,
    availableDrivers: Number,
    demandSupplyRatio: Number,
    surgeMultiplier: Number
  }]
}, { timestamps: true });

// Create a geospatial index for efficient geo-queries
zoneSchema.index({ boundaries: '2dsphere' });

// Method to find zone containing a point
zoneSchema.statics.findZoneByLocation = async function(longitude, latitude) {
  return this.findOne({
    boundaries: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }
    }
  });
};

// Method to update zone status
zoneSchema.methods.updateStatus = async function(statusData) {
  // Update current status
  if (statusData.weatherCondition) {
    this.currentStatus.weatherCondition = statusData.weatherCondition;
  }
  
  if (statusData.trafficLevel) {
    this.currentStatus.trafficLevel = statusData.trafficLevel;
  }
  
  if (statusData.activeRiders !== undefined) {
    this.currentStatus.activeRiders = statusData.activeRiders;
  }
  
  if (statusData.availableDrivers !== undefined) {
    this.currentStatus.availableDrivers = statusData.availableDrivers;
  }
  
  // Calculate demand-supply ratio
  if (this.currentStatus.availableDrivers > 0) {
    this.currentStatus.demandSupplyRatio = this.currentStatus.activeRiders / this.currentStatus.availableDrivers;
  } else {
    // If no drivers, set a high ratio
    this.currentStatus.demandSupplyRatio = 5.0;
  }
  
  // Update timestamp
  this.currentStatus.lastUpdated = new Date();
  
  // Add to history
  this.pricingHistory.push({
    timestamp: new Date(),
    weatherCondition: this.currentStatus.weatherCondition,
    trafficLevel: this.currentStatus.trafficLevel,
    activeRiders: this.currentStatus.activeRiders,
    availableDrivers: this.currentStatus.availableDrivers,
    demandSupplyRatio: this.currentStatus.demandSupplyRatio,
    surgeMultiplier: this.currentStatus.currentSurgeMultiplier
  });
  
  // Limit history size to prevent document growth
  if (this.pricingHistory.length > 100) {
    this.pricingHistory = this.pricingHistory.slice(-100);
  }
  
  return this.save();
};

module.exports = mongoose.model('Zone', zoneSchema);