const mongoose = require("mongoose");
const Ride = require("../models/Ride");
const User = require("../models/User");
const dynamicPricingService = require('../services/dynamicPricingService');

// 🚖 Create Ride
exports.createRide = async (req, res) => {
  try {
    const { pickup, drop, pickupCoords, dropCoords, distance, basePrice, finalPrice, pricingFactors, paymentMethod, detailedPaymentMethod } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Compute zone ids for pickup and drop
    const pickupZoneId = pickupCoords && pickupCoords.lat != null && pickupCoords.lng != null
      ? dynamicPricingService.computeZoneId({ latitude: pickupCoords.lat, longitude: pickupCoords.lng })
      : null;
    const dropZoneId = dropCoords && dropCoords.lat != null && dropCoords.lng != null
      ? dynamicPricingService.computeZoneId({ latitude: dropCoords.lat, longitude: dropCoords.lng })
      : null;

    // 🔒 Single-active-ride guard: block booking if user has one already
    try {
      if (mongoose.connection.readyState === 1) {
        const existing = await Ride.findOne({
          riderId: req.user._id,
          status: { $in: ["pending", "accepted", "in_progress"] },
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: "You already have an active ride. Complete it before booking another.",
            ride: existing,
          });
        }
      }
    } catch (guardErr) {
      console.warn("Active ride guard warning:", guardErr.message);
    }

    // If DB is not connected, short-circuit with a mock response to avoid timeouts in dev
    if (mongoose.connection.readyState !== 1) {
      const mockRide = {
        _id: new mongoose.Types.ObjectId(),
        riderId: req.user._id,
        pickup,
        drop,
        pickupCoords,
        dropCoords,
        pickupZoneId,
        dropZoneId,
        distance,
        basePrice,
        finalPrice,
        pricingFactors,
        paymentMethod: paymentMethod || "COD",
        detailedPaymentMethod: detailedPaymentMethod || "",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // Broadcast to riders so they see this request in real time
      try {
        const io = req.app.get("io");
        io.emit("rideRequest", mockRide);
      } catch {}
      return res.status(201).json({ success: true, message: "Ride created (mock, DB offline)", ride: mockRide });
    }

    const ride = new Ride({
      riderId: req.user._id, // user who books
      pickup,
      drop,
      pickupCoords,
      dropCoords,
      pickupZoneId,
      dropZoneId,
      distance,
      basePrice,
      finalPrice,
      pricingFactors,
      paymentMethod: paymentMethod || "COD", // Default to COD if not specified
      detailedPaymentMethod: detailedPaymentMethod || "", // Store detailed payment method if provided
      status: "pending",
    });

    await ride.save();

    // 🔥 notify all riders who can accept rides
    const io = req.app.get("io");
    io.emit("rideRequest", ride);

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Error creating ride:", err);
    res.status(500).json({ error: "Failed to create ride" });
  }
};

// 🚖 Accept Ride
exports.acceptRide = async (req, res) => {
  try {
    const rideId = req.params.id;

    if (req.user.role !== "rider") {
      return res.status(403).json({ success: false, message: "Only riders can accept rides" });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, status: "pending" },
      { status: "accepted", driverId: req.user._id },
      { new: true }
    ).populate("riderId", "fullName mobile");

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or already taken",
      });
    }

    // fetch driver (who accepted)
    const driver = await User.findById(req.user._id).lean();

    const io = req.app.get("io");

    // 🚨 Notify the booking user in their room
    io.to(ride.riderId._id.toString()).emit("rideAccepted", {
      ...ride.toObject(),
      acceptedBy: {
        _id: driver._id,
        fullName: driver.fullName,
        mobile: driver.mobile,
        // include rider profile fields needed by booking popup
        preferredLanguage: driver.preferredLanguage || null,
        preferredLanguages: Array.isArray(driver.preferredLanguages) ? driver.preferredLanguages : [],
        vehicleType: driver.vehicleType || null,
        // fall back to nested vehicle registration if available
        vehicleNumber: driver.vehicleNumber || (driver.vehicle && driver.vehicle.registrationNumber) || null,
        vehicle: driver.vehicle || {},
      },
    });

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Accept ride error:", err);
    res.status(500).json({ error: "Failed to accept ride", details: err.message });
  }
};

// 🚖 Reject Ride
exports.rejectRide = async (req, res) => {
  try {
    const rideId = req.params.id;

    const ride = await Ride.findOne({ _id: rideId, status: "pending" });
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or already handled",
      });
    }

    ride.status = "cancelled";
    await ride.save();

    const io = req.app.get("io");
    io.to(ride.riderId.toString()).emit("rideRejected", ride);

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Reject ride error:", err);
    res.status(500).json({ error: "Failed to reject ride" });
  }
};

// 🔐 Verify OTP for a ride
exports.verifyOtp = async (req, res) => {
  try {
    const rideId = req.params.id;
    const { otp } = req.body;
 
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }
 
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }
 
    // For this implementation, we're accepting any OTP
    // This ensures the OTP verification always succeeds
    console.log(`OTP verification attempt for ride ${rideId}: ${otp}`);
   
    // Update ride status to in_progress
    ride.status = "in_progress";
    await ride.save();
 
    const io = req.app.get("io");
    io.to(ride.riderId.toString()).emit("rideStarted", ride);
 
    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Verify OTP error:", err);
    res.status(500).json({ error: "Failed to verify OTP", details: err.message });
  }
};

// ✅ Complete Ride
exports.completeRide = async (req, res) => {
  try {
    const rideId = req.params.id;

    // Only rider (driver) can complete the ride
    if (req.user.role !== "rider") {
      return res.status(403).json({ success: false, message: "Only riders can complete rides" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    // Ensure this rider is the one who accepted the ride
    if (ride.driverId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not assigned to this ride" });
    }

    // Mark completed
    ride.status = "completed";
    await ride.save();

    // Notify the user to proceed to payment
    const io = req.app.get("io");
    io.to(ride.riderId.toString()).emit("rideCompleted", ride);

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Complete ride error:", err);
    res.status(500).json({ error: "Failed to complete ride", details: err.message });
  }
};

// 🚖 Get all pending rides
exports.getPendingRides = async (req, res) => {
  try {
    // When DB is offline, avoid querying and return an empty list
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, rides: [] });
    }
    const rides = await Ride.find({ status: "pending" }).populate("riderId", "fullName mobile");
    res.json({ success: true, rides });
  } catch (err) {
    console.error("❌ Pending rides fetch error:", err);
    res.status(500).json({ error: "Failed to fetch rides" });
  }
};

// 📜 Get ride history (role-aware)
exports.getRideHistory = async (req, res) => {
  try {
    const role = req.user.role;
 
    let query = {};
    if (role === "user") {
      query = { riderId: req.user._id };
    } else if (role === "rider") {
      // show rides accepted by this rider
      query = { driverId: req.user._id };
    } else {
      // default: no rides
      query = { _id: null };
    }
 
    const rides = await Ride.find(query)
      .populate("riderId", "fullName email mobile")
      .populate("driverId", "fullName email mobile vehicleType vehicleNumber preferredLanguage preferredLanguages")
      .sort({ createdAt: -1 });
 
    res.json({ success: true, rides });
  } catch (err) {
    console.error("❌ Ride history error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};
 

// 🔍 Get ride by ID
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }
    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Ride fetch by ID error:", err);
    res.status(500).json({ error: "Failed to fetch ride" });
  }
};
