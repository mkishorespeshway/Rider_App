const mongoose = require("mongoose");
const Ride = require("../models/Ride");
const User = require("../models/User");
const dynamicPricingService = require('../services/dynamicPricingService');

// 🚖 Create Ride
exports.createRide = async (req, res) => {
  try {
    const { pickup, drop, pickupCoords, dropCoords, distance, basePrice, finalPrice, pricingFactors, paymentMethod, detailedPaymentMethod, requestedVehicleType } = req.body;

    // Normalize coords to expected { lat, lng } even if frontend sends { latitude, longitude }
    const normalizeCoords = (c) => {
      if (!c || typeof c !== "object") return null;
      const lat = c.lat != null ? c.lat : c.latitude;
      const lng = c.lng != null ? c.lng : c.longitude;
      if (lat == null || lng == null) return null;
      const nLat = Number(lat);
      const nLng = Number(lng);
      return {
        lat: Number.isFinite(nLat) ? nLat : lat,
        lng: Number.isFinite(nLng) ? nLng : lng,
      };
    };

    const safePickupCoords = normalizeCoords(pickupCoords);
    const safeDropCoords = normalizeCoords(dropCoords);

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Basic required field validation to avoid schema errors
    if (!pickup || !drop) {
      return res.status(400).json({ success: false, message: "Pickup and drop addresses are required" });
    }
    if (!safePickupCoords || !safeDropCoords) {
      return res.status(400).json({ success: false, message: "Pickup and drop coordinates are required" });
    }
    if (safePickupCoords.lat == null || safePickupCoords.lng == null || safeDropCoords.lat == null || safeDropCoords.lng == null) {
      return res.status(400).json({ success: false, message: "Invalid coordinates provided" });
    }

    // Compute zone ids for pickup and drop
    const pickupZoneId = safePickupCoords && safePickupCoords.lat != null && safePickupCoords.lng != null
      ? dynamicPricingService.computeZoneId({ latitude: safePickupCoords.lat, longitude: safePickupCoords.lng })
      : null;
    const dropZoneId = safeDropCoords && safeDropCoords.lat != null && safeDropCoords.lng != null
      ? dynamicPricingService.computeZoneId({ latitude: safeDropCoords.lat, longitude: safeDropCoords.lng })
      : null;

    // === Safe defaults for distance and pricing ===
    const toRad = (v) => (Number(v) * Math.PI) / 180;
    const haversineKm = (a, b) => {
      const R = 6371; // Earth radius in km
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
    };

    let distanceNum = Number(distance);
    if (!Number.isFinite(distanceNum) || distanceNum <= 0) {
      distanceNum = Number(haversineKm(safePickupCoords, safeDropCoords).toFixed(2));
    }

    let safeBasePrice = Number(basePrice);
    let safeFinalPrice = Number(finalPrice);
    let safePricingFactors = pricingFactors;
    // Sanitize requested vehicle type for consistent storage and matching
    const safeRequestedType = (requestedVehicleType != null && requestedVehicleType !== "")
      ? String(requestedVehicleType).trim().toLowerCase()
      : "";

    if (!Number.isFinite(safeBasePrice) || safeBasePrice <= 0 || !Number.isFinite(safeFinalPrice) || safeFinalPrice <= 0) {
      try {
        const priceDetails = await dynamicPricingService.calculateDynamicPrice(
          { latitude: safePickupCoords.lat, longitude: safePickupCoords.lng },
          distanceNum,
          Number.isFinite(safeBasePrice) && safeBasePrice > 0 ? safeBasePrice : 25,
          requestedVehicleType || '',
          null
        );
        safeBasePrice = Number(priceDetails.basePrice);
        safeFinalPrice = Number(priceDetails.finalPrice);
        safePricingFactors = priceDetails.factors || safePricingFactors;
      } catch (e) {
        const fallback = Number((25 + distanceNum * 5).toFixed(2));
        safeBasePrice = fallback;
        safeFinalPrice = fallback;
      }
    }


    // If DB is not connected, short-circuit with a mock response to avoid timeouts in dev
    if (mongoose.connection.readyState !== 1) {
      const mockRide = {
        _id: new mongoose.Types.ObjectId(),
        riderId: req.user._id,
        pickup,
        drop,
        pickupCoords: safePickupCoords || pickupCoords,
        dropCoords: safeDropCoords || dropCoords,
        pickupZoneId,
        dropZoneId,
        distance: distanceNum,
        basePrice: safeBasePrice,
        finalPrice: safeFinalPrice,
        pricingFactors: safePricingFactors,
        paymentMethod: paymentMethod || "COD",
        detailedPaymentMethod: detailedPaymentMethod || "",
        requestedVehicleType: requestedVehicleType || "",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // Broadcast only when a vehicle type is explicitly chosen
      try {
        const io = req.app.get("io");
        const vType = String(mockRide.requestedVehicleType || "").trim().toLowerCase();
        if (vType) {
          io.to(`vehicle:${vType}`).emit("rideRequest", mockRide);
        }
      } catch {}
      return res.status(201).json({ success: true, message: "Ride created (mock, DB offline)", ride: mockRide });
    }


    const ride = new Ride({
      riderId: req.user._id, // user who books
      pickup,
      drop,
      pickupCoords: safePickupCoords,
      dropCoords: safeDropCoords,
      pickupZoneId,
      dropZoneId,
      distance: distanceNum,
      basePrice: safeBasePrice,
      finalPrice: safeFinalPrice,
      pricingFactors: safePricingFactors,
      paymentMethod: paymentMethod || "COD", // Default to COD if not specified
      detailedPaymentMethod: detailedPaymentMethod || "", // Store detailed payment method if provided
      requestedVehicleType: safeRequestedType,
      status: "pending",
    });

    await ride.save();

     // 🔥 notify only riders of the requested vehicle type when set
    const io = req.app.get("io");
    const vType = String(ride.requestedVehicleType || "").trim().toLowerCase();
    if (vType) {
      io.to(`vehicle:${vType}`).emit("rideRequest", ride);
    }
 
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

     // Ensure rider vehicle type matches ride requested vehicle type
    const riderProfile = await User.findById(req.user._id).lean();
    const riderType = riderProfile?.vehicleType || riderProfile?.vehicle?.type || null;
    const rideForType = await Ride.findById(rideId).lean();
    if (!rideForType) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }
    if (rideForType.status !== "pending") {
      return res.status(400).json({ success: false, message: "Ride already handled" });
    }
    if (
      riderType &&
      rideForType.requestedVehicleType &&
      String(riderType).trim().toLowerCase() !== String(rideForType.requestedVehicleType).trim().toLowerCase()
    ) {
      return res.status(403).json({ success: false, message: "Ride type does not match your vehicle" });
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
        profilePicture: driver.profilePicture || null,
        // include rider profile fields needed by booking popup
        preferredLanguage: driver.preferredLanguage || null,
        preferredLanguages: Array.isArray(driver.preferredLanguages) ? driver.preferredLanguages : [],
        vehicleType: driver.vehicleType || null,
        // fall back to nested vehicle registration if available
        vehicleNumber: driver.vehicleNumber || (driver.vehicle && driver.vehicle.registrationNumber) || null,
        vehicle: driver.vehicle || {},
      },
    });

    // Notify other riders of this vehicle type to remove the ride from their lists
    try {
      const vTypeBroadcast = String(
        ride.requestedVehicleType || riderType || driver.vehicleType || (driver.vehicle && driver.vehicle.type) || ""
      ).trim().toLowerCase();
      if (vTypeBroadcast) {
        io.to(`vehicle:${vTypeBroadcast}`).emit("rideLocked", { rideId: ride._id });
      }
    } catch (e) {
      console.warn("rideLocked emit warning:", e.message);
    }

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

    // Locally mark this ride as rejected by the current rider so only they don't see it
    if (!Array.isArray(ride.rejectedBy)) ride.rejectedBy = [];
    const me = req.user?._id?.toString();
    const already = ride.rejectedBy.some((id) => id.toString() === me);
    if (!already && me) {
      ride.rejectedBy.push(req.user._id);
    }
    await ride.save();

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
  // Validate OTP must be pre-set by the booking user and match
  if (!ride.rideOtp) {
    return res.status(400).json({ success: false, message: "OTP not set for this ride" });
  }
  if (String(ride.rideOtp) !== String(otp)) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }
  
  // Update ride status to in_progress only after correct OTP
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
 
