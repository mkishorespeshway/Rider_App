const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const { updateDriverLocation } = require("./controllers/rides.controller");


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = http.createServer(app);

// ✅ Socket.IO setup
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.set("io", io); // make io available inside controllers

// === Socket.IO Events ===
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // Rider created a new ride
  socket.on("newRide", (ride) => {
    console.log("📦 New ride request:", ride);
    io.emit("rideRequest", ride); // notify all drivers
  });

  // Driver accepted
  socket.on("acceptRide", (ride) => {
    console.log("🚖 Ride accepted:", ride._id);
    io.emit("rideAccepted", ride); // notify rider
  });

  // Driver rejected
  socket.on("rejectRide", (ride) => {
    console.log("❌ Ride rejected:", ride._id);
    io.emit("rideRejected", ride); // notify rider
  });

  // Driver sends GPS updates
  socket.on("driverLocation", ({ rideId, coords }) => {
    console.log(`📍 Driver location update for ride ${rideId}:`, coords);
    io.emit("driverLocationUpdate", { rideId, coords });
  });

  // Rider sends GPS updates
  socket.on("riderLocation", ({ rideId, coords }) => {
    console.log(`📍 Rider location update for ride ${rideId}:`, coords);
    io.emit("riderLocationUpdate", { rideId, coords });
  });
  
  io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  updateDriverLocation(io, socket);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// === Middleware ===
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Request logger
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
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/parcels", require("./routes/parcelRoutes"));
app.use("/api/sos", require("./routes/sosRoutes"));

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
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

module.exports = app;
