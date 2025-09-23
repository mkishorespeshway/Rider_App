import React, { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Divider,
} from "@mui/material";
import { useLocation } from "react-router-dom";

export default function Activity() {
  const location = useLocation();
  const { parcel, rider, distance } = location.state || {};

  const [status, setStatus] = useState("Searching for nearby riders…");
  const [accepted, setAccepted] = useState(false);

  // Simulate rider confirmation after 3s
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("Rider Accepted ✅");
      setAccepted(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!parcel) {
    return (
      <Container>
        <Paper sx={{ mt: 4, p: 4, textAlign: "center" }}>
          <Typography variant="h6">No activity found.</Typography>
        </Paper>
      </Container>
    );
  }

  const pricePerKm = 10; // ₹10 per km
  const price = distance ? (distance * pricePerKm).toFixed(2) : null;

  return (
    <Container maxWidth="sm">
      <Paper sx={{ mt: 4, p: 4, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2 }}>
          📦 Parcel Activity
        </Typography>

        {/* Status */}
        <Typography
          variant="body1"
          sx={{ mb: 2, color: accepted ? "green" : "orange" }}
        >
          {status}
        </Typography>
        {!accepted && <CircularProgress size={24} />}

        <Divider sx={{ my: 2 }} />

        {/* Distance & Price */}
        {distance && (
          <Box sx={{ mb: 2 }}>
            <Typography>Distance: {distance} km</Typography>
            <Typography>Estimated Price: ₹{price}</Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Rider Info */}
        {accepted && rider && (
          <Box>
            <Typography variant="h6">Rider Details</Typography>
            <Typography>Name: {rider.name}</Typography>
            <Typography>Phone: {rider.phone}</Typography>
            <Typography>
              Vehicle: {rider.vehicle.model} ({rider.vehicle.type})
            </Typography>
            <Typography>Plate: {rider.vehicle.plate}</Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
