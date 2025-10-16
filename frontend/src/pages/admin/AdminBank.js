import React, { useEffect, useState } from "react";
import { Container, Paper, Typography, TextField, Button, Box, Alert } from "@mui/material";
import { getAdminBankDetails, updateAdminBankDetails } from "../../services/api";

export default function AdminBank() {
  const [bank, setBank] = useState({ holderName: "", bankName: "", accountNumber: "", ifsc: "", upiVpa: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchBank = async () => {
      try {
        const res = await getAdminBankDetails();
        setBank(res?.data?.bankDetails || { holderName: "", bankName: "", accountNumber: "", ifsc: "", upiVpa: "" });
      } catch (err) {
        setMessage({ type: "warning", text: "Unable to load admin bank details." });
      }
    };
    fetchBank();
  }, []);

  const save = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await updateAdminBankDetails(bank);
      setMessage({ type: "success", text: "Bank details saved." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save bank details." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Admin Bank Settings</Typography>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>
        )}
        <Box display="grid" gap={2}>
          <TextField label="Account Holder Name" value={bank.holderName} onChange={(e) => setBank({ ...bank, holderName: e.target.value })} fullWidth />
          <TextField label="Bank Name" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} fullWidth />
          <TextField label="Account Number" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} fullWidth />
          <TextField label="IFSC" value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value })} fullWidth />
          <TextField label="UPI VPA (for UPI receipts/payouts)" value={bank.upiVpa} onChange={(e) => setBank({ ...bank, upiVpa: e.target.value })} fullWidth />
        </Box>
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" } }} disabled={loading} onClick={save}>
            Save Bank Details
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}