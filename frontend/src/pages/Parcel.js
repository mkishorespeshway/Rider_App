import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  MenuItem,
  List,
  ListItem,
  ListItemButton,
} from "@mui/material";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Map from "../components/Map";

export default function Parcel() {
  const [form, setForm] = useState({
    senderName: "",
    senderMobile: "",
    receiverName: "",
    receiverMobile: "",
    parcelCategory: "",
    parcelDetails: "",
    pickupAddress: "",
    dropAddress: "",
  });

  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [documents, setDocuments] = useState([]);
  // clear documents when category doesn't require uploads
  useEffect(() => {
    const cat = String(form.parcelCategory || "").trim().toLowerCase();
    if (cat !== "xerox" && cat !== "documents" && documents.length > 0) {
      setDocuments([]);
    }
  }, [form.parcelCategory]);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);

  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);

  const navigate = useNavigate();

  // 📍 Get current location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCurrentLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => console.warn("Geolocation warning:", err)
    );
  }, []);

  // 🌍 Geocoding helpers
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      return res.data.display_name || "";
    } catch (err) {
      console.warn("Reverse geocode warning:", err);
      return "";
    }
  };

  // 📤 Document change handler
  const handleDocsChange = (e) => {
    const files = Array.from(e.target.files || []);
    setDocuments(files);
  };

  // 📍 Suggestions search (within ~30km radius)
  const fetchSuggestions = async (query, type) => {
    if (!query || !currentLocation) return;

    const lat = currentLocation.lat;
    const lon = currentLocation.lng;
    const delta = 0.27; // ~30km

    const viewbox = [
      lon - delta,
      lat - delta,
      lon + delta,
      lat + delta,
    ].join(",");

    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=5&viewbox=${viewbox}&bounded=1`
      );
      if (type === "pickup") setPickupSuggestions(res.data);
      if (type === "drop") setDropSuggestions(res.data);
    } catch (err) {
      console.warn("Suggestion fetch warning:", err);
    }
  };

  // 📍 Set GPS as default pickup
  useEffect(() => {
    if (currentLocation) {
      setPickup(currentLocation);
      (async () => {
        const addr = await getAddressFromCoords(
          currentLocation.lat,
          currentLocation.lng
        );
        setForm((prev) => ({ ...prev, pickupAddress: addr }));
      })();
    }
  }, [currentLocation]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ Submit to backend → then navigate to Activity page
  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.senderMobile)) {
      alert("Sender Mobile must be 10 digits starting with 6,7,8,9");
      return;
    }
    if (!phoneRegex.test(form.receiverMobile)) {
      alert("Receiver Mobile must be 10 digits starting with 6,7,8,9");
      return;
    }

    const pickupData = pickup || { lat: null, lng: null };
    const dropData = drop || { lat: null, lng: null };

    try {
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const API_URL = `${API_BASE}/api`;

      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val ?? ""));
      formData.append("pickup", JSON.stringify(pickupData));
      formData.append("drop", JSON.stringify(dropData));
      documents.forEach((file) => formData.append("documents", file));

      const res = await axios.post(`${API_URL}/parcels`, formData);
      // Persist active parcel context so Activity works across reloads/devices
      try {
        localStorage.setItem("activeParcelId", res?.data?.parcel?._id || "");
        if (distance) localStorage.setItem("activeParcelDistance", String(distance));
      } catch {}

      navigate("/activity", {
        state: {
          parcel: res.data.parcel,
          distance,
        },
      });
    } catch (err) {
      console.warn("Error submitting parcel:", err?.response?.data || err.message);
      alert(err?.response?.data?.message || "Error submitting parcel!");
    }
  };

  // 📍 Drop marker by map click
  // (Handled inside Map component now)

  // 📍 Draggable Pickup Marker
  // (Handled via address suggestions + Map component)

  // 🛣️ Fetch real route when pickup & drop set
  useEffect(() => {
    const fetchRoute = async () => {
      if (pickup && drop) {
        try {
          const res = await axios.get(
            `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`
          );
          const data = res.data.routes[0];
          setRoute(data.geometry.coordinates.map((c) => [c[1], c[0]]));
          setDistance((data.distance / 1000).toFixed(2)); // in km
        } catch (err) {
          console.warn("Route fetch warning:", err);
        }
      }
    };
    fetchRoute();
  }, [pickup, drop]);

  // ✅ Custom marker icons (only used for legacy Leaflet map, kept for reference)

  return (
    <Container maxWidth="lg" className="px-3 sm:px-6">
      <Paper className="p-3 sm:p-4 rounded-2xl" sx={{ mt: 4, p: 4, borderRadius: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
          📦 Book a Parcel
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "gray" }}>
          Fill in the parcel details and select pickup/drop points (manual or map).
        </Typography>

        {/* ✅ Flex layout: Form (left) + Map (right) */}
        <Box
          className="grid grid-cols-1 lg:grid-cols-2 gap-3"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 3,
          }}
        >
          {/* --- LEFT: Form --- */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              name="senderName"
              label="Sender Name"
              value={form.senderName}
              onChange={handleChange}
              fullWidth
              required
            />

            {/* Sender Mobile */}
            <TextField
              name="senderMobile"
              label="Sender Mobile"
              value={form.senderMobile}
              onChange={handleChange}
              inputProps={{ pattern: "[6-9][0-9]{9}", maxLength: 10 }}
              helperText="Enter 10-digit mobile starting with 6-9"
              required
            />

            {/* Receiver Name */}
            <TextField
              name="receiverName"
              label="Receiver Name"
              value={form.receiverName}
              onChange={handleChange}
              fullWidth
              required
            />

            {/* Receiver Mobile */}
            <TextField
              name="receiverMobile"
              label="Receiver Mobile"
              value={form.receiverMobile}
              onChange={handleChange}
              inputProps={{ pattern: "[6-9][0-9]{9}", maxLength: 10 }}
              helperText="Enter 10-digit mobile starting with 6-9"
              required
            />

            {/* Parcel Category */}
            <TextField
              select
              name="parcelCategory"
              label="Parcel Category"
              value={form.parcelCategory}
              onChange={handleChange}
              required
              sx={{ gridColumn: "1/3" }}
            >
              <MenuItem value="Documents">Documents</MenuItem>
              <MenuItem value="Xerox">Xerox</MenuItem>
              <MenuItem value="Food">Food</MenuItem>
              <MenuItem value="Electronics">Electronics</MenuItem>
              <MenuItem value="Clothes">Clothes</MenuItem>
              <MenuItem value="Fragile">Fragile</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>

            {/* Pickup/Drop addresses removed as requested – use map pins only */}

            {/* Parcel Details */}
            <TextField
              name="parcelDetails"
              label="Parcel Details"
              value={form.parcelDetails}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
              sx={{ gridColumn: "1/3" }}
            />

            {/* Upload Documents (only for Xerox/Documents) */}
            {(["xerox" ].includes(String(form.parcelCategory || "").trim().toLowerCase())) && (
              <Box sx={{ gridColumn: "1/3" }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Upload Document(s)</Typography>
                <input type="file" multiple onChange={handleDocsChange} />
              </Box>
            )}

            <Button
              type="submit"
              variant="contained"
              sx={{
                mt: 2,
                gridColumn: "1/3",
                bgcolor: "black",
                "&:hover": { bgcolor: "#333" },
              }}
            >
              Submit Parcel Request
            </Button>
          </Box>

          {/* --- RIGHT: Map (Google Maps with fallback) --- */}
          <Box sx={{ height: { xs: '60vh', md: '70vh' }, minHeight: { xs: 380, md: 440 }, borderRadius: 2, overflow: 'hidden' }}>
            <Map
              apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
              pickup={pickup}
              setPickup={setPickup}
              setPickupAddress={(addr) => setForm((prev) => ({ ...prev, pickupAddress: addr }))}
              drop={drop}
              setDrop={setDrop}
              setDropAddress={(addr) => setForm((prev) => ({ ...prev, dropAddress: addr }))}
              setDistance={setDistance}
              setDuration={() => {}}
              setNormalDuration={() => {}}
              showRiderOnly={false}
              rideStarted={false}
            />
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
