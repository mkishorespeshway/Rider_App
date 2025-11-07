import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getRideHistory, getRiderStatus } from "../services/api";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Grid,
  Button,
  Divider,
  Stack,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import PaymentIcon from "@mui/icons-material/Payment";
import LocalTaxiIcon from "@mui/icons-material/LocalTaxi";
 
export default function HistoryRider() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { auth } = useAuth();
  const rider = auth?.user || {};
  const [riderDetails, setRiderDetails] = useState(rider || {});
 
  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString();
  };
 
  const statusColor = (s) => {
    switch (s) {
      case "accepted":
        return "success";
      case "in_progress":
        return "info";
      case "completed":
        return "primary";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };
 
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getRideHistory();
        const data = res?.data?.rides || res?.data || [];
        setRides(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("HistoryRider warning:", err);
        setError("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Fetch rider profile/status to ensure vehicle details are available in header
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getRiderStatus();
        // Support multiple backend shapes
        const data = res?.data?.rider || res?.data?.data || res?.data || {};
        if (mounted && data && typeof data === "object") {
          setRiderDetails((prev) => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.warn("HistoryRider: getRiderStatus failed", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
 
  if (loading)
    return (
      <Box p={3}>
        <Typography>Loading history...</Typography>
      </Box>
    );
  if (error)
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
 
  // Compute vehicle display values including fallback from latest ride with driver info
  const withDriver = (Array.isArray(rides) ? rides : []).filter(
    (r) => r && r.driverId && (r.driverId.vehicleType || r.driverId.vehicleNumber)
  );
  const latestDriver = withDriver.length
    ? [...withDriver].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.driverId || {}
    : {};
  const vehicleTypeDisplay =
    riderDetails.vehicleType ||
    riderDetails.vehicle?.type ||
    rider.vehicleType ||
    rider.vehicle?.type ||
    latestDriver.vehicleType ||
    "—";
  const vehicleNumberDisplay =
    riderDetails.vehicleNumber ||
    riderDetails.vehicle?.registrationNumber ||
    rider.vehicleNumber ||
    rider.vehicle?.registrationNumber ||
    latestDriver.vehicleNumber ||
    "—";

  return (
    <Box p={3}>
      {/* Centered identity header for rider */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        <Paper elevation={2} sx={{ p: 2, borderRadius: 2, textAlign: "center", maxWidth: 600, width: "100%" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Rider Details
          </Typography>
          <Box display="flex" justifyContent="center" gap={1} alignItems="center" sx={{ mb: 0.5 }}>
            <PersonIcon fontSize="small" />
            <Typography>
              <b>Name:</b> {riderDetails.fullName || rider.fullName || "—"}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="center" gap={1} alignItems="center" sx={{ mb: 0.5 }}>
            <LocalPhoneIcon fontSize="small" />
            <Typography>
              <b>Mobile:</b> {riderDetails.mobile || rider.mobile || "—"}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="center" gap={1} alignItems="center">
            <LocalTaxiIcon fontSize="small" />
            <Typography>
              <b>Vehicle:</b> {vehicleTypeDisplay} • {vehicleNumberDisplay}
            </Typography>
          </Box>
        </Paper>
      </Box>
 
      <Typography variant="h5" className="page-title" sx={{ mb: 2 }}>
        Rider Ride History
      </Typography>
      {rides.length === 0 && <Typography>No rides yet</Typography>}
      <Stack spacing={2}>
        {rides.map((r) => (
          <Paper key={r._id} sx={{ p: 2, borderRadius: 2 }}>
            <Grid container alignItems="center" spacing={1}>
              <Grid item xs={12} sm={8}>
                <Typography sx={{ fontWeight: 600 }}>
                  {r.pickup} <span style={{ opacity: 0.7 }}>→</span> {r.drop}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Ride ID: {r._id} • {formatDate(r.createdAt)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box display="flex" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                  <Chip label={r.status} color={statusColor(r.status)} />
                </Box>
              </Grid>
            </Grid>
 
            <Divider sx={{ my: 2 }} />
 
            {r.riderId && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon fontSize="small" />
                    <Typography>
                      <b>User:</b> {r.riderId.fullName || "-"}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    <LocalPhoneIcon fontSize="small" />
                    <Typography>
                      <b>Mobile:</b> {r.riderId.mobile || "-"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocalTaxiIcon fontSize="small" />
                    <Typography>
                      <b>Driver Vehicle:</b> {r.driverId?.vehicleType || "-"} • {r.driverId?.vehicleNumber || "-"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
 
            <Divider sx={{ my: 2 }} />
 
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <Box display="flex" alignItems="center" gap={1}>
                  <PaymentIcon fontSize="small" />
                  <Typography sx={{ fontWeight: 600 }}>Payment</Typography>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                  Status: {r.payment?.status ? (r.payment.status === 'success' ? 'Paid' : (r.payment.status === 'initiated' ? 'Initiated' : r.payment.status)) : (r.paymentStatus ? (r.paymentStatus === 'completed' ? 'Paid' : 'Pending') : 'Not available')}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Method: {r.paymentMethod ? (r.detailedPaymentMethod ? `${r.paymentMethod} (${r.detailedPaymentMethod})` : r.paymentMethod) : (r.payment?.provider || '—')}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Amount: {r.payment?.amount != null ? `₹${Number(r.payment.amount).toFixed(2)}` : (r.finalPrice != null ? `₹${Number(r.finalPrice).toFixed(2)}` : "—")}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box display="flex" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                  <Button variant="contained" onClick={() => navigate(`/ride/${r._id}`)}>
                    Track
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
 