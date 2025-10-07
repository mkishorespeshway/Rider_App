import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { sendOtp, verifyOtp } from "../services/api";
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

export default function UserLogin() {
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
      const res = await sendOtp(mobile, "user");
      if (res.data.success) {
        setStep(2);
        setMessage({ type: "success", text: "OTP sent! Check your mobile." });
      } else {
        setMessage({ type: "error", text: res.data.message || "Failed to send OTP" });
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
      setMessage({ type: "error", text: "Enter a valid OTP" });
      return;
    }
    try {
      setLoading(true);
      const res = await verifyOtp(mobile, otp, "user");
      if (res.data.success) {
        login({
          token: res.data.token,
          user: res.data.user,
          roles: [res.data.role || res.data.user?.role || "user"], // ✅ FIX
        });
        setMessage({ type: "success", text: "Login successful! Redirecting..." });
        navigate("/booking");
      } else {
        setMessage({ type: "error", text: res.data.message || "Invalid OTP" });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Server error while verifying OTP";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, p: 4, border: "1px solid #ccc", borderRadius: 2, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>User Login</Typography>

        {message.text && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

        {step === 1 && (
          <>
            <TextField
              fullWidth
              label="Mobile Number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              margin="normal"
              inputProps={{ maxLength: 10 }}
            />
            <Button fullWidth variant="contained" sx={{ mt: 2, bgcolor: "black" }}
              onClick={handleSendOtp} disabled={loading}>
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
            />
            <Button fullWidth variant="contained" sx={{ mt: 2, bgcolor: "black" }}
              onClick={handleVerifyOtp} disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : "Verify OTP"}
            </Button>
          </>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2">
            Don’t have an account?{" "}
            <Link to="/register">Sign Up</Link>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Are you a Rider?{" "}
            <Link to="/rider-login">Login as Rider</Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
