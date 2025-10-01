import React, { useState, useEffect } from "react";
import {
  Container, Paper, Typography, TextField, Box,
  Button, Drawer, CircularProgress, ListItemButton
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { io } from "socket.io-client";
import MapComponent from "../components/Map";

const socket = io("http://localhost:5000");

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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rideOptions, setRideOptions] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);

  const [lookingForRider, setLookingForRider] = useState(false);
  const [assignedRider, setAssignedRider] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [riderPanelOpen, setRiderPanelOpen] = useState(false);
  const [rideStatus, setRideStatus] = useState("Waiting for rider 🚖");

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
    if (distance) {
      const km = parseFloat(distance);
      setRideOptions([
        { id: "bike", name: "Bike", eta: "3 min", price: "₹" + (km * 10).toFixed(2) },
        { id: "auto", name: "Auto", eta: "2 min", price: "₹" + (km * 15).toFixed(2) },
        { id: "car", name: "Car", eta: "4 min", price: "₹" + (km * 20).toFixed(2) },
        { id: "parcel", name: "Parcel", eta: "—", price: "Go to Parcel Page" }
      ]);
    }
  }, [distance]);

  // 🔥 Create ride request
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
      socket.emit("newRide", res.data.ride);
      setDrawerOpen(true);
    } catch (err) {
      alert("Failed to create ride request");
    }
  };

  // 🚖 Request ride type
  const handleRequestRide = () => {
    if (selectedRide === "parcel") {
      navigate("/parcel");
      return;
    }
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
          />
        </Paper>
      </Box>

      {/* Ride options drawer */}
      <Drawer anchor="bottom" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>Choose a ride</Typography>
          {rideOptions.map((opt) => (
            <Box key={opt.id} onClick={() => setSelectedRide(opt.id)}
              sx={{
                border: selectedRide === opt.id ? "2px solid black" : "1px solid #ccc",
                borderRadius: 2, p: 2, mb: 2, cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>{opt.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {opt.eta} • {distance || "—"} • {duration || ""}
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "black" }}>{opt.price}</Typography>
            </Box>
          ))}
          {lookingForRider ? (
            <Box textAlign="center" sx={{ my: 3 }}>
              <CircularProgress />
              <Typography variant="body1" sx={{ mt: 2 }}>⏳ Looking for riders...</Typography>
            </Box>
          ) : (
            <Button variant="contained" fullWidth sx={{ mt: 2 }}
              onClick={handleRequestRide} disabled={!selectedRide}>
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
              <Typography><b>Vehicle:</b> {assignedRider.vehicle?.type} ({assignedRider.vehicle?.plate})</Typography>
              <Typography><b>Fare:</b> {rideOptions.find((r) => r.id === selectedRide)?.price}</Typography>
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
