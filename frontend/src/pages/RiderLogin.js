import React, { useState } from "react";
import { Container, Box, Button, TextField, Typography, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
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
      setMessage({ type: "error", text: "Server error while sending OTP" });
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
        setTimeout(() => navigate("/rider-dashboard"), 1000);
      } else {
        setMessage({ type: "error", text: res.data.message });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Server error while verifying OTP" });
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
            <TextField fullWidth label="Mobile Number" value={mobile}
              onChange={(e) => setMobile(e.target.value)} margin="normal"
              inputProps={{ maxLength: 10 }} />
            <Button fullWidth variant="contained" sx={{ mt: 2 }}
              onClick={handleSendOtp} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <TextField fullWidth label="Enter OTP" value={otp}
              onChange={(e) => setOtp(e.target.value)} margin="normal" />
            <Button fullWidth variant="contained" sx={{ mt: 2 }}
              onClick={handleVerifyOtp} disabled={loading}>
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
