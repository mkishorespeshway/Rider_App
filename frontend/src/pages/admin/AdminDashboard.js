// src/pages/admin/AdminDashboard.js
import React, { useEffect, useState } from "react";
import {
  getOverview,
  getUsers,
  getApprovedCaptains,
  getPendingCaptains,
  getRides,
  approveCaptain,
  rejectCaptain,
  getRiders,
} from "../../services/adminApi";
import { useAuth } from "../../contexts/AuthContext";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Button,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Grid,
  Paper,
  Tabs,
  Tab,
  Stack,
  Link,
} from "@mui/material";

// Icons
import GroupsIcon from "@mui/icons-material/Groups";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import CommuteIcon from "@mui/icons-material/Commute";
import PersonIcon from "@mui/icons-material/Person";

export default function AdminDashboard() {
  const { logout } = useAuth();

  const [overview, setOverview] = useState({
    users: 0,
    captains: 0,
    pendingCaptains: 0,
    rides: 0,
    riders: 0,
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchOverview = async () => {
    try {
      const res = await getOverview();
      setOverview(res.data.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load overview");
    }
  };

  const fetchData = async (type) => {
    setActiveTab(type);
    setLoading(true);
    setError("");
    try {
      let res;
      switch (type) {
        case "users":
          res = await getUsers();
          break;
        case "captains":
          res = await getApprovedCaptains();
          break;
        case "pending":
          res = await getPendingCaptains();
          break;
        case "rides":
          res = await getRides();
          break;
        case "riders":
          res = await getRiders();
          break;
        default:
          res = { data: { data: [] } };
      }
      setData(res?.data?.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveCaptain(id);
      fetchData("pending");
      fetchOverview();
    } catch (err) {
      console.error(err);
      setError("Failed to approve captain");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectCaptain(id);
      fetchData("pending");
      fetchOverview();
    } catch (err) {
      console.error(err);
      setError("Failed to reject captain");
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Dashboard cards with unique colors
  const cards = [
    { label: "Users", value: overview.users, icon: <GroupsIcon />, type: "users", color: "#3498db" },
    { label: "Riders", value: overview.riders, icon: <PersonIcon />, type: "riders", color: "#1abc9c" },
    { label: "Approved Captains", value: overview.captains, icon: <VerifiedUserIcon />, type: "captains", color: "#2ecc71" },
    { label: "Pending Captains", value: overview.pendingCaptains, icon: <HourglassTopIcon />, type: "pending", color: "#e67e22" },
    { label: "Rides", value: overview.rides, icon: <CommuteIcon />, type: "rides", color: "#9b59b6" },
  ];

  return (
    <Box sx={{ flexGrow: 1, bgcolor: "#f4f6f8", minHeight: "100vh" }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: "#34495e", mb: 4 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight="bold">
            Admin Dashboard
          </Typography>
          <Button variant="contained" color="error" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box maxWidth="1300px" mx="auto" px={3} pb={5}>
        {/* Tabs */}
        <Paper elevation={3} sx={{ borderRadius: 3, mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => {
              setData([]);
              if (val === "overview") fetchOverview();
              else fetchData(val);
              setActiveTab(val);
            }}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            sx={{ "& .MuiTab-root": { fontWeight: 600, fontSize: "14px" } }}
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Users" value="users" />
            <Tab label="Riders" value="riders" />
            <Tab label="Approved Captains" value="captains" />
            <Tab label="Pending Captains" value="pending" />
            <Tab label="Rides" value="rides" />
          </Tabs>
        </Paper>

        {/* Overview Cards */}
        {activeTab === "overview" && (
          <Grid container spacing={3}>
            {cards.map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.label}>
                <Card
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    borderRadius: 3,
                    boxShadow: 3,
                    transition: "0.3s",
                    "&:hover": { boxShadow: 6, transform: "translateY(-5px)" },
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" color={card.color}>
                      {card.label}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color={card.color}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ fontSize: 50, color: card.color }}>{card.icon}</Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Loading/Error */}
        {loading && (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color="error" textAlign="center" mt={2}>
            {error}
          </Typography>
        )}

        {/* Data Tables */}
        {!loading && data.length > 0 && activeTab !== "overview" && (
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3, mt: 4, overflowX: "auto" }}>
            <Typography variant="h6" mb={2} fontWeight="bold">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Details
            </Typography>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#ecf0f1" }}>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mobile</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  {(activeTab === "captains" || activeTab === "pending") && <TableCell sx={{ fontWeight: 600 }}>Documents</TableCell>}
                  {activeTab === "pending" && <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Actions</TableCell>}
                  {activeTab === "rides" && (
                    <>
                      <TableCell sx={{ fontWeight: 600 }}>Rider</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Captain</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Pickup</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Drop</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item._id} hover sx={{ "&:nth-of-type(odd)": { bgcolor: "#fafafa" } }}>
                    <TableCell>{item.fullName || "-"}</TableCell>
                    <TableCell>{item.email || "-"}</TableCell>
                    <TableCell>{item.mobile || "-"}</TableCell>
                    <TableCell>{item.role || "-"}</TableCell>

                    {(activeTab === "captains" || activeTab === "pending") && (
                      <TableCell>
                        {item.documents?.length > 0 ? (
                          item.documents.map((doc, idx) => (
                            <Box key={idx}>
                              <Link href={doc.url} target="_blank" rel="noopener">
                                {doc.name || `Document ${idx + 1}`}
                              </Link>
                            </Box>
                          ))
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    )}

                    {activeTab === "pending" && (
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Button size="small" color="success" variant="outlined" onClick={() => handleApprove(item._id)}>
                            Approve
                          </Button>
                          <Button size="small" color="error" variant="outlined" onClick={() => handleReject(item._id)}>
                            Reject
                          </Button>
                        </Stack>
                      </TableCell>
                    )}

                    {activeTab === "rides" && (
                      <>
                        <TableCell>{item.riderId?.fullName || "-"}</TableCell>
                        <TableCell>{item.captainId?.fullName || "-"}</TableCell>
                        <TableCell>{item.pickup || "-"}</TableCell>
                        <TableCell>{item.drop || "-"}</TableCell>
                        <TableCell>{item.status || "-"}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {!loading && data.length === 0 && activeTab !== "overview" && (
          <Typography textAlign="center" mt={3}>
            No data found
          </Typography>
        )}
      </Box>
    </Box>
  );
}
