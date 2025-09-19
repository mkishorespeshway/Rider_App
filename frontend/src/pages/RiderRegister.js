import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signupRider, uploadRiderDocs } from "../services/api";

export default function RiderRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
  });
  const [docs, setDocs] = useState({
    aadharFront: null,
    aadharBack: null,
    license: null,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setDocs((prev) => ({ ...prev, [name]: files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // 1️⃣ Signup rider first
      const res = await signupRider(formData);
      if (!res.data?.success) {
        setError(res.data?.message || "Signup failed.");
        setLoading(false);
        return;
      }

      const riderId = res.data?.data?.id;
      if (!riderId) {
        setError("No Rider ID returned from server.");
        setLoading(false);
        return;
      }

      // 2️⃣ Upload documents using riderId
      const formDataUpload = new FormData();
      formDataUpload.append("aadharFront", docs.aadharFront);
      formDataUpload.append("aadharBack", docs.aadharBack);
      formDataUpload.append("license", docs.license);

      await uploadRiderDocs(riderId, formDataUpload);

      setSuccess("Signup successful! Waiting for admin approval.");
      setTimeout(() => {
        navigate("/rider-login");
      }, 2000);
    } catch (err) {
      console.error("❌ Rider signup error:", err);
      setError("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper sx={{ mt: 6, p: 4, borderRadius: 3, textAlign: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
          Rider Signup
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "gray" }}>
          Join as a rider — create your account and upload documents.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            type="email"
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            type="tel"
            label="Mobile Number"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            margin="normal"
            inputProps={{ maxLength: 10 }}
            required
          />

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Upload Documents
          </Typography>
          <Box sx={{ textAlign: "left" }}>
            <label>Aadhar Front</label>
            <input type="file" name="aadharFront" onChange={handleFileChange} required />

            <label>Aadhar Back</label>
            <input type="file" name="aadharBack" onChange={handleFileChange} required />

            <label>License</label>
            <input type="file" name="license" onChange={handleFileChange} required />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, bgcolor: "black", color: "white", fontWeight: "bold" }}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Sign Up"}
          </Button>
        </form>

        <Typography sx={{ mt: 2 }}>
          Already have an account?{" "}
          <Button onClick={() => navigate("/rider-login")} sx={{ fontWeight: "bold" }}>
            LOGIN
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
}
