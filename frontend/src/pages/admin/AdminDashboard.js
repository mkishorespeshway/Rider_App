// src/pages/admin/AdminDashboard.js
import React, { useEffect, useState } from "react";
import {
  getOverview,
  getUsers,
  getRiders,
  getApprovedCaptains,
  getPendingCaptains,
  getRides,
  approveCaptain,
  rejectCaptain
} from "../../services/adminApi";
import { useAuth } from "../../contexts/AuthContext";
import {
  Button,
  Typography,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress
} from "@mui/material";

// MUI Icons
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [overview, setOverview] = useState({ users:0, riders:0, captains:0, pendingCaptains:0, rides:0 });
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getOverview();
      setOverview(res.data || { users:0, riders:0, captains:0, pendingCaptains:0, rides:0 });
    } catch (err) {
      console.error("Overview fetch error:", err);
      setError("Failed to load overview");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (type) => {
    setActiveTab(type);
    setLoading(true);
    setError("");
    try {
      let res;
      switch(type){
        case "users": res = await getUsers(); setData(res?.data?.users || []); break;
        case "riders": res = await getRiders(); setData(res?.data?.riders || []); break;
        case "captains": res = await getApprovedCaptains(); setData(res?.data?.captains || []); break;
        case "pending": res = await getPendingCaptains(); setData(res?.data?.pendingCaptains || []); break;
        case "rides": res = await getRides(); setData(res?.data?.rides || []); break;
        default: setData([]);
      }
    } catch (err) {
      console.error("Data fetch error:", err);
      setError("Failed to fetch data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try { await approveCaptain(id); fetchData("pending"); fetchOverview(); } 
    catch(err){ console.error(err); setError("Failed to approve captain"); }
  };

  const handleReject = async (id) => {
    try { await rejectCaptain(id); fetchData("pending"); fetchOverview(); } 
    catch(err){ console.error(err); setError("Failed to reject captain"); }
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Admin Dashboard</Typography>
        <Button variant="contained" color="error" onClick={logout}>Logout</Button>
      </Box>

      <Box mb={2} display="flex" gap={1}>
        <Button variant="outlined" onClick={() => fetchData("users")}>Users ({overview.users})</Button>
        <Button variant="outlined" onClick={() => fetchData("riders")}>Riders ({overview.riders})</Button>
        <Button variant="outlined" onClick={() => fetchData("captains")}>Approved Captains ({overview.captains})</Button>
        <Button variant="outlined" onClick={() => fetchData("pending")}>Pending Captains ({overview.pendingCaptains})</Button>
        <Button variant="outlined" onClick={() => fetchData("rides")}>Rides ({overview.rides})</Button>
      </Box>

      {loading && <CircularProgress />}
      {error && <Typography color="error">{error}</Typography>}

      {!loading && data.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><PersonIcon /> Name</TableCell>
              <TableCell><EmailIcon /> Email</TableCell>
              <TableCell><PhoneIcon /> Mobile</TableCell>
              <TableCell><VerifiedUserIcon /> Role</TableCell>
              <TableCell><CheckCircleIcon /> Approval</TableCell>
              {activeTab === "pending" && <TableCell>Actions</TableCell>}
              {activeTab === "rides" && (
                <>
                  <TableCell><LocationOnIcon /> Pickup</TableCell>
                  <TableCell><LocationOnIcon /> Drop</TableCell>
                  <TableCell><DirectionsCarIcon /> Status</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(item => (
              <TableRow key={item._id}>
                <TableCell>{item.fullName || "-"}</TableCell>
                <TableCell>{item.email || "-"}</TableCell>
                <TableCell>{item.mobile || "-"}</TableCell>
                <TableCell>{item.role || "-"}</TableCell>
                <TableCell>
                  {item.approvalStatus === "approved" ? <CheckCircleIcon color="success" /> :
                   item.approvalStatus === "rejected" ? <CancelIcon color="error" /> : "-"}
                </TableCell>
                {activeTab === "pending" && (
                  <TableCell>
                    <Button size="small" color="success" startIcon={<ThumbUpIcon />} onClick={() => handleApprove(item._id)}>Approve</Button>
                    <Button size="small" color="error" startIcon={<ThumbDownIcon />} onClick={() => handleReject(item._id)}>Reject</Button>
                  </TableCell>
                )}
                {activeTab === "rides" && (
                  <>
                    <TableCell>{item.pickup || "-"}</TableCell>
                    <TableCell>{item.drop || "-"}</TableCell>
                    <TableCell>{item.status || "-"}</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && data.length === 0 && <Typography>No data found</Typography>}
    </Box>
  );
}
