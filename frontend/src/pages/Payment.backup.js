import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Container, Paper, Typography, Button, Box, CircularProgress, Alert, Divider, TextField, ToggleButton, ToggleButtonGroup, Chip } from "@mui/material";
import { getRideById, markCashPayment, getRideHistory, getMerchantDetails } from "../services/api";

export default function Payment() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [effectiveRideId, setEffectiveRideId] = useState(params.rideId || null);
  const [amount, setAmount] = useState(state?.amount || null);
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [upiId, setUpiId] = useState(state?.upiId || "");
  const [upiFlow, setUpiFlow] = useState(state?.upiFlow || "intent");
  const [upiApp, setUpiApp] = useState(state?.upiApp || "any"); // gpay | phonepe | paytm | any

  // Merchant VPA for deep links; prefer AdminSettings, fallback to env.
  const [merchantVpa, setMerchantVpa] = useState(process.env.REACT_APP_MERCHANT_VPA || null);
  const [merchantName, setMerchantName] = useState("Rider App");

  useEffect(() => {
    const fetchRide = async () => {
      try {
        if (!effectiveRideId) {
          const hist = await getRideHistory();
          const rides = hist.data?.rides || [];
          const completed = rides.filter((r) => r.status === "completed");
          const latest = (completed.length ? completed : rides).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
          if (latest?._id) {
            setEffectiveRideId(latest._id);
            if (!amount && latest?.finalPrice != null) setAmount(Number(latest.finalPrice));
            setRide(latest);
            return;
          }
          setMessage({ type: "error", text: "No recent ride found. Please complete a ride to proceed with payment." });
          return;
        }

        const resp = await getRideById(effectiveRideId);
        if (resp.data?.success) {
          const r = resp.data.ride;
          setRide(r);
          if (!amount && r?.finalPrice != null) {
            setAmount(Number(r.finalPrice));
          }
        }
      } catch (err) {
        console.warn("Fetch ride warning:", err);
      }
    };
    const fetchAdminBank = async () => {
      try {
        const res = await getMerchantDetails();
        const bd = res?.data?.bankDetails;
        if (bd?.upiVpa) setMerchantVpa(bd.upiVpa);
        if (bd?.holderName) setMerchantName(bd.holderName);
      } catch (e) {
        // ignore; fall back to env var
      }
    };
    fetchRide();
    fetchAdminBank();
  }, [effectiveRideId]);

  const resolvedAmount = ride?.finalPrice != null ? Number(ride.finalPrice) : amount;

  const tryOpenAppSpecificUpi = (paParam) => {
    if (!paParam || upiApp === "any") return false;
    if (resolvedAmount == null) return false;

    const params = new URLSearchParams({
      pa: paParam,
      pn: merchantName || "Rider App",
      am: String(Number(resolvedAmount).toFixed(2)),
      cu: "INR",
      tn: "Ride Payment",
    });

    const pkgMap = {
      gpay: "com.google.android.apps.nbu.paisa.user",
      phonepe: "com.phonepe.app",
      paytm: "net.one97.paytm",
    };
    const targetPkg = pkgMap[upiApp];
    if (!targetPkg) return false;

    const intentUrl = `intent://upi/pay?${params.toString()}#Intent;scheme=upi;package=${targetPkg};end`;
    try {
      window.location.href = intentUrl;
      return true;
    } catch (e) {
      console.warn("Failed to open app-specific UPI intent, falling back:", e);
      return false;
    }
  };

  const openSelectedUpiApp = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const pa = upiFlow === "collect" ? (upiId || "").trim() : merchantVpa;
    if (!pa) {
      setMessage({ type: "warning", text: "UPI ID or merchant VPA missing. Please enter a UPI ID or configure merchant VPA." });
      return false;
    }
    const openedSpecific = tryOpenAppSpecificUpi(pa);
    if (openedSpecific) {
      if (!isMobile) setMessage({ type: "warning", text: "Deep links work best on mobile. Please test on your phone." });
      return true;
    }
    const params = new URLSearchParams({
      pa,
      pn: merchantName || "Rider App",
      am: String(Number(resolvedAmount || 0).toFixed(2)),
      cu: "INR",
      tn: "Ride Payment",
    });
    const upiUrl = `upi://pay?${params.toString()}`;
    try {
      window.location.href = upiUrl;
      if (!isMobile) setMessage({ type: "warning", text: "If the app does not open, try from a mobile browser." });
      return true;
    } catch (e) {
      console.warn("Failed to open generic UPI link:", e);
      setMessage({ type: "error", text: "Unable to open UPI app. Please open your UPI app and pay to Rider App." });
      return false;
    }
  };

  const startPayment = async () => {
    if (!effectiveRideId || resolvedAmount == null) {
      setMessage({ type: "error", text: "Missing ride or amount." });
      return;
    }
    if (Number(resolvedAmount) <= 0) {
      setMessage({ type: "error", text: "Amount must be greater than ?0." });
      return;
    }
    if (upiFlow === "collect") {
      const v = (upiId || "").trim();
      const vpaOk = /^[a-zA-Z0-9\.\-_]{2,}@[a-zA-Z]{2,}$/.test(v);
      if (!vpaOk) {
        setMessage({ type: "error", text: "Enter a valid UPI ID (e.g., name@bank)." });
        return;
      }
      const openedSpecific = tryOpenAppSpecificUpi(v);
      if (openedSpecific) {
        setMessage({ type: "info", text: "Opening selected UPI app to complete payment." });
        return;
      }
      const params = new URLSearchParams({
        pa: v,
        pn: "Rider App",
        am: String(Number(resolvedAmount).toFixed(2)),
        cu: "INR",
        tn: "Ride Payment",
      });
      const upiUrl = `upi://pay?${params.toString()}`;
      try {
        window.location.href = upiUrl;
        setMessage({ type: "info", text: "Opening UPI app. Complete payment and return." });
        return;
      } catch (e) {
        console.warn("Failed to open UPI link:", e);
      }
      setMessage({ type: "warning", text: "Unable to open UPI app. Please open your UPI app and pay to Rider App." });
      return;
    }
    if (upiFlow === "intent") {
      const opened = tryOpenAppSpecificUpi(merchantVpa);
      if (opened) {
        setMessage({ type: "info", text: "Opening selected UPI app. Complete payment and return to app." });
        return;
      }
      if (merchantVpa && resolvedAmount != null) {
        const params = new URLSearchParams({
          pa: merchantVpa,
          pn: merchantName || "Rider App",
          am: String(Number(resolvedAmount).toFixed(2)),
          cu: "INR",
          tn: "Ride Payment",
        });
        const upiUrl = `upi://pay?${params.toString()}`;
        try {
          window.location.href = upiUrl;
          setMessage({ type: "info", text: "Opening UPI app. Complete payment and return." });
          return;
        } catch (e) {
          console.warn("Failed to open UPI link:", e);
        }
      }
      setMessage({ type: "warning", text: "Unable to open UPI app. Please pay using your UPI app to Rider App." });
      return;
    }
  };

  const payCash = async () => {
    if (!effectiveRideId || resolvedAmount == null) {
      setMessage({ type: "error", text: "Missing ride or amount." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const resp = await markCashPayment({ rideId: effectiveRideId, amount: resolvedAmount });
      if (resp.data?.ok) {
        setMessage({ type: "success", text: "Payment marked as completed." });
        try { localStorage.removeItem(`unpaid:${effectiveRideId}`); } catch {}
        setTimeout(() => navigate("/booking"), 1200);
      } else {
        setMessage({ type: "error", text: "Could not record payment." });
      }
    } catch (err) {
      console.warn("Cash payment warning:", err);
      setMessage({ type: "error", text: "Error recording payment." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2 }}>
          Complete Payment
        </Typography>
        <Typography variant="body1">Ride ID: {effectiveRideId || "�"}</Typography>
        <Typography variant="h6" sx={{ my: 1 }}>
          Amount: {resolvedAmount != null ? `?${Number(resolvedAmount).toFixed(2)}` : "�"}
        </Typography>
        {ride && (
          <Box sx={{ my: 2 }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2">Pickup: {ride.pickup}</Typography>
            <Typography variant="body2">Drop: {ride.drop}</Typography>
            <Typography variant="body2">Ride Date: {ride?.createdAt ? new Date(ride.createdAt).toLocaleString() : "-"}</Typography>
            <Typography variant="body2">Status: {ride.status}</Typography>
            <Typography variant="body2">Distance: {ride.distance} km</Typography>
            <Typography variant="body2">Fare: ?{Number(ride.finalPrice || 0).toFixed(2)}</Typography>
            <Divider sx={{ my: 1 }} />
          </Box>
        )}
        {message && (
          <Alert severity={message.type} sx={{ my: 2 }}>
            {message.text}
          </Alert>
        )}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>UPI Method</Typography>
            <ToggleButtonGroup
              color="primary"
              exclusive
              value={upiFlow}
              onChange={(e, val) => { if (val) setUpiFlow(val); }}
              size="small"
            >
              <ToggleButton value="intent">UPI App (Intent)</ToggleButton>
              <ToggleButton value="collect">Enter UPI ID (Collect)</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Choose UPI App</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label="GPay" clickable color={upiApp === 'gpay' ? 'primary' : 'default'} variant={upiApp === 'gpay' ? 'filled' : 'outlined'} onClick={() => { setUpiApp('gpay'); openSelectedUpiApp(); }} />
              <Chip label="PhonePe" clickable color={upiApp === 'phonepe' ? 'primary' : 'default'} variant={upiApp === 'phonepe' ? 'filled' : 'outlined'} onClick={() => { setUpiApp('phonepe'); openSelectedUpiApp(); }} />
              <Chip label="Paytm" clickable color={upiApp === 'paytm' ? 'primary' : 'default'} variant={upiApp === 'paytm' ? 'filled' : 'outlined'} onClick={() => { setUpiApp('paytm'); openSelectedUpiApp(); }} />
              <Chip label="Any" clickable color={upiApp === 'any' ? 'primary' : 'default'} variant={upiApp === 'any' ? 'filled' : 'outlined'} onClick={() => { setUpiApp('any'); openSelectedUpiApp(); }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Selected app will be opened to complete payment.
            </Typography>
          </Box>
          {upiFlow === "collect" && (
            <TextField
              label="Enter UPI ID (e.g., name@bank)"
              fullWidth
              size="small"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}
          <Button
            variant="contained"
            sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" } }}
            disabled={loading}
            onClick={startPayment}
          >
            {loading ? <CircularProgress size={24} /> : (upiFlow === "intent" ? "PAY VIA UPI APP" : "PAY VIA UPI ID")}
          </Button>
          <Button sx={{ ml: 2 }} variant="outlined" disabled={loading} onClick={payCash}>PAY CASH</Button>
        </Box>
      </Paper>
    </Container>
  );
}
