const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

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

// ✅ MongoDB connection + auto-create collections
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in .env file");
  process.exit(1);
}

// Import models
const User = require("./models/User");
const Driver = require("./models/Driver");
const Ride = require("./models/Ride");
const Vehicle = require("./models/Vehicle");
const Payment = require("./models/Payment");
const Otp = require("./models/Otp");
const Parcel = require("./models/Parcel");

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB Connected");

    try {
      // Ensure all collections exist
      const models = [
        { model: User, name: "User" },
        { model: Driver, name: "Driver" },
        { model: Ride, name: "Ride" },
        { model: Vehicle, name: "Vehicle" },
        { model: Payment, name: "Payment" },
        { model: Otp, name: "Otp" },
        { model: Parcel, name: "Parcel" },
      ];

      for (const { model, name } of models) {
        await model.createCollection(); // creates collection if not exists
        console.log(`✅ ${name} collection ensured`);
      }

      console.log("✅ All collections checked/created (will show in Atlas once data exists)");
    } catch (err) {
      console.error("⚠️ Error ensuring collections:", err.message);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// API Routes
app.use("/api/auth", authRoutes); // Auth routes
app.use("/api/otp", otpRoutes); // OTP routes
app.use("/api/rider", require("./routes/rider.routes"));
app.use("/uploads", express.static("uploads"));

// Protected test route
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: `Hello ${req.user.fullName}!`,
    role: req.user.role,
  });
});

// === Serve Frontend Build ===
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));

// Catch-all for React Router (only non-API routes)
app.get("*", (req, res) => {
  if (req.url.startsWith("/api")) {
    return res
      .status(404)
      .json({ success: false, message: "API route not found" });
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
module.exports = app; // for testing