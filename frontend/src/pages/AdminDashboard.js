// src/pages/AdminDashboard.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from "@mui/material";
import { getAllRiders, approveRider, rejectRider } from "../services/api";

export default function AdminDashboard() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRiders = async () => {
    try {
      setLoading(true);
      const res = await getAllRiders();
      setRiders(res.data.riders || []);
    } catch (err) {
      console.error("❌ Error fetching riders:", err);
      setError("Failed to fetch riders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveRider(id);
      fetchRiders();
    } catch {
      setError("Failed to approve rider");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectRider(id);
      fetchRiders();
    } catch {
      setError("Failed to reject rider");
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Admin Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Full Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {riders.map((rider) => (
              <TableRow key={rider._id}>
                <TableCell>{rider.fullName}</TableCell>
                <TableCell>{rider.email}</TableCell>
                <TableCell>{rider.mobile}</TableCell>
                <TableCell>{rider.approvalStatus}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={() => handleApprove(rider._id)}
                    sx={{ mr: 1 }}
                    disabled={rider.approvalStatus === "approved"}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={() => handleReject(rider._id)}
                    disabled={rider.approvalStatus === "rejected"}
                  >
                    Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
