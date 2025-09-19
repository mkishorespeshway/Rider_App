const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // name of the counter, e.g. "rideId"
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

