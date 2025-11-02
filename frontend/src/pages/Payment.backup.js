import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Container, Paper, Typography, Button, Box, CircularProgress, Alert, Divider, TextField, ToggleButton, ToggleButtonGroup, Chip } from "@mui/material";
// Map removed on payment page per request
import { getRideById, markCashPayment, getRideHistory, getMerchantDetails, confirmOnlinePayment, initiatePayment, verifyPayment } from "../services/api";

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
    if (!effectiveRideId) {
      setMessage({ type: "error", text: "Missing ride." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const resp = await markCashPayment({ rideId: effectiveRideId });
      if (resp.data?.ok) {
        setMessage({ type: "success", text: "Payment marked as completed." });
        try { localStorage.removeItem(`unpaid:${effectiveRideId}`); } catch {}
        setTimeout(() => navigate("/rider-dashboard"), 1200);
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

  // Derive payment status safely from ride shape
  const paymentStatus = ride?.payment?.status || ride?.paymentStatus || null;

  // Refresh latest payment status from backend
  const refreshStatus = async () => {
    if (!effectiveRideId) return;
    try {
      const resp = await getRideById(effectiveRideId);
      if (resp.data?.success && resp.data.ride) {
        setRide(resp.data.ride);
      }
    } catch (e) {
      console.warn("Refresh status failed:", e);
    }
  };

  // Razorpay helpers defined inside component for state access
  const loadRazorpayScript = async () => {
    if (window.Razorpay) return true;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Failed to load Razorpay script"));
      document.body.appendChild(script);
    });
  };

  const payWithRazorpay = async () => {
    try {
      if (!effectiveRideId || resolvedAmount == null) {
        setMessage({ type: "error", text: "Missing ride or amount." });
        return;
      }
      setLoading(true);
      await loadRazorpayScript();

      const amountNum = Number(resolvedAmount);
      const initRes = await initiatePayment({ rideId: effectiveRideId });
      const data = initRes?.data || {};
      if (!data.ok) {
        setMessage({ type: "error", text: data.message || "Live payments disabled or init failed." });
        return;
      }

      const { order, key } = data;
      const options = {
        key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Rider App",
        description: "Ride Payment",
        order_id: order.id,
        prefill: {},
        theme: { color: "#000000" },
        handler: async (response) => {
          try {
            const verifyRes = await verifyPayment({
              rideId: effectiveRideId,
              orderId: order.id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            const v = verifyRes?.data || {};
            if (v.ok) {
              setMessage({ type: "success", text: "Payment captured. Confirming..." });
              await refreshStatus();
              navigate("/rider-dashboard");
            } else {
              setMessage({ type: "error", text: v.message || "Verification failed." });
            }
          } catch (err) {
            console.warn("Verify error:", err);
            setMessage({ type: "error", text: "Verification error." });
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function () {
        setMessage({ type: "error", text: "Payment failed." });
      });
      rzp.open();
    } catch (e) {
      console.warn("Razorpay start error:", e);
      setMessage({ type: "error", text: `Unable to start Razorpay: ${e?.message || e}` });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOnline = async () => {
    if (!effectiveRideId) {
      setMessage({ type: "error", text: "Missing ride." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await confirmOnlinePayment({ rideId: effectiveRideId });
      setMessage({ type: "success", text: "Online payment confirmed." });
      try { localStorage.removeItem(`unpaid:${effectiveRideId}`); } catch {}
      navigate("/rider-dashboard");
    } catch (err) {
      console.warn("Manual online confirm error:", err);
      setMessage({ type: "error", text: "Failed to confirm payment." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Blue Header Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
          height: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Logo/Brand Circle */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.3)",
          }}
        >
          <Typography variant="h4" sx={{ color: "white", fontWeight: "bold", fontSize: 24 }}>R</Typography>
        </Box>
      </Box>

      {/* White Content Section */}
      <Container maxWidth="sm">
        <Box
          sx={{
            background: "white",
            borderRadius: "24px 24px 0 0",
            mt: "-60px",
            position: "relative",
            zIndex: 1,
            p: 4,
            minHeight: "60vh",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
          }}
        >
          <Typography variant="h5" sx={{ textAlign: "center", fontWeight: "bold", mb: 2, color: "#1f2937" }}>
            Complete Payment
          </Typography>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="body1">Ride ID: {effectiveRideId || "—"}</Typography>
            <Typography variant="h6" sx={{ my: 1 }}>
              Amount: {resolvedAmount != null ? `?${Number(resolvedAmount).toFixed(2)}` : "—"}
            </Typography>
            {ride && (
              <Box sx={{ my: 2 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2">Pickup: {ride.pickup}</Typography>
                <Typography variant="body2">Drop: {ride.drop}</Typography>
                <Typography variant="body2">Ride Date: {ride?.createdAt ? new Date(ride.createdAt).toLocaleString() : "-"}</Typography>
                <Typography variant="body2">Status: {ride.status}</Typography>
                <Typography variant="body2">Distance: {ride.distance} km</Typography>
                <Typography variant="body2">Upfront Fare: ?{Number(ride.finalPrice || 0).toFixed(2)}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography variant="body2">Payment:</Typography>
                  {paymentStatus === 'completed' && <Chip label="Confirmed" color="success" size="small" />}
                  {paymentStatus !== 'completed' && paymentStatus && <Chip label={String(paymentStatus)} color={paymentStatus === 'failed' ? 'error' : 'warning'} size="small" />}
                  {!paymentStatus && <Chip label="Pending" color="warning" size="small" />}
                  <Button size="small" variant="outlined" onClick={refreshStatus}>Refresh</Button>
                </Box>
              </Box>
            )}
            {message && (
              <Alert severity={message.type} sx={{ my: 2 }}>
                {message.text}
              </Alert>
            )}
          </Paper>

          {/* Action Area */}
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
              sx={{
                height: 48,
                borderRadius: 3,
                background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                fontWeight: "bold",
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)",
                "&:hover": { background: "linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)" },
              }}
              disabled={loading}
              onClick={startPayment}
            >
              {loading ? <CircularProgress size={24} /> : (upiFlow === "intent" ? "PAY VIA UPI APP" : "PAY VIA UPI ID")}
            </Button>
            {/* Keep Razorpay button at bottom too for redundancy */}
            <Button sx={{ ml: 2 }} variant="contained" disabled={loading} onClick={payWithRazorpay}>PAY VIA RAZORPAY</Button>
            <Button sx={{ ml: 2 }} variant="outlined" disabled={loading} onClick={payCash}>PAY CASH</Button>
            <Button sx={{ ml: 2 }} variant="outlined" color="success" disabled={loading} onClick={handleConfirmOnline}>CONFIRM PAID (ONLINE)</Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}



