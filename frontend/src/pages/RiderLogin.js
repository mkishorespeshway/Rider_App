import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOtp, verifyOtp, checkRiderApproval } from "../services/api"; 
import { Box, Button, Container, TextField, Typography, Alert } from "@mui/material";

export default function RiderLogin() {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const navigate = useNavigate();

  // 🔹 Step 1: Send OTP
  const handleSendOtp = async () => {
    setMessage({ type: "", text: "" });

    if (!mobile || mobile.length !== 10) {
      setMessage({ type: "error", text: "Enter a valid 10-digit mobile number" });
      return;
    }

    try {
      setLoading(true);

      // Check admin approval
      const approvalRes = await checkRiderApproval(mobile);
      if (!approvalRes.data?.approved) {
        setMessage({ type: "info", text: "Your account is still waiting for admin approval." });
        setLoading(false);
        return;
      }

      // Send OTP
      const res = await sendOtp(mobile, "rider");
      if (res.data.success) {
        setStep(2);
        setMessage({ type: "success", text: "OTP sent! Check your mobile." });
      } else {
        setMessage({ type: "error", text: res.data.message });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Server error while sending OTP";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    setMessage({ type: "", text: "" });

    if (!otp || otp.length !== 6) {
      setMessage({ type: "error", text: "Enter the 6-digit OTP" });
      return;
    }

    try {
      setLoading(true);
      const res = await verifyOtp(mobile, otp, "rider");

      if (res.data.success) {
        // Save token & role
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.user.role);

        setMessage({ type: "success", text: "Login successful! Redirecting..." });
        setTimeout(() => navigate("/rider-dashboard"), 1000);
      } else {
        setMessage({ type: "error", text: res.data.message });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Server error while verifying OTP";
      setMessage({ type: "error", text: errorMessage });
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
          Rider Login
        </Typography>

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
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
              sx={{ mt: 2 }}
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? "Checking..." : "Send OTP"}
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
              sx={{ mt: 2 }}
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
          </>
        )}

        <Typography sx={{ mt: 2 }}>
          Don’t have an account?{" "}
          <Button onClick={() => navigate("/rider-register")}>Sign Up</Button>
          <br />
          Are you a User?{" "}
          <Button onClick={() => navigate("/login")}>Login as User</Button>
        </Typography>
      </Box>
    </Container>
  );
}
