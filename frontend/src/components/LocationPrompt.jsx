import React, { useEffect, useState } from "react";
import { Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography } from "@mui/material";

export default function LocationPrompt({ role = "user", onGranted }) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    try {
      if (!("geolocation" in navigator)) return;
      if (navigator.permissions?.query) {
        navigator.permissions.query({ name: "geolocation" }).then((res) => {
          setVisible(res.state !== "granted");
          setStatusText(res.state);
        }).catch(() => setVisible(true));
      } else {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const requestLocation = async () => {
    if (!("geolocation" in navigator)) {
      setOpen(false);
      return;
    }
    try {
      // Try to prompt for permission
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          try { localStorage.setItem(`${role}LastLocation`, JSON.stringify(coords)); } catch {}
          if (typeof onGranted === "function") onGranted(coords);
          setVisible(false);
          setOpen(false);
        },
        (err) => {
          const msg = String(err?.message || "Location permission blocked");
          setStatusText(msg);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    } catch (e) {
      setStatusText("Unable to request location");
    }
  };

  if (!visible) return null;

  return (
    <Box sx={{ position: "fixed", right: 12, bottom: 12, zIndex: 1000 }}>
      <Chip
        color="warning"
        label="Enable Location"
        onClick={() => setOpen(true)}
        sx={{ boxShadow: 2, fontWeight: 600 }}
      />
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Enable Location</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Allow location to improve pickup accuracy and live tracking.
          </Typography>
          {statusText && (
            <Typography variant="caption" color="text.secondary">
              Status: {statusText}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={requestLocation}>Enable Now</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}