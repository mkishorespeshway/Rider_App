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
import "../activity-mobile.css";

export default function Activity() {
  const location = useLocation();
  const { parcel, distance } = location.state || {};
  // Fallbacks: support reloads or mobile simulators where navigation state is lost
  const [parcelId] = useState(() => {
    try {
      return parcel?._id || localStorage.getItem("activeParcelId");
    } catch {
      return parcel?._id;
    }
  });

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

  // Ensure OTP exists when parcel is accepted/in_progress
  const ensureOtpAssigned = async (parcelObj) => {
    try {
      if (!parcelObj?._id) return;
      const statusVal = parcelObj?.status;
      if (statusVal !== "accepted" && statusVal !== "in_progress") return;
      const key = `parcelOtp:${parcelObj._id}`;
      let existing = null;
      try { existing = localStorage.getItem(key); } catch {}
      const serverOtp = parcelObj?.parcelOtp || null;
      const finalOtp = existing || serverOtp || Math.floor(1000 + Math.random() * 9000).toString();
      if (!existing) {
        try { localStorage.setItem(key, finalOtp); } catch {}
      }
      setOtp(finalOtp);
      // Persist to server when status is accepted and serverOtp not set yet
      if (statusVal === "accepted" && !serverOtp) {
        try { await axios.post(`${API_URL}/parcels/${parcelObj._id}/set-otp`, { otp: finalOtp }); } catch {}
      }
    } catch (e) {
      try { console.warn("ensureOtpAssigned warning:", e?.message || e); } catch {}
    }
  };

  // Update local status and OTP when parcel changes
  useEffect(() => {
    if (!liveParcel?._id) return;
    if (liveParcel?.status === "in_progress") {
      setAccepted(true);
      setStatus("Rider verified OTP. Parcel pickup started ✅");
    } else if (liveParcel?.status === "accepted") {
      setAccepted(false);
      setStatus("Rider accepted. Share OTP to start 📲");
    }
    ensureOtpAssigned(liveParcel);
  }, [liveParcel]);

  // Fetch initial parcel when only id is available
  useEffect(() => {
    const id = parcel?._id || parcelId;
    if (!id) return;
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/parcels/${id}`);
        if (!mounted) return;
        setLiveParcel(res.data.parcel);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [parcelId, parcel]);

  // 🔄 Poll parcel to reflect rider acceptance and progress
  useEffect(() => {
    const id = parcel?._id || parcelId;
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/parcels/${id}`);
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
  }, [parcelId, parcel]);

  // Resolve distance (from state or persisted value)
  const resolvedDistance = (() => {
    if (typeof distance !== 'undefined' && distance !== null) return distance;
    try {
      const d = localStorage.getItem("activeParcelDistance");
      return d ? parseFloat(d) : null;
    } catch { return null; }
  })();

  if (!parcel && !parcelId) {
    return (
      <Container className="activity-container">
        <Paper className="activity-paper" sx={{ mt: 4, p: 4, textAlign: "center" }}>
          <Typography variant="h6">No activity found.</Typography>
        </Paper>
      </Container>
    );
  }

  const pricePerKm = 10; // ₹10 per km
  const price = resolvedDistance ? (resolvedDistance * pricePerKm).toFixed(2) : null;

  return (
    <Container className="activity-container" maxWidth="sm">
      <Paper className="activity-paper" sx={{ mt: 4, p: 4, borderRadius: 3 }}>
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
        {resolvedDistance && (
          <Box sx={{ mb: 2 }}>
            <Typography>Distance: {resolvedDistance} km</Typography>
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
