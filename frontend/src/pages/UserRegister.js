import React, { useState } from "react";
import { Container, Box, Typography, TextField, Button, Alert, CircularProgress } from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import { signupUser } from "../services/api";

export default function UserRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: "", email: "", mobile: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await signupUser(formData);
      if (res.data.success) {
        setSuccess("Registered successfully! Please login.");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="min-h-screen bg-gray-50" sx={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Brand Header Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #007C91 0%, #00B8D4 100%)",
          height: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Logo/Brand Circle */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.3)",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              color: "white",
              fontWeight: "bold",
              fontSize: "24px",
            }}
          >
            R
          </Typography>
        </Box>
      </Box>

      {/* White Form Section */}
      <Container maxWidth="xs" className="px-3 sm:px-6">
        <Box
          sx={{
            background: "white",
            borderRadius: "24px 24px 0 0",
            mt: "-60px",
            position: "relative",
            zIndex: 1,
            p: 4,
            minHeight: "60vh",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              textAlign: "center",
              fontWeight: "bold",
              mb: 1,
              color: "#1f2937",
            }}
          >
            Create Account
          </Typography>
          
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "#6b7280",
              mb: 4,
            }}
          >
            Sign up to get started with your account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              {success}
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
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  height: 56,
                },
              }}
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
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  height: 56,
                },
              }}
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
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  height: 56,
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                height: 56,
                borderRadius: 3,
                backgroundColor: "#007C91",
                fontWeight: "bold",
                fontSize: "16px",
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(0, 124, 145, 0.35)",
                "&:hover": {
                  backgroundColor: "#00687A",
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Sign Up"}
            </Button>
          </form>

          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "#6b7280", mb: 2 }}>
              Already have an account?{" "}
              <Link
                to="/login"
                style={{
                  color: "#007C91",
                  textDecoration: "none",
                  fontWeight: "600",
                }}
              >
                Login
              </Link>
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280" }}>
              Are you a Rider?{" "}
              <Link
                to="/rider-login"
                style={{
                  color: "#007C91",
                  textDecoration: "none",
                  fontWeight: "600",
                }}
              >
                Login as Rider
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
