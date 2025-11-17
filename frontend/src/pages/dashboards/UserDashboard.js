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
    <Box
      className="section"
      sx={{ p: 4, minHeight: "100vh" }}
    >
      <Box className="max-w-screen-sm mx-auto px-3 sm:px-6">
      <Typography variant="h4" className="page-title" sx={{ mb: 2 }}>
        User Dashboard
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Welcome to the user dashboard! 🚗
      </Typography>

      {/* ✅ Logout button */}
      <Button
        variant="contained"
        className="btn-primary w-full sm:w-auto"
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
