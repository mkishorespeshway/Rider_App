// src/pages/UserOtpLogin.jsx
import React, { useState } from "react";
import { Container, Paper, Typography, TextField, Button, Alert, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { verifyOtp } from "../services/api";

export default function UserOtpLogin() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    try {
      const mobile = localStorage.getItem("userMobile");
      if (!mobile) throw new Error("Mobile number not found. Please login again.");

      const res = await verifyOtp(mobile, otp, "user");

      if (res.data.success) {
        setSuccess("Login successful!");
        // ✅ Save token & role (you should be returning token from backend OTP verify API)
        localStorage.setItem("token", res.data.token || "dummy-user-token");
        localStorage.setItem("role", "user");
        localStorage.removeItem("userMobile");

        setTimeout(() => navigate("/user-dashboard"), 1500);
      } else {
        setError("Invalid OTP");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper sx={{ mt: 6, p: 4, borderRadius: 3, textAlign: "center", boxShadow: 5 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Enter OTP</Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>OTP has been sent to your mobile</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleVerify}>
          <TextField
            fullWidth
            label="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            margin="normal"
            required
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, bgcolor: "black" }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Verify OTP"}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
