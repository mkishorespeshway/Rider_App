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
import axios from "axios";

export default function AdminDashboard() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "success" });

  // Fetch all riders
  const fetchRiders = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/rider");
      setRiders(res.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch riders:", err);
      setSnackbar({ open: true, message: "Failed to fetch riders", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  // Approve Rider
  const handleApprove = async (id) => {
    try {
      await axios.post(`/api/rider/${id}/approve`);
      setSnackbar({ open: true, message: "Rider approved & OTP sent", type: "success" });
      fetchRiders();
    } catch (err) {
      console.error("❌ Error approving rider:", err);
      setSnackbar({ open: true, message: err.response?.data?.message || "Error approving rider", type: "error" });
    }
  };

  // Reject Rider
  const handleReject = async (id) => {
    try {
      await axios.post(`/api/rider/${id}/reject`);
      setSnackbar({ open: true, message: "Rider rejected", type: "warning" });
      fetchRiders();
    } catch (err) {
      console.error("❌ Error rejecting rider:", err);
      setSnackbar({ open: true, message: "Error rejecting rider", type: "error" });
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Rider App - Admin Dashboard
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={2}>
          {riders.length === 0 ? (
            <Typography color="error">No riders found</Typography>
          ) : (
            riders.map((rider) => (
              <Grid item xs={12} md={6} key={rider._id}>
                <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h6">{rider.fullName}</Typography>
                    <Typography>Email: {rider.email}</Typography>
                    <Typography>Mobile: {rider.mobile}</Typography>
                    <Typography>Status: {rider.approvalStatus || "pending"}</Typography>

                    {/* Show docs if uploaded */}
                    {rider.documents?.length > 0 && (
                      <Box mt={1}>
                        <Typography variant="subtitle2">Documents:</Typography>
                        {rider.documents.map((doc, idx) => (
                          <div key={idx}>
                            <a
                              href={`/uploads/${doc.filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {doc.filename}
                            </a>
                          </div>
                        ))}
                      </Box>
                    )}

                    <Box mt={2} display="flex" gap={1}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => handleApprove(rider._id)}
                        disabled={rider.approvalStatus === "approved"}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleReject(rider._id)}
                        disabled={rider.approvalStatus === "rejected"}
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

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
