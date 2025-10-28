import React, { useState } from "react";
import { Box, Paper } from "@mui/material";
import AdminSidebar from "./AdminSidebar";
import AdminDashboard from "./AdminDashboard";

export default function AdminLayout() {
  const [tab, setTab] = useState("overview");

  return (
    <Box className="admin-layout" display="flex" minHeight="100vh">
      <Paper elevation={3} className="admin-sidebar" sx={{ width: 240, p: 2 }}>
        <AdminSidebar />
      </Paper>
      <Box flex={1} p={3}>
        <AdminDashboard tab={tab} setTab={setTab} />
      </Box>
    </Box>
  );
}
