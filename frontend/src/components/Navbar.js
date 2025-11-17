// src/components/Navbar.js
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, logout } = useAuth();
  const { token, roles } = auth || {};
  const role = roles[0] || null;
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    const currentRole = role; // ✅ capture before logout
    logout();

    if (currentRole === "admin") navigate("/admin");
    else if (currentRole === "rider") navigate("/rider-login");
    else navigate("/login");

    handleMenuClose();
  };

  return (
    <AppBar position="static" className="shadow-card-glow" sx={{ px: 2 }}>
      <Toolbar className="text-white" sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", cursor: "pointer" }}
          className="hover-lift"
          onClick={() => {
            if (role === "rider") navigate("/rider-dashboard");
            else if (role === "user") navigate("/user-dashboard");
            else if (role === "admin") navigate("/admin-dashboard");
            else navigate("/");
          }}
        >
          {role === "rider" && location.pathname.startsWith("/rider-dashboard")
            ? "Rider Dashboard"
            : "Rider App"}
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
              {role === "admin" && (
                <>
                  <MenuItem onClick={() => { navigate("/admin-dashboard"); handleMenuClose(); }}>
                    Dashboard
                  </MenuItem>
                  <MenuItem onClick={handleLogout} sx={{ color: "red" }}>Logout</MenuItem>
                </>
              )}

              {role === "user" && (
                <>
                  <MenuItem onClick={() => { navigate("/booking"); handleMenuClose(); }}>Booking</MenuItem>
                  <MenuItem onClick={() => { navigate("/history"); handleMenuClose(); }}>History</MenuItem>
                  <MenuItem onClick={() => { navigate("/profile"); handleMenuClose(); }}>Profile</MenuItem>
                  <MenuItem onClick={() => { navigate("/parcel"); handleMenuClose(); }}>Parcel</MenuItem>
                  <MenuItem onClick={handleLogout} sx={{ color: "red" }}>Logout</MenuItem>
                </>
              )}

              {role === "rider" && (
                <>
                  <MenuItem onClick={() => { navigate("/rider-wallet"); handleMenuClose(); }}>Wallet</MenuItem>
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
