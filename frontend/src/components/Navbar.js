import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar } from "@mui/material";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    handleMenuClose();
    navigate("/login");
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "black",
        px: 2,
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* 🔹 Left: Logo / App Name */}
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", cursor: "pointer" }}
          onClick={() => {
            if (role === "rider") navigate("/rider-dashboard");
            else if (role === "user") navigate("/user-dashboard");
            else navigate("/");
          }}
        >
          Rider App
        </Typography>

        {/* 🔹 Right: Profile Dropdown (only if logged in) */}
        {token && (
          <>
            <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: "orangered" }}>
                {role === "rider" ? "R" : "U"}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 3,
                sx: { mt: 1.5, borderRadius: 2 },
              }}
            >
              <MenuItem onClick={() => { navigate("/booking"); handleMenuClose(); }}>
                Booking
              </MenuItem>
              <MenuItem onClick={() => { navigate("/history"); handleMenuClose(); }}>
                History
              </MenuItem>
              <MenuItem onClick={() => { navigate("/profile"); handleMenuClose(); }}>
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: "red" }}>
                Logout
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
