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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signupRider } from "../services/api";
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
 
export default function RiderRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    gender: "",
    preferredLanguage: "English",
    preferredLanguages: [],
    emergencyContactName: "",
    emergencyContactNumber: "",
    address: "",
    vehicleType: "",
    vehicleNumber: "",
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [vehicleImage, setVehicleImage] = useState(null);
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
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [vehicleImagePreview, setVehicleImagePreview] = useState(null);
 
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
 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
 
  const handleLanguagesChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      preferredLanguages: Array.isArray(value) ? value : [value],
      preferredLanguage: Array.isArray(value) ? (value[0] || "") : value,
    }));
  };
 
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (validateFile(files[0])) {
      if (name === "profilePicture") {
        setProfilePicture(files[0]);
        const reader = new FileReader();
        reader.onload = () => {
          setProfilePicturePreview(reader.result);
        };
        reader.readAsDataURL(files[0]);
      } else if (name === "vehicleImage") {
        setVehicleImage(files[0]);
        const reader = new FileReader();
        reader.onload = () => {
          setVehicleImagePreview(reader.result);
        };
        reader.readAsDataURL(files[0]);
      } else {
        setDocs((prev) => ({ ...prev, [name]: files[0] }));
      }
    }
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setLoading(true);
 
    try {
      const form = new FormData();
      // Basic information
      form.append("fullName", formData.fullName);
      form.append("email", formData.email);
      form.append("mobile", formData.mobile);
      form.append("password", formData.password);
      form.append("role", "rider");
     
      // Additional information
      form.append("gender", formData.gender);
      form.append("preferredLanguage", formData.preferredLanguage);
      // send multiple languages as JSON string to be robust
      if (formData.preferredLanguages && formData.preferredLanguages.length) {
        form.append("preferredLanguages", JSON.stringify(formData.preferredLanguages));
      }
      form.append("emergencyContactName", formData.emergencyContactName);
      form.append("emergencyContactNumber", formData.emergencyContactNumber);
      form.append("address", formData.address);
     
      // Vehicle information
      form.append("vehicleType", formData.vehicleType);
      form.append("vehicleNumber", formData.vehicleNumber);
     
      // Profile picture and vehicle image
      if (profilePicture) form.append("profilePicture", profilePicture);
      if (vehicleImage) form.append("vehicleImage", vehicleImage);
 
      // Documents
      documentFields.forEach(({ key }) => {
        if (docs[key]) form.append(key, docs[key]);
      });
 
      // 🔎 Debug: show what's inside FormData before sending
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
    <Container maxWidth="md">
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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar
              src={profilePicturePreview}
              sx={{ width: 100, height: 100, mb: 2 }}
            />
            <Button
              variant="outlined"
              component="label"
              startIcon={<PhotoCameraIcon />}
            >
              Upload Profile Picture
              <input
                type="file"
                name="profilePicture"
                onChange={handleFileChange}
                hidden
              />
            </Button>
          </Box>
 
          <Typography variant="h6" sx={{ mt: 3, mb: 2, textAlign: 'left' }}>
            Personal Information
          </Typography>
         
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              margin="normal"
              required
              sx={{ flex: '1 1 45%' }}
            />
           
            <TextField
              type="email"
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              sx={{ flex: '1 1 45%' }}
            />
           
            <TextField
              type="tel"
              label="Mobile Number"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              margin="normal"
              inputProps={{ maxLength: 10 }}
              required
              sx={{ flex: '1 1 45%' }}
            />
           
            <TextField
              type="password"
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              sx={{ flex: '1 1 45%' }}
            />
           
            <FormControl margin="normal" sx={{ flex: '1 1 45%' }} required>
              <InputLabel>Gender</InputLabel>
              <Select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                label="Gender "
                
              >
                <MenuItem value="">Select Gender</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
           
            <FormControl margin="normal" required sx={{ flex: '1 1 45%' }}>
              <InputLabel>Preferred Languages</InputLabel>
              <Select
                multiple
                name="preferredLanguages"
                value={formData.preferredLanguages}
                onChange={handleLanguagesChange}
                label="Preferred Languages"
                renderValue={(selected) => (selected || []).join(', ')}
              >
                <MenuItem value="English">English</MenuItem>
                <MenuItem value="Hindi">Hindi</MenuItem>
                <MenuItem value="Tamil">Tamil</MenuItem>
                <MenuItem value="Telugu">Telugu</MenuItem>
                <MenuItem value="Kannada">Kannada</MenuItem>
                <MenuItem value="Malayalam">Malayalam</MenuItem>
              </Select>
            </FormControl>
          </Box>
 
          <Typography variant="h6" sx={{ mt: 3, mb: 2, textAlign: 'left' }}>
            Address & Emergency Contact
          </Typography>
         
          <TextField
            fullWidth
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            margin="normal"
            required
            multiline
            rows={2}
          />
         
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              label="Emergency Contact Name"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              margin="normal"
              required
              sx={{ flex: '1 1 45%' }}
            />
           
            <TextField
              type="tel"
              label="Emergency Contact Number"
              name="emergencyContactNumber"
              value={formData.emergencyContactNumber}
              onChange={handleChange}
              margin="normal"
              required
              inputProps={{ maxLength: 10 }}
              sx={{ flex: '1 1 45%' }}
            />
          </Box>
 
          <Typography variant="h6" sx={{ mt: 3, mb: 2, textAlign: 'left' }}>
            Vehicle Information
          </Typography>
         
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <FormControl margin="normal" required sx={{ flex: '1 1 45%' }}>
              <InputLabel>Vehicle Type</InputLabel>
              <Select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                label="Vehicle Type"
              >
                <MenuItem value="bike">Bike</MenuItem>
                <MenuItem value="auto">Auto</MenuItem>
                <MenuItem value="car">Car</MenuItem>
                <MenuItem value="suv">SUV</MenuItem>
              </Select>
            </FormControl>
           
            <TextField
              label="Vehicle Number"
              name="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={handleChange}
              margin="normal"
              required
              sx={{ flex: '1 1 45%' }}
            />
          </Box>
         
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 3 }}>
            {vehicleImagePreview && (
              <Box
                component="img"
                src={vehicleImagePreview}
                sx={{ maxWidth: '100%', maxHeight: '200px', mb: 2 }}
              />
            )}
            <Button
              variant="outlined"
              component="label"
              startIcon={<PhotoCameraIcon />}
            >
              Upload Vehicle Image
              <input
                type="file"
                name="vehicleImage"
                onChange={handleFileChange}
                hidden
              />
            </Button>
          </Box>
 
          <Typography variant="h6" sx={{ mt: 3, mb: 1, textAlign: 'left' }}>
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
 
 