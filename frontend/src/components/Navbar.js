// src/components/Navbar.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar } from "@mui/material";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    handleMenuClose();
    navigate("/login");
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: "black", px: 2 }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", cursor: "pointer" }}
          onClick={() => {
            if (role === "rider") navigate("/rider-dashboard");
            else if (role === "user") navigate("/user-dashboard");
            else if (role === "admin") navigate("/admin-dashboard");
            else navigate("/");
          }}
        >
          Rider App
        </Typography>

        {token && (
  <>
    <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
      <Avatar sx={{ bgcolor: "orangered" }}>
        {role === "rider" ? "R" : role === "user" ? "U" : "A"}
      </Avatar>
    </IconButton>

    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      PaperProps={{ elevation: 3, sx: { mt: 1.5, borderRadius: 2 } }}
    >
      {role === "admin" ? (
        <>
          <MenuItem onClick={() => { navigate("/admin-dashboard"); handleMenuClose(); }}>
            Dashboard
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: "red" }}>
            Logout
          </MenuItem>
        </>
      ) : (
        <>
          <MenuItem onClick={() => { navigate("/booking"); handleMenuClose(); }}>Booking</MenuItem>
          <MenuItem onClick={() => { navigate("/history"); handleMenuClose(); }}>History</MenuItem>
          <MenuItem onClick={() => { navigate("/profile"); handleMenuClose(); }}>Profile</MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: "red" }}>Logout</MenuItem>
        </>
      )}
    </Menu>
  </>
)}

      </Toolbar>
    </AppBar>
  );
}
