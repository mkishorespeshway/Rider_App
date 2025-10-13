import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Container, Paper, Typography, Button, Box, CircularProgress, Alert, Divider, TextField, ToggleButton, ToggleButtonGroup, Chip } from "@mui/material";
import { initiatePayment, verifyPayment, getRideById, markCashPayment, getRideHistory } from "../services/api";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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

  // Optional merchant VPA to support direct UPI deep links to specific apps.
  // If not set, we will fallback to Razorpay intent which lets OS choose the app.
  const merchantVpa = process.env.REACT_APP_MERCHANT_VPA || null;

  // Remove localStorage fallback to avoid cross-ride mismatches.

  useEffect(() => {
    const fetchRide = async () => {
      try {
        if (!effectiveRideId) {
          // Fallback: get latest completed ride from history
          const hist = await getRideHistory();
          const rides = hist.data?.rides || [];
          // Prefer most recent completed ride, else last ride with finalPrice
          const completed = rides.filter(r => r.status === "completed");
          const latest = (completed.length ? completed : rides).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
          if (latest?._id) {
            setEffectiveRideId(latest._id);
            if (!amount && latest?.finalPrice != null) setAmount(Number(latest.finalPrice));
            setRide(latest);
            return;
          }
          // If nothing found, show a friendly message
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
    fetchRide();
  }, [effectiveRideId]);

  // Use ride.finalPrice when available, otherwise fallback to amount
  const resolvedAmount = ride?.finalPrice != null ? Number(ride.finalPrice) : amount;

  // Try opening an app-specific UPI intent when possible
  const tryOpenAppSpecificUpi = () => {
    if (!merchantVpa || upiApp === 'any') return false;
    if (resolvedAmount == null) return false;

    const params = new URLSearchParams({
      pa: merchantVpa,
      pn: 'Rider App',
      am: String(Number(resolvedAmount).toFixed(2)),
      cu: 'INR',
      tn: 'Ride Payment',
    });

    const pkgMap = {
      gpay: 'com.google.android.apps.nbu.paisa.user',
      phonepe: 'com.phonepe.app',
      paytm: 'net.one97.paytm',
    };
    const targetPkg = pkgMap[upiApp];
    if (!targetPkg) return false;

    // Android intent URL to target a specific package; supported by mobile browsers.
    const intentUrl = `intent://upi/pay?${params.toString()}#Intent;scheme=upi;package=${targetPkg};end`;
    try {
      window.location.href = intentUrl;
      return true;
    } catch (e) {
      console.warn('Failed to open app-specific UPI intent, falling back:', e);
      return false;
    }
  };

  const startPayment = async () => {
    if (!effectiveRideId || resolvedAmount == null) {
      setMessage({ type: "error", text: "Missing ride or amount." });
      return;
    }
    if (Number(resolvedAmount) <= 0) {
      setMessage({ type: "error", text: "Amount must be greater than ₹0." });
      return;
    }
    if (upiFlow === "collect") {
      const v = (upiId || "").trim();
      const vpaOk = /^[a-zA-Z0-9\.\-_]{2,}@[a-zA-Z]{2,}$/.test(v);
      if (!vpaOk) {
        setMessage({ type: "error", text: "Enter a valid UPI ID (e.g., name@bank)." });
        return;
      }
    }
    setLoading(true);
    setMessage(null);

    try {
      // If using intent and a specific app is selected, try direct deep link first.
      if (upiFlow === 'intent') {
        const opened = tryOpenAppSpecificUpi();
        if (opened) {
          // We cannot verify automatically via deep link; instruct user to complete in app.
          setMessage({ type: 'info', text: 'Opening selected UPI app. Complete payment and return to app.' });
          // Still prepare Razorpay as a fallback if the deep link doesn’t navigate.
        }
      }

      const initResp = await initiatePayment({ rideId: effectiveRideId, amount: resolvedAmount, method: "upi" });
      const { order, key } = initResp.data;
      // Proceed with provided key (supports test and live)
      if (!key) {
        setMessage({ type: "error", text: "Missing Razorpay key. Please configure keys in backend." });
        setLoading(false);
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        setMessage({ type: "error", text: "Failed to load Razorpay. Please try again." });
        setLoading(false);
        return;
      }

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "Rider App",
        description: "Ride Payment",
        order_id: order.id,
        notes: { rideId: String(effectiveRideId), upiPreferredApp: upiApp, merchantVpa: merchantVpa || undefined },
        theme: { color: "#000000" },
        method: { upi: true, card: false, netbanking: false, wallet: false },
        upi: { flow: upiFlow },
        handler: async function (response) {
          try {
            const verifyResp = await verifyPayment({
              rideId: effectiveRideId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            if (verifyResp.data?.ok) {
              setMessage({ type: "success", text: "Payment successful!" });
              setTimeout(() => navigate("/booking"), 1200);
            } else {
              setMessage({ type: "error", text: "Payment verification failed." });
            }
          } catch (err) {
            console.warn("Verification warning:", err);
            setMessage({ type: "error", text: "Error verifying payment." });
          }
        },
        modal: {
          ondismiss: function () {
            setMessage({ type: "warning", text: "Payment popup closed. You can retry or use app-specific UPI." });
          },
        },
        prefill: { name: "Customer", vpa: upiFlow === "collect" ? upiId.trim() : undefined },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.warn("Payment init warning:", err);
      const serverMsg = err?.response?.data?.message || err?.message || "Failed to initiate payment.";
      setMessage({ type: "error", text: serverMsg });
    } finally {
      setLoading(false);
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
        setMessage({ type: "success", text: "Marked as paid (Cash)." });
        setTimeout(() => navigate("/booking"), 1200);
      } else {
        setMessage({ type: "error", text: "Could not mark cash payment." });
      }
    } catch (err) {
      console.warn("Cash payment warning:", err);
      setMessage({ type: "error", text: "Error marking cash payment." });
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
        <Typography variant="body1">Ride ID: {effectiveRideId || "—"}</Typography>
        <Typography variant="h6" sx={{ my: 1 }}>
          Amount: {resolvedAmount != null ? `₹${Number(resolvedAmount).toFixed(2)}` : "—"}
        </Typography>
        {ride && (
          <Box sx={{ my: 2 }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2">Pickup: {ride.pickup}</Typography>
            <Typography variant="body2">Drop: {ride.drop}</Typography>
            <Typography variant="body2">Ride Date: {ride?.createdAt ? new Date(ride.createdAt).toLocaleString() : "-"}</Typography>
            <Typography variant="body2">Status: {ride.status}</Typography>
            <Typography variant="body2">Distance: {ride.distance} km</Typography>
            <Typography variant="body2">Fare: ₹{Number(ride.finalPrice || 0).toFixed(2)}</Typography>
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
          {upiFlow === "intent" && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Choose UPI App</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="GPay" clickable color={upiApp === 'gpay' ? 'primary' : 'default'} variant={upiApp === 'gpay' ? 'filled' : 'outlined'} onClick={() => setUpiApp('gpay')} />
                <Chip label="PhonePe" clickable color={upiApp === 'phonepe' ? 'primary' : 'default'} variant={upiApp === 'phonepe' ? 'filled' : 'outlined'} onClick={() => setUpiApp('phonepe')} />
                <Chip label="Paytm" clickable color={upiApp === 'paytm' ? 'primary' : 'default'} variant={upiApp === 'paytm' ? 'filled' : 'outlined'} onClick={() => setUpiApp('paytm')} />
                <Chip label="Any" clickable color={upiApp === 'any' ? 'primary' : 'default'} variant={upiApp === 'any' ? 'filled' : 'outlined'} onClick={() => setUpiApp('any')} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Your selected app is used for reference; the OS chooses the handler.
              </Typography>
            </Box>
          )}
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
          <Button sx={{ ml: 2 }} variant="outlined" disabled={loading} onClick={payCash}>Pay Cash</Button>
        </Box>
      </Paper>
    </Container>
  );
}