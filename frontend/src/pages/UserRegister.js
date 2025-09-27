import React, { useState } from "react";
import { Container, Paper, Typography, TextField, Button, Alert, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signupUser } from "../services/api";

export default function UserRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: "", email: "", mobile: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await signupUser(formData);
      if (res.data.success) {
        setSuccess("Registered successfully! Please login.");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper sx={{ mt: 6, p: 4, borderRadius: 3, textAlign: "center", boxShadow: 5 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>User Register</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} margin="normal" required />
          <TextField fullWidth type="email" label="Email" name="email" value={formData.email} onChange={handleChange} margin="normal" required />
          <TextField fullWidth type="tel" label="Mobile Number" name="mobile" value={formData.mobile} onChange={handleChange} margin="normal" inputProps={{ maxLength: 10 }} required />

          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, bgcolor: "black" }} disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : "Sign Up"}
          </Button>
        </form>

        <Typography sx={{ mt: 2 }}>
          Already have an account?{" "}
          <Button onClick={() => navigate("/login")} sx={{ fontWeight: "bold" }}>Login</Button>
        </Typography>
        <Typography sx={{ mt: 1 }}>
          Login as Rider?{" "}
          <Button onClick={() => navigate("/rider-login")} sx={{ fontWeight: "bold" }}>Rider Login</Button>
        </Typography>
      </Paper>
    </Container>
  );
}
