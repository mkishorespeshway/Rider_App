import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signup } from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    role: "user", // default role
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleRoleChange = (_, newRole) => {
    if (newRole) setFormData((p) => ({ ...p, role: newRole }));
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      setError("Please enter a valid full name.");
      return false;
    }
    if (!formData.email || !validateEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      setError("Mobile number must start with 6-9 and be 10 digits long.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await signup(formData);
      if (res.data?.success) {
        setSuccess("Signup successful! Redirecting...");
        setTimeout(() => navigate("/login"), 800);
      } else {
        setError(res.data?.message || "Signup failed. Try again.");
      }
    } catch (err) {
      console.error("Signup error:", err);
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
          Create Account
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "gray" }}>
          Sign up to start using Rider App
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
            inputProps={{ maxLength: 10 }}
            required
          />

          <Typography variant="subtitle2" align="left" sx={{ mt: 2 }}>
            Role
          </Typography>
          <ToggleButtonGroup
            value={formData.role}
            exclusive
            onChange={handleRoleChange}
            sx={{ mt: 1, mb: 2, display: "flex" }}
          >
            <ToggleButton value="user" sx={{ flex: 1, textTransform: "none" }}>
              User
            </ToggleButton>
            <ToggleButton value="rider" sx={{ flex: 1, textTransform: "none" }}>
              Rider
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 2,
              bgcolor: "black",
              color: "white",
              fontWeight: "bold",
              "&:hover": { bgcolor: "#333" },
            }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: "white" }} />
            ) : (
              "Sign Up"
            )}
          </Button>
        </Box>

        <Typography sx={{ mt: 2 }}>
          Already have an account?{" "}
          <Button
            variant="text"
            onClick={() => navigate("/login")}
            sx={{ color: "black", fontWeight: "bold" }}
          >
            Login
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
}
