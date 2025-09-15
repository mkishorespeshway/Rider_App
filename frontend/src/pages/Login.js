import React, { useState } from "react";
import { Box, Button, TextField, Typography, Alert, CircularProgress, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { sendOtp, verifyOtp } from "../services/api"; // ensure api.js exports these

export default function Login() {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter a valid 10-digit mobile number starting with 6-9.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await sendOtp(mobile);
      if (res.data?.success) {
        setOtpSent(true);
        setSuccess("OTP sent successfully! (Check server console in dev mode)");
      } else {
        setError(res.data?.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      setError(err.response?.data?.message || "Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      setError("Enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await verifyOtp(mobile, otp);
      if (res.data?.success) {
        const token = res.data.data.token;
        localStorage.setItem("token", token);
        setSuccess("Login successful!");
        // ✅ Redirect to /booking (your dashboard) instead of /dashboard
        setTimeout(() => navigate("/booking"), 400);
      } else {
        setError(res.data?.message || "OTP verification failed.");
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError(err.response?.data?.message || "Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, mt: 5, maxWidth: 400, margin: "auto", borderRadius: 3 }}>
      <Typography variant="h4" align="center" gutterBottom sx={{ color: "orangered", fontWeight: "bold" }}>
        Rider App
      </Typography>
      <Typography variant="body1" align="center" sx={{ mb: 3 }}>
        {otpSent ? "Enter the OTP sent to your mobile" : "Login with your mobile number"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <TextField
        fullWidth
        label="Mobile Number"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        margin="normal"
        inputProps={{ maxLength: 10 }}
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
        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 2, bgcolor: "orangered", "&:hover": { bgcolor: "darkred" } }}
          onClick={handleSendOtp}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Send OTP"}
        </Button>
      ) : (
        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 2, bgcolor: "orangered", "&:hover": { bgcolor: "darkred" } }}
          onClick={handleVerifyOtp}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Verify OTP"}
        </Button>
      )}

      <Typography align="center" sx={{ mt: 2 }}>
        Don't have an account?{" "}
        <Button variant="text" onClick={() => navigate("/register")} sx={{ color: "orangered" }}>
          Signup
        </Button>
      </Typography>
    </Paper>
  );
}
