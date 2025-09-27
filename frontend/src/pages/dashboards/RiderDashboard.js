import React, { useEffect, useState } from "react";
import {
  Box, Card, CardContent, Typography, Button, CircularProgress, Paper
} from "@mui/material";
import {
  MapContainer, TileLayer, Marker, Popup, Polyline
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function RiderDashboard() {
  const [rides, setRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const { auth } = useAuth();

  const [riderLocation, setRiderLocation] = useState(null);
  const [route, setRoute] = useState(null);

  // Icons
  const pickupIcon = new L.Icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/32/32339.png", iconSize: [25, 25] });
  const dropIcon = new L.Icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", iconSize: [35, 35] });
  const riderIcon = new L.Icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png", iconSize: [35, 35] });

  // ✅ Get rider's live location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRiderLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true }
    );
  }, []);

  // 🔄 Fetch pending rides
  const fetchPendingRides = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/rides/pending", {
        headers: { Authorization: `Bearer ${auth?.token}` }
      });
      setRides(res.data.rides || []);
    } catch (err) {
      console.error("❌ Error fetching rides:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRides();

    socket.on("rideAccepted", (ride) => {
      console.log("✅ Ride accepted event:", ride);
      setSelectedRide(ride);
    });

    socket.on("rideRejected", () => {
      console.log("❌ Ride rejected event");
      fetchPendingRides();
    });

    return () => {
      socket.off("rideAccepted");
      socket.off("rideRejected");
    };
  }, []);

  // 🚖 Accept ride
  const handleAccept = async (rideId) => {
    try {
      const res = await axios.post(
        `http://localhost:5000/api/rides/${rideId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      setSelectedRide(res.data.ride);

      // ✅ Fetch route polyline between pickup & drop
      if (res.data.ride.pickupCoords && res.data.ride.dropCoords) {
        const { lat: pLat, lng: pLng } = res.data.ride.pickupCoords;
        const { lat: dLat, lng: dLng } = res.data.ride.dropCoords;
        try {
          const routeRes = await axios.get(
            `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`
          );
          setRoute(routeRes.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
        } catch (err) {
          console.error("❌ Route fetch error:", err);
        }
      }
    } catch (err) {
      alert("Failed to accept ride");
    }
  };

  // ❌ Reject ride
  const handleReject = async (rideId) => {
    try {
      await axios.post(
        `http://localhost:5000/api/rides/${rideId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      fetchPendingRides();
    } catch (err) {
      alert("Failed to reject ride");
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Rider Dashboard
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : selectedRide ? (
        <>
          {/* ✅ Show User details once ride accepted */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">🚖 Ride Accepted</Typography>
              <Typography><b>User:</b> {selectedRide.riderId?.fullName}</Typography>
              <Typography><b>Phone:</b> {selectedRide.riderId?.mobile}</Typography>
              <Typography><b>Pickup:</b> {selectedRide.pickup}</Typography>
              <Typography><b>Drop:</b> {selectedRide.drop}</Typography>
              <Box mt={2}>
                <Button variant="contained" color="success" sx={{ mr: 2 }}>Call 📞</Button>
                <Button variant="outlined" color="primary">Chat 💬</Button>
              </Box>
            </CardContent>
          </Card>

          {/* ✅ Map with rider + pickup/drop + polyline */}
          <Paper sx={{ p: 1 }}>
            <MapContainer
              center={riderLocation || selectedRide.pickupCoords}
              zoom={13}
              style={{ height: "500px", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {riderLocation && (
                <Marker position={riderLocation} icon={riderIcon}>
                  <Popup>You (Rider)</Popup>
                </Marker>
              )}
              {selectedRide.pickupCoords && (
                <Marker position={selectedRide.pickupCoords} icon={pickupIcon}>
                  <Popup>Pickup</Popup>
                </Marker>
              )}
              {selectedRide.dropCoords && (
                <Marker position={selectedRide.dropCoords} icon={dropIcon}>
                  <Popup>Drop</Popup>
                </Marker>
              )}
              {route && <Polyline positions={route} pathOptions={{ color: "blue", weight: 4 }} />}
            </MapContainer>
          </Paper>
        </>
      ) : (
        <>
          <Typography variant="h5" gutterBottom>Pending Ride Requests</Typography>
          {rides.length === 0 ? (
            <Typography>No pending rides</Typography>
          ) : (
            rides.map((ride) => (
              <Card key={ride._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography><b>Pickup:</b> {ride.pickup}</Typography>
                  <Typography><b>Drop:</b> {ride.drop}</Typography>
                  <Typography>Status: {ride.status}</Typography>
                  <Box mt={2}>
                    <Button variant="contained" color="success" onClick={() => handleAccept(ride._id)}>Accept ✅</Button>
                    <Button variant="contained" color="error" sx={{ ml: 2 }} onClick={() => handleReject(ride._id)}>Reject ❌</Button>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}
    </Box>
  );
}
