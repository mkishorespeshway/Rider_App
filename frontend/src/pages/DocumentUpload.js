// frontend/src/pages/DocumentUpload.js
import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Alert,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { uploadRiderDocs } from "../services/api";

export default function DocumentUpload() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!token) {
    navigate("/rider-login");
    return null;
  }

  const handleFileChange = (e) => {
    setFiles((prev) => ({ ...prev, [e.target.name]: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.aadharFront || !files.aadharBack || !files.license) {
      setError("Please upload all required documents.");
      return;
    }

    const formData = new FormData();
    Object.keys(files).forEach((key) => formData.append(key, files[key]));

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await uploadRiderDocs(token, formData);
      if (res.data?.success) {
        setSuccess("Documents uploaded successfully! Waiting for admin approval.");
        setTimeout(() => navigate("/rider-dashboard"), 1500);
      } else {
        setError(res.data?.message || "Upload failed. Try again.");
      }
    } catch (err) {
      console.error("Upload error:", err.response?.data || err);
      setError(err.response?.data?.message || "Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper
        sx={{
          mt: 6,
          p: 4,
          borderRadius: 3,
          textAlign: "center",
          fontFamily: "Uber Move, Helvetica Neue, sans-serif",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
          Upload Rider Documents
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "gray" }}>
          Please upload all required documents for verification.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Typography align="left" sx={{ mt: 2 }}>Aadhar Front</Typography>
          <input type="file" name="aadharFront" onChange={handleFileChange} required />

          <Typography align="left" sx={{ mt: 2 }}>Aadhar Back</Typography>
          <input type="file" name="aadharBack" onChange={handleFileChange} required />

          <Typography align="left" sx={{ mt: 2 }}>License</Typography>
          <input type="file" name="license" onChange={handleFileChange} required />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              bgcolor: "black",
              color: "white",
              fontWeight: "bold",
              "&:hover": { bgcolor: "#333" },
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Upload"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
