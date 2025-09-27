// src/pages/admin/AdminLogin.js
import React, { useState } from "react";
import { loginAdmin } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { Button, TextField, Container, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await loginAdmin({ username, password });
      if (res.data.success) {
        login({
          token: res.data.token,
          user: { username },
          roles: ["admin"], // ✅ FIX
        });
        navigate("/admin-dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Login failed. Check your credentials.");
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
        <Typography variant="h5" mb={2}>
          Admin Login
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
          />

          {error && (
            <Typography color="error" variant="body2" mt={1}>
              {error}
            </Typography>
          )}

          <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }}>
            Login
          </Button>
        </form>
      </Box>
    </Container>
  );
}
