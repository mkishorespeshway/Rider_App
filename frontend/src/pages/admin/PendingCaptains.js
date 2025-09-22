import React, { useEffect, useState } from "react"; 
import {
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  Button,
  CircularProgress,
  Box,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { getPendingCaptains, approveRider, rejectRider } from "../../services/api";

export default function PendingCaptains() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);

  const fetchPending = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await getPendingCaptains();
      setPending(res.data?.pendingCaptains || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to load pending riders" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this rider? OTP will be generated automatically.")) return;
    try {
      setLoading(true);
      const res = await approveRider(id);
      setMessage({ type: "success", text: res.data?.message || "Approved successfully" });
      setPending((p) => p.filter((r) => r._id !== id));
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to approve" });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Reject this rider? This cannot be undone.")) return;
    try {
      setLoading(true);
      const res = await rejectRider(id);
      setMessage({ type: "success", text: res.data?.message || "Rejected successfully" });
      setPending((p) => p.filter((r) => r._id !== id));
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to reject" });
    } finally {
      setLoading(false);
    }
  };

  const openDocs = (docs = []) => {
    setSelectedDocs(docs);
    setDocDialogOpen(true);
  };

  const API_URL = process.env.REACT_APP_API_URL || "";

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Pending Riders / Captains
      </Typography>

      {message.text && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Documents</TableCell>
                <TableCell>Registered At</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : pending.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    No pending riders.
                  </TableCell>
                </TableRow>
              ) : (
                pending.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>{r.fullName}</TableCell>
                    <TableCell>{r.mobile}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>
                      {r.documents?.length ? (
                        <IconButton size="small" onClick={() => openDocs(r.documents)}>
                          <VisibilityIcon />
                        </IconButton>
                      ) : (
                        "No docs"
                      )}
                    </TableCell>
                    <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        size="small"
                        sx={{ mr: 1 }}
                        onClick={() => handleApprove(r._id)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleReject(r._id)}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={docDialogOpen} onClose={() => setDocDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Documents</DialogTitle>
        <DialogContent dividers>
          {selectedDocs.length === 0 && <Typography>No documents uploaded.</Typography>}
          {selectedDocs.map((d, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Typography variant="subtitle2">{d.filename || `doc-${i + 1}`}</Typography>
              <a href={`${API_URL}${d.path}`} target="_blank" rel="noopener noreferrer">
                View / Download
              </a>
            </Box>
          ))}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
