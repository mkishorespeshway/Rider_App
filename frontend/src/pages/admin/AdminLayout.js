import React, { useState } from "react";
import { Box, Paper } from "@mui/material";
import AdminSidebar from "./AdminSidebar";
import AdminDashboard from "./AdminDashboard";

export default function AdminLayout() {
  const [tab, setTab] = useState("overview");

  return (
    <Box className="admin-layout min-h-screen flex flex-col sm:flex-row bg-gray-50">
      <Paper elevation={3} className="admin-sidebar w-full sm:w-60 p-3" sx={{ width: 240, p: 2 }}>
        <AdminSidebar />
      </Paper>
      <Box className="flex-1 p-3 sm:p-6">
        <AdminDashboard tab={tab} setTab={setTab} />
      </Box>
    </Box>
  );
}
