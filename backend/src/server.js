const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
//const sosRoutes = require("./routes/sosRoutes");
//const adminRoutes = require("./routes/adminRoutes");


const sosRoutes = require("./routes/sosRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const ridesRoutes = require("./routes/rides.routes");
const riderRoutes = require("./routes/rider.routes");
const driversRoutes = require("./routes/drivers.routes");
const parcelRoutes = require("./routes/parcelRoutes");
//const captainRoutes = require("./routes/captainRoutes");
 

// === Middleware ===
app.use(cors());
app.use(express.json({ limit: "10mb" })); // ✅ handle larger payloads like images/docs

// Request logger (dev helper)
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ➡️ ${req.method} ${req.originalUrl} | Body:`,
    req.body
  );
  next();
});

// === MongoDB connection ===
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in .env file");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB Connected");

    // Import models AFTER connection
    const User = require("./models/User");
    const Driver = require("./models/Driver");
    const Ride = require("./models/Ride");
    const Vehicle = require("./models/Vehicle");
    const Payment = require("./models/Payment");
    const Otp = require("./models/Otp");
    const Parcel = require("./models/Parcel");

    try {
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
        if (model && model.createCollection) {
          await model.createCollection();
          console.log(`✅ ${name} collection ensured`);
        }
      }
      console.log("✅ All collections checked/created");
    } catch (err) {
      console.error("⚠️ Error ensuring collections:", err.message);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// === Routes ===
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/otp", require("./routes/otpRoutes"));
app.use("/api/rides", require("./routes/rides.routes"));
app.use("/api/rider", require("./routes/rider.routes"));
app.use("/api/drivers", require("./routes/drivers.routes"));
app.use("/api/admin", require("./routes/adminRoutes")); // ✅ Admin Dashboard API
app.use("/api/parcels", require("./routes/parcelRoutes")); // ✅ NEW Parcel API
app.use("/api/sos", sosRoutes);
app.use("/api/admin", adminRoutes);

// Uploads folder
app.use("/uploads", express.static("uploads"));

// Example protected route
const authMiddleware = require("./middleware/authMiddleware");
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: `Hello ${req.user.fullName || "User"}!`,
    role: req.user.role,
  });
});

// === Serve React Frontend ===
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));

// Catch-all handler for frontend routes
app.get("*", (req, res) => {
  if (req.url.startsWith("/api")) {
    return res
      .status(404)
      .json({ success: false, message: "API route not found" });
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});

// === Start server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
