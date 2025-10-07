const mongoose = require('mongoose');

const dynamicPricingSchema = new mongoose.Schema({
  basePrice: {
    type: Number,
    required: true,
    default: 25 // Base price in rupees
  },
  weatherMultiplier: {
    type: Number,
    required: true,
    default: 1.0 // Default multiplier (no effect)
  },
  trafficMultiplier: {
    type: Number,
    required: true,
    default: 1.0 // Default multiplier (no effect)
  },
  demandMultiplier: {
    type: Number,
    required: true,
    default: 1.0 // Default multiplier (no effect)
  },
  timeMultiplier: {
    type: Number,
    required: true,
    default: 1.0 // Default multiplier (no effect)
  },
  maxSurgeMultiplier: {
    type: Number,
    required: true,
    default: 3.0 // Maximum surge multiplier
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  // Zone metadata for auditability and aggregation
  zoneId: {
    type: String,
    index: true,
    required: false
  },
  zoneBounds: {
    minLat: { type: Number },
    minLng: { type: Number },
    maxLat: { type: Number },
    maxLng: { type: Number }
  },
  zoneCenter: {
    lat: { type: Number },
    lng: { type: Number }
  },
  // Persist combined multiplier used at calculation time for analytics
  combinedMultiplier: {
    type: Number,
    required: true,
    default: 1.0
  }
}, { timestamps: true });

// Create a geospatial index for location-based queries
dynamicPricingSchema.index({ location: '2dsphere' });
// Index zoneId for efficient zone queries
dynamicPricingSchema.index({ zoneId: 1 });

module.exports = mongoose.model('DynamicPricing', dynamicPricingSchema);