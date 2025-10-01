import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Paper,
} from "@mui/material";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Map from "../../components/Map"; // ✅ Google Maps component

const socket = io("http://localhost:5000");

export default function RiderDashboard() {
  const [rides, setRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  // map state
  const [pickup, setPickup] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [drop, setDrop] = useState(null);
  const [dropAddress, setDropAddress] = useState("");
  const [riderLocation, setRiderLocation] = useState(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  // ✅ Logout
  const handleLogout = () => {
    logout();
    navigate("/rider-login");
  };

  // ✅ Get rider's live location (updates every 5s)
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setRiderLocation(loc);
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 🔄 Fetch pending rides
  const fetchPendingRides = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/rides/pending", {
        headers: { Authorization: `Bearer ${auth?.token}` },
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

      if (ride.pickupCoords) setPickup(ride.pickupCoords);
      if (ride.dropCoords) setDrop(ride.dropCoords);
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

      if (res.data.ride.pickupCoords) setPickup(res.data.ride.pickupCoords);
      if (res.data.ride.dropCoords) setDrop(res.data.ride.dropCoords);
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

      <Button
        variant="contained"
        sx={{
          bgcolor: "black",
          color: "white",
          mb: 2,
          "&:hover": { bgcolor: "#333" },
        }}
        onClick={handleLogout}
      >
        Logout
      </Button>

      {loading ? (
        <CircularProgress />
      ) : selectedRide ? (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">🚖 Ride Accepted</Typography>
              <Typography>
                <b>User:</b> {selectedRide.riderId?.fullName}
              </Typography>
              <Typography>
                <b>Phone:</b> {selectedRide.riderId?.mobile}
              </Typography>
              <Typography>
                <b>Pickup:</b> {selectedRide.pickup}
              </Typography>
              <Typography>
                <b>Drop:</b> {selectedRide.drop}
              </Typography>
              <Typography>
                <b>Distance:</b> {distance} km
              </Typography>
              <Typography>
                <b>ETA:</b> {duration}
              </Typography>
              <Box mt={2}>
                <Button variant="contained" color="success" sx={{ mr: 2 }}>
                  Call 📞
                </Button>
                <Button variant="outlined" color="primary">
                  Chat 💬
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* ✅ Google Map */}
          <Paper sx={{ p: 1 }}>
            <Map
              apiKey="AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo"
              pickup={pickup}
              setPickup={setPickup}
              setPickupAddress={setPickupAddress}
              drop={drop}
              setDrop={setDrop}
              setDropAddress={setDropAddress}
              riderLocation={riderLocation}
              setDistance={setDistance}
              setDuration={setDuration}
            />
          </Paper>
        </>
      ) : (
        <>
          <Typography variant="h5" gutterBottom>
            Pending Ride Requests
          </Typography>
          {rides.length === 0 ? (
            <Typography>No pending rides</Typography>
          ) : (
            rides.map((ride) => (
              <Card key={ride._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography>
                    <b>Pickup:</b> {ride.pickup}
                  </Typography>
                  <Typography>
                    <b>Drop:</b> {ride.drop}
                  </Typography>
                  <Typography>Status: {ride.status}</Typography>
                  <Box mt={2}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleAccept(ride._id)}
                    >
                      Accept ✅
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      sx={{ ml: 2 }}
                      onClick={() => handleReject(ride._id)}
                    >
                      Reject ❌
                    </Button>
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
