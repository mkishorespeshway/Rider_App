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
import axios from "axios";

export default function Activity() {
  const location = useLocation();
  const { parcel, distance } = location.state || {};

  const [liveParcel, setLiveParcel] = useState(parcel);
  const [status, setStatus] = useState("Waiting for rider acceptance…");
  const [accepted, setAccepted] = useState(false);
  const [otp, setOtp] = useState("");
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const API_URL = `${API_BASE}/api`;

  // Helper to reliably open Google Maps (mobile-first, popup-safe)
  const openNavUrl = (url) => {
    try {
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth < 768);
      if (isMobile) {
        try { window.location.assign(url); return; } catch {}
      }
      const win = window.open(url, isMobile ? "_self" : "_blank");
      if (!win) {
        try { window.location.assign(url); } catch (e1) {
          try { window.top.location.href = url; } catch {}
        }
      }
    } catch (e) {
      try { window.location.href = url; } catch {}
    }
  };

  // Remove auto-OTP on mount; set OTP only after rider accepts
  // Generate and persist OTP when parcel status becomes 'accepted'
  useEffect(() => {
    if (!liveParcel?._id) return;
    if (liveParcel?.status === "accepted") {
      setStatus("Rider accepted. Share OTP to start 📲");
      try {
        const key = `parcelOtp:${liveParcel._id}`;
        let existing = localStorage.getItem(key);
        if (!existing) {
          existing = Math.floor(1000 + Math.random() * 9000).toString();
          localStorage.setItem(key, existing);
        }
        // Always set OTP regardless of previous state
        setOtp(existing);
        axios
          .post(`${API_URL}/parcels/${liveParcel._id}/set-otp`, { otp: existing })
          .catch(() => {});
      } catch (error) {
        console.error("Error setting OTP:", error);
      }
    }
  }, [liveParcel]);

  // 🔄 Poll parcel to reflect rider acceptance and progress
  useEffect(() => {
    if (!parcel?._id) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/parcels/${parcel._id}`);
        const p = res.data.parcel;
        setLiveParcel(p);
        if (p?.status === "in_progress") {
          setAccepted(true);
          setStatus("Rider verified OTP. Parcel pickup started ✅");
        } else if (p?.status === "accepted") {
          setAccepted(false);
          setStatus("Rider accepted. Share OTP to start 📲");
        } else {
          setAccepted(false);
          setStatus("Waiting for rider acceptance…");
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [parcel]);

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

        {/* OTP display */}
        {otp && (
          <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: "#f7f7f7", borderRadius: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Share this 4-digit OTP with the rider to start parcel pickup.
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: "bold", letterSpacing: 2 }}>
              {otp}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Distance & Price */}
        {distance && (
          <Box sx={{ mb: 2 }}>
            <Typography>Distance: {distance} km</Typography>
            <Typography>Estimated Price: ₹{price}</Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Rider Info (only after OTP verification) */}
        {liveParcel?.status === "in_progress" && liveParcel?.assignedRider && (
          <Box>
            <Typography variant="h6">Rider Details</Typography>
            <Typography>Name: {liveParcel.assignedRider.fullName}</Typography>
            <Typography>Phone: {liveParcel.assignedRider.mobile}</Typography>
            <Typography>
              Vehicle: {liveParcel.assignedRider.vehicleType}
            </Typography>
            <Typography>Plate: {liveParcel.assignedRider.vehicleNumber}</Typography>
            {/* Navigate in Google Maps after OTP verified */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>Open turn-by-turn navigation in Google Maps</Typography>
              <button
                onClick={() => {
                  try {
                    const o = liveParcel?.pickup || parcel?.pickup;
                    const d = liveParcel?.drop || parcel?.drop;
                    if (!o || !d) return;
                    const origin = `${o.lat},${o.lng}`;
                    const destination = `${d.lat},${d.lng}`;
                    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate`;
                    openNavUrl(url);
                  } catch {}
                }}
                style={{
                  backgroundColor: "#1E3A8A",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #000",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Navigate in Google Maps
              </button>
            </Box>
          </Box>
        )}

        {/* Pay Now prompt after completion (mirrors booking page behavior) */}
        {liveParcel?.status === 'completed' && (
          <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Parcel Completed — Proceed to Payment</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {price != null ? `Amount: ₹${Number(price).toFixed(2)}` : 'Amount will be shown on the payment screen.'}
            </Typography>
            <button
              onClick={() => {
                const amt = price ? Number(price) : undefined;
                try { window.location.href = amt != null ? `/payment` : `/payment`; } catch {}
              }}
              style={{
                backgroundColor: "#0B2A6E",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #000",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Pay Now
            </button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
