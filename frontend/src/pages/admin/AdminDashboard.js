import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  getPaymentsSummary,
  getAdminBankDetails,
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
    paymentsTotal: 0,
    paymentsAdmin: 0,
    paymentsRider: 0,
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminBank, setAdminBank] = useState(null);

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

      try {
        const bankRes = await getAdminBankDetails();
        setAdminBank(bankRes?.data?.bankDetails || null);
      } catch (e) {
        // silently ignore bank fetch error for overview
        setAdminBank(null);
      }
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
        case "payments":
          res = await getPaymentsSummary();
          setOverview((prev) => ({
            ...prev,
            paymentsTotal: res?.data?.data?.totalAmount || 0,
            paymentsAdmin: res?.data?.data?.adminAmount || 0,
            paymentsRider: res?.data?.data?.riderAmount || 0,
          }));
          break;
        case "sos":
          res = await getSOSAlerts();
          break;
        default:
          res = { data: { data: [] } };
      }
      // Payments summary returns {data: {items}}
      setData(res?.data?.data?.items || res?.data?.data || []);
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
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            Need to update bank details? <Link to="/admin/bank">Go to Admin Bank Settings</Link>
          </Typography>
        </Box>
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
            <Tab label="Payments" value="payments" />
            <Tab label="SOS Alerts" value="sos" />
          </Tabs>
        </Paper>

        {/* Overview */}
        {activeTab === "overview" && (
          <Box>
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

            {/* Admin Bank Details */}
            <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3, mt: 4 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Admin Bank Details</Typography>
              {adminBank ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}><Typography variant="body2" sx={{ fontWeight: 600 }}>Account Holder</Typography><Typography>{adminBank.holderName || '-'}</Typography></Grid>
                  <Grid item xs={12} sm={6} md={4}><Typography variant="body2" sx={{ fontWeight: 600 }}>Bank Name</Typography><Typography>{adminBank.bankName || '-'}</Typography></Grid>
                  <Grid item xs={12} sm={6} md={4}><Typography variant="body2" sx={{ fontWeight: 600 }}>Account Number</Typography><Typography>{adminBank.accountNumber || '-'}</Typography></Grid>
                  <Grid item xs={12} sm={6} md={4}><Typography variant="body2" sx={{ fontWeight: 600 }}>IFSC</Typography><Typography>{adminBank.ifsc || '-'}</Typography></Grid>
                  <Grid item xs={12} sm={6} md={4}><Typography variant="body2" sx={{ fontWeight: 600 }}>UPI VPA</Typography><Typography>{adminBank.upiVpa || '-'}</Typography></Grid>
                  <Grid item xs={12} md={4}>
                    <Button variant="outlined" onClick={() => (window.location.href = "/admin/bank")}>Edit Bank Details</Button>
                  </Grid>
                </Grid>
              ) : (
                <Box>
                  <Typography sx={{ mb: 1 }}>No bank details saved.</Typography>
                  <Button variant="contained" onClick={() => (window.location.href = "/admin/bank")}>Add Bank Details</Button>
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* Payments Summary */}
        {activeTab === "payments" && (
          <Box>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Total Amount</Typography>
                  <Typography variant="h6">₹{Number(overview.paymentsTotal || 0).toFixed(2)}</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Admin Share (10%)</Typography>
                  <Typography variant="h6">₹{Number(overview.paymentsAdmin || 0).toFixed(2)}</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle2">Rider Share (90%)</Typography>
                  <Typography variant="h6">₹{Number(overview.paymentsRider || 0).toFixed(2)}</Typography>
                </Card>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Recent Payments</Typography>
              <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ride ID</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Admin (10%)</TableCell>
                  <TableCell align="right">Rider (90%)</TableCell>
                  <TableCell>Rider Name</TableCell>
                  <TableCell>Rider Email</TableCell>
                  <TableCell>Rider Mobile</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{p.rideId}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell align="right">₹{Number(p.amount || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">₹{Number(p.adminShare || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">₹{Number(p.riderShare || 0).toFixed(2)}</TableCell>
                    <TableCell>{p.riderName || '-'}</TableCell>
                    <TableCell>{p.riderEmail || '-'}</TableCell>
                    <TableCell>{p.riderMobile || '-'}</TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

        {/* Loading/Error */}
        {loading && <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>}
        {error && <Typography color="error" textAlign="center" mt={2}>{error}</Typography>}

        {/* Data Tables */}
        {!loading && data.length > 0 && activeTab !== "overview" && activeTab !== "sos" && activeTab !== "payments" && (
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3, mt: 4, overflowX: "auto" }}>
            <Typography variant="h6" mb={2} fontWeight="bold">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Details</Typography>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#ecf0f1" }}>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mobile</TableCell>
                  {activeTab !== "rides" && <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>}
                  
                  {/* Additional rider signup fields */}
                  {(activeTab === "riders" || activeTab === "captains" || activeTab === "pending") && (
                    <>
                      <TableCell sx={{ fontWeight: 600 }}>Gender</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Language</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Emergency Contact</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Vehicle Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Vehicle Number</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Profile Picture</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Vehicle Image</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </>
                  )}
                  
                  {(activeTab === "captains" || activeTab === "pending") && <TableCell sx={{ fontWeight: 600 }}>Documents</TableCell>}
                  {activeTab === "pending" && <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Actions</TableCell>}
                  {activeTab === "rides" && <>
                    <TableCell sx={{ fontWeight: 600 }}>Pickup</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Drop</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </>}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item._id} hover sx={{ "&:nth-of-type(odd)": { bgcolor: "#fafafa" } }}>
                    <TableCell>{activeTab === "rides" ? (item.riderId?.fullName || "-") : (item.fullName || "-")}</TableCell>
                    <TableCell>{activeTab === "rides" ? (item.riderId?.email || "-") : (item.email || "-")}</TableCell>
                    <TableCell>{activeTab === "rides" ? (item.riderId?.mobile || "-") : (item.mobile || "-")}</TableCell>
                    {activeTab !== "rides" && (
                      <TableCell>{item.role || "-"}</TableCell>
                    )}

                    {/* Additional rider signup fields */}
                    {(activeTab === "riders" || activeTab === "captains" || activeTab === "pending") && (
                      <>
                        <TableCell>{item.gender || "-"}</TableCell>
                        <TableCell>
                          {(() => {
                            const list = Array.isArray(item.preferredLanguages)
                              ? item.preferredLanguages.filter(Boolean)
                              : [];
                            if (list.length) return list.join(", ");
                            return item.preferredLanguage || "-";
                          })()}
                        </TableCell>
                        <TableCell>
                           {item.emergencyContactName && item.emergencyContactNumber
                               ? `${item.emergencyContactName} (${item.emergencyContactNumber})`
                               : "-"}
                        </TableCell>

                       <TableCell>{item.address || "-"}</TableCell>
                        <TableCell>{item.vehicleType || "-"}</TableCell>
                        <TableCell>{item.vehicleNumber || "-"}</TableCell>
                        <TableCell>
                          {item.profilePicture ? (
                            <Button 
                              variant="outlined" 
                              size="small" 
                              onClick={() => window.open(item.profilePicture, '_blank')}
                            >
                              View Profile
                            </Button>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {item.vehicleImage ? (
                            <Button 
                              variant="outlined" 
                              size="small" 
                              onClick={() => window.open(item.vehicleImage, '_blank')}
                            >
                              View Vehicle
                            </Button>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Typography 
                            sx={{ 
                              color: item.approvalStatus === 'approved' ? 'green' : 
                                     item.approvalStatus === 'rejected' ? 'red' : 'orange',
                              fontWeight: 'bold'
                            }}
                          >
                            {item.approvalStatus || 'pending'}
                          </Typography>
                        </TableCell>
                      </>
                    )}

                    {(activeTab === "captains" || activeTab === "pending") && (
                      <TableCell>{renderDocumentsCell(item)}</TableCell>
                    )}

                    {activeTab === "pending" && <TableCell align="center">{renderActionsCell(item)}</TableCell>}

                    {activeTab === "rides" && <>
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