const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    role: { type: String, enum: ["user", "rider"], required: true },
    status: { type: String, enum: ["active", "resolved"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SOS", sosSchema);
