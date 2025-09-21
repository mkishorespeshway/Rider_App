// src/pages/RiderDetails.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, Paper, CircularProgress, Alert, Button, Grid } from "@mui/material";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const RiderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRider = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/api/admin/rider/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        setRider(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to fetch rider details");
      } finally {
        setLoading(false);
      }
    };
    fetchRider();
  }, [id]);

  if (loading) return <CircularProgress sx={{ mt: 5, display: "block", mx: "auto" }} />;
  if (error) return <Alert severity="error" sx={{ mt: 5 }}>{error}</Alert>;

  return (
    <Box p={4}>
      <Button variant="contained" sx={{ mb: 3 }} onClick={() => navigate(-1)}>Back</Button>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>Rider Details</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><Typography><b>Full Name:</b> {rider.fullName}</Typography></Grid>
          <Grid item xs={12} sm={6}><Typography><b>Email:</b> {rider.email}</Typography></Grid>
          <Grid item xs={12} sm={6}><Typography><b>Mobile:</b> {rider.mobile}</Typography></Grid>
          <Grid item xs={12} sm={6}><Typography><b>Status:</b> {rider.approvalStatus}</Typography></Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 3 }}>Uploaded Documents</Typography>
        {rider.documents?.length > 0 ? (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {rider.documents.map((doc, i) => (
              <Grid item xs={12} sm={4} key={i}>
                <Paper sx={{ p: 1, textAlign: "center" }}>
                  <a href={doc.url} target="_blank" rel="noreferrer">{doc.name}</a>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography>No documents uploaded</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default RiderDetails;
