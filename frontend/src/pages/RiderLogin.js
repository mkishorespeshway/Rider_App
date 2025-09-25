import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { sendOtp, verifyOtp } from "../services/api"; // ✅ use OTP API
import { useAuth } from "../contexts/AuthContext"; 
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";

export default function RiderLogin() {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const navigate = useNavigate();
  const { login } = useAuth();

  const isValidMobile = (num) => /^[0-9]{10}$/.test(num);

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    setMessage({ type: "", text: "" });
    if (!mobile || !isValidMobile(mobile)) {
      setMessage({ type: "error", text: "Enter a valid 10-digit mobile number" });
      return;
    }

    try {
      setLoading(true);
      // ✅ Call OTP API with role 'rider'
      const res = await sendOtp(mobile, "rider");
      if (res.data.success) {
        setStep(2);
        setMessage({ type: "success", text: "OTP sent! Check your mobile." });
      } else {
        setMessage({ type: "error", text: res.data.message || "Failed to send OTP" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Server error while sending OTP" });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    setMessage({ type: "", text: "" });
    if (!otp || otp.length < 4) {
      setMessage({ type: "error", text: "Enter a valid OTP" });
      return;
    }

    try {
      setLoading(true);
      const res = await verifyOtp(mobile, otp, "rider"); // ✅ role = rider
      if (res.data.success) {
        login({
          token: res.data.token,
          role: res.data.role || res.data.user?.role || "rider",
          user: res.data.user,
        });
        setMessage({ type: "success", text: "Login successful! Redirecting..." });
        setTimeout(() => navigate("/rider-dashboard"), 1000);
      } else {
        setMessage({ type: "error", text: res.data.message || "Invalid OTP" });
      }
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Server error while verifying OTP",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, p: 4, border: "1px solid #ccc", borderRadius: 2, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>Rider Login</Typography>

        {message.text && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

        {step === 1 && (
          <>
            <TextField
              fullWidth
              label="Mobile Number"
              variant="outlined"
              margin="normal"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              inputProps={{ maxLength: 10 }}
            />
            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 2, bgcolor: "black", "&:hover": { bgcolor: "#333" } }}
              onClick={handleSendOtp}
              disabled={loading}
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
              variant="outlined"
              margin="normal"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 2, bgcolor: "black", "&:hover": { bgcolor: "#333" } }}
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Verify OTP"}
            </Button>
          </>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2">
            Don’t have an account?{" "}
            <Link to="/rider-register" style={{ textDecoration: "none" }}>
              Sign Up
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Are you a User?{" "}
            <Link to="/user-login" style={{ textDecoration: "none" }}>
              Login as User
            </Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
