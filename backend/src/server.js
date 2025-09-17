// backend/src/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes"); // OTP routes
const authMiddleware = require("./middleware/authMiddleware");
require("dotenv").config(); // 🔹 Must be first

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

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // stop server if DB connection fails
  });

// Routes
app.use("/api/auth", authRoutes); // Auth routes
app.use("/api/otp", otpRoutes);   // OTP routes

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
  res.send("🚀 Rider App Backend is running");
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
