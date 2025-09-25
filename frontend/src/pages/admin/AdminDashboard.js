import React, { useEffect, useState } from "react";
import {
  getOverview,
  getAllUsers,
  getAllRiders,
  getCaptains,
  getPendingCaptains,
  getAllRides,
  approveRider,
  rejectRider,
  getSOSAlerts,
  resolveSOS,
} from "../../services/api";
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
  Grid,
  Paper,
  Tabs,
  Tab,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";

import GroupsIcon from "@mui/icons-material/Groups";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import CommuteIcon from "@mui/icons-material/Commute";
import PersonIcon from "@mui/icons-material/Person";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

export default function AdminDashboard() {
  const { logout } = useAuth();

  const [overview, setOverview] = useState({
    users: 0,
    captains: 0,
    pendingCaptains: 0,
    rides: 0,
    riders: 0,
    sos: 0,
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openDocsModal, setOpenDocsModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState({});
  const [selectedRiderName, setSelectedRiderName] = useState("");
  const [docTab, setDocTab] = useState(0); // ✅ added state for tab

  const documentLabels = {
    aadharFront: "Aadhar Front",
    aadharBack: "Aadhar Back",
    license: "License",
    panCard: "PAN Card",
    rc: "RC",
  };

  const fetchOverview = async () => {
    try {
      const res = await getOverview();
      setOverview(res.data.data);

      const sosRes = await getSOSAlerts();
      setOverview((prev) => ({
        ...prev,
        sos: sosRes.data?.data?.filter((s) => s.status === "active").length || 0,
      }));
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
          res = await getAllUsers();
          break;
        case "riders":
          res = await getAllRiders();
          break;
        case "captains":
          res = await getCaptains();
          break;
        case "pending":
          res = await getPendingCaptains();
          break;
        case "rides":
          res = await getAllRides();
          break;
        case "sos":
          res = await getSOSAlerts();
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
      await approveRider(id);
      fetchData("pending");
      fetchOverview();
    } catch (err) {
      console.error(err);
      setError("Failed to approve rider");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectRider(id);
      fetchData("pending");
      fetchOverview();
    } catch (err) {
      console.error(err);
      setError("Failed to reject rider");
    }
  };

  const handleResolveSOS = async (id) => {
    try {
      await resolveSOS(id);
      fetchData("sos");
      fetchOverview();
    } catch (err) {
      console.error(err);
      setError("Failed to resolve SOS");
    }
  };

  const handleViewDocuments = (item) => {
    setSelectedDocuments(item.documents || {});
    setSelectedRiderName(item.fullName || "");
    setDocTab(0); // ✅ reset to first tab on open
    setOpenDocsModal(true);
  };

  const handleCloseDocuments = () => {
    setOpenDocsModal(false);
    setSelectedDocuments({});
    setSelectedRiderName("");
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const cards = [
    { label: "Users", value: overview.users, icon: <GroupsIcon />, type: "users", color: "#3498db" },
    { label: "Riders", value: overview.riders, icon: <PersonIcon />, type: "riders", color: "#1abc9c" },
    { label: "Approved Captains", value: overview.captains, icon: <VerifiedUserIcon />, type: "captains", color: "#2ecc71" },
    { label: "Pending Captains", value: overview.pendingCaptains, icon: <HourglassTopIcon />, type: "pending", color: "#e67e22" },
    { label: "Rides", value: overview.rides, icon: <CommuteIcon />, type: "rides", color: "#9b59b6" },
    { label: "SOS Alerts", value: overview.sos, icon: <WarningAmberIcon />, type: "sos", color: "#e74c3c" },
  ];

  const renderDocumentsCell = (item) => {
    const documents = item?.documents || {};
    if (!documents || Object.keys(documents).length === 0) return "-";
    return (
      <Button variant="outlined" size="small" onClick={() => handleViewDocuments(item)}>
        View Documents
      </Button>
    );
  };

  const renderActionsCell = (item) => (
    <Stack direction="row" spacing={1} justifyContent="center">
      <Button size="small" color="success" variant="outlined" onClick={() => handleApprove(item._id)}>
        Approve
      </Button>
      <Button size="small" color="error" variant="outlined" onClick={() => handleReject(item._id)}>
        Reject
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ flexGrow: 1, bgcolor: "#f4f6f8", minHeight: "100vh" }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: "#34495e", mb: 4 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight="bold">Admin Dashboard</Typography>
          <Button variant="contained" color="error" onClick={logout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Box maxWidth="1300px" mx="auto" px={3} pb={5}>
        {/* Tabs */}
        <Paper elevation={3} sx={{ borderRadius: 3, mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => {
              setData([]);
              val === "overview" ? fetchOverview() : fetchData(val);
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
            <Tab label="SOS Alerts" value="sos" />
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
                  onClick={() => card.type !== "overview" && fetchData(card.type)}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" color={card.color}>{card.label}</Typography>
                    <Typography variant="h4" fontWeight="bold" color={card.color}>{card.value}</Typography>
                  </Box>
                  <Box sx={{ fontSize: 50, color: card.color }}>{card.icon}</Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Loading/Error */}
        {loading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}
        {error && <Typography color="error" textAlign="center" mt={2}>{error}</Typography>}

        {/* Data Tables */}
        {!loading && data.length > 0 && activeTab !== "overview" && activeTab !== "sos" && (
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3, mt: 4, overflowX: "auto" }}>
            <Typography variant="h6" mb={2} fontWeight="bold">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Details</Typography>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#ecf0f1" }}>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mobile</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  {(activeTab === "captains" || activeTab === "pending") && <TableCell sx={{ fontWeight: 600 }}>Documents</TableCell>}
                  {activeTab === "pending" && <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Actions</TableCell>}
                  {activeTab === "rides" && <>
                    <TableCell sx={{ fontWeight: 600 }}>Rider</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Captain</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Pickup</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Drop</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </>}
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
                      <TableCell>{renderDocumentsCell(item)}</TableCell>
                    )}

                    {activeTab === "pending" && <TableCell align="center">{renderActionsCell(item)}</TableCell>}

                    {activeTab === "rides" && <>
                      <TableCell>{item.riderId?.fullName || "-"}</TableCell>
                      <TableCell>{item.captainId?.fullName || "-"}</TableCell>
                      <TableCell>{item.pickup || "-"}</TableCell>
                      <TableCell>{item.drop || "-"}</TableCell>
                      <TableCell>{item.status || "-"}</TableCell>
                    </>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Documents Modal with Tabs */}
        <Dialog open={openDocsModal} onClose={handleCloseDocuments} maxWidth="md" fullWidth>
          <DialogTitle>Documents - {selectedRiderName}</DialogTitle>
          <DialogContent>
            {selectedDocuments && Object.keys(selectedDocuments).length > 0 ? (
              <>
                {/* Tabs */}
                <Tabs
                  value={docTab}
                  onChange={(e, val) => setDocTab(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
                >
                  {Object.keys(selectedDocuments).map((key, idx) => (
                    <Tab key={key} label={documentLabels[key] || key} />
                  ))}
                </Tabs>

                {/* Document Viewer */}
                {Object.keys(selectedDocuments).map((key, idx) => {
                  const doc = selectedDocuments[key];
                  if (idx !== docTab) return null;
                  if (!doc?.url) return <Typography>No {documentLabels[key] || key} uploaded.</Typography>;

                  const isImage = doc.mimetype?.startsWith("image/");
                  const isPdf = doc.mimetype === "application/pdf";

                  return (
                    <Box key={key} sx={{ textAlign: "center" }}>
                      <Typography fontWeight="bold" sx={{ mb: 1 }}>
                        {documentLabels[key] || key}
                      </Typography>

                      {isImage && (
                        <img
                          src={doc.url}
                          alt={key}
                          style={{ maxWidth: "100%", maxHeight: "500px", borderRadius: "8px" }}
                        />
                      )}

                      {isPdf && (
                        <iframe
                          src={doc.url}
                          title={key}
                          width="100%"
                          height="500px"
                          style={{ border: "1px solid #ccc", borderRadius: "8px" }}
                        />
                      )}

                      {!isImage && !isPdf && (
                        <Button href={doc.url} target="_blank" rel="noopener noreferrer" variant="outlined">
                          Download {documentLabels[key] || key}
                        </Button>
                      )}
                    </Box>
                  );
                })}
              </>
            ) : (
              <Typography>No documents uploaded.</Typography>
            )}
          </DialogContent>
        </Dialog>

        {/* SOS Alerts Table */}
        {activeTab === "sos" && !loading && (
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3, mt: 4, overflowX: "auto" }}>
            <Typography variant="h6" mb={2} fontWeight="bold">SOS Alerts</Typography>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#ecf0f1" }}>
                  <TableCell>User/Rider</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((sos) => (
                  <TableRow key={sos._id} hover>
                    <TableCell>{sos.userId?.fullName || "-"}</TableCell>
                    <TableCell>{sos.role}</TableCell>
                    <TableCell>{new Date(sos.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{sos.status}</TableCell>
                    <TableCell>
                      {sos.status === "active" && (
                        <Button size="small" color="success" variant="outlined" onClick={() => handleResolveSOS(sos._id)}>Resolve</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {!loading && data.length === 0 && activeTab !== "overview" && (
          <Typography textAlign="center" mt={3}>No data found</Typography>
        )}
      </Box>
    </Box>
  );
}
