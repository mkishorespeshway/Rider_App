import React from "react";
import { Button, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import SOSButton from "../../components/SOSButton";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box className="min-h-screen bg-gray-50" sx={{ p: 4 }}>
      <Box className="max-w-screen-sm mx-auto px-3 sm:px-6">
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
        User Dashboard
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Welcome to the user dashboard! 🚗
      </Typography>

      {/* ✅ Logout button */}
      <Button
        variant="contained"
        className="w-full sm:w-auto"
        sx={{ bgcolor: "black", color: "white", "&:hover": { bgcolor: "#333" } }}
        onClick={handleLogout}
      >
        Logout
      </Button>

      {/* 🚨 SOS Button */}
      <SOSButton role="user" />
      </Box>
    </Box>
  );
}
