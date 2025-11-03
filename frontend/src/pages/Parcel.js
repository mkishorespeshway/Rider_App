import React, { useState, useEffect, useRef } from "react";
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
import "../parcel-mobile.css";

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
  const [xeroxOptions, setXeroxOptions] = useState({ size: "A4", colorMode: "bw", sides: "single", copies: 1, totalPages: 1 });
  const [priceEstimate, setPriceEstimate] = useState(0);
  // clear documents when category doesn't require uploads
  useEffect(() => {
    const cat = String(form.parcelCategory || "").trim().toLowerCase();
    if (cat !== "xerox" && cat !== "documents" && documents.length > 0) {
      setDocuments([]);
    }
  }, [form.parcelCategory]);

  // Compute simple price estimate similar to Blinkit
  useEffect(() => {
    try {
      const pages = Math.max(1, Number(xeroxOptions.totalPages) || 1);
      const copies = Math.max(1, Number(xeroxOptions.copies) || 1);
      const perPage = xeroxOptions.colorMode === "color" ? 15 : 3;
      const sidesFactor = xeroxOptions.sides === "double" ? 0.9 : 1.0; // small discount for double-sided
      const sizeFactor = xeroxOptions.size === "A3" ? 2 : xeroxOptions.size === "A5" ? 0.7 : 1;
      const total = Math.round(perPage * sizeFactor * sidesFactor * pages * copies);
      setPriceEstimate(total);
    } catch {}
  }, [xeroxOptions]);

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
    const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
    const maxPerFileMB = 50;
    const maxFiles = 15;
    const filtered = [];
    for (const f of files) {
      if (!allowedTypes.includes(f.type)) {
        alert(`Unsupported file type: ${f.type}. Allowed: PNG, JPG, PDF.`);
        continue;
      }
      if (f.size > maxPerFileMB * 1024 * 1024) {
        alert(`${f.name} exceeds ${maxPerFileMB} MB limit`);
        continue;
      }
      filtered.push(f);
      if (filtered.length >= maxFiles) break;
    }
    setDocuments(filtered);
  };

  const fileInputRef = useRef(null);

  // Drag & drop helpers
  const onDropZoneDragOver = (e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} };
  const onDropZoneDrop = (e) => {
    try {
      e.preventDefault();
      const dtFiles = Array.from(e.dataTransfer?.files || []);
      const mockEvent = { target: { files: dtFiles } };
      handleDocsChange(mockEvent);
    } catch {}
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

  // 🔒 Initialize from Booking selections if present and lock edits
  const [lockedFromBooking, setLockedFromBooking] = useState(false);

  useEffect(() => {
    try {
      const locked = localStorage.getItem("parcelLockFromBooking") === "true";
      const puStr = localStorage.getItem("parcelPickupCoords");
      const drStr = localStorage.getItem("parcelDropCoords");
      const puAddr = localStorage.getItem("parcelPickupAddress");
      const drAddr = localStorage.getItem("parcelDropAddress");

      const pu = puStr ? JSON.parse(puStr) : null;
      const dr = drStr ? JSON.parse(drStr) : null;

      if (pu && typeof pu === "object") setPickup(pu);
      if (dr && typeof dr === "object") setDrop(dr);
      if (puAddr) setForm((prev) => ({ ...prev, pickupAddress: puAddr }));
      if (drAddr) setForm((prev) => ({ ...prev, dropAddress: drAddr }));

      if (locked && pu && dr) setLockedFromBooking(true);
    } catch {}
  }, []);

  // 📍 Set GPS as default pickup ONLY when not locked and no saved pickup
  useEffect(() => {
    if (!lockedFromBooking && currentLocation && !pickup) {
      setPickup(currentLocation);
      (async () => {
        const addr = await getAddressFromCoords(
          currentLocation.lat,
          currentLocation.lng
        );
        setForm((prev) => ({ ...prev, pickupAddress: addr }));
      })();
    }
  }, [currentLocation, lockedFromBooking, pickup]);

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
const API_BASE = process.env.REACT_APP_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const API_URL = `${API_BASE}/api`;

      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val ?? ""));
      formData.append("pickup", JSON.stringify(pickupData));
      formData.append("drop", JSON.stringify(dropData));
      documents.forEach((file) => formData.append("documents", file));
      const isXerox = String(form.parcelCategory || "").trim().toLowerCase() === "xerox";
      if (isXerox) {
        formData.append("xeroxPrintOptions", JSON.stringify(xeroxOptions));
        formData.append("printPriceEstimate", String(priceEstimate));
      }

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
    <Container maxWidth="lg" className="parcel-container px-3 sm:px-6">
      <Paper className="parcel-paper p-3 sm:p-4 rounded-2xl" sx={{ mt: 4, p: 4, borderRadius: 3 }}>
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

            {/* Upload Documents and Print Options (Xerox) */}
            {(["xerox", "documents" ].includes(String(form.parcelCategory || "").trim().toLowerCase())) && (
              <Box sx={{ gridColumn: "1/3" }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Upload your files</Typography>
                <Box onDragOver={onDropZoneDragOver} onDrop={onDropZoneDrop} sx={{ border: "2px dashed #9aa0a6", borderRadius: 2, p: 3, textAlign: "center", bgcolor: "#fafafa" }}>
                  <Typography sx={{ mb: 1 }}>Drop files here or click to upload (PDF, JPG, PNG)</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>Maximum upload size per file: 50 MB • Maximum files: 15</Typography>
                  <input ref={fileInputRef} id="xerox-file-input" type="file" multiple onChange={handleDocsChange} style={{ display: "none" }} accept=".pdf,image/png,image/jpeg" />
                  <Button onClick={() => fileInputRef.current?.click()} variant="contained" sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" } }}>Upload your files</Button>
                  {documents.length > 0 && (
                    <List dense sx={{ mt: 2 }}>
                      {documents.map((f, idx) => (
                        <ListItem key={`${f.name}-${idx}`} sx={{ py: 0.5 }}>
                          <ListItemButton disableRipple sx={{ cursor: "default" }}>
                            {f.name} • {(f.size / (1024 * 1024)).toFixed(2)} MB
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>

                <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
                  <TextField select label="Paper Size" value={xeroxOptions.size} onChange={(e) => setXeroxOptions((o) => ({ ...o, size: e.target.value }))}>
                    <MenuItem value="A4">A4</MenuItem>
                    <MenuItem value="A3">A3</MenuItem>
                    <MenuItem value="A5">A5</MenuItem>
                  </TextField>
                  <TextField select label="Color Mode" value={xeroxOptions.colorMode} onChange={(e) => setXeroxOptions((o) => ({ ...o, colorMode: e.target.value }))}>
                    <MenuItem value="bw">Black & White</MenuItem>
                    <MenuItem value="color">Color</MenuItem>
                  </TextField>
                  <TextField select label="Print Sides" value={xeroxOptions.sides} onChange={(e) => setXeroxOptions((o) => ({ ...o, sides: e.target.value }))}>
                    <MenuItem value="single">Single-sided</MenuItem>
                    <MenuItem value="double">Double-sided</MenuItem>
                  </TextField>
                  <TextField type="number" label="Copies" inputProps={{ min: 1 }} value={xeroxOptions.copies} onChange={(e) => setXeroxOptions((o) => ({ ...o, copies: Math.max(1, Number(e.target.value) || 1) }))} />
                  <TextField type="number" label="Total Pages" inputProps={{ min: 1 }} value={xeroxOptions.totalPages} onChange={(e) => setXeroxOptions((o) => ({ ...o, totalPages: Math.max(1, Number(e.target.value) || 1) }))} />
                </Box>

                <Box sx={{ mt: 2, p: 2, border: "1px solid #eee", borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle2">Estimated print price</Typography>
                  <Typography variant="h6">₹ {priceEstimate}</Typography>
                </Box>
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
              setPickup={lockedFromBooking ? (() => {}) : setPickup}
              setPickupAddress={lockedFromBooking ? (() => {}) : ((addr) => setForm((prev) => ({ ...prev, pickupAddress: addr })))}
              drop={drop}
              setDrop={lockedFromBooking ? (() => {}) : setDrop}
              setDropAddress={lockedFromBooking ? (() => {}) : ((addr) => setForm((prev) => ({ ...prev, dropAddress: addr })))}
              setDistance={setDistance}
              setDuration={() => {}}
              setNormalDuration={() => {}}
              showRiderOnly={false}
              rideStarted={false}
              lockToProvidedPoints={lockedFromBooking || true}
            />
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
