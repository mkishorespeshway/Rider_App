import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getRiderStatus, getRideHistory } from "../../services/api"; // ✅ single import

export default function RiderDashboard() {
  const [rider, setRider] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });
  const navigate = useNavigate();

  // ✅ Fetch rider profile/status
  const fetchRiderData = async () => {
    try {
      setLoading(true);
      const res = await getRiderStatus(); // GET /api/rider/status
      setRider(res.data || null);
    } catch (err) {
      console.error("❌ Failed to fetch rider status:", err);
      setSnackbar({
        open: true,
        message: "Failed to load rider profile",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch ride history
  const fetchRideHistory = async () => {
    try {
      const res = await getRideHistory(); // GET /api/rides/history
      setRides(res.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch ride history:", err);
      setSnackbar({
        open: true,
        message: "Failed to load ride history",
        type: "error",
      });
    }
  };

  useEffect(() => {
    fetchRiderData();
    fetchRideHistory();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/rider-login");
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Rider Dashboard
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : rider ? (
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6">{rider.fullName}</Typography>
            <Typography>Email: {rider.email}</Typography>
            <Typography>Mobile: {rider.mobile}</Typography>
            <Typography>
              Approval Status:{" "}
              <b
                style={{
                  color:
                    rider.approvalStatus === "approved" ? "green" : "orange",
                }}
              >
                {rider.approvalStatus || "pending"}
              </b>
            </Typography>
            <Box mt={2}>
              <Button variant="contained" color="error" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Typography color="error">No rider data available</Typography>
      )}

      <Typography variant="h5" gutterBottom>
        Ride History
      </Typography>
      <Grid container spacing={2}>
        {rides.length === 0 ? (
          <Typography>No rides found</Typography>
        ) : (
          rides.map((ride) => (
            <Grid item xs={12} md={6} key={ride._id}>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Typography>From: {ride.pickupLocation}</Typography>
                  <Typography>To: {ride.dropLocation}</Typography>
                  <Typography>
                    Date: {new Date(ride.date).toLocaleString()}
                  </Typography>
                  <Typography>Status: {ride.status}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Snackbar for alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.type}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
