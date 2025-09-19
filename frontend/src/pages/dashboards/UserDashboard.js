import React from "react";
import { Button, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function UserDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
      window.location.reload();

  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
        User Dashboard
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Welcome to the user dashboard! 🚗  
        Here you can book rides, view ride history, and manage your profile.
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
