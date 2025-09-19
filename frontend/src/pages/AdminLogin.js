import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // ✅ Static credentials (change as needed)
    const ADMIN_USERNAME = "admin";
    const ADMIN_PASSWORD = "admin123";

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Save role in localStorage so App.js can redirect properly
      localStorage.setItem("token", "admin-token");
        localStorage.setItem("role", "admin");
        navigate("/admin-dashboard", { replace: true });
        window.location.reload();

      
    } else {
      setError("Invalid admin credentials");
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper sx={{ mt: 8, p: 4, textAlign: "center" }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
          Admin Login
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 3,
              bgcolor: "black",
              fontWeight: "bold",
              color: "white",
              "&:hover": { bgcolor: "#333" },
            }}
          >
            Login
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
