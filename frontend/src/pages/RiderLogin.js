import React, { useState } from "react";
import {
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Container,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { sendOtp, verifyOtp } from "../services/api";

export default function RiderLogin() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Send OTP
  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Mobile number must start with 6/7/8/9 and be 10 digits long.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await sendOtp(mobile, "rider");
      if (res.data?.success) {
        setOtpSent(true);
        setSuccess("OTP sent!");
      } else {
        setError(res.data?.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error("Send OTP error:", err.response?.data || err);
      setError(err.response?.data?.message || "Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await verifyOtp(mobile, otp, "rider");
      if (res.data?.success) {
        const { token, role } = res.data.data;
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        navigate("/rider-dashboard"); // ✅ go to dashboard
      } else {
        setError(res.data?.message || "OTP verification failed.");
      }
    } catch (err) {
      console.error("Verify OTP error:", err.response?.data || err);
      setError(err.response?.data?.message || "Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper sx={{ mt: 6, p: 3, borderRadius: 3, textAlign: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
          Rider Login
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <TextField
          fullWidth
          label="Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          margin="normal"
          inputProps={{ maxLength: 10, pattern: "^[6-9][0-9]{9}$" }}
          disabled={otpSent}
        />

        {otpSent && (
          <TextField
            fullWidth
            label="OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            margin="normal"
            inputProps={{ maxLength: 6 }}
          />
        )}

        {!otpSent ? (
          <Button fullWidth sx={{ mt: 2 }} onClick={handleSendOtp} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Send OTP"}
          </Button>
        ) : (
          <Button fullWidth sx={{ mt: 2 }} onClick={handleVerifyOtp} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Verify OTP"}
          </Button>
        )}

        <Typography sx={{ mt: 2 }}>
          Don’t have a rider account?{" "}
          <Button onClick={() => navigate("/rider-register")}>Signup</Button>
        </Typography>
        <Typography sx={{ mt: 1 }}>
          Are you a User?{" "}
          <Button onClick={() => navigate("/login")}>Login as User</Button>
        </Typography>
      </Paper>
    </Container>
  );
}
