const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
 
const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const authMiddleware = require("./middleware/authMiddleware");
 
require("dotenv").config();
 
const app = express();
 
// Middleware
app.use(cors());
app.use(express.json());
 
// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ➡️ ${req.method} ${req.url} | Body:`, req.body);
  next();
});
 
// Check MONGO_URI
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in .env");
  process.exit(1);
}
 
// Import models (case-sensitive)
const User = require("./models/User");
const Driver = require("./models/Driver");
const Ride = require("./models/Ride");
const Vehicle = require("./models/Vehicle");
const Payment = require("./models/Payment");
const Otp = require("./models/Otp");
const Parcel = require("./models/Parcel");
 
// MongoDB connection + auto create collections
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log("✅ MongoDB Connected");
 
    // Auto create collections (only if not exist)
    await User.createCollection();
    await Driver.createCollection();
    await Ride.createCollection();
    await Vehicle.createCollection();
    await Payment.createCollection();
    await Otp.createCollection();
    await Parcel.createCollection();
 
    console.log("✅ All collections checked/created (empty if no data yet)");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Stop server if DB fails
  });
 
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
 
// Protected test route
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: `Hello ${req.user.fullName}!`,
    role: req.user.role,
  });
});
 
// Root route
app.get("/", (req, res) => {
  res.send("🚀 rider App Backend is running with auto-created collections");
});
 
// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});
 
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));