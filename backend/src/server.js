const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const cors = require("cors");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const dotenv = require("dotenv");

// Load env from multiple possible locations
dotenv.config();
const envCandidates = [
  path.resolve(__dirname, "../.env.local"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(__dirname, "../../.env"),
];
for (const p of envCandidates) {
  try {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
    }
  } catch {}
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

// Fail fast for Mongoose
mongoose.set("bufferCommands", false);

// Socket.IO setup
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("join", (userId) => {
    console.log(`📌 User joined room: ${userId}`);
    socket.join(userId);
  });

  socket.on("registerRiderVehicleType", (vehicleType) => {
    const vType = String(vehicleType || "").trim().toLowerCase();
    if (vType) {
      const roomName = `vehicle:${vType}`;
      socket.join(roomName);
      console.log(`🚗 Rider joined vehicle room: ${roomName} (socket: ${socket.id})`);
    }
  });

  socket.on("joinRideRoom", (rideId) => {
    try {
      if (!rideId) return;
      const room = `ride:${rideId}`;
      socket.join(room);
      console.log(`💬 Joined ride room: ${room}`);
    } catch (e) {
      console.warn("joinRideRoom warning:", e?.message || e);
    }
  });

  socket.on("chatMessage", ({ rideId, fromUserId, text }) => {
    try {
      if (!rideId || !text) return;
      const room = `ride:${rideId}`;
      const payload = { rideId, fromUserId, text, at: Date.now() };
      io.to(room).emit("chatMessage", payload);
      console.log(`💬 Chat in ${room}:`, text);
    } catch (e) {
      console.warn("chatMessage relay warning:", e?.message || e);
    }
  });

  socket.on("riderAccepted", (ride) => {
    console.log("🚖 Rider accepted ride:", ride._id);
    io.to(ride.riderId.toString()).emit("rideAccepted", ride);
  });

  socket.on("riderRejected", (ride) => {
    console.log("❌ Ride rejected:", ride._id);
    io.to(ride.riderId.toString()).emit("rideRejected", ride);
  });

  socket.on("riderLocation", ({ rideId, coords }) => {
    console.log(`📍 Rider location update for ride ${rideId}:`, coords);
    io.emit("riderLocationUpdate", { rideId, coords });
  });

  // Broadcast rider online/offline status (vehicle type included)
  socket.on("riderAvailability", ({ isOnline, vehicleType, riderId }) => {
    try {
      const payload = {
        isOnline: !!isOnline,
        vehicleType: String(vehicleType || "").trim().toLowerCase(),
        riderId: riderId || null,
        at: Date.now(),
      };
      io.emit("riderAvailabilityUpdate", payload);
      console.log("🟢 riderAvailabilityUpdate:", payload);
    } catch (e) {
      console.warn("riderAvailability relay warning:", e?.message || e);
    }
  });

  // Broadcast rider's current available location to all clients
  socket.on("riderAvailableLocation", ({ coords, vehicleType, riderId }) => {
    try {
      if (!coords || coords.lat == null || coords.lng == null) return;
      const payload = {
        coords,
        vehicleType: String(vehicleType || "").trim().toLowerCase(),
        riderId: riderId || null,
        at: Date.now(),
      };
      io.emit("riderAvailableLocationUpdate", payload);
      console.log("📍 riderAvailableLocationUpdate:", payload);
    } catch (e) {
      console.warn("riderAvailableLocation relay warning:", e?.message || e);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// --- CORS Setup ---
const allowedOrigins = [
  "http://localhost:3000",        // React dev
  "https://yourdomain.com",       // Deployed site
  "https://www.yourdomain.com"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Allow pre-flight for all routes
app.options("*", cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware
app.use(express.json({ limit: "10mb" }));

// Raw body for webhook route
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
// JSON parser for all other routes
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') return next();
  return express.json({ limit: '10mb' })(req, res, next);
});

// Normalize multiple slashes in URL
app.use((req, _res, next) => {
  try {
    req.url = req.url.replace(/\/{2,}/g, '/');
  } catch {}
  next();
});

// Request logger
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ➡️ ${req.method} ${req.originalUrl} | Body:`,
    req.body
  );
  next();
});

// MongoDB connection (with in-memory fallback)
async function connectDatabase() {
  const opts = { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000 };
  const uri = process.env.MONGO_URI;
  let connected = false;
  try {
    if (uri) {
      await mongoose.connect(uri, opts);
      connected = true;
      console.log("✅ MongoDB Connected");
    } else {
      throw new Error("MONGO_URI missing");
    }
  } catch (err) {
    console.warn("⚠️ MongoDB connect failed:", err.message);
    console.warn("➡️ Starting in-memory MongoDB for development");
    try {
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri, opts);
      connected = true;
      console.log("✅ In-memory MongoDB started");
      process.on("SIGINT", async () => {
        try { await mongod.stop(); } catch {}
        process.exit(0);
      });
    } catch (memErr) {
      console.warn("⚠️ In-memory MongoDB failed:", memErr.message);
      console.warn("➡️ Continuing in DB-offline mode; controllers have safe fallbacks.");
    }
  }

  app.set("dbOnline", connected);

  if (!connected) {
    return;
  }

  const User = require("./models/User");
  const Ride = require("./models/Ride");
  const Vehicle = require("./models/Vehicle");
  const Payment = require("./models/Payment");
  const Otp = require("./models/Otp");
  const Parcel = require("./models/Parcel");

  try {
    const models = [
      { model: User, name: "User" },
      { model: Ride, name: "Ride" },
      { model: Vehicle, name: "Vehicle" },
      { model: Payment, name: "Payment" },
      { model: Otp, name: "Otp" },
      { model: Parcel, name: "Parcel" },
    ];
    for (const { model, name } of models) {
      if (mongoose.connection.readyState === 1 && model && model.createCollection) {
        await model.createCollection();
        console.log(`✅ ${name} collection ensured`);
      }
    }
    console.log("✅ All collections checked/created");
  } catch (err) {
    console.warn("⚠️ Error ensuring collections:", err.message);
  }
}

connectDatabase().catch((e) => console.error("❌ DB init error:", e));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/otp", require("./routes/otpRoutes"));
app.use("/api/rides", require("./routes/rides.routes"));
app.use("/api/rider", require("./routes/rider.routes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/parcels", require("./routes/parcelRoutes"));
app.use("/api/sos", require("./routes/sosRoutes"));
app.use("/api/pricing", require("./routes/pricingRoutes"));
app.use("/api/payments", require("./routes/payments.routes"));
app.use("/api/wallet", require("./routes/wallet.routes"));

app.use("/uploads", express.static("uploads"));

// Protected route example
const authMiddleware = require("./middleware/authMiddleware");
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: `Hello ${req.user.fullName || "User"}!`,
    role: req.user.role,
  });
});

// Serve React Frontend if build exists
const frontendPath = path.resolve(__dirname, "../../frontend/build");
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get("*", (req, res) => {
    if (req.url.startsWith("/api")) {
      return res
        .status(404)
        .json({ success: false, message: "API route not found" });
    }
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  // Without a build
  app.get("*", (req, res) => {
    if (req.url.startsWith("/api")) {
      return res
        .status(404)
        .json({ success: false, message: "API route not found" });
    }
    res.status(404).send("Frontend build not found");
  });
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
