import React, { useEffect, useState } from "react";
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, CircularProgress, Alert, Tabs, Tab,
} from "@mui/material";
import { Person, DirectionsCar, People, PendingActions, LocalTaxi } from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const overviewIcons = {
  users: { icon: <Person fontSize="large" />, color: "#3f51b5" },
  riders: { icon: <People fontSize="large" />, color: "#4caf50" },
  captains: { icon: <DirectionsCar fontSize="large" />, color: "#ff9800" },
  pendingCaptains: { icon: <PendingActions fontSize="large" />, color: "#f44336" },
  rides: { icon: <LocalTaxi fontSize="large" />, color: "#9c27b0" },
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [pendingCaptains, setPendingCaptains] = useState([]);
  const [rides, setRides] = useState([]);
  const [overview, setOverview] = useState({ users:0, riders:0, captains:0, pendingCaptains:0, rides:0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const navigate = useNavigate();

  const token = localStorage.getItem("adminToken"); // ✅ admin JWT token
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [overviewRes, usersRes, captainsRes, pendingRes, ridesRes] = await Promise.all([
        axios.get(`${API}/api/admin/overview`, { headers }),
        axios.get(`${API}/api/admin/users`, { headers }),
        axios.get(`${API}/api/admin/captains`, { headers }),
        axios.get(`${API}/api/admin/pending-captains`, { headers }),
        axios.get(`${API}/api/admin/rides`, { headers }),
      ]);
      setOverview(overviewRes.data);
      setUsers(usersRes.data.users);
      setCaptains(captainsRes.data.captains);
      setPendingCaptains(pendingRes.data.pendingCaptains);
      setRides(ridesRes.data.rides);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch data");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id) => {
    try {
      await axios.post(`${API}/api/admin/captain/${id}/approve`, {}, { headers });
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to approve");
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.post(`${API}/api/admin/captain/${id}/reject`, {}, { headers });
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to reject");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken"); // ✅ clear token
    navigate("/admin", { replace: true });
  };

  const formatLabel = (key) => key.replace(/([A-Z])/g, " $1").trim().replace(/^./, s=>s.toUpperCase());

  return (
    <Box p={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Rider App - Admin Dashboard</Typography>
        <Button variant="contained" color="error" onClick={handleLogout}>Logout</Button>
      </Box>

      <Tabs value={tab} onChange={(e,val)=>setTab(val)} sx={{mb:3}}>
        <Tab label="Overview" value="overview" />
        <Tab label="Users" value="users" />
        <Tab label="Captains" value="captains" />
        <Tab label="Pending Captains" value="pending" />
        <Tab label="Rides" value="rides" />
      </Tabs>

      {loading && <Box display="flex" justifyContent="center" my={2}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}

      {/* Overview */}
      {tab==="overview" && (
        <Box display="flex" flexWrap="wrap" justifyContent="center" gap={3} mt={2}>
          {Object.entries(overview).map(([key, value])=>(
            <Card key={key} sx={{ flex:"1 1 180px", textAlign:"center", py:3, px:2, minWidth:150, maxWidth:220, boxShadow:3, borderRadius:2 }}>
              <Box display="flex" justifyContent="center" alignItems="center" mb={1} color={overviewIcons[key]?.color}>{overviewIcons[key]?.icon}</Box>
              <Typography variant="subtitle1" color="textSecondary" gutterBottom>{formatLabel(key)}</Typography>
              <Typography variant="h4" fontWeight="bold">{value}</Typography>
            </Card>
          ))}
        </Box>
      )}

      {/* Users */}
      {tab==="users" && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Full Name</TableCell><TableCell>Email</TableCell>
                <TableCell>Mobile</TableCell><TableCell>Role</TableCell><TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length>0 ? users.map(u=>(
                <TableRow key={u._id}>
                  <TableCell>{u.fullName}</TableCell><TableCell>{u.email}</TableCell>
                  <TableCell>{u.mobile}</TableCell><TableCell>{u.role}</TableCell>
                  <TableCell>{u.approvalStatus||"-"}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={5} align="center">No users found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Captains */}
      {tab==="captains" && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell><TableCell>Email</TableCell>
                <TableCell>Documents</TableCell><TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {captains.length>0 ? captains.map(c=>(
                <TableRow key={c._id}>
                  <TableCell>{c.fullName}</TableCell><TableCell>{c.email}</TableCell>
                  <TableCell>{c.documents?.length>0 ? c.documents.map((d,i)=>(<Box key={i}><a href={d.file} target="_blank">{d.type}</a></Box>)) : "-"}</TableCell>
                  <TableCell>{c.approvalStatus}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={4} align="center">No captains found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pending Captains */}
      {tab==="pending" && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingCaptains.length>0 ? pendingCaptains.map(p=>(
                <TableRow key={p._id}>
                  <TableCell>{p.fullName}</TableCell><TableCell>{p.email}</TableCell>
                  <TableCell>{p.approvalStatus}</TableCell>
                  <TableCell>
                    <Button variant="contained" color="success" sx={{mr:1}} onClick={()=>handleApprove(p._id)}>Approve</Button>
                    <Button variant="contained" color="error" onClick={()=>handleReject(p._id)}>Reject</Button>
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={4} align="center">No pending captains</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rides */}
      {tab==="rides" && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rider</TableCell><TableCell>Captain</TableCell>
                <TableCell>Pickup</TableCell><TableCell>Drop</TableCell>
                <TableCell>Fare</TableCell><TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rides.length>0 ? rides.map(r=>(
                <TableRow key={r._id}>
                  <TableCell>{r.riderId?.fullName||"-"}</TableCell>
                  <TableCell>{r.captainId?.fullName||"-"}</TableCell>
                  <TableCell>{r.pickup}</TableCell>
                  <TableCell>{r.drop}</TableCell>
                  <TableCell>{r.fare||"-"}</TableCell>
                  <TableCell>{r.status}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={6} align="center">No rides found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

    </Box>
  );
}
