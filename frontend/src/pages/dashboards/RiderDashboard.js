import React, { useEffect, useState } from "react";
import { Button, Typography, Box, Alert, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getRiderStatus } from "../../services/api";

export default function RiderDashboard() {
  const navigate = useNavigate();
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load rider status
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/rider-login");
      return;
    }

    getRiderStatus(token)
      .then((res) => {
        console.log("✅ Rider status response:", res.data);
        setRider(res.data.user);
      })
      .catch((err) => {
        console.error("❌ Error loading rider data:", err.response?.data || err);
        setError(err.response?.data?.message || "Error loading rider data");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Handle approval logic
  useEffect(() => {
    if (!rider) return;

    if (rider.approvalStatus === "pending") {
      return; // stay here
    }

    if (rider.approvalStatus === "rejected" || rider.approvalStatus === "docs_required") {
      navigate("/upload-docs");
    }
  }, [rider, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/rider-login");
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (rider?.approvalStatus === "pending") {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Verification in Progress
        </Typography>
        <Typography>
          Your documents are under review. Please wait for admin approval.
        </Typography>
        <Button
          sx={{ mt: 3 }}
          variant="contained"
          color="error"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>
    );
  }

  // Approved
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Welcome, {rider.fullName || rider.mobile} 🚖
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        You can now access your rides, track trips, and earnings.
      </Typography>
      <Button variant="contained" color="primary" onClick={handleLogout}>
        Logout
      </Button>
    </Box>
  );
}
