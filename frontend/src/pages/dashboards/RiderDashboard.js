import React from "react";
import { Button, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function RiderDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
        Rider Dashboard
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Welcome to the rider dashboard! 🛵  
        Here you can see ride requests, track your trips, and manage earnings.
      </Typography>

      <Button
        variant="contained"
        sx={{ bgcolor: "black", color: "white", "&:hover": { bgcolor: "#333" } }}
        onClick={handleLogout}
      >
        Logout
      </Button>
    </Box>
  );
}