// 📝 Persist per-ride OTP from Booking page
exports.setRideOtp = async (req, res) => {
  try {
    const rideId = req.params.id;
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }
 
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }
 
    // Only the booking user can set OTP
    if (ride.riderId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to set OTP for this ride" });
    }
 
    // Allow setting only while accepted/pending
    if (!["pending", "accepted"].includes(ride.status)) {
      return res.status(400).json({ success: false, message: "Cannot set OTP after ride has started" });
    }
 
    ride.rideOtp = String(otp);
    await ride.save();
    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Set ride OTP error:", err);
    res.status(500).json({ error: "Failed to set ride OTP", details: err.message });
  }
};
 
// 🏷️ Set requested vehicle type and notify matching riders
exports.setRequestedVehicleType = async (req, res) => {
  try {
    const rideId = req.params.id;
    const rawType = req.body?.requestedVehicleType;
    const type = String(rawType || "").trim().toLowerCase();
    if (!type) {
      return res.status(400).json({ success: false, message: "Requested vehicle type is required" });
    }
 
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }
 
    // Only allow setting while ride is pending
    if (ride.status !== "pending") {
      return res.status(400).json({ success: false, message: "Cannot change type after ride is handled" });
    }
 
    // Only the booking user can set requested type
    if (ride.riderId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to set type for this ride" });
    }
 
    ride.requestedVehicleType = type;
    await ride.save();
 
    // Notify only riders of the selected vehicle type
    try {
      const io = req.app.get("io");
      if (io && type) {
        io.to(`vehicle:${type}`).emit("rideRequest", ride);
      }
    } catch (e) {
      console.warn("setRequestedVehicleType emit warning:", e.message);
    }
 
    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Set requested vehicle type error:", err);
    res.status(500).json({ error: "Failed to set requested vehicle type", details: err.message });
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

    // Enforce business rule: can only complete after OTP verification (in_progress)
    if (ride.status !== "in_progress") {
      return res.status(400).json({ success: false, message: "Cannot complete ride before start (OTP verification required)" });
    }

    // Mark completed
    ride.status = "completed";
    await ride.save();

    // Populate rider and driver before returning/broadcasting
    const populatedRide = await Ride.findById(ride._id)
      .populate("riderId", "fullName email mobile")
      .populate("driverId", "fullName email mobile vehicleType vehicleNumber preferredLanguage preferredLanguages profilePicture vehicle");

    // Notify the user to proceed to payment
    const io = req.app.get("io");
    io.to(ride.riderId.toString()).emit("rideCompleted", populatedRide);

    res.json({ success: true, ride: populatedRide });
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
    // Optional filter by rider's vehicleType if rider is logged in
    let query = { status: "pending" };
    if (req.user && req.user.role === "rider") {
      const riderProfile = await User.findById(req.user._id).lean();
      const vType = riderProfile?.vehicleType || riderProfile?.vehicle?.type || null;
      if (vType) {
        const vLower = String(vType).trim().toLowerCase();
        query = { ...query, requestedVehicleType: vLower };
      }
      // Exclude rides this rider has rejected locally
      query = { ...query, rejectedBy: { $nin: [req.user._id] } };

    }
    const rides = await Ride.find(query).populate("riderId", "fullName mobile");
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
    const ride = await Ride.findById(req.params.id)
      .populate("driverId", "fullName email mobile vehicleType vehicleNumber preferredLanguage preferredLanguages profilePicture vehicle");
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }
    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Ride fetch by ID error:", err);
    res.status(500).json({ error: "Failed to fetch ride" });
  }
};

