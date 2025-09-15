import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signup } from "../services/api";

export default function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    role: "user",
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
        setSuccess(res.data.message || "Signup successful");
        setTimeout(() => navigate("/login"), 800);
      } else if (res.data?.errorField === "mobile") {
        setError(res.data.message || "Mobile number already exists.");
      } else {
        setError(res.data?.message || "Signup failed. Try again.");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError(
        err.response?.data?.message || "Server error. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 5, borderRadius: 3 }}>
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{ color: "orangered", fontWeight: "bold" }}
        >
          Rider App
        </Typography>
        <Typography variant="body1" align="center" sx={{ mb: 3 }}>
          Create your account to get started
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

          <Typography variant="subtitle1" sx={{ mt: 2 }}>
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
            <ToggleButton value="owner" sx={{ flex: 1, textTransform: "none" }}>
              Owner
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2, bgcolor: "orangered", "&:hover": { bgcolor: "darkred" } }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Register"}
          </Button>
        </Box>

        <Typography align="center" sx={{ mt: 2 }}>
          Already have an account?{" "}
          <Button variant="text" onClick={() => navigate("/login")} sx={{ color: "orangered" }}>
            Login
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
}
