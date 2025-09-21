import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signupRider, uploadRiderDocs } from "../services/api";

export default function RiderRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: "", email: "", mobile: "" });
  const [docs, setDocs] = useState({ aadharFront: null, aadharBack: null, license: null });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const validateFile = (file) => {
    if (!file) return false;
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: "Only JPG/PNG allowed" });
      return false;
    }
    if (file.size > maxSize) {
      setMessage({ type: "error", text: "File size must be < 5MB" });
      return false;
    }
    return true;
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (validateFile(files[0])) setDocs((prev) => ({ ...prev, [name]: files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setLoading(true);

    try {
      // 1️⃣ Signup Rider
      const res = await signupRider({ ...formData, role: "rider" });
      const riderId = res.data?.data?.id || res.data?.data?._id;
      if (!riderId) throw new Error("Rider ID not returned");

      // 2️⃣ Upload Documents
      const formDataUpload = new FormData();
      if (docs.aadharFront) formDataUpload.append("documents", docs.aadharFront);
      if (docs.aadharBack) formDataUpload.append("documents", docs.aadharBack);
      if (docs.license) formDataUpload.append("documents", docs.license);

      await uploadRiderDocs(riderId, formDataUpload);

      // 3️⃣ Success message + navigate
      setMessage({ type: "success", text: "Registered! Wait for admin approval." });
      setTimeout(() => navigate("/rider-login"), 2500);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper sx={{ mt: 6, p: 4, borderRadius: 3, textAlign: "center", boxShadow: 5 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>Rider Signup</Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "gray" }}>
          Create your account and upload documents.
        </Typography>

        {message.text && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} margin="normal" required />
          <TextField fullWidth type="email" label="Email" name="email" value={formData.email} onChange={handleChange} margin="normal" required />
          <TextField fullWidth type="tel" label="Mobile Number" name="mobile" value={formData.mobile} onChange={handleChange} margin="normal" inputProps={{ maxLength: 10 }} required />

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Upload Documents</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, textAlign: "left" }}>
            <input type="file" name="aadharFront" onChange={handleFileChange} required />
            <input type="file" name="aadharBack" onChange={handleFileChange} required />
            <input type="file" name="license" onChange={handleFileChange} required />
          </Box>

          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, bgcolor: "black", fontWeight: "bold" }} disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : "Sign Up"}
          </Button>
        </form>

        <Typography sx={{ mt: 2 }}>
          Already have an account?{" "}
          <Button onClick={() => navigate("/rider-login")} sx={{ fontWeight: "bold" }}>LOGIN</Button>
        </Typography>
      </Paper>
    </Container>
  );
}
