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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signupRider } from "../services/api";

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
    panCard: null,
    rc: null,
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const documentFields = [
    { key: "aadharFront", name: "Aadhar Front" },
    { key: "aadharBack", name: "Aadhar Back" },
    { key: "license", name: "License" },
    { key: "panCard", name: "PAN Card" },
    { key: "rc", name: "RC" },
  ];

  const validateFile = (file) => {
    if (!file) return false;
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: "Only JPG/PNG/PDF allowed" });
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
    if (validateFile(files[0]))
      setDocs((prev) => ({ ...prev, [name]: files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setLoading(true);

    try {
      const form = new FormData();
      form.append("fullName", formData.fullName);
      form.append("email", formData.email);
      form.append("mobile", formData.mobile);
      form.append("role", "rider");

      documentFields.forEach(({ key }) => {
        if (docs[key]) form.append(key, docs[key]);
      });

      // 🔎 Debug: show what’s inside FormData before sending
      console.log("FormData being sent:");
      for (let [key, value] of form.entries()) {
        console.log(key, value instanceof File ? value.name : value);
      }

      await signupRider(form); // ✅ sends multipart/form-data

      setOpenModal(true);
    } catch (err) {
      console.error("❌ Signup error:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper
        sx={{
          mt: 6,
          p: 4,
          borderRadius: 3,
          textAlign: "center",
          boxShadow: 5,
        }}
      >
        <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
          Rider Signup
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "gray" }}>
          Create your account and upload documents.
        </Typography>

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

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
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              textAlign: "left",
            }}
          >
            {documentFields.map(({ key, name }) => (
              <Button
                key={key}
                variant="outlined"
                component="label"
                fullWidth
                sx={{ textTransform: "none", justifyContent: "flex-start" }}
              >
                {name}: {docs[key] ? docs[key].name : "Choose File"}
                <input
                  type="file"
                  name={key}
                  onChange={handleFileChange}
                  hidden
                />
              </Button>
            ))}
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, bgcolor: "black", fontWeight: "bold" }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>

        <Typography sx={{ mt: 2 }}>
          Already have an account?{" "}
          <Button onClick={() => navigate("/rider-login")} sx={{ fontWeight: "bold" }}>
            Login as Rider
          </Button>
          <br />
          Are you a User?{" "}
          <Button onClick={() => navigate("/login")} sx={{ fontWeight: "bold" }}>
            Login as User
          </Button>
        </Typography>
      </Paper>

      <Dialog open={openModal} onClose={() => setOpenModal(false)}>
        <DialogTitle>Registration Successful!</DialogTitle>
        <DialogContent>
          <Typography>
            Your account is created successfully. Please wait for admin
            approval.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenModal(false);
              navigate("/rider-login");
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
