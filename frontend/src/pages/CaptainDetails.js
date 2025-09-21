// src/pages/CaptainDetails.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Link,
} from "@mui/material";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function CaptainDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [captain, setCaptain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCaptain = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/api/admin/captain/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCaptain(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to fetch captain details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptain();
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!captain) return null;

  return (
    <Box p={4}>
      <Button variant="contained" color="primary" sx={{ mb: 3 }} onClick={() => navigate("/admin-dashboard")}>
        Back to Dashboard
      </Button>

      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
          Captain Details
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography><b>Full Name:</b> {captain.fullName}</Typography>
            <Typography><b>Email:</b> {captain.email}</Typography>
            <Typography><b>Mobile:</b> {captain.mobile}</Typography>
            <Typography><b>Status:</b> {captain.status}</Typography>
            <Typography><b>Joined At:</b> {new Date(captain.createdAt).toLocaleString()}</Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="h6" sx={{ mb: 1 }}>Uploaded Documents</Typography>
            {captain.documents && captain.documents.length > 0 ? (
              captain.documents.map((doc, i) => (
                <Box key={i} sx={{ mb: 1 }}>
                  <Link href={doc.url} target="_blank" rel="noreferrer">{doc.name}</Link>
                </Box>
              ))
            ) : (
              <Typography>No documents uploaded</Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
