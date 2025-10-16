const mongoose = require("mongoose");

const bankDetailsSchema = new mongoose.Schema(
  {
    holderName: { type: String, default: "" },
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifsc: { type: String, default: "" },
    upiVpa: { type: String, default: "" },
  },
  { _id: false }
);

const adminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "admin" },
    bankDetails: { type: bankDetailsSchema, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminSettings", adminSettingsSchema);