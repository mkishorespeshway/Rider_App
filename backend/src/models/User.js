const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true },
    mobile: { type: String, required: true, unique: true },

    // ✅ Only Rider, User, Admin
    role: {
      type: String,
      enum: ["rider", "user", "admin"],
      default: "user",
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // Riders may need admin approval later
    },

    // Rider documents if needed
    documents: {
      aadharFront: { url: String, mimetype: String, public_id: String },
      aadharBack: { url: String, mimetype: String, public_id: String },
      license: { url: String, mimetype: String, public_id: String },
      panCard: { url: String, mimetype: String, public_id: String },
      rc: { url: String, mimetype: String, public_id: String },
    },

    loginCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ mobile: 1 });

module.exports = mongoose.model("User", userSchema);
