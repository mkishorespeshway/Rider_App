// models/User.js
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  url: { type: String },
  mimetype: { type: String },
  public_id: { type: String },
});

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String },
    role: { type: String, enum: ["user", "rider", "admin"], default: "user" },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    // documents object with keys for each doc
    documents: {
      aadharFront: { type: documentSchema, default: null },
      aadharBack: { type: documentSchema, default: null },
      license: { type: documentSchema, default: null },
      panCard: { type: documentSchema, default: null },
      rc: { type: documentSchema, default: null },
    },
    // any other fields you have
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
