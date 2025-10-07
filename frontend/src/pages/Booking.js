import React, { useState, useEffect } from "react";
import {
  Container, Paper, Typography, TextField, Box,
  Button, Drawer, CircularProgress, ListItemButton,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Chip
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { io } from "socket.io-client";
import MapComponent from "../components/Map";
import DynamicPricingDisplay from "../components/DynamicPricingDisplay.jsx";
import { initiatePayment, verifyPayment } from "../services/api";
import PricingService from "../services/pricingService";
import SOSButton from "../components/SOSButton";

const socket = io("http://localhost:5000");

// Load Razorpay Checkout script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Booking() {
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

  const { auth } = useAuth();
  const navigate = useNavigate();

  const GOOGLE_API_KEY = "AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo"; // 🔑 Replace with your real key

  // ✅ Join socket room
  useEffect(() => {
    if (auth?.user?._id) {
      socket.emit("join", auth.user._id);
    }
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
  const [detailedPaymentMethod, setDetailedPaymentMethod] = useState("upi");
  const [createdRide, setCreatedRide] = useState(null);
  
  // 🔥 Create ride request (opens the drawer with payment options)
  const handleFindRiders = async () => {
    if (!pickup || !drop || !distance) {
      alert("Please select pickup and drop");
      return;
    }
    try {
      const res = await axios.post(
        "http://localhost:5000/api/rides/create",
        { pickup: pickupAddress, drop: dropAddress, pickupCoords: pickup, dropCoords: drop },
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const ride = res.data?.ride;
      if (ride) setCreatedRide(ride);
      socket.emit("newRide", ride);
      setDrawerOpen(true);
    } catch (err) {
      console.error("Failed to create ride request:", err);
      alert("Failed to create ride request");
    }
  };
  
  // helper to compute amount for selected ride
  const getSelectedRideAmount = () => {
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
  
    // if online payment selected, process payment before requesting ride
    if (paymentMethod === "online") {
      try {
        const amount = getSelectedRideAmount();
        if (!amount) {
          alert("Unable to compute fare. Please select a ride type and ensure distance is calculated.");
          return;
        }
  
        const initResp = await initiatePayment({
          rideId: createdRide._id,
          amount,
          method: detailedPaymentMethod,
        });
        const initData = initResp.data;
        if (!initData?.ok || !initData?.order?.id || !initData?.key) {
          alert("Failed to initiate payment. Please try again.");
          return;
        }
  
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          alert("Razorpay SDK failed to load. Please check your connection.");
          return;
        }
  
        const options = {
          key: initData.key,
          amount: initData.order.amount,
          currency: initData.order.currency,
          name: "Rider App",
          description: "Ride Payment",
          order_id: initData.order.id,
          notes: { rideId: String(createdRide._id), rideType: selectedRide },
          theme: { color: "#1976d2" },
          handler: async function (response) {
            try {
              const verifyResp = await verifyPayment({
                rideId: createdRide._id,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              if (verifyResp.data?.ok) {
                alert("✅ Payment successful and verified! Proceeding to find a rider.");
                setLookingForRider(true);
              } else {
                alert("❌ Payment verification failed. Please contact support.");
              }
            } catch (err) {
              console.error("Verification error:", err);
              alert("❌ Error verifying payment.");
            }
          },
          modal: {
            ondismiss: function () {
              alert("Payment popup closed. You can select Cash or retry online payment.");
            },
          },
          prefill: {
            name: "Customer",
            email: "",
            contact: "",
          },
        };
  
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (resp) {
          console.error("Payment failed:", resp.error);
          alert("❌ Payment failed. Please try another method or retry.");
        });
        rzp.open();
        return; // don't proceed to lookingForRider until payment handler sets it
      } catch (e) {
        console.error(e);
        alert("Payment could not be completed. Please try again or choose Cash.");
        return;
      }
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
    });

     // Generate a random 4-digit OTP for demonstration
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setOtp(generatedOtp);

    socket.on("rideRejected", () => {
      setLookingForRider(false);
      alert("❌ All riders rejected your request.");
    });

    socket.on("riderLocationUpdate", ({ coords }) => {
      setRiderLocation(coords);
    });

    return () => {
      socket.off("rideAccepted");
      socket.off("rideRejected");
      socket.off("riderLocationUpdate");
    };
  }, []);

  return (
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      {/* 🚨 SOS Button (fixed position) */}
      <SOSButton role="user" />
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
        <Paper sx={{ p: 1, borderRadius: 2 }}>
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
              }}
            >
              <FormControlLabel value="cash" control={<Radio />} label="Cash" />
              <FormControlLabel value="online" control={<Radio />} label="Online" />
            </RadioGroup>

            {showDetailedPayments && (
              <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label="UPI"
                  color={detailedPaymentMethod === "upi" ? "primary" : "default"}
                  onClick={() => setDetailedPaymentMethod("upi")}
                  variant={detailedPaymentMethod === "upi" ? "filled" : "outlined"}
                />
                <Chip
                  label="Card"
                  color={detailedPaymentMethod === "card" ? "primary" : "default"}
                  onClick={() => setDetailedPaymentMethod("card")}
                  variant={detailedPaymentMethod === "card" ? "filled" : "outlined"}
                />
                <Chip
                  label="Wallet"
                  color={detailedPaymentMethod === "wallet" ? "primary" : "default"}
                  onClick={() => setDetailedPaymentMethod("wallet")}
                  variant={detailedPaymentMethod === "wallet" ? "filled" : "outlined"}
                />
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
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                Your Rider is on the way 🚗
              </Typography>
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

              <Typography><b>Fare:</b> {rideOptions.find((r) => r.id === selectedRide)?.price}</Typography>

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
            </>
          )}
        </Box>
      </Drawer>
    </Container>
  );
}
