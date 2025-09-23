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
      (err) => console.error("Geolocation error:", err)
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
      console.error("❌ Reverse geocode failed:", err);
      return "";
    }
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
      console.error("❌ Suggestion fetch failed:", err);
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
      const res = await axios.post("http://localhost:5000/api/parcels", {
        ...form,
        pickup: pickupData,
        drop: dropData,
      });

      // 👉 Navigate to Activity Page with parcel & rider info
      navigate("/activity", {
        state: {
          parcel: res.data.parcel,
          rider: res.data.rider,
          distance,
        },
      });
    } catch (err) {
      console.error("❌ Error submitting parcel:", err);
      alert("Error submitting parcel!");
    }
  };

  // 📍 Drop marker by map click
  function LocationMarker({ type }) {
    useMapEvents({
      async click(e) {
        if (type === "drop") {
          setDrop(e.latlng);
          const address = await getAddressFromCoords(
            e.latlng.lat,
            e.latlng.lng
          );
          setForm((prev) => ({ ...prev, dropAddress: address }));
        }
      },
    });
    return null;
  }

  // 📍 Draggable Pickup Marker
  function DraggablePickupMarker() {
    return (
      pickup && (
        <Marker
          position={pickup}
          icon={pickupIcon}
          draggable={true}
          eventHandlers={{
            dragend: async (e) => {
              const newPos = e.target.getLatLng();
              setPickup(newPos);
              const addr = await getAddressFromCoords(
                newPos.lat,
                newPos.lng
              );
              setForm((prev) => ({ ...prev, pickupAddress: addr }));
            },
          }}
        >
          <Popup>Sender (Pickup)</Popup>
        </Marker>
      )
    );
  }

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
          console.error("❌ Route fetch failed:", err);
        }
      }
    };
    fetchRoute();
  }, [pickup, drop]);

  // ✅ Custom marker icons
  const pickupIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/32/32339.png",
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });

  const dropIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    iconSize: [35, 35],
    iconAnchor: [17, 34],
  });

  const currentIcon = new L.DivIcon({
    className: "custom-blue-dot",
    html: `<div style="
      width: 16px;
      height: 16px;
      background: blue;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return (
    <Container maxWidth="lg">
      <Paper sx={{ mt: 4, p: 4, borderRadius: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
          📦 Book a Parcel
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "gray" }}>
          Fill in the parcel details and select pickup/drop points (manual or map).
        </Typography>

        {/* ✅ Flex layout: Form (left) + Map (right) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
          {/* --- LEFT: Form --- */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
            }}
          >
            <TextField
              name="senderName"
              label="Sender Name"
              value={form.senderName}
              onChange={handleChange}
              required
            />
            <TextField
              name="senderMobile"
              label="Sender Mobile"
              value={form.senderMobile}
              onChange={handleChange}
              type="tel"
              inputProps={{ pattern: "[6-9][0-9]{9}", maxLength: 10 }}
              helperText="Enter 10-digit mobile starting with 6-9"
              required
            />
            <TextField
              name="receiverName"
              label="Receiver Name"
              value={form.receiverName}
              onChange={handleChange}
              required
            />
            <TextField
              name="receiverMobile"
              label="Receiver Mobile"
              value={form.receiverMobile}
              onChange={handleChange}
              type="tel"
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
              <MenuItem value="Food">Food</MenuItem>
              <MenuItem value="Electronics">Electronics</MenuItem>
              <MenuItem value="Clothes">Clothes</MenuItem>
              <MenuItem value="Fragile">Fragile</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>

            {/* Pickup with suggestions */}
            <Box sx={{ gridColumn: "1/3" }}>
              <TextField
                fullWidth
                name="pickupAddress"
                label="Pickup Address"
                value={form.pickupAddress}
                onChange={(e) => {
                  handleChange(e);
                  fetchSuggestions(e.target.value, "pickup");
                }}
              />
              {pickupSuggestions.length > 0 && (
                <List sx={{ border: "1px solid #ccc", maxHeight: 150, overflowY: "auto" }}>
                  {pickupSuggestions.map((s, i) => (
                    <ListItem key={i} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          setForm((prev) => ({ ...prev, pickupAddress: s.display_name }));
                          setPickup({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                          setPickupSuggestions([]);
                        }}
                      >
                        {s.display_name}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {/* Drop with suggestions */}
            <Box sx={{ gridColumn: "1/3" }}>
              <TextField
                fullWidth
                name="dropAddress"
                label="Drop Address"
                value={form.dropAddress}
                onChange={(e) => {
                  handleChange(e);
                  fetchSuggestions(e.target.value, "drop");
                }}
              />
              {dropSuggestions.length > 0 && (
                <List sx={{ border: "1px solid #ccc", maxHeight: 150, overflowY: "auto" }}>
                  {dropSuggestions.map((s, i) => (
                    <ListItem key={i} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          setForm((prev) => ({ ...prev, dropAddress: s.display_name }));
                          setDrop({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                          setDropSuggestions([]);
                        }}
                      >
                        {s.display_name}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

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

          {/* --- RIGHT: Map --- */}
          <Box sx={{ height: "100%", minHeight: "500px", borderRadius: 2, overflow: "hidden" }}>
            {currentLocation && (
              <MapContainer
                center={currentLocation}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Current Location */}
                <Marker position={currentLocation} icon={currentIcon}>
                  <Popup>You are here</Popup>
                </Marker>

                {/* Pickup */}
                <DraggablePickupMarker />

                {/* Drop */}
                {drop && (
                  <Marker position={drop} icon={dropIcon}>
                    <Popup>
                      Receiver (Drop) <br />
                      {distance ? `Distance: ${distance} km` : ""}
                    </Popup>
                  </Marker>
                )}
                <LocationMarker type="drop" />

                {/* 🛣️ Actual Route */}
                {route && (
                  <Polyline
                    positions={route}
                    pathOptions={{ color: "black", weight: 4 }}
                  />
                )}
              </MapContainer>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
