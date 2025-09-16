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

export default function Login() {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 🔹 Send OTP
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
        setSuccess("OTP sent! (check SMS or console in dev mode)");
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

  // 🔹 Verify OTP
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
        const { token, role } = res.data.data;

        // ✅ Store in localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);

        setSuccess("Login successful!");

        // ✅ Navigate & reload so App.js sees updated role immediately
        setTimeout(() => {
          if (role === "rider") {
            navigate("/rider-dashboard");
          } else {
            navigate("/user-dashboard");
          }
          window.location.reload(); // 🔑 forces App.js to re-render
        }, 500);
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
    <Container maxWidth="xs">
      <Paper
        elevation={0}
        sx={{
          mt: 6,
          p: 3,
          borderRadius: 3,
          textAlign: "center",
          fontFamily: "Uber Move, Helvetica Neue, sans-serif",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
          Login
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "gray" }}>
          {otpSent ? "Enter the OTP sent to your mobile" : "Enter your mobile number to login"}
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
            sx={{
              mt: 2,
              bgcolor: "black",
              color: "white",
              fontWeight: "bold",
              "&:hover": { bgcolor: "#333" },
            }}
            onClick={handleSendOtp}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Send OTP"}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            sx={{
              mt: 2,
              bgcolor: "black",
              color: "white",
              fontWeight: "bold",
              "&:hover": { bgcolor: "#333" },
            }}
            onClick={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Verify OTP"}
          </Button>
        )}

        <Typography sx={{ mt: 2 }}>
          Don’t have an account?{" "}
          <Button
            variant="text"
            onClick={() => navigate("/register")}
            sx={{ color: "black", fontWeight: "bold" }}
          >
            Signup
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
}
