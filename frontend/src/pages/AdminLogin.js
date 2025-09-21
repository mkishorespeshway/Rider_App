import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Container, Paper, Box, Typography, TextField, Button, Alert } from "@mui/material";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function AdminLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post(`${API}/api/admin/login`, form);
      localStorage.setItem("adminToken", res.data.token);
      navigate("/admin-dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 10 }}>
        <Typography variant="h5" textAlign="center" fontWeight="bold" gutterBottom>
          Admin Login
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
            Login
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
