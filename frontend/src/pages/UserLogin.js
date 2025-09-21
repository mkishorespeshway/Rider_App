import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { sendOtp, verifyOtp } from "../services/api";
import { useAuth } from "../contexts/AuthContext"; // ✅ Use auth context
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
  const [step, setStep] = useState(1); // 1 = enter mobile, 2 = enter OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth(); // ✅ get login function from context

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    setError("");
    if (!mobile || mobile.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      setLoading(true);
      const res = await sendOtp(mobile, "user");
      if (res.data.success) {
        setStep(2);
      } else {
        setError(res.data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      setError("Server error while sending OTP");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    setError("");
    if (!otp || otp.length < 4) {
      setError("Enter a valid OTP");
      return;
    }

    try {
      setLoading(true);
      const res = await verifyOtp(mobile, otp, "user");
      if (res.data.success) {
        // ✅ Store user auth in context
        login({ token: res.data.user._id, role: "user" });

        // Navigate to user dashboard
        navigate("/user-dashboard");
      } else {
        setError(res.data.message || "Invalid OTP");
      }
    } catch (err) {
      console.error(err);
      setError("Server error while verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          mt: 8,
          p: 4,
          border: "1px solid #ccc",
          borderRadius: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="h5" gutterBottom>
          User Login
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 1 && (
          <>
            <TextField
              fullWidth
              label="Mobile Number"
              variant="outlined"
              margin="normal"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
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
            <Link to="/register" style={{ textDecoration: "none" }}>
              Sign Up
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Are you a Rider?{" "}
            <Link to="/rider-login" style={{ textDecoration: "none" }}>
              Login as Rider
            </Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
