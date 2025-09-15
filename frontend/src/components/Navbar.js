// frontend/src/components/Navbar.js
import React from "react";
import { Link } from "react-router-dom";
import { AppBar, Toolbar, Button, Box } from "@mui/material";

export default function Navbar() {
  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar>
        <Box sx={{ display: "flex", gap: 2 }}>
          {/* Home → Register */}
          <Button
            component={Link}
            to="/register"
            color="inherit"
            sx={{ textTransform: "none" }}
          >
            Home
          </Button>

          {/* Login */}
          <Button
            component={Link}
            to="/login"
            color="inherit"
            sx={{ textTransform: "none" }}
          >
            Login
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
