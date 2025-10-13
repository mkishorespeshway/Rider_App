import React, { useState, useEffect } from "react";
import {
  Container, Paper, Typography, TextField, Box,
  Button, Drawer, CircularProgress, ListItemButton,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Chip, Avatar
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { io } from "socket.io-client";
import MapComponent from "../components/Map";
import DynamicPricingDisplay from "../components/DynamicPricingDisplay.jsx";
// Razorpay removed from booking flow
// import { initiatePayment, verifyPayment } from "../services/api";
import PricingService from "../services/pricingService";
import SOSButton from "../components/SOSButton";

const socket = io("http://localhost:5000");

// Removed Razorpay loader (no third-party checkout in this flow)
const loadRazorpayScript = () => Promise.resolve(false);

export default function Booking() {
  const mapPanelRef = React.useRef(null);
  // Initialize auth and navigate before any references in effects
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [normalDuration, setNormalDuration] = useState(null);
  const [zoneFactors, setZoneFactors] = useState(null);
  // Helper to parse "X min" into minutes number
  const parseMins = (txt) => {
    if (!txt) return null;
    const m = txt.match(/(\d+)\s*min/);
    return m ? parseInt(m[1], 10) : null;
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rideOptions, setRideOptions] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);

  const [lookingForRider, setLookingForRider] = useState(false);
  const [assignedRider, setAssignedRider] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [riderPanelOpen, setRiderPanelOpen] = useState(false);
  const [rideStatus, setRideStatus] = useState("Waiting for rider 🚖");
  const [otp, setOtp] = useState("");
  // Persist OTP per active ride across refreshes
  useEffect(() => {
    try {
      const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
      const existingId = localStorage.getItem(activeKey);
      if (existingId) {
        const otpKey = `rideOtp:${existingId}`;
        const savedOtp = localStorage.getItem(otpKey);
        if (savedOtp) setOtp(savedOtp);
      }
    } catch {}
  }, [auth]);


  const GOOGLE_API_KEY = "AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo"; // 🔑 Replace with your real key

  // ✅ Join socket room
  useEffect(() => {
    if (auth?.user?._id) {
      socket.emit("join", auth.user._id);
    }
  }, [auth]);

  // 🔄 Restore active ride and keep popup open across refresh until OTP verification
  useEffect(() => {
    const restore = async () => {
      try {
        const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
        const existingId = localStorage.getItem(activeKey);
        if (!existingId) return;
        const resp = await axios.get(`http://localhost:5000/api/rides/${existingId}`, { headers: { Authorization: `Bearer ${auth?.token}` } });
        const ride = resp.data?.ride;
        if (!ride) return;
        // If ride is still pending or accepted, show the drawer with assigned rider (if available)
        if (ride.status === 'pending' || ride.status === 'accepted') {
          // Build assignedRider from populated driverId when available
          const d = ride.driverId || {};
          const assigned = {
            _id: d._id,
            fullName: d.fullName,
            mobile: d.mobile,
            profilePicture: d.profilePicture || null,
            preferredLanguage: d.preferredLanguage || null,
            preferredLanguages: Array.isArray(d.preferredLanguages) ? d.preferredLanguages : [],
            vehicleType: d.vehicleType || null,
            vehicleNumber: d.vehicleNumber || (d.vehicle && d.vehicle.registrationNumber) || null,
            vehicle: d.vehicle || {},
          };
          if (assigned._id) setAssignedRider(assigned);
          setRiderPanelOpen(true);
          setRideStatus('Rider en route 🚖');

          // If accepted and OTP not yet set (e.g., after refresh), load or generate it
          if (ride.status === 'accepted') {
            try {
              const otpKey = `rideOtp:${ride._id}`;
              let saved = localStorage.getItem(otpKey);
              if (!saved) {
                saved = Math.floor(1000 + Math.random() * 9000).toString();
                localStorage.setItem(otpKey, saved);
              }
              setOtp(saved);
            } catch {}
          }
        }
        // If already in progress or completed/cancelled, close and clear
        if (ride.status === 'in_progress') {
          setRiderPanelOpen(false);
          setRideStatus('Ride started ✅');
        }
        if (ride.status === 'completed' || ride.status === 'cancelled') {
          localStorage.removeItem(activeKey);
          setRiderPanelOpen(false);
        }
      } catch (e) {
        // If fetch fails, keep current state; do not close prematurely
      }
    };
    restore();
  }, [auth]);

  // 📍 Get current location for pickup
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickup(loc);
        const addr = await getAddressFromCoords(loc.lat, loc.lng);
        setPickupAddress(addr);
      },
      (err) => console.error("Geolocation error:", err.message)
    );
  }, []);

  // 🌍 Reverse geocode helper
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
      );
      return res.data.results[0]?.formatted_address || "";
    } catch {
      return "";
    }
  };

  // 🔎 Fetch suggestions using Google AutocompleteService (with 50 km radius)
  const fetchSuggestions = (input, setSuggestions, loc) => {
    if (!input || !window.google) return setSuggestions([]);

    const service = new window.google.maps.places.AutocompleteService();

    service.getPlacePredictions(
      {
        input,
        location: loc
          ? new window.google.maps.LatLng(loc.lat, loc.lng)
          : new window.google.maps.LatLng(17.385044, 78.486671), // Hyderabad fallback
        radius: 50000, // ✅ 50 km
        componentRestrictions: { country: "in" }, // ✅ restrict to India (optional)
      },
      (predictions, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const handlePickupSelect = async (placeId, description) => {
    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      service.getDetails(
        { placeId, fields: ["geometry.location"] },
        (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place.geometry
          ) {
            const loc = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            setPickup(loc);
            setPickupAddress(description);
            setPickupSuggestions([]);
          }
        }
      );
    } catch (err) {
      console.error("Pickup place details failed:", err);
    }
  };

  const handleDropSelect = async (placeId, description) => {
    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      service.getDetails(
        { placeId, fields: ["geometry.location"] },
        (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place.geometry
          ) {
            const loc = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            setDrop(loc);
            setDropAddress(description);
            setDropSuggestions([]);
          }
        }
      );
    } catch (err) {
      console.error("Drop place details failed:", err);
    }
  };

  // 🚖 Update ride options dynamically
  useEffect(() => {
    // fetch zone pricing factors when pickup and distance are available
    const fetchFactors = async () => {
      try {
        if (pickup && distance) {
          const loc1 = {
            latitude: pickup.lat || pickup.latitude,
            longitude: pickup.lng || pickup.longitude,
          };
          const f1 = await PricingService.getPricingFactors(loc1);

          let combined = { ...f1 };

          // If drop is available, fetch factors there too and average
          if (drop && (drop.lat || drop.latitude)) {
            const loc2 = {
              latitude: drop.lat || drop.latitude,
              longitude: drop.lng || drop.longitude,
            };
            const f2 = await PricingService.getPricingFactors(loc2);

            const trafficAvg = (((f1.trafficMultiplier || 1) + (f2.trafficMultiplier || 1)) / 2);
            const weatherAvg = (((f1.weatherMultiplier || 1) + (f2.weatherMultiplier || 1)) / 2);

            combined = {
              ...f1,
              // Use pickup metadata for display, but averaged multipliers for pricing
              trafficMultiplier: +trafficAvg.toFixed(2),
              weatherMultiplier: +weatherAvg.toFixed(2),
            };
          }

          // Duration-based traffic adjustment from ETA vs normal ETA
          const parseMinsLocal = (txt) => {
            if (!txt) return null;
            const m = txt.match(/(\d+)\s*min/);
            return m ? parseInt(m[1], 10) : null;
          };
          const curMins = parseMinsLocal(duration || "");
          const normMins = parseMinsLocal(normalDuration || duration || "");
          if (curMins && normMins && normMins > 0) {
            const ratio = curMins / normMins;
            const durAdj = Math.max(1, 1 + (ratio - 1) * 0.6); // scale impact to avoid extreme surges
            combined.trafficMultiplier = Math.max(combined.trafficMultiplier || 1, +durAdj.toFixed(2));
            combined.isPeakHour = combined.isPeakHour || (durAdj > 1);
          }

          setZoneFactors(combined);
        }
      } catch (err) {
        console.error("Failed to fetch pricing factors:", err);
      }
    };
    fetchFactors();
  
    if (distance) {
      const km = parseFloat(distance);
      // format duration strings
      const currentEta = duration || "";
      const normalEta = normalDuration || currentEta;
      // compute delta in minutes when both available in "X mins" form
      const parseMins = (txt) => {
        if (!txt) return null;
        const m = txt.match(/(\d+)\s*min/);
        return m ? parseInt(m[1], 10) : null;
      };
      const curM = parseMins(currentEta);
      const normM = parseMins(normalEta);
      const delta = curM != null && normM != null ? curM - normM : null;
      const deltaText = delta != null && delta > 0 ? ` +${delta} mins` : delta != null && delta < 0 ? ` ${delta} mins` : "";
  
      // multipliers from backend factors (default to 1)
      const tMult = Math.max(zoneFactors?.trafficMultiplier || 1, 1);
      const wMult = Math.max(zoneFactors?.weatherMultiplier || 1, 1);
  
      // helper to compute breakdown given a base fare
      const mkBreakdown = (base) => {
        const trafficAdd = +(base * (tMult - 1)).toFixed(2);
        const weatherAdd = +(base * (wMult - 1)).toFixed(2);
        const total = +(base + trafficAdd + weatherAdd).toFixed(2);
        return { base, trafficAdd, weatherAdd, total };
      };
  
      const bikeBase = +(km * 10).toFixed(2);
      const autoBase = +(km * 15).toFixed(2);
      const carBase = +(km * 20).toFixed(2);
  
      setRideOptions([
        {
          id: "bike",
          name: "Bike • 1 seats",
          eta: currentEta,
          price: `₹${mkBreakdown(bikeBase).total.toFixed(2)}`,
          meta: { km: km.toFixed(2), normalEta, deltaText, breakdown: mkBreakdown(bikeBase) },
          icon: "🚲",
        },
        {
          id: "auto",
          name: "Auto • 3 seats",
          eta: currentEta,
          price: `₹${mkBreakdown(autoBase).total.toFixed(2)}`,
          meta: { km: km.toFixed(2), normalEta, deltaText, breakdown: mkBreakdown(autoBase) },
          icon: "🛺",
        },
        {
          id: "car",
          name: "Car • 4 seats",
          eta: currentEta,
          price: `₹${mkBreakdown(carBase).total.toFixed(2)}`,
          meta: { km: km.toFixed(2), normalEta, deltaText, breakdown: mkBreakdown(carBase) },
          icon: "🚗",
        },
        { id: "parcel", name: "Parcel", eta: "—", price: "Go to Parcel Page", meta: { km: km.toFixed(2), normalEta, deltaText }, icon: "📦" },
      ]);

      // ✅ Auto-select a default ride option if none is selected yet
      setSelectedRide((prev) => prev ?? "bike");
    }
  }, [pickup, distance, duration, normalDuration]);

  // state additions for payments
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showDetailedPayments, setShowDetailedPayments] = useState(false);
  const [detailedPaymentMethod, setDetailedPaymentMethod] = useState("upi");  const [selectedPaymentOption, setSelectedPaymentOption] = useState(null);
  const [createdRide, setCreatedRide] = useState(null);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(null);

  // 🔔 Helper to open payment prompt for an unpaid ride lock
  const openPaymentPromptForUnpaidRide = async () => {
    try {
      const unpaidKeys = Object.keys(localStorage).filter((k) => k.startsWith("unpaid:"));
      if (unpaidKeys.length === 0) return false;
      const rideId = unpaidKeys[0].split(":")[1];
      if (!rideId) return false;
      const resp = await axios.get(`http://localhost:5000/api/rides/${rideId}`, { headers: { Authorization: `Bearer ${auth?.token}` } });
      const ride = resp.data?.ride;
      if (!ride) return false;
      setCreatedRide(ride);
      const computedAmount = (ride.finalPrice != null) ? Number(ride.finalPrice) : null;
      setPaymentAmount(computedAmount);
      setShowPaymentPrompt(true);
      setRiderPanelOpen(false);
      setDrawerOpen(false);
      try {
        mapPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
      return true;
    } catch {
      return false;
    }
  };

  // 🔄 On mount/refresh, if there's an unpaid lock, show payment prompt automatically
  useEffect(() => {
    (async () => {
      try {
        const unpaidKeys = Object.keys(localStorage).filter((k) => k.startsWith("unpaid:"));
        if (unpaidKeys.length > 0) {
          await openPaymentPromptForUnpaidRide();
        }
      } catch {}
    })();
  }, [auth]);
  
  // 🔥 Create ride request (opens the drawer with payment options)
  const handleFindRiders = async () => {
    if (!pickup || !drop || !distance) {
      alert("Please select pickup and drop");
      return;
    }
    try {
      // 🚫 Block new booking if there is any unpaid completed ride
      try {
        const unpaidKeys = Object.keys(localStorage).filter(k => k.startsWith('unpaid:'));
        if (unpaidKeys.length > 0) {
          const opened = await openPaymentPromptForUnpaidRide();
          if (!opened) {
            alert("Payment pending for previous ride. Please pay before booking another.");
          }
          return;
        }
      } catch {}
      // 🚫 Client-side guard: only one active ride per user
      const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
      const existingId = localStorage.getItem(activeKey);
      if (existingId) {
        try {
          const chk = await axios.get(`http://localhost:5000/api/rides/${existingId}`, { headers: { Authorization: `Bearer ${auth?.token}` } });
          const st = chk.data?.ride?.status;
          if (st && st !== 'completed' && st !== 'cancelled') {
            alert("You already have an active ride. Please complete it before booking another.");
            return;
          } else {
            localStorage.removeItem(activeKey);
          }
        } catch {
          // If status can't be verified, be conservative and block
          alert("You already have an active ride. Please complete it before booking another.");
          return;
        }
      }
      // Lock final price to the selected ride card amount so Payment matches Booking
      const distanceKm = parseFloat(distance);

      // Derive base rate by selected ride type (same as card display)
      let rateForCreate = 10; // bike
      if (selectedRide === "auto") rateForCreate = 15;
      else if (selectedRide === "car") rateForCreate = 20;

      const baseFare = +(distanceKm * rateForCreate).toFixed(2);
      // Apply simple traffic/weather multipliers used in the card breakdown
      const tMult = Math.max(zoneFactors?.trafficMultiplier || 1, 1);
      const wMult = Math.max(zoneFactors?.weatherMultiplier || 1, 1);
      const trafficAdd = +(baseFare * (tMult - 1)).toFixed(2);
      const weatherAdd = +(baseFare * (wMult - 1)).toFixed(2);
      const selectedFinalPrice = +(baseFare + trafficAdd + weatherAdd).toFixed(2);

      const res = await axios.post(
        "http://localhost:5000/api/rides/create",
        {
          pickup: pickupAddress,
          drop: dropAddress,
          pickupCoords: pickup,
          dropCoords: drop,
          distance: distanceKm,
          // Persist the selected booking price so Payment shows the same amount
          finalPrice: selectedFinalPrice,
          requestedVehicleType: selectedRide || "",
        },
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const ride = res.data?.ride;
      if (ride) setCreatedRide(ride);
      // Mark active ride locally to prevent parallel bookings
      if (ride?._id) {
        localStorage.setItem(activeKey, ride._id);
      }
      socket.emit("newRide", ride);
      setDrawerOpen(true);
    } catch (err) {
      console.error("Failed to create ride request:", err);
      const msg = err?.response?.data?.message || "Failed to create ride request";
      alert(msg);
    }
  };
  
  // helper to compute amount for selected ride
  const getSelectedRideAmount = () => {
    // Prefer server-calculated final price when available
    if (createdRide?.finalPrice != null && Number(createdRide.finalPrice) > 0) {
      return Number(createdRide.finalPrice);
    }
    if (!distance || !selectedRide) return null;
    const km = parseFloat(distance);
    let rate = null;
    if (selectedRide === "bike") rate = 10;
    else if (selectedRide === "auto") rate = 15;
    else if (selectedRide === "car") rate = 20;
    if (rate == null) return null;
    return Number((km * rate).toFixed(2));
  };

  // 🚖 Request ride type
  const handleRequestRide = async () => {
    // ✅ Require a created ride first (ensures socket event already went out)
    if (!createdRide || !createdRide._id) {
      alert("Please create a ride first by clicking 'Find Riders'.");
      return;
    }

    if (selectedRide === "parcel") {
      navigate("/parcel");
      return;
    }
  
    // Online payment: do NOT open Razorpay; just proceed with selected option
    if (paymentMethod === "online") {
      if (!selectedPaymentOption) {
        alert("Please choose a payment option under Online.");
        return;
      }
      setLookingForRider(true);
      return;
    }
  
    // Cash payment: proceed to find rider
    setLookingForRider(true);
  };

  // 🚖 Socket listeners
  useEffect(() => {
    socket.on("rideAccepted", (ride) => {
      setLookingForRider(false);
      setDrawerOpen(false);
      setAssignedRider(ride.acceptedBy);
      setRiderPanelOpen(true);
      setRideStatus("Rider en route 🚖");
      // Persist active ride id on acceptance to filter GPS updates
      try {
        const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
        if (ride?._id) localStorage.setItem(activeKey, ride._id);
      } catch {}

      // Generate/persist OTP for this ride on acceptance
      try {
        if (ride?._id) {
          const otpKey = `rideOtp:${ride._id}`;
          let saved = localStorage.getItem(otpKey);
          if (!saved) {
            saved = Math.floor(1000 + Math.random() * 9000).toString();
            localStorage.setItem(otpKey, saved);
          }
          setOtp(saved);
        }
      } catch {}
    });

    socket.on("rideRejected", () => {
      setLookingForRider(false);
      alert("❌ All riders rejected your request.");
      try {
        const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
        localStorage.removeItem(activeKey);
      } catch {}
    });

    // ✅ Ride started after OTP verification
    socket.on("rideStarted", (ride) => {
      setRideStatus("Ride started ✅");
      setShowPaymentPrompt(false);
      setPaymentAmount(null);
      setRiderPanelOpen(false);
      try {
        // Smoothly scroll map into view to focus on the route
        mapPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    });

    // ✅ Ride completed by rider → stay on Booking and show Pay Now prompt
    socket.on("rideCompleted", (ride) => {
      const computedAmount =
        (ride && ride.finalPrice != null) ? Number(ride.finalPrice) : (getSelectedRideAmount() ?? null);
      setRideStatus("Ride Completed — awaiting user payment");
      setPaymentAmount(computedAmount);
      // Open the payment prompt in the same screen (Rapido-style)
      setShowPaymentPrompt(true);
      setRiderPanelOpen(false);
      // 🔓 Reset booking state so user can immediately make another booking
      try {
        setLookingForRider(false);
        setAssignedRider(null);
        setDrawerOpen(false);
        setCreatedRide(null);
        setSelectedRide(null);
      } catch {}
      try {
        // Smoothly scroll to the payment prompt area to avoid perceived reload
        mapPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
      try {
        const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
        const rideId = localStorage.getItem(activeKey);
        if (rideId) {
          // Keep an unpaid lock to block next booking until payment
          localStorage.setItem(`unpaid:${rideId}`, "true");
          // Clear per-ride OTP when completed; it will be shown until rider starts
          localStorage.removeItem(`rideOtp:${rideId}`);
        }
        localStorage.removeItem(activeKey);
      } catch {}
    });

    socket.on("riderLocationUpdate", ({ rideId, coords }) => {
      try {
        const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
        const activeId = localStorage.getItem(activeKey);
        const currentId = activeId || (createdRide && createdRide._id) || null;
        if (!currentId) return;
        if (String(rideId) === String(currentId)) {
          setRiderLocation(coords);
        }
      } catch {
        // Fallback: update if filtering fails
        setRiderLocation(coords);
      }
    });

    return () => {
      
      socket.off("rideAccepted");
      socket.off("rideRejected");
      socket.off("rideStarted");
      socket.off("rideCompleted");
      socket.off("riderLocationUpdate");
    };
  }, []);

  return (
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      {/* 🚨 SOS Button (fixed position) */}
      <SOSButton role="user" />

      {/* ✅ Global payment prompt shown when ride is completed */}
      {showPaymentPrompt && (
        <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#fff3e0', border: '1px solid #ffe0b2' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#e65100' }}>
            Ride Completed — Proceed to Payment
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Amount due: {
              (createdRide?.finalPrice != null && Number(createdRide.finalPrice) > 0)
                ? `₹${Number(createdRide.finalPrice).toFixed(2)}`
                : (paymentAmount != null
                    ? `₹${Number(paymentAmount).toFixed(2)}`
                    : (getSelectedRideAmount() != null
                        ? `₹${Number(getSelectedRideAmount()).toFixed(2)}`
                        : '—'))
            }
          </Typography>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 1 }}
            onClick={() => {
              const id = createdRide?._id;
              const amt = (createdRide?.finalPrice != null && Number(createdRide.finalPrice) > 0)
                ? Number(createdRide.finalPrice)
                : (paymentAmount ?? getSelectedRideAmount());
              if (id) {
                navigate(`/payment/${id}`, { state: { amount: amt } });
              } else {
                navigate(`/payment`, { state: { amount: amt } });
              }
            }}
          >
            Pay Now
          </Button>
        </Box>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 2 }}>
        {/* Left panel */}
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Find a trip</Typography>

          {/* ✅ Pickup Input with Suggestions */}
          <TextField
            fullWidth
            label="Pickup Address"
            value={pickupAddress}
            onChange={(e) => {
              setPickupAddress(e.target.value);
              fetchSuggestions(e.target.value, setPickupSuggestions, pickup);
            }}
            sx={{ mb: 1 }}
          />
          {pickupSuggestions.map((s, i) => (
            <ListItemButton
              key={i}
              onClick={() => handlePickupSelect(s.place_id, s.description)}
            >
              {s.description}
            </ListItemButton>
          ))}

          {/* ✅ Drop Input with Suggestions */}
          <TextField
            fullWidth
            label="Drop Address"
            value={dropAddress}
            onChange={(e) => {
              setDropAddress(e.target.value);
              fetchSuggestions(e.target.value, setDropSuggestions, pickup);
            }}
            sx={{ mb: 1 }}
          />
          {dropSuggestions.map((s, i) => (
            <ListItemButton
              key={i}
              onClick={() => handleDropSelect(s.place_id, s.description)}
            >
              {s.description}
            </ListItemButton>
          ))}

          <Button
            fullWidth
            variant="contained"
            sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" }, mt: 2 }}
            onClick={handleFindRiders}
          >
            Find Riders
          </Button>
        </Paper>

        {/* Right panel (Map) */}
        <Paper sx={{ p: 1, borderRadius: 2 }} ref={mapPanelRef}>
          <MapComponent
            apiKey={GOOGLE_API_KEY}
            pickup={pickup}
            setPickup={setPickup}
            setPickupAddress={setPickupAddress}
            drop={drop}
            setDrop={setDrop}
            setDropAddress={setDropAddress}
            riderLocation={riderLocation}
            route={route}
            setRoute={setRoute}
            setDistance={setDistance}
            setDuration={setDuration}
            setNormalDuration={setNormalDuration}
          />
        </Paper>
      </Box>

      {/* Ride options drawer */}
      <Drawer anchor="bottom" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>Choose a ride</Typography>
          {/* condition badges similar to reference image */}
          <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
            {zoneFactors?.currentTraffic && zoneFactors.currentTraffic !== "light" && (
              <Chip label="High Traffic" color="warning" icon={<span>⚡</span>} />
            )}
            {zoneFactors?.currentWeather && zoneFactors.currentWeather !== "clear" && (
              <Chip label="Bad Weather" color="error" icon={<span>🌧️</span>} />
            )}
          </Box>
          {rideOptions.map((opt) => (
            <Box key={opt.id} onClick={() => setSelectedRide(opt.id)}
              sx={{
                border: selectedRide === opt.id ? "2px solid black" : "1px solid #ccc",
                borderRadius: 2, p: 2, mb: 2, cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  {opt.icon ? `${opt.icon} ` : ""}{opt.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {opt.eta} • {(opt.meta?.km ?? distance) || "—"} km
                </Typography>
                {/* breakdown block */}
                {opt.meta?.breakdown && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">Base Fare: ₹{opt.meta.breakdown.base.toFixed(2)}</Typography>
                    <Typography variant="body2">+ Traffic: ₹{opt.meta.breakdown.trafficAdd.toFixed(2)}</Typography>
                    <Typography variant="body2">+ Weather: ₹{opt.meta.breakdown.weatherAdd.toFixed(2)}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: "bold", mt: 0.5 }}>Total: ₹{opt.meta.breakdown.total.toFixed(2)}</Typography>
                  </Box>
                )}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "black" }}>{opt.price}</Typography>
            </Box>
          ))}
          {/* Price details based on traffic/weather conditions */}
          {distance && pickup && drop && (
            <Box sx={{ mt: 2 }}>
              <DynamicPricingDisplay
                pickup={{ latitude: pickup.lat || pickup.latitude, longitude: pickup.lng || pickup.longitude }}
                destination={{ latitude: drop.lat || drop.latitude, longitude: drop.lng || drop.longitude }}
                distance={parseFloat(distance)}
                durationMins={parseMins(duration)}
                normalDurationMins={parseMins(normalDuration || duration)}
              />
            </Box>
          )}
          {/* Payment Method Selection */}
          <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>Payment Method</Typography>
            <RadioGroup
              row
              value={paymentMethod}
              onChange={(e) => {
                const val = e.target.value;
                setPaymentMethod(val);
                setShowDetailedPayments(val === "online");
                if (val !== "online") {
                  setSelectedPaymentOption(null);
                }
              }}
            >
              <FormControlLabel value="cash" control={<Radio />} label="Cash" />
              <FormControlLabel value="online" control={<Radio />} label="Online" />
            </RadioGroup>

            {showDetailedPayments && (
              <Box sx={{ mt: 1 }}>
                {/* Selected summary */}
                {selectedPaymentOption && (
                  <Chip
                    label={`Selected: ${(() => {
                      const labels = {
                        rapido_wallet: "Rapido Wallet",
                        amazon_pay: "Amazon Pay",
                        upi_gpay: "GPay",
                        upi_phonepe: "PhonePe",
                        upi_paytm: "Paytm",
                        upi_any: "Any UPI app",
                        paylater_phonepe: "PhonePe (Pay Later)",
                        paylater_upi_any: "Any UPI app (Pay Later)",
                        pay_at_drop: "Pay at drop",
                        simpl: "Simpl",
                      };
                      return labels[selectedPaymentOption] || selectedPaymentOption;
                    })()}`}
                    variant="outlined"
                    color="primary"
                    sx={{ mb: 1 }}
                  />
                )}

                {/* Wallets */}
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 1 }}>Wallets</Typography>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <ListItemButton
                    selected={selectedPaymentOption === "rapido_wallet"}
                    onClick={() => setSelectedPaymentOption("rapido_wallet")}
                  >
                    Rapido Wallet
                  </ListItemButton>
                  <ListItemButton
                    selected={selectedPaymentOption === "amazon_pay"}
                    onClick={() => setSelectedPaymentOption("amazon_pay")}
                  >
                    Amazon Pay
                  </ListItemButton>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Chip label="UPI" color="default" variant="outlined" sx={{ mb: 0.5 }} />
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <ListItemButton
                      selected={selectedPaymentOption === "upi_gpay"}
                      onClick={() => { setSelectedPaymentOption("upi_gpay"); setDetailedPaymentMethod("upi"); }}
                    >
                      GPay
                    </ListItemButton>
                    <ListItemButton
                      selected={selectedPaymentOption === "upi_phonepe"}
                      onClick={() => { setSelectedPaymentOption("upi_phonepe"); setDetailedPaymentMethod("upi"); }}
                    >
                      PhonePe
                    </ListItemButton>
                    <ListItemButton
                      selected={selectedPaymentOption === "upi_paytm"}
                      onClick={() => { setSelectedPaymentOption("upi_paytm"); setDetailedPaymentMethod("upi"); }}
                    >
                      Paytm
                    </ListItemButton>
                    <ListItemButton
                      selected={selectedPaymentOption === "upi_any"}
                      onClick={() => { setSelectedPaymentOption("upi_any"); setDetailedPaymentMethod("upi"); }}
                    >
                      Pay by any UPI app
                    </ListItemButton>
                  </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Chip label="Pay Later" color="default" variant="outlined" sx={{ mb: 0.5 }} />
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <ListItemButton
                      selected={selectedPaymentOption === "paylater_phonepe"}
                      onClick={() => setSelectedPaymentOption("paylater_phonepe")}
                    >
                      PhonePe
                    </ListItemButton>
                    <ListItemButton
                      selected={selectedPaymentOption === "paylater_upi_any"}
                      onClick={() => setSelectedPaymentOption("paylater_upi_any")}
                    >
                      Pay by any UPI app
                    </ListItemButton>
                    <ListItemButton
                      selected={selectedPaymentOption === "pay_at_drop"}
                      onClick={() => setSelectedPaymentOption("pay_at_drop")}
                    >
                      Pay at drop (scan QR after ride)
                    </ListItemButton>
                    <ListItemButton
                      selected={selectedPaymentOption === "simpl"}
                      onClick={() => setSelectedPaymentOption("simpl")}
                    >
                      Simpl
                    </ListItemButton>
                  </Box>
                </Box>
                
              </Box>
            )}
          </Box>

          {lookingForRider ? (
            <Box textAlign="center" sx={{ my: 3 }}>
              <CircularProgress />
              <Typography variant="body1" sx={{ mt: 2 }}>⏳ Looking for riders...</Typography>
            </Box>
          ) : (
            <Button variant="contained" fullWidth sx={{ mt: 2 }}
              onClick={handleRequestRide} disabled={!selectedRide || !createdRide}>
              {selectedRide === "parcel"
                ? "Go to Parcel Page"
                : `Request ${rideOptions.find((r) => r.id === selectedRide)?.name || ""}`}
            </Button>
          )}
        </Box>
      </Drawer>

      {/* Rider details drawer */}
      <Drawer anchor="bottom" open={riderPanelOpen} onClose={() => setRiderPanelOpen(false)}>
        <Box sx={{ p: 3 }}>
          {assignedRider && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                <Avatar
                  src={assignedRider.profilePicture || undefined}
                  alt={assignedRider.fullName || 'Rider'}
                  sx={{ width: 56, height: 56, bgcolor: '#eee' }}
                />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>Your Rider is on the way 🚗</Typography>
                  <Typography variant="body2" color="text.secondary">Please share the OTP when rider arrives</Typography>
                </Box>
              </Box>
              <Typography><b>Name:</b> {assignedRider.fullName}</Typography>
              <Typography><b>Mobile:</b> {assignedRider.mobile}</Typography>
              <Typography>
                <b>Vehicle:</b> {
                  (assignedRider.vehicleType || assignedRider.vehicle?.type)
                    ? `${assignedRider.vehicleType || assignedRider.vehicle?.type} (${assignedRider.vehicleNumber || assignedRider.vehicle?.registrationNumber || 'N/A'})`
                    : (assignedRider.vehicleNumber || assignedRider.vehicle?.registrationNumber ? `(${assignedRider.vehicleNumber || assignedRider.vehicle?.registrationNumber})` : 'N/A')
                }
              </Typography>
              <Typography>
                <b>Preferred Languages:</b> {(() => {
                  const list = Array.isArray(assignedRider.preferredLanguages)
                    ? assignedRider.preferredLanguages
                    : [];
                  if (list.length) return list.join(', ');
                  return assignedRider.preferredLanguage || '—';
                })()}
              </Typography>

            <Typography>
              <b>Fare:</b>{" "}
              {createdRide?.finalPrice != null && Number(createdRide.finalPrice) > 0
                ? `₹${Number(createdRide.finalPrice).toFixed(2)}`
                : (rideOptions.find((r) => r.id === selectedRide)?.price || "—")}
            </Typography>

              {/* OTP Display */}
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Your OTP Code</Typography>
                <Typography variant="h4" sx={{ letterSpacing: 2, fontWeight: 'bold', color: '#FF5722' }}>
                  {otp}
                </Typography>
                <Typography variant="caption">Share this code with your rider to start the trip</Typography>
              </Box>
              
              <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                <Button variant="contained" color="success">📞 Call</Button>
                <Button variant="outlined" color="primary">💬 Chat</Button>
              </Box>
              <Typography variant="body1" sx={{ mt: 2 }}>{rideStatus}</Typography>

              {showPaymentPrompt && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#e8f5e9', border: '1px solid #c8e6c9' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    Ride Completed — awaiting user payment
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
      Amount due: {
        (createdRide?.finalPrice != null && Number(createdRide.finalPrice) > 0)
          ? `₹${Number(createdRide.finalPrice).toFixed(2)}`
          : (paymentAmount != null
              ? `₹${paymentAmount.toFixed(2)}`
              : (getSelectedRideAmount() != null
                  ? `₹${Number(getSelectedRideAmount()).toFixed(2)}`
                  : '—'))
      }
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 1 }}
                    onClick={() => {
                      const id = createdRide?._id;
                      const amt = (createdRide?.finalPrice != null && Number(createdRide.finalPrice) > 0)
                        ? Number(createdRide.finalPrice)
                        : (paymentAmount ?? getSelectedRideAmount());
                      if (id) {
                        navigate(`/payment/${id}` , { state: { amount: amt } });
                      } else {
                        navigate(`/payment`, { state: { amount: amt } });
                      }
                    }}
                  >
                    Pay Now
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Drawer>
    </Container>
  );
}