import React, { useState, useEffect } from "react";
import {
  Container, Paper, Typography, TextField, Box,
  Button, ListItemButton, Drawer, CircularProgress
} from "@mui/material";
import {
  MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function Booking() {
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);

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

  // ✅ Join user room after login
  useEffect(() => {
    if (auth?.user?._id) {
      socket.emit("join", auth.user._id);
      console.log("📌 User joined room:", auth.user._id);
    }
  }, [auth]);

  // 📍 Get current location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickup(loc);
        const addr = await getAddressFromCoords(loc.lat, loc.lng);
        setPickupAddress(addr);
      },
      (err) => console.error("Geolocation error:", err)
    );
  }, []);

  // 🌍 Reverse geocode
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      return res.data.display_name || "";
    } catch {
      return "";
    }
  };

  // 🔎 Drop suggestions
  const fetchSuggestions = async (query) => {
    if (!query) return;
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: query, format: "json", limit: 5 },
      });
      setDropSuggestions(res.data);
    } catch (err) {
      console.error("Suggestion fetch failed:", err);
    }
  };

  // 🛣 Route + Distance
  useEffect(() => {
    const fetchRoute = async () => {
      if (pickup && drop) {
        try {
          const res = await axios.get(
            `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`
          );
          const data = res.data.routes[0];
          setRoute(data.geometry.coordinates.map((c) => [c[1], c[0]]));
          setDistance((data.distance / 1000).toFixed(2));
        } catch (err) {
          console.error("Route fetch failed:", err);
        }
      }
    };
    fetchRoute();
  }, [pickup, drop]);

  // 🚖 Update ride options
  useEffect(() => {
    if (distance) {
      setRideOptions([
        { id: "bike", name: "Bike", eta: "3 min", price: (distance * 10).toFixed(2), capacity: 1,
          image: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png" },
        { id: "auto", name: "Auto", eta: "2 min", price: (distance * 15).toFixed(2), capacity: 3,
          image: "https://cdn-icons-png.flaticon.com/512/743/743131.png" },
        { id: "car", name: "Car", eta: "4 min", price: (distance * 20).toFixed(2), capacity: 4,
          image: "https://cdn-icons-png.flaticon.com/512/743/743007.png" },
        { id: "parcel", name: "Parcel", eta: "—", price: "Go to Parcel Page", capacity: "-",
          image: "https://cdn-icons-png.flaticon.com/512/2921/2921222.png" }
      ]);
    }
  }, [distance]);

  // 📍 Drop marker by map click
  function LocationMarker() {
    useMapEvents({
      async click(e) {
        setDrop(e.latlng);
        const addr = await getAddressFromCoords(e.latlng.lat, e.latlng.lng);
        setDropAddress(addr);
      },
    });
    return null;
  }

  // 📍 Draggable pickup marker
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
              const addr = await getAddressFromCoords(newPos.lat, newPos.lng);
              setPickupAddress(addr);
            },
          }}
        >
          <Popup>Pickup</Popup>
        </Marker>
      )
    );
  }

  // 🔥 create ride request
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

  // 🚖 Listen for backend events
  useEffect(() => {
    socket.on("rideAccepted", (ride) => {
      console.log("✅ Ride accepted:", ride);
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

  // Icons
  const pickupIcon = new L.Icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/32/32339.png", iconSize: [25, 25] });
  const dropIcon = new L.Icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", iconSize: [35, 35] });
  const currentIcon = new L.DivIcon({
    className: "custom-blue-dot",
    html: `<div style="width:16px;height:16px;background:blue;border-radius:50%;border:2px solid white;"></div>`,
  });
  const riderIcon = new L.Icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png", iconSize: [35, 35] });

  return (
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 2 }}>
        {/* Left panel */}
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Find a trip</Typography>
          <TextField fullWidth label="Pickup Address" value={pickupAddress} sx={{ mb: 2 }} InputProps={{ readOnly: true }} />
          <TextField fullWidth label="Drop Address" value={dropAddress}
            onChange={(e) => { setDropAddress(e.target.value); fetchSuggestions(e.target.value); }}
            sx={{ mb: 2 }} />
          {dropSuggestions.map((s, i) => (
            <ListItemButton key={i} onClick={() => {
              setDrop({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
              setDropAddress(s.display_name);
              setDropSuggestions([]);
            }}>{s.display_name}</ListItemButton>
          ))}
          <Button fullWidth variant="contained"
            sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" }, mt: 2 }}
            onClick={handleFindRiders}>Find Riders</Button>
        </Paper>

        {/* Right panel */}
        <Paper sx={{ p: 1, borderRadius: 2 }}>
          {pickup && (
            <MapContainer center={pickup} zoom={13} style={{ height: "600px", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={pickup} icon={currentIcon}><Popup>You are here</Popup></Marker>
              <DraggablePickupMarker />
              {drop && <Marker position={drop} icon={dropIcon}><Popup>Drop • {distance} km</Popup></Marker>}
              {riderLocation && (
                <Marker position={riderLocation} icon={riderIcon}><Popup>Rider</Popup></Marker>
              )}
              <LocationMarker />
              {route && <Polyline positions={route} pathOptions={{ color: "black", weight: 4 }} />}
            </MapContainer>
          )}
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <img src={opt.image} alt={opt.name} width={50} height={50} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {opt.name} • {opt.capacity} seats
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {opt.eta} • {distance ? `${distance} km` : "—"}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "black" }}>
                {isNaN(opt.price) ? opt.price : `₹${opt.price}`}
              </Typography>
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
              {selectedRide === "parcel" ? "Go to Parcel Page"
                : `Request ${rideOptions.find((r) => r.id === selectedRide)?.name || ""}`}
            </Button>
          )}
        </Box>
      </Drawer>

      {/* ✅ Rider details drawer */}
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
              <Typography><b>Fare:</b> ₹{(distance * 15).toFixed(2)}</Typography>
              <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                <Button variant="contained" color="success">📞 Call</Button>
                <Button variant="outlined" color="primary">💬 Chat</Button>
              </Box>
              <Typography variant="body1" sx={{ mt: 2 }}>
                {rideStatus}
              </Typography>
            </>
          )}
        </Box>
      </Drawer>
    </Container>
  );
}
