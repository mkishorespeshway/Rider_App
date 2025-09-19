const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
<<<<<<< HEAD
const path = require("path");

=======
 
>>>>>>> aced6b199b083cb320663ecabeb739aba4129a5a
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
  console.log(
    `[${new Date().toISOString()}] ➡️ ${req.method} ${req.url} | Body:`,
    req.body
  );
  next();
});
<<<<<<< HEAD

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
=======
 
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
>>>>>>> aced6b199b083cb320663ecabeb739aba4129a5a
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Stop server if DB fails
  });
<<<<<<< HEAD

// API Routes
app.use("/api/auth", authRoutes); // Auth routes
app.use("/api/otp", otpRoutes); // OTP routes
app.use("/api/rider", require("./routes/rider.routes"));
app.use("/uploads", express.static("uploads"));

=======
 
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
 
>>>>>>> aced6b199b083cb320663ecabeb739aba4129a5a
// Protected test route
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: `Hello ${req.user.fullName}!`,
    role: req.user.role,
  });
});
<<<<<<< HEAD

// === Serve Frontend Build ===
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));

// Catch-all for React Router (only non-API routes)
app.get("*", (req, res) => {
  if (req.url.startsWith("/api")) {
    return res.status(404).json({ success: false, message: "API route not found" });
  }
  res.sendFile(path.join(frontendPath, "index.html"));
=======
 
// Root route
app.get("/", (req, res) => {
  res.send("🚀 rider App Backend is running with auto-created collections");
});
 
// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
>>>>>>> aced6b199b083cb320663ecabeb739aba4129a5a
});
 
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));