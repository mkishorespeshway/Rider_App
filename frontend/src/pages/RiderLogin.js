import React, { useState } from "react";
import { Container, Box, Button, TextField, Typography, Alert, CircularProgress } from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import { sendOtp, verifyOtp } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function RiderLogin() {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const navigate = useNavigate();
  const { login } = useAuth();

  const isValidMobile = (num) => /^[0-9]{10}$/.test(num);

  const handleSendOtp = async () => {
    setMessage({ type: "", text: "" });
    if (!mobile || !isValidMobile(mobile)) {
      setMessage({ type: "error", text: "Enter a valid 10-digit mobile number" });
      return;
    }
    try {
      setLoading(true);
      const res = await sendOtp(mobile, "rider");
      if (res.data.success) {
        setStep(2);
        setMessage({ type: "success", text: "OTP sent! Check your mobile." });
      } else {
        setMessage({ type: "error", text: res.data.message });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Server error while sending OTP";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setMessage({ type: "", text: "" });
    if (!otp || otp.length < 4) {
      setMessage({ type: "error", text: "Enter OTP" });
      return;
    }
    try {
      setLoading(true);
      const res = await verifyOtp(mobile, otp, "rider");
      if (res.data.success) {
        const user = res.data.user;
        if (user.role !== "rider") {
          setMessage({ type: "error", text: "This login is only for Riders" });
          setLoading(false);
          return;
        }
        login({
          token: res.data.token,
          user,
          roles: [user.role], // ✅ FIX
        });
        setMessage({ type: "success", text: "Login successful! Redirecting..." });
        // Ensure dashboard opens to pending rides list (not a restored active ride)
        try { localStorage.removeItem("riderActiveRideId"); } catch {}
        setTimeout(() => navigate("/rider-dashboard"), 1000);
      } else {
        setMessage({ type: "error", text: res.data.message });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Server error while verifying OTP";
      setMessage({ type: "error", text: msg });
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

      {/* White Form Section */}
      <Container maxWidth="xs">
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
          <Typography variant="h5" sx={{ textAlign: "center", fontWeight: "bold", mb: 1, color: "#1f2937" }}>
            Rider Login
          </Typography>
          <Typography variant="body2" sx={{ textAlign: "center", color: "#6b7280", mb: 4 }}>
            {step === 1 ? "Enter your mobile number to continue" : "Enter the OTP sent to your mobile"}
          </Typography>

          {message.text && (
            <Alert severity={message.type} sx={{ mb: 3, borderRadius: 2 }}>{message.text}</Alert>
          )}

          {step === 1 && (
            <>
              <TextField
                fullWidth
                label="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                margin="normal"
                inputProps={{ maxLength: 10 }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": { borderRadius: 3, height: 56 },
                }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleSendOtp}
                disabled={loading}
                sx={{
                  height: 56,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                  fontWeight: "bold",
                  fontSize: 16,
                  textTransform: "none",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)",
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Send OTP"}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <TextField
                fullWidth
                label="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                margin="normal"
                sx={{ mb: 3, "& .MuiOutlinedInput-root": { borderRadius: 3, height: 56 } }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleVerifyOtp}
                disabled={loading}
                sx={{
                  height: 56,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                  fontWeight: "bold",
                  fontSize: 16,
                  textTransform: "none",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)",
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Verify OTP"}
              </Button>
            </>
          )}

          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "#6b7280", mb: 2 }}>
              Don't have an account?{" "}
              <Link to="/rider-register" style={{ color: "#4F46E5", textDecoration: "none", fontWeight: 600 }}>
                Sign Up
              </Link>
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280" }}>
              Are you a User?{" "}
              <Link to="/login" style={{ color: "#4F46E5", textDecoration: "none", fontWeight: 600 }}>
                Login as User
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
