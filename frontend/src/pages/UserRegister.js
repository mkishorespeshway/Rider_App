import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signupUser } from "../services/api";

export default function UserRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: "", email: "", mobile: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return false;
    }
    if (!validateEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      setError("Mobile number must start with 6/7/8/9 and be exactly 10 digits.");
      return false;
    }
    setError("");
    return true;
  };

  // ---------- FIXED handleSubmit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await signupUser({ ...formData, role: "user" });
      if (res.data?.success) {
        setSuccess("Signup successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 1000);
      } else setError(res.data?.message || "Signup failed. Try again.");
    } catch {
      setError("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };
  // ---------- end fixed handleSubmit ----------

  return (
    <Container maxWidth="xs">
      <Paper
        elevation={3}
        sx={{
          mt: 6,
          p: 4,
          borderRadius: 3,
          textAlign: "center",
          fontFamily: "Uber Move, Helvetica Neue, sans-serif",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
          User Signup
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "gray" }}>
          Create your account to start using Rider App
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            type="email"
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            type="tel"
            label="Mobile Number"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            margin="normal"
            inputProps={{
              maxLength: 10,
              pattern: "^[6-9][0-9]{9}$", // ✅ starts with 6-9 and 10 digits
            }}
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              bgcolor: "black",
              color: "white",
              fontWeight: "bold",
              "&:hover": { bgcolor: "#333" },
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Sign Up"}
          </Button>
        </Box>

        <Typography sx={{ mt: 3 }}>
          Already have an account?{" "}
          <Button onClick={() => navigate("/login")} sx={{ color: "black", fontWeight: "bold" }}>
            LOGIN
          </Button>
        </Typography>
        <Typography sx={{ mt: 1 }}>
          Want to drive with us?{" "}
          <Button onClick={() => navigate("/rider-register")} sx={{ color: "black", fontWeight: "bold" }}>
            RIDER SIGNUP
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
}
