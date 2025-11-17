import React, { useState, useEffect } from "react";
import {
  Container, Paper, Typography, TextField, Box,
  Button, Drawer, CircularProgress, ListItemButton,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, InputAdornment, IconButton
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import FlagIcon from "@mui/icons-material/Flag";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ContactPageOutlinedIcon from "@mui/icons-material/ContactPageOutlined";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import socket from "../services/socket";
import MapComponent from "../components/Map";
import ChatDialog from "../components/ChatDialog.jsx";
import DynamicPricingDisplay from "../components/DynamicPricingDisplay.jsx";
import LocationPrompt from "../components/LocationPrompt.jsx";
import RatingDialog from "../components/RatingDialog.jsx";
// Razorpay removed from booking flow
// import { initiatePayment, verifyPayment } from "../services/api";
import PricingService from "../services/pricingService";
import { rateRide } from "../services/api";
import SOSButton from "../components/SOSButton";
import "../theme.css";
import "../booking-mobile.css";

const API_BASE = process.env.REACT_APP_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
const API_URL = `${API_BASE}/api`;
  const MAX_RIDE_DISTANCE_KM = 25;
  const toRad = (d) => (d * Math.PI) / 180;
  const distanceKmBetween = (a, b) => {
    try {
      if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return NaN;
      const R = 6371; // km
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    } catch {
      return NaN;
    }
  };

// Removed Razorpay loader (no third-party checkout in this flow)
const loadRazorpayScript = () => Promise.resolve(false);

export default function Booking() {
  const mapPanelRef = React.useRef(null);
  // Initialize auth and navigate before any references in effects
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  
  // Generate a unique tab ID for this browser tab instance
const [tabId] = useState(() => `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Check authentication and tab session on component mount
  useEffect(() => {
    // First check authentication
    if (!auth?.token) {
      navigate("/login", { replace: true });
      return;
    }
    
    // Each tab can have its own session now
    // We still generate a unique tab ID for this tab's internal use
    // but we don't restrict to one tab only
    localStorage.setItem(`bookingTab-${tabId}`, 'active');
    
    // Cleanup function to remove tab registration when component unmounts
    return () => {
      // Clean up this tab's data
      localStorage.removeItem(`bookingTab-${tabId}`);
    };
  }, [auth, navigate, tabId]);
  
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
  const [createdRide, setCreatedRide] = useState(null);
  const [mapOnlyView, setMapOnlyView] = useState(() => {
    try {
      const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
      const rideId = localStorage.getItem(activeKey);
      if (rideId) {
        return localStorage.getItem(`rideMapOnly:${rideId}`) === 'true';
      }
    } catch {}
    return false;
  });

  const [lookingForRider, setLookingForRider] = useState(false);
  const [assignedRider, setAssignedRider] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  // Track multiple available riders by vehicle type for pre-OTP visualization
  const [availableRiders, setAvailableRiders] = useState([]);
  const [riderPanelOpen, setRiderPanelOpen] = useState(false);
  const [rideStatus, setRideStatus] = useState("Waiting for rider 🚖");
  const [otp, setOtp] = useState("");
  const [userLiveCoords, setUserLiveCoords] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  // Booking-for picker (Rapido-style)
  const [bookingForOpen, setBookingForOpen] = useState(false);
  const [bookingFor, setBookingFor] = useState('myself');
  const [bookingForName, setBookingForName] = useState('');
  const [bookingForMobile, setBookingForMobile] = useState('');
  // Contacts picker (mobile) – safe no-op if unsupported
  const handlePickContact = async () => {
    try {
      const supported = 'contacts' in navigator && 'select' in navigator.contacts;
      if (!supported) {
        console.warn('Contact Picker API not supported');
        return;
      }
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      const c = contacts && contacts[0];
      if (!c) return;
      const tel = Array.isArray(c.tel) ? c.tel[0] : (c.tel || c.phoneNumbers || [])[0];
      if (tel) setBookingForMobile(String(tel));
      const nm = Array.isArray(c.name) ? c.name[0] : c.name;
      if (nm && !bookingForName) setBookingForName(String(nm));
      setBookingFor('other');
    } catch (err) {
      console.warn('Contact selection canceled or failed:', err);
    }
  };
  // Rating dialog state
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingRideId, setRatingRideId] = useState(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState("");
  // No popup needed when a rider accepts the ride in multiple tabs
  const [serviceLimitOpen, setServiceLimitOpen] = useState(false);
  const [acceptBannerOpen, setAcceptBannerOpen] = useState(false);
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

  // Join the ride-specific room to scope chat messages for the user
  useEffect(() => {
    try {
        const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
        const activeId = localStorage.getItem(activeKey);
        const rideId = (createdRide && createdRide._id) || activeId || null;
          if (rideId) socket.emit("joinRideRoom", rideId);
    } catch (e) {
      console.warn("joinRideRoom emit warning (user):", e?.message || e);
    }
  }, [createdRide, auth?.user?._id]);


  const GOOGLE_API_KEY = "AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo"; // 🔑 Replace with your real key

  const handleSubmitRating = async ({ rating, review }) => {
    try {
      setRatingError("");
      setRatingSubmitting(true);
      // Robustly resolve rideId even after completion clears createdRide
      let id = ratingRideId || (createdRide && createdRide._id) || null;
      if (!id) {
        try {
          // Use unpaid lock set on rideCompleted event
          const unpaidKeys = Object.keys(localStorage).filter((k) => k.startsWith("unpaid:"));
          if (unpaidKeys.length) id = unpaidKeys[0].split(":")[1] || null;
        } catch {}
      }
      if (!id) {
        try {
          // Fallback to active ride key if still present
          const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
          const activeId = localStorage.getItem(activeKey);
          if (activeId) id = activeId;
        } catch {}
      }
      if (!id) {
        setRatingError("Unable to resolve ride to rate. Please try again.");
        return; // keep dialog open so user can retry
      }
      await rateRide(id, { rating, review });
      setShowRatingDialog(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Failed to submit rating";
      setRatingError(String(msg));
    } finally {
      setRatingSubmitting(false);
    }
  };

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
          // If the ride was already started (OTP verified), persist map-only view across refresh
          const mapOnlyKey = `rideMapOnly:${existingId}`;
          const persistedMapOnly = localStorage.getItem(mapOnlyKey) === 'true';
          if (persistedMapOnly) {
            // Set map-only immediately to avoid flicker before API returns
            setMapOnlyView(true);
            // OTP banner should be hidden once ride has started
            setAcceptBannerOpen(false);
          }
          const resp = await axios.get(
              `${API_URL}/rides/${existingId}`,
                { headers: { Authorization: `Bearer ${auth?.token}` } }
              );

        const ride = resp.data?.ride;
        if (!ride) return;
        // Ensure rideStarted prop reflects server state after refresh
        try { setCreatedRide(ride); } catch {}
        // ✅ Restore pickup/drop to the exact ride coordinates to keep map identical
        try {
          if (ride.pickupCoords && ride.pickupCoords.lat && ride.pickupCoords.lng) {
            setPickup({ lat: ride.pickupCoords.lat, lng: ride.pickupCoords.lng });
          }
          if (typeof ride.pickup === 'string' && ride.pickup.length > 0) {
            setPickupAddress(ride.pickup);
          }
          if (ride.dropCoords && ride.dropCoords.lat && ride.dropCoords.lng) {
            setDrop({ lat: ride.dropCoords.lat, lng: ride.dropCoords.lng });
          }
          if (typeof ride.drop === 'string' && ride.drop.length > 0) {
            setDropAddress(ride.drop);
          }
        } catch {}
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
          // Ensure compact map view before OTP verification, unless started flag persisted
          if (!persistedMapOnly) {
            setMapOnlyView(false);
          }

          // Restore last known rider location immediately after refresh
          try {
            const lastKey = `riderLocation:last:${ride._id}`;
            const savedLoc = localStorage.getItem(lastKey);
            if (savedLoc) {
              const parsed = JSON.parse(savedLoc);
              if (parsed && typeof parsed === 'object') setRiderLocation(parsed);
            }
          } catch {}

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
              // Show OTP banner until rider verifies it
              setAcceptBannerOpen(true);
              // Persist OTP to backend so rider can verify even after refresh
              try {
                await axios.post(
                  `${API_URL}/rides/${ride._id}/set-otp`,
                  { otp: saved },
                  { headers: { Authorization: `Bearer ${auth?.token}` } }
                );
              } catch (e) {
                console.warn("Restore: failed to persist ride OTP:", e?.message || e);
              }
            } catch {}
          }
        }
        // If already in progress or completed/cancelled, close and clear
        if (ride.status === 'in_progress') {
          setRiderPanelOpen(false);
          setRideStatus('Ride started ✅');
          // Switch to full map-only view after OTP verification
          setMapOnlyView(true);
          // Hide OTP banner after OTP verification
          setAcceptBannerOpen(false);
          // Ensure vehicle image and type are available to Map in map-only view
          try {
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
          } catch {}
        }
        if (ride.status === 'completed' || ride.status === 'cancelled') {
          localStorage.removeItem(activeKey);
          // Clear persisted map-only flag if ride no longer active
          try { localStorage.removeItem(mapOnlyKey); } catch {}
          // Ensure UI returns to free-map mode for fresh booking
          setMapOnlyView(false);
          setRiderPanelOpen(false);
          // Reset booking-related state so the map is cleared
          try {
            setLookingForRider(false);
            setAssignedRider(null);
            setCreatedRide(null);
            setSelectedRide(null);
            setPickup(null);
            setDrop(null);
            setPickupAddress("");
            setDropAddress("");
            setRiderLocation(null);
            setAvailableRiders([]);
          } catch {}
        }
      } catch (e) {
        // If fetch fails, keep current state; do not close prematurely
      }
    };
    restore();
  }, [auth]);



   // 📍 Get current location for pickup (skip when ride has started to keep view unchanged)
  useEffect(() => {
    try {
      const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
      const rideId = localStorage.getItem(activeKey);
      const persistedStarted = rideId && localStorage.getItem(`rideMapOnly:${rideId}`) === 'true';
      if (mapOnlyView || persistedStarted) {
        // Do not override pickup while an in-progress ride is active
        return;
      }
    } catch {}

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickup(loc);
        const addr = await getAddressFromCoords(loc.lat, loc.lng);
        setPickupAddress(addr);
      },
      (err) => console.warn("Geolocation warning:", err?.message || err)
    );
  }, [mapOnlyView, auth]);

  // 🚀 Emit user's live GPS while ride is accepted or in progress
  useEffect(() => {
    let watchId = null;
    const startWatch = () => {
      if (watchId != null) return;
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLiveCoords(coords);
            try {
              const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
              const rideId = localStorage.getItem(activeKey) || (createdRide && createdRide._id) || null;
              if (rideId) {
                socket.emit("userLocation", { rideId, coords });
              }
            } catch {}
          },
          (err) => console.warn("user watchPosition warning:", err?.message || err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
        );
      } catch {}
    };

    const shouldWatch = !!assignedRider || riderPanelOpen || (rideStatus && /started|en route/i.test(rideStatus));
    if (shouldWatch) startWatch();

    return () => {
      try { if (watchId != null) navigator.geolocation.clearWatch(watchId); } catch {}
    };
  }, [assignedRider, riderPanelOpen, rideStatus, createdRide, auth]);


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

  // 📍 Quickly set pickup to user's current GPS location
  const useCurrentPickup = async () => {
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPickup(loc);
          const addr = await getAddressFromCoords(loc.lat, loc.lng);
          setPickupAddress(addr);
          setPickupSuggestions([]);
        },
        (err) => console.warn("Geolocation (pickup quick-set) warning:", err?.message || err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );
    } catch (e) {
      console.warn("useCurrentPickup error:", e?.message || e);
    }
  };

  // 🔎 Fetch suggestions using Google AutocompleteService (with 25 km radius)
  const fetchSuggestions = (input, setSuggestions, loc) => {
    if (!input || !window.google) return setSuggestions([]);

    const service = new window.google.maps.places.AutocompleteService();

    service.getPlacePredictions(
      {
        input,
        location: loc
          ? new window.google.maps.LatLng(loc.lat, loc.lng)
          : new window.google.maps.LatLng(17.385044, 78.486671), // Hyderabad fallback
          radius: 25000, // ✅ 25 km
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
      console.warn("Pickup place details warning:", err);
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
            // Enforce 25 km radius from pickup
            const dist = distanceKmBetween(pickup, loc);
            if (pickup && Number.isFinite(dist) && dist > MAX_RIDE_DISTANCE_KM) {
              setServiceLimitOpen(true);
            } else {
              setDrop(loc);
              setDropAddress(description);
            }
            setDropSuggestions([]);
          }
        }
      );
    } catch (err) {
      console.warn("Drop place details warning:", err);
    }
  };

  // Allow changing pickup/drop before OTP; persist to backend
  useEffect(() => {
    if (!createdRide || !createdRide._id) return;
    const st = String(createdRide.status || '').toLowerCase();
    if (st === 'in_progress' || st === 'completed' || st === 'cancelled') return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        await axios.post(
          `${API_URL}/rides/${createdRide._id}/update-details`,
          {
            pickupAddress,
            dropAddress,
            pickupCoords: pickup,
            dropCoords: drop,
          },
          { headers: { Authorization: `Bearer ${auth?.token}` }, signal: controller.signal }
        );
      } catch (e) {
        try { console.warn('update-details warning:', e?.response?.data || e?.message || e); } catch {}
      }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [pickupAddress, dropAddress, pickup, drop]);

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
          const normMins = parseMinsLocal(normalDuration || duration);
          if (curMins && normMins && normMins > 0) {
            const ratio = curMins / normMins;
            const durAdj = Math.max(1, 1 + (ratio - 1) * 0.6); // scale impact to avoid extreme surges
            combined.trafficMultiplier = Math.max(combined.trafficMultiplier || 1, +durAdj.toFixed(2));
            combined.isPeakHour = combined.isPeakHour || (durAdj > 1);
          }

          setZoneFactors(combined);
        }
      } catch (err) {
        console.warn("Pricing factors fetch warning:", err);
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
          icon: "🏍",
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
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [showDetailedPayments, setShowDetailedPayments] = useState(false);
  const [detailedPaymentMethod, setDetailedPaymentMethod] = useState("upi");
  const [selectedPaymentOption, setSelectedPaymentOption] = useState(null);
  
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(null);

  // 🔔 Helper to open payment prompt for an unpaid ride lock
  const openPaymentPromptForUnpaidRide = async () => {
    try {
      const unpaidKeys = Object.keys(localStorage).filter((k) => k.startsWith("unpaid:"));
      if (unpaidKeys.length === 0) return false;
      const rideId = unpaidKeys[0].split(":")[1];
      if (!rideId) return false;
      const resp = await axios.get(`${API_URL}/rides/${rideId}`, { headers: { Authorization: `Bearer ${auth?.token}` } });
      const ride = resp.data?.ride;
      if (!ride) return false;

      // If already paid, clear lock and do NOT show the prompt
      const ps = ride?.payment?.status || ride?.paymentStatus || null;
      if (ps === "success" || ps === "completed" || ps === "paid") {
        try { localStorage.removeItem(`unpaid:${rideId}`); } catch {}
        setShowPaymentPrompt(false);
        setCreatedRide(ride);
        return false;
      }

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
  
  // 🔎 Find drivers: do NOT create a ride; only open selection (mobile-friendly flow)
  const handleFindRiders = () => {
    if (!pickup || !drop || !distance) return;
    if (!auth?.token) { navigate("/login-user"); return; }
    setDrawerOpen(true);
  };

  // 🧾 Book Ride: create the ride AFTER user selects vehicle/parcel and payment
  const handleBookRide = async () => {
    if (!pickup || !drop || !distance) return;
    if (!auth?.token) { navigate("/login-user"); return; }
  if (selectedRide === "parcel") {
    try {
      // Persist provided points individually so Parcel can honor Booking input
      if (pickup) localStorage.setItem("parcelPickupCoords", JSON.stringify(pickup));
      if (drop) localStorage.setItem("parcelDropCoords", JSON.stringify(drop));
      if (pickupAddress) localStorage.setItem("parcelPickupAddress", pickupAddress);
      if (dropAddress) localStorage.setItem("parcelDropAddress", dropAddress);
      // Hint Parcel to prefer Booking-provided values (locking only applies when both exist)
      localStorage.setItem("parcelLockFromBooking", "true");
    } catch {}
    navigate("/parcel");
    return;
  }

    const distanceKm = parseFloat(distance);
    if (Number.isFinite(distanceKm) && distanceKm > MAX_RIDE_DISTANCE_KM) { setServiceLimitOpen(true); return; }

    let rateForCreate = null;
    if (selectedRide === "bike") rateForCreate = 10;
    else if (selectedRide === "auto") rateForCreate = 15;
    else if (selectedRide === "car") rateForCreate = 20;

    try {
      const price = await PricingService.calculatePrice(
        { latitude: pickup?.lat ?? pickup?.latitude, longitude: pickup?.lng ?? pickup?.longitude },
        { latitude: drop?.lat ?? drop?.latitude, longitude: drop?.lng ?? drop?.longitude },
        distanceKm,
        25,
        selectedRide || "",
        rateForCreate
      );
      const selectedFinalPrice = Number(price?.finalPrice ?? 0);
      const selectedBasePrice = Number(price?.basePrice ?? 0);

      const resolveDetailed = (opt) => {
        try {
          if (!opt) return "";
          if (String(opt).startsWith("upi")) return "upi";
          if (opt === "wallet" || opt === "amazon_pay") return "wallet";
          if (String(opt).startsWith("card")) return "card";
          return "";
        } catch { return ""; }
      };

      const res = await axios.post(
        `${API_URL}/rides/create`,
        {
          pickup: pickupAddress,
          drop: dropAddress,
          pickupCoords: pickup,
          dropCoords: drop,
          distance: distanceKm,
          basePrice: selectedBasePrice,
          finalPrice: selectedFinalPrice,
          requestedVehicleType: selectedRide || "",
          paymentMethod: paymentMethod === "online" ? "online" : "COD",
          detailedPaymentMethod: paymentMethod === "online" ? resolveDetailed(selectedPaymentOption) : "",
        },
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const ride = res.data?.ride;
      if (ride) setCreatedRide(ride);
      if (ride?._id) {
        const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
        localStorage.setItem(activeKey, ride._id);
      }
      socket.emit("newRide", ride);
      setDrawerOpen(false);
      setLookingForRider(true);
    } catch (err) {
      console.warn("Book ride warning:", err);
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
      try {
        if (pickup) localStorage.setItem("parcelPickupCoords", JSON.stringify(pickup));
        if (drop) localStorage.setItem("parcelDropCoords", JSON.stringify(drop));
        if (pickupAddress) localStorage.setItem("parcelPickupAddress", pickupAddress);
        if (dropAddress) localStorage.setItem("parcelDropAddress", dropAddress);
        localStorage.setItem("parcelLockFromBooking", "true");
      } catch {}
      navigate("/parcel");
      return;
    }

    if (!selectedRide) {
      alert("Please choose a ride type (Bike/Auto/Car) before requesting.");
      return;
    }

    // Persist the requested vehicle type and notify matching riders
    try {
      const res = await axios.post(
        `${API_URL}/rides/${createdRide._id}/request-type`,
        { requestedVehicleType: selectedRide },
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const updated = res?.data?.ride;
      if (updated) setCreatedRide(updated);
    } catch (e) {
      console.warn("set requested vehicle type warning:", e?.message || e);
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

  // 🔄 Auto-broadcast to matching riders when type is selected after creation
  useEffect(() => {
    try {
      if (!createdRide || !createdRide._id) return;
      if (!selectedRide || selectedRide === "parcel") return;
      const currentType = String(createdRide.requestedVehicleType || "").trim().toLowerCase();
      const sel = String(selectedRide).trim().toLowerCase();
      if (sel && sel !== currentType) {
        axios
          .post(
            `${API_URL}/rides/${createdRide._id}/request-type`,
            { requestedVehicleType: sel },
            { headers: { Authorization: `Bearer ${auth?.token}` } }
          )
          .then((res) => {
            const updated = res?.data?.ride;
            if (updated) setCreatedRide(updated);
          })
          .catch((e) => {
            console.warn("auto set requested vehicle type warning:", e?.message || e);
          });
      }
    } catch (e) {
      console.warn("auto-broadcast effect warning:", e?.message || e);
    }
  }, [selectedRide, createdRide]);



  // 🚖 Socket listeners
  useEffect(() => {
    socket.on("rideAccepted", (ride) => {
      setLookingForRider(false);
      setDrawerOpen(false);
      setAssignedRider(ride.acceptedBy);
      setRiderPanelOpen(true);
      setRideStatus("Rider en route 🚖");
       // Show compact map until OTP verification
      setMapOnlyView(false);
      // Show OTP banner immediately upon acceptance
      setAcceptBannerOpen(true);
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
          // Persist OTP to backend so rider can only verify with this code
          const persistOtp = async () => {
          try {
            await axios.post(
              `${API_URL}/rides/${ride._id}/set-otp`,
              { otp: saved },
              { headers: { Authorization: `Bearer ${auth?.token}` } }
            );
          } catch (e) {
            console.warn("Failed to persist ride OTP:", e?.message || e);
          }

        };
        // Invoke persistence immediately after defining
        persistOtp();
        }
      } catch {}
    });

    // Fallback: respond to rider's OTP request and persist it before replying
    socket.on("requestRideOtp", async ({ rideId, replyTo }) => {
      try {
        if (!rideId || !replyTo) return;
          const otpKey = `rideOtp:${rideId}`;
        let saved = localStorage.getItem(otpKey);
        if (!saved) {
          saved = Math.floor(1000 + Math.random() * 9000).toString();
          localStorage.setItem(otpKey, saved);
          setOtp(saved);
        }
        try {
          await axios.post(
            `${API_URL}/rides/${rideId}/set-otp`,
            { otp: saved },
            { headers: { Authorization: `Bearer ${auth?.token}` } }
          );
        } catch (e) {
          console.warn("Failed to persist ride OTP on rider request:", e?.message || e);
        }
        socket.emit("rideOtpForRider", { replyTo, rideId, otp: saved });
      } catch (e) {
        console.warn("requestRideOtp handler error:", e?.message || e);
      }
    });

    socket.on("rideRejected", () => {
      setLookingForRider(false);
      // No popup needed when ride is rejected
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
      setMapOnlyView(true);
      // Hide OTP banner once the rider verifies the OTP
      setAcceptBannerOpen(false);
      // Close any open selection drawer once the ride starts
      try { setDrawerOpen(false); } catch {}
      // Persist map-only state for this active ride to survive refresh
      try {
        const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
          const rideId = ride?._id || localStorage.getItem(activeKey);
          if (rideId) {
          localStorage.setItem(`rideMapOnly:${rideId}`, 'true');
          }
      } catch {}
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
      // Also open rating dialog (non-blocking, user can submit or close)
      try {
        setRatingRideId(ride?._id || null);
        setShowRatingDialog(true);
      } catch {}
      // Persist unpaid lock so the prompt survives refresh until payment is completed
      try {
        if (ride && ride._id) {
          localStorage.setItem(`unpaid:${ride._id}`, "true");
        }
      } catch {}
      setRiderPanelOpen(false);
      // Exit map-only mode once a ride is completed
      setMapOnlyView(false);
      // 🔓 Reset booking state so user can immediately make another booking
      try {
        setLookingForRider(false);
        setAssignedRider(null);
        setDrawerOpen(false);
        setCreatedRide(null);
        setSelectedRide(null);
        // Clear map markers and any lingering route after completion
        setPickup(null);
        setDrop(null);
        setPickupAddress("");
        setDropAddress("");
        setRiderLocation(null);
        setAvailableRiders([]);
      } catch {}
      try {
        // Smoothly scroll to the payment prompt area to avoid perceived reload
        mapPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
      try {
        const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
        const rideId = localStorage.getItem(activeKey);
        if (rideId) {
          // Clear per-ride OTP when completed; it will be shown until rider starts
          localStorage.removeItem(`rideOtp:${rideId}`);
        }
        localStorage.removeItem(activeKey);
        // Also clear per-ride map-only persistence so refresh won’t show old route
        try {
          localStorage.removeItem(`rideMapOnly:${ride?._id}`);
          if (rideId) localStorage.removeItem(`rideMapOnly:${rideId}`);
        } catch {}
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
          try { localStorage.setItem(`riderLocation:last:${rideId}`, JSON.stringify(coords)); } catch {}
        }
      } catch {
        // Fallback: update if filtering fails
        setRiderLocation(coords);
        try { if (createdRide?._id) localStorage.setItem(`riderLocation:last:${createdRide._id}`, JSON.stringify(coords)); } catch {}
      }
    });

    // Show rider’s available location before a ride is created,
    // and continue showing assigned rider’s live location pre-OTP.
    socket.on("riderAvailableLocationUpdate", ({ coords, vehicleType, riderId }) => {
      try {
        const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
        const activeId = localStorage.getItem(activeKey);
        const currentId = activeId || (createdRide && createdRide._id) || null;
        const hasActiveRide = Boolean(currentId);

        // Guard invalid coords
        if (!coords || coords.lat == null || coords.lng == null || !riderId) return;

        // Maintain a list of all available riders near the user
        setAvailableRiders((prev) => {
          const idx = prev.findIndex((r) => String(r.riderId) === String(riderId));
          const entry = { riderId, vehicleType, coords };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...entry };
            return next;
          }
          // cap list to avoid unbounded growth
          const filtered = prev.filter((r) => r && r.riderId && String(r.riderId) !== String(riderId)).slice(0, 49);
          return [entry, ...filtered];
        });

        if (!hasActiveRide) {
          // No active ride — still reflect last seen rider to center map if needed
          setRiderLocation(coords);
          return;
        }

        // When a rider is assigned but OTP not verified yet, reflect that rider’s location too
        const assignedId = assignedRider?._id || assignedRider?.id;
        if (!mapOnlyView && assignedId && String(riderId) === String(assignedId)) {
          setRiderLocation(coords);
          try { localStorage.setItem(`riderLocation:last:${currentId}`, JSON.stringify(coords)); } catch {}
        }
      } catch {
        if (coords && coords.lat != null && coords.lng != null) setRiderLocation(coords);
      }
    });

    // Remove riders from the local list when they go offline
    socket.on("riderAvailabilityUpdate", ({ isOnline, riderId }) => {
      try {
        if (!isOnline && riderId) {
          setAvailableRiders((prev) => prev.filter((r) => String(r.riderId) !== String(riderId)));
        }
      } catch (_) {}
    });

    return () => {
      
      socket.off("rideAccepted");
      socket.off("rideRejected");
      socket.off("rideStarted");
      socket.off("rideCompleted");
      socket.off("riderLocationUpdate");
      socket.off("riderAvailableLocationUpdate");
      socket.off("riderAvailabilityUpdate");
    };
  }, [assignedRider, mapOnlyView, createdRide, auth]);

  // Re-check payment status when the prompt is visible; auto-hide if already paid
  useEffect(() => {
    if (!showPaymentPrompt) return;
    (async () => {
      try {
        const unpaidKeys = Object.keys(localStorage).filter((k) => k.startsWith("unpaid:"));
        const rideId = (createdRide?._id) || (unpaidKeys.length ? unpaidKeys[0].split(":")[1] : null);
        if (!rideId) return;
        const resp = await axios.get(`${API_URL}/rides/${rideId}`, { headers: { Authorization: `Bearer ${auth?.token}` } });
        const ride = resp.data?.ride;
        const ps = ride?.payment?.status || ride?.paymentStatus || null;
        if (ps === "success" || ps === "completed" || ps === "paid") {
          setShowPaymentPrompt(false);
          try { localStorage.removeItem(`unpaid:${rideId}`); } catch {}
        }
      } catch {}
    })();
  }, [showPaymentPrompt, createdRide, auth]);

  return (
  <Container maxWidth="xl" sx={{ mt: 3 }} className="booking-page mobile-ui rapido-ui px-2 sm:px-6 space-y-4">
      {/* 🚨 SOS Button (fixed position) */}
      <SOSButton role="user" />


      {/* Service area limit popup */}
      <Dialog open={serviceLimitOpen} onClose={() => setServiceLimitOpen(false)}>
        <DialogTitle>Service Area Limit</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1 }}>
            We currently support rides up to 25 km from your pickup location.
            Please adjust your drop location or consider splitting the journey.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServiceLimitOpen(false)} variant="contained">OK</Button>
        </DialogActions>
      </Dialog>

    {/* Booking ride for — Rapido-style bottom sheet */}
    <Dialog
      open={bookingForOpen}
      onClose={() => setBookingForOpen(false)}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderTopLeftRadius: 3, borderTopRightRadius: 3, pb: 1, width: { xs: '92%', md: 380 }, mr: { xs: 1, md: 0 }, mb: { xs: 1, md: 0 } } }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: { xs: 'flex-end', md: 'center' },
          justifyContent: { xs: 'flex-end', md: 'center' }
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Booking ride for</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <RadioGroup
            value={bookingFor}
            onChange={(e) => setBookingFor(e.target.value)}
          >
            <FormControlLabel
              value="myself"
              control={<Radio />}
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PersonOutlineIcon sx={{ color: 'text.secondary' }} /><Typography>Myself</Typography></Box>}
            />
            <FormControlLabel
              value="other"
              control={<Radio sx={{ display: 'none' }} />}
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AddIcon sx={{ color: 'text.secondary' }} /><Typography sx={{ color: 'primary.main', fontWeight: 600 }}>Add new rider</Typography></Box>}
            />
          </RadioGroup>
        </FormControl>
        {bookingFor === 'other' && (
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              type="tel"
              label="Mobile number"
              placeholder="Enter rider mobile number"
              value={bookingForMobile}
              onChange={(e) => setBookingForMobile(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIphoneIcon fontSize="small" />
                  </InputAdornment>
                ),
                inputMode: 'tel',
              }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContactPageOutlinedIcon />}
              onClick={handlePickContact}
              sx={{ mt: 1 }}
            >
              Pick from contacts
            </Button>
          </Box>
        )}
        {/* Info note */}
        <Box sx={{ mt: 2, p: 1.25, bgcolor: '#F5F6F8', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoOutlinedIcon sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">Contact name won't be shared with captain</Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          fullWidth
          sx={{ bgcolor: '#FF8A1F', color: '#fff', '&:hover': { bgcolor: '#E67600' } }}
          onClick={() => setBookingForOpen(false)}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>

      {/* Searching modal (Rapido-style popup) */}
      <Dialog open={lookingForRider} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Finding a nearby captain…</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
              We’re matching you with the best nearby rider.
            </Typography>
            {pickupAddress && dropAddress && (
              <Box sx={{ mt: 2, width: '100%' }}>
                <Typography variant="caption">Pickup</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>{pickupAddress}</Typography>
                <Typography variant="caption">Drop</Typography>
                <Typography variant="body2">{dropAddress}</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLookingForRider(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Global payment prompt shown when ride is completed */}
      {showPaymentPrompt && (
        <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#ecfdf5', border: '1px solid #d1fae5' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#000000' }}>
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
                navigate('/payment', { state: { amount: amt } });
              }
            }}
          >
            Pay Now
          </Button>
        </Box>
      )}
      <Box className="booking-grid" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: mapOnlyView ? "1fr" : "1fr 2fr" }, gap: 2 }}>
        {/* Left panel (hidden after OTP verification) */}
        {!mapOnlyView && (
        <Paper className="booking-form" sx={{ p: 3, borderRadius: 2 }}>
          {assignedRider && riderPanelOpen ? (
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
                <b>Vehicle:</b>{" "}
                { (assignedRider.vehicleType || assignedRider.vehicle?.type)
                  ? `${assignedRider.vehicleType || assignedRider.vehicle?.type} (${assignedRider.vehicleNumber || assignedRider.vehicle?.registrationNumber || 'N/A'})`
                  : (assignedRider.vehicleNumber || assignedRider.vehicle?.registrationNumber
                      ? `(${assignedRider.vehicleNumber || assignedRider.vehicle?.registrationNumber})`
                      : 'N/A') }
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
                <b>Upfront Fare:</b>{" "}
                {createdRide?.finalPrice != null && Number(createdRide.finalPrice) > 0
                  ? `₹${Number(createdRide.finalPrice).toFixed(2)}`
                  : (rideOptions.find((r) => r.id === selectedRide)?.price || "—")}
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Your OTP Code</Typography>
                <Typography variant="h4" sx={{ letterSpacing: 2, fontWeight: 'bold', color: '#000000' }}>
                  {otp}
                </Typography>
                <Typography variant="caption">Share this code with your rider to start the trip</Typography>
              </Box>
              <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => {
                    const mobile = assignedRider?.mobile;
                    if (mobile) window.location.href = `tel:${mobile}`;
                  }}
                >
                  📞 Call
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setChatOpen(true)}
                >
                  💬 Chat
                </Button>
              </Box>
              <Typography variant="body1" sx={{ mt: 2 }}>{rideStatus}</Typography>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#1A1A1A', fontWeight: 700 }}>Rider App</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setBookingForOpen(true)}
                  endIcon={<KeyboardArrowDownIcon fontSize="small" />}
                  sx={{ ml: 'auto', borderRadius: 999, bgcolor: '#fff', color: 'text.primary', px: 1.5, py: 0.5, height: 30, fontSize: '0.8rem', textTransform: 'none', fontWeight: 600, borderColor: '#E0E0E0', boxShadow: 'none', '&:hover': { bgcolor: '#fff' } }}
                >
                  {bookingFor === 'myself' ? 'For me' : 'For someone'}
                </Button>
              </Box>

              {/* ✅ Pickup Input with Suggestions */}
              <TextField
                className="booking-input"
                fullWidth
                label="Enter Pickup Location"
                value={pickupAddress}
                onChange={(e) => {
                  setPickupAddress(e.target.value);
                  fetchSuggestions(e.target.value, setPickupSuggestions, pickup);
                }}
                sx={{ mb: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOnIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label="Use current location" onClick={useCurrentPickup} size="small" edge="end">
                        <MyLocationIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {/* Wrap pickup suggestions to avoid pushing layout on mobile */}
              {pickupSuggestions.length > 0 && (
                <Box className="suggestions-panel">
                  {pickupSuggestions.map((s, i) => (
                    <ListItemButton
                      key={`m-pu-${i}`}
                      onClick={() => handlePickupSelect(s.place_id, s.description)}
                    >
                      {s.description}
                    </ListItemButton>
                  ))}
                </Box>
              )}

              {/* ✅ Drop Input with Suggestions */}
              <TextField
                className="booking-input"
                fullWidth
                label="Enter Drop Location"
value={dropAddress}
                onChange={(e) => {
                  setDropAddress(e.target.value);
                  fetchSuggestions(e.target.value, setDropSuggestions, pickup);
                }}
                sx={{ mb: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FlagIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              {/* Wrap drop suggestions to avoid pushing layout on mobile */}
              {dropSuggestions.length > 0 && (
                <Box className="suggestions-panel">
                  {dropSuggestions.map((s, i) => (
                    <ListItemButton
                      key={`m-dr-${i}`}
                      onClick={() => handleDropSelect(s.place_id, s.description)}
                    >
                      {s.description}
                    </ListItemButton>
                  ))}
                </Box>
              )}

              {pickup && drop && distance ? (
                <>
                  <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOnIcon fontSize="small" color="error" />
                      <Typography variant="body2" noWrap>{pickupAddress}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <FlagIcon fontSize="small" color="success" />
                      <Typography variant="body2" noWrap>{dropAddress}</Typography>
                    </Box>
                  </Paper>

                  {/* Service selection removed per request; defaulting to Bike */}

                  {/* Hidden per Rapido-style single-page booking */}
                  <Button
                    className="booking-blue-btn"
                    fullWidth
                    variant="contained"
                    onClick={handleFindRiders}
                    sx={{ mt: 1, bgcolor: '#16A34A', color: '#fff', border: '1px solid #0b3d1c', '&:hover': { bgcolor: '#15803D' }, display: 'none' }}
                  >
                    Find Driver
                  </Button>
                </>
              ) : (
                <>
                  {/* Hidden per Rapido-style single-page booking */}
                  <Button
                    className="booking-blue-btn"
                    fullWidth
                    variant="contained"
                    onClick={handleFindRiders}
                    sx={{ mt: 1, bgcolor: '#16A34A', color: '#fff', border: '1px solid #0b3d1c', '&:hover': { bgcolor: '#15803D' }, display: 'none' }}
                  >
                    Find Driver
                  </Button>
                </>
              )}
            </>
          )}
        </Paper>
        )}

        {/* Map panel */}
        <Paper
          className="booking-map"
          sx={{
            display: 'block',
            p: 1,
            borderRadius: 2,
            // Make the map reliably visible on mobile and desktop
            height: { xs: 'calc(100vh - 160px)', md: '70vh' },
            minHeight: { xs: 420, md: 520 },
            width: '100%'
          }}
          ref={mapPanelRef}
        >
          <MapComponent
            apiKey={GOOGLE_API_KEY}
            pickup={pickup}
            setPickup={setPickup}
            setPickupAddress={setPickupAddress}
            drop={drop}
            setDrop={(pos) => {
              try {
                const dist = distanceKmBetween(pickup, pos);
                if (pickup && Number.isFinite(dist) && dist > MAX_RIDE_DISTANCE_KM) {
                  setServiceLimitOpen(true);
                  return;
                }
              } catch {}
              setDrop(pos);
            }}
            setDropAddress={setDropAddress}
            riderLocation={riderLocation}
            availableRiders={availableRiders}
            route={route}
            setRoute={setRoute}
            setDistance={setDistance}
            setDuration={setDuration}
            setNormalDuration={setNormalDuration}
            // Show rider's exact location + pickup ONLY once a rider is assigned (accepted),
            // and switch to full route view after OTP (mapOnlyView)
            showRiderOnly={Boolean(assignedRider) && !mapOnlyView}
            // After OTP verification, keep map in started state
            rideStarted={createdRide?.status === "in_progress" || mapOnlyView}
            vehicleType={assignedRider?.vehicleType || assignedRider?.vehicle?.type || selectedRide}
            vehicleImage={assignedRider?.vehicle?.images?.[0] || assignedRider?.vehicleImage}
          />
        </Paper>
        {/* Compact riders panel removed from UI per Rapido-style layout */}
        {(!assignedRider && !mapOnlyView && false) && (
          <Paper sx={{ mt: 2, p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
              Find riders below
            </Typography>
            {Array.isArray(availableRiders) && availableRiders.length > 0 ? (
              <Box>
                {/* summarize by vehicle type */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {['bike','auto','car','taxi'].map((t) => {
                    const count = availableRiders.filter(r => {
                      const vt = (r?.vehicleType || r?.vehicle?.type || '').toString().toLowerCase();
                      return vt.includes(t);
                    }).length;
                    return (
                      <Chip key={t} size="small" label={`${t.charAt(0).toUpperCase()+t.slice(1)}: ${count}`} />
                    );
                  })}
                  <Chip size="small" color="primary" label={`Total: ${availableRiders.length}`} />
                </Box>
                {/* simple list of riders */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                  {availableRiders.slice(0, 8).map((r, idx) => {
                    const vtRaw = (r?.vehicleType || r?.vehicle?.type || '').toString().toLowerCase();
                    const vt = vtRaw.includes('bike') ? 'Bike' : vtRaw.includes('auto') ? 'Auto' : vtRaw.includes('car') ? 'Car' : vtRaw.includes('taxi') ? 'Taxi' : 'Rider';
                    const coords = r?.coords || r?.location || r;
                    const lat = coords?.lat ?? coords?.latitude;
                    const lng = coords?.lng ?? coords?.longitude;
                    return (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                        <Avatar sx={{ mr: 1 }}>
                          {vt === 'Bike' ? '🏍' : vt === 'Auto' ? '🛺' : vt === 'Car' ? '🚗' : '🚕'}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{vt}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {lat != null && lng != null ? `Lat: ${Number(lat).toFixed(5)}, Lng: ${Number(lng).toFixed(5)}` : 'Location updating…'}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
                {/* convenience action, reuses existing handler */}
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={handleFindRiders} className="booking-blue-btn"
                    sx={{ bgcolor: '#16A34A', color: '#fff', border: '1px solid #0b3d1c', '&:hover': { bgcolor: '#15803D' } }}>
                    Find Driver
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">Waiting for nearby riders…</Typography>
            )}
          </Paper>
        )}

        {/* Inline ride selection panel – hidden once a ride is accepted */}
        {(!mapOnlyView && !(createdRide?.status === 'accepted' || createdRide?.status === 'in_progress' || assignedRider)) && (
          <Paper sx={{ mt: 2, p: 3, borderRadius: 2, gridColumn: { md: '1 / 2' } }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>Choose a ride</Typography>
            {/* condition badges similar to reference image */}
            <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
              {zoneFactors?.currentTraffic && zoneFactors.currentTraffic !== "light" && (
                <Chip label="High Traffic" color="warning" icon={<span>⚡</span>} />
              )}
              {zoneFactors?.currentWeather && zoneFactors.currentWeather !== "clear" && (
                <Chip label="Bad Weather" color="error" icon={<span>🌧</span>} />
              )}
            </Box>

            {rideOptions.map((opt) => (
              <Box key={opt.id} onClick={() => setSelectedRide(opt.id)} className="ride-option-card"
                sx={{
                  border: selectedRide === opt.id ? "2px solid black" : "1px solid #ccc",
                  borderRadius: 2, p: { xs: 1.5, sm: 2 }, mb: { xs: 1.5, sm: 2 }, cursor: "pointer",
                  display: "grid",
                  gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) auto' },
                  alignItems: "center", columnGap: { xs: 1, sm: 2 }, rowGap: { xs: 0.5, sm: 0 }, overflow: 'visible'
                }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body1" sx={{ fontWeight: "bold", display: 'flex', alignItems: 'center', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                    {opt.icon ? `${opt.icon} ` : ""}{opt.name}
                    {(opt.id === 'bike' || opt.id === 'auto' || opt.id === 'car') && (
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ml: 1, px: 0.75, py: 0.25, borderRadius: 1, bgcolor: '#ecfdf5', color: '#16A34A' }}>
                        <PersonOutlineIcon sx={{ fontSize: '1rem' }} />
                        <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
                          {availableRiders.filter(r => {
                            const vt = (r?.vehicleType || r?.vehicle?.type || '').toString().toLowerCase();
                            return vt.includes(opt.id);
                          }).length}
                        </Typography>
                      </Box>
                    )}
                    {/* Mobile price pill */}
                    <Box
                      component="span"
                      sx={{
                        display: { xs: 'inline-flex', sm: 'none' },
                        alignItems: 'center',
                        ml: 1,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: '#ecfdf5',
                        color: '#16A34A',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                      }}
                    >
                      {selectedRide === opt.id && createdRide?.finalPrice != null ? `₹${Number(createdRide.finalPrice).toFixed(2)}` : opt.price}
                    </Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pickup ETA: {opt.eta} • Drop time: {duration || opt.meta?.duration || "—"}
                  </Typography>
                </Box>
                <Typography
                  variant="h6"
                  className="ride-price"
                  sx={{
                    fontWeight: "bold",
                    color: "#16A34A",
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    textAlign: 'right',
                    ml: { xs: 1, sm: 2 },
                    mt: { xs: 0.5, sm: 0 },
                    justifySelf: { xs: 'end', sm: 'unset' },
                    flexShrink: 0,
                    minWidth: { xs: 68, sm: 'auto' },
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    lineHeight: { xs: 1.25, sm: 1.4 },
                    overflow: 'visible',
                    visibility: 'visible',
                    display: { xs: 'none', sm: 'block' },
                  }}
                  //className="text-indigo-800"
                >
                  {selectedRide === opt.id && createdRide?.finalPrice != null ? `₹${Number(createdRide.finalPrice).toFixed(2)}` : opt.price}
                </Typography>
              </Box>
            ))}

            {/* Payment Method Selection */}
            <Box className="payment-section" sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2, mb: 2 }}>
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
                <FormControlLabel value="online" control={<Radio />} label="Online" />
                <FormControlLabel value="cash" control={<Radio />} label="Cash (Pay at drop)" />
              </RadioGroup>

              {showDetailedPayments && (
                <Box sx={{ mt: 1 }}>
                  {/* Selected summary */}
                  {selectedPaymentOption && (
                    <Chip
                      label={`Selected: ${(() => {
                        const labels = {
                          wallet: "Wallet",
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
                      selected={selectedPaymentOption === "wallet"}
                      onClick={() => setSelectedPaymentOption("wallet")}
                    >
                      Wallet
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

                  {/* Cards */}
                  <Box sx={{ mt: 1 }}>
                    <Chip label="Cards" color="default" variant="outlined" sx={{ mb: 0.5 }} />
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <ListItemButton
                        selected={selectedPaymentOption === "card_any"}
                        onClick={() => { setSelectedPaymentOption("card_any"); setDetailedPaymentMethod("card"); }}
                      >
                        Debit/Credit Card
                      </ListItemButton>
                    </Box>
                  </Box>

                  {/* Net Banking */}
                  <Box sx={{ mt: 1 }}>
                    <Chip label="Net Banking" color="default" variant="outlined" sx={{ mb: 0.5 }} />
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <ListItemButton
                        selected={selectedPaymentOption === "net_banking_any"}
                        onClick={() => { setSelectedPaymentOption("net_banking_any"); setDetailedPaymentMethod(""); }}
                      >
                        Net Banking
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
              <></>
            ) : (
              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 2, bgcolor: '#FF8A1F', color: '#fff', '&:hover': { bgcolor: '#E67600' } }}
                onClick={handleBookRide}
                disabled={!selectedRide || showPaymentPrompt}
                title={showPaymentPrompt ? 'Complete payment to book your next ride' : ''}
              >
                {selectedRide === "parcel" ? "Go to Parcel Page" : "Book Ride"}
                {selectedRide !== "parcel" && (
                  <Box
                    component="span"
                    sx={{
                      display: { xs: 'inline-flex', sm: 'none' },
                      alignItems: 'center',
                      ml: 1,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: '#ecfdf5',
                      color: '#16A34A',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}
                  >
                  {createdRide?.finalPrice != null && Number(createdRide.finalPrice) > 0
                      ? `₹${Number(createdRide.finalPrice).toFixed(2)}`
                      : (rideOptions.find((r) => r.id === selectedRide)?.price || '—')}
                  </Box>
                )}
              </Button>
            )}
          </Paper>
        )}
      </Box>

      {/* Rider options drawer */}
      <Drawer anchor="bottom" open={drawerOpen && !(createdRide?.status === 'accepted' || createdRide?.status === 'in_progress' || assignedRider)} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>Choose a ride</Typography>
          {/* condition badges similar to reference image */}
          <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
            {zoneFactors?.currentTraffic && zoneFactors.currentTraffic !== "light" && (
              <Chip label="High Traffic" color="warning" icon={<span>⚡</span>} />
            )}
            {zoneFactors?.currentWeather && zoneFactors.currentWeather !== "clear" && (
              <Chip label="Bad Weather" color="error" icon={<span>🌧</span>} />
            )}
          </Box>
          {rideOptions.map((opt) => (
            <Box key={opt.id} onClick={() => setSelectedRide(opt.id)} className="ride-option-card"
              sx={{
                border: selectedRide === opt.id ? "2px solid black" : "1px solid #ccc",
                borderRadius: 2, p: { xs: 1.5, sm: 2 }, mb: { xs: 1.5, sm: 2 }, cursor: "pointer",
                display: "grid",
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) auto' },
                alignItems: "center", columnGap: { xs: 1, sm: 2 }, rowGap: { xs: 0.5, sm: 0 }, overflow: 'visible'
              }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: "bold", display: 'flex', alignItems: 'center', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  {opt.icon ? `${opt.icon} ` : ""}{opt.name}
                  {/* Mobile price pill */}
                  <Box
                    component="span"
                    sx={{
                      display: { xs: 'inline-flex', sm: 'none' },
                      alignItems: 'center',
                      ml: 1,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: '#ecfdf5',
                      color: '#16A34A',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}
                  >
                    {selectedRide === opt.id && createdRide?.finalPrice != null ? `₹${Number(createdRide.finalPrice).toFixed(2)}` : opt.price}
                  </Box>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pickup ETA: {opt.eta} • Drop time: {duration || opt.meta?.duration || "—"}
                </Typography>
              </Box>
              <Typography
                variant="h6"
                className="ride-price"
                sx={{
                  fontWeight: "bold",
                  color: "#16A34A",
                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                  textAlign: 'right',
                  ml: { xs: 1, sm: 2 },
                  mt: { xs: 0.5, sm: 0 },
                  justifySelf: { xs: 'end', sm: 'unset' },
                  flexShrink: 0,
                  minWidth: { xs: 68, sm: 'auto' },
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  lineHeight: { xs: 1.25, sm: 1.4 },
                  overflow: 'visible',
                  visibility: 'visible',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {selectedRide === opt.id && createdRide?.finalPrice != null ? `₹${Number(createdRide.finalPrice).toFixed(2)}` : opt.price}
              </Typography>
            </Box>
          ))}
          {/* Price details based on traffic/weather conditions */}
          {/* Pricing panel removed per request */}
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
              <FormControlLabel value="online" control={<Radio />} label="Online" />
              <FormControlLabel value="cash" control={<Radio />} label="Cash (Pay at drop)" />
            </RadioGroup>

            {showDetailedPayments && (
              <Box sx={{ mt: 1 }}>
                {/* Selected summary */}
                {selectedPaymentOption && (
                  <Chip
                    label={`Selected: ${(() => {
                      const labels = {
                        wallet: "Wallet",
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
                    selected={selectedPaymentOption === "wallet"}
                    onClick={() => setSelectedPaymentOption("wallet")}
                  >
                    Wallet
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

                {/* Cards */}
                <Box sx={{ mt: 1 }}>
                  <Chip label="Cards" color="default" variant="outlined" sx={{ mb: 0.5 }} />
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <ListItemButton
                      selected={selectedPaymentOption === "card_any"}
                      onClick={() => { setSelectedPaymentOption("card_any"); setDetailedPaymentMethod("card"); }}
                    >
                      Debit/Credit Card
                    </ListItemButton>
                  </Box>
                </Box>

                {/* Net Banking */}
                <Box sx={{ mt: 1 }}>
                  <Chip label="Net Banking" color="default" variant="outlined" sx={{ mb: 0.5 }} />
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <ListItemButton
                      selected={selectedPaymentOption === "net_banking_any"}
                      onClick={() => { setSelectedPaymentOption("net_banking_any"); setDetailedPaymentMethod(""); }}
                    >
                      Net Banking
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
            <></>
          ) : (
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2, bgcolor: '#FF8A1F', color: '#fff', '&:hover': { bgcolor: '#E67600' } }}
              onClick={handleBookRide}
              disabled={!selectedRide || showPaymentPrompt}
              title={showPaymentPrompt ? 'Complete payment to book your next ride' : ''}
            >
              {selectedRide === "parcel" ? "Go to Parcel Page" : "Book Ride"}
              {selectedRide !== "parcel" && (
                <Box
                  component="span"
                  sx={{
                    display: { xs: 'inline-flex', sm: 'none' },
                    alignItems: 'center',
                    ml: 1,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: '#ecfdf5',
                    color: '#16A34A',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                  }}
                >
                  {createdRide?.finalPrice != null && Number(createdRide.finalPrice) > 0
                    ? `₹${Number(createdRide.finalPrice).toFixed(2)}`
                    : (rideOptions.find((r) => r.id === selectedRide)?.price || '—')}
                </Box>
              )}
            </Button>
          )}
        </Box>
      </Drawer>
      {/* Chat dialog for current ride */}
      {(() => {
        try {
          const activeKey = `activeRide:${auth?.user?._id || 'anon'}`;
          const activeId = localStorage.getItem(activeKey);
          const rideId = (createdRide && createdRide._id) || activeId || null;
          const otherName = (assignedRider && (assignedRider.fullName || assignedRider.name)) || "Rider";
          return (
            <ChatDialog
              open={chatOpen}
              onClose={() => setChatOpen(false)}
              rideId={rideId}
              otherName={otherName}
            />
          );
        } catch {
          return null;
        }
      })()}

      {/* Rating dialog shown after ride completion; does not block payment */}
      <RatingDialog
        open={showRatingDialog}
        onClose={() => setShowRatingDialog(false)}
        onSubmit={handleSubmitRating}
        ride={{ id: ratingRideId }}
        submitting={ratingSubmitting}
        error={ratingError}
      />

      {/* Rider details drawer disabled to keep only side-by-side popup */}
      <Drawer anchor="bottom" open={false} onClose={() => setRiderPanelOpen(false)}>
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
                <b>Vehicle:</b>{" "}
                { (assignedRider.vehicleType || assignedRider.vehicle?.type)
                  ? `${assignedRider.vehicleType || assignedRider.vehicle?.type} (${assignedRider.vehicleNumber || assignedRider.vehicle?.registrationNumber || 'N/A'})`
                  : (assignedRider.vehicleNumber || assignedRider.vehicle?.registrationNumber
                      ? `(${assignedRider.vehicleNumber || assignedRider.vehicle?.registrationNumber})`
                      : 'N/A') }
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
              <b>Upfront Fare:</b>{" "}
              {createdRide?.finalPrice != null && Number(createdRide.finalPrice) > 0
                ? `₹${Number(createdRide.finalPrice).toFixed(2)}`
                : (rideOptions.find((r) => r.id === selectedRide)?.price || "—")}
            </Typography>

              {/* OTP Display */}
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Your OTP Code</Typography>
                <Typography variant="h4" sx={{ letterSpacing: 2, fontWeight: 'bold', color: '#16A34A' }}>
                  {otp}
                </Typography>
                <Typography variant="caption">Share this code with your rider to start the trip</Typography>
              </Box>
              
              <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => {
                    const mobile = assignedRider?.mobile;
                    if (mobile) window.location.href = `tel:${mobile}`;
                  }}
                >
                  📞 Call
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setChatOpen(true)}
                >
                  💬 Chat
                </Button>
              </Box>
              <Typography variant="body1" sx={{ mt: 2 }}>{rideStatus}</Typography>

              {showPaymentPrompt && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#e8f5e9', border: '1px solid #c8e6c9' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#000000' }}>
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
                        navigate(`/payment/${id}`, { state: { amount: amt } });
                      } else {
                        navigate('/payment', { state: { amount: amt } });
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
      {/* Enable Location chip/dialog for devices */}
      <LocationPrompt role="user" onGranted={(coords) => {
        try { setUserLiveCoords(coords); } catch {}
      }} />
    </Container>
  );
}