// ✏️ Update ride details (pickup/drop) before OTP verification
exports.updateRideDetails = async (req, res) => {
  try {
    const rideId = req.params.id;
    const { pickup, drop, pickupCoords, dropCoords, pickupAddress, dropAddress } = req.body || {};

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    // Only the booking user can edit ride details
    if (!req.user || ride.riderId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this ride" });
    }

    // Allow edits only while pending or accepted (before OTP verification)
    if (!["pending", "accepted"].includes(String(ride.status))) {
      return res.status(400).json({ success: false, message: "Cannot change ride details after start" });
    }

    // Apply provided fields
    if (typeof pickup !== "undefined") ride.pickup = pickup;
    if (typeof drop !== "undefined") ride.drop = drop;
    if (typeof pickupCoords === "object" && pickupCoords) ride.pickupCoords = pickupCoords;
    if (typeof dropCoords === "object" && dropCoords) ride.dropCoords = dropCoords;
    if (typeof pickupAddress === "string") ride.pickup = pickupAddress; // keep string form in pickup
    if (typeof dropAddress === "string") ride.drop = dropAddress; // keep string form in drop

    await ride.save();

    // Notify rider and user about updated route if rider is assigned
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(ride.riderId.toString()).emit("rideDetailsUpdated", ride);
        if (ride.driverId) {
          io.to(ride.driverId.toString()).emit("rideDetailsUpdated", ride);
        }
      }
    } catch (e) {
      console.warn("rideDetailsUpdated emit warning:", e.message);
    }

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Update ride details error:", err);
    res.status(500).json({ error: "Failed to update ride details", details: err.message });
  }
};
