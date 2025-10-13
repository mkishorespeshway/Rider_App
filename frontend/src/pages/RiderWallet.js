import React, { useEffect, useState } from "react";
import { Box, Card, CardContent, Typography, Button, Divider, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Chip, List, ListItem, ListItemText } from "@mui/material";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

export default function RiderWallet() {
  const { auth } = useAuth();
  const token = auth?.token;
  const [wallet, setWallet] = useState(null);
  const [txns, setTxns] = useState([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState({ holderName: "", bankName: "", accountNumber: "", ifsc: "" });
  const API_BASE = "http://localhost:5000";

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = async () => {
    try {
      const wRes = await axios.get(`${API_BASE}/api/wallet/me`, { headers });
      setWallet(wRes.data.wallet);
      setBank(wRes.data.wallet?.bankDetails || { holderName: "", bankName: "", accountNumber: "", ifsc: "" });
      const tRes = await axios.get(`${API_BASE}/api/wallet/transactions`, { headers });
      setTxns(tRes.data.transactions || []);
    } catch (err) {
      console.warn("Wallet fetch warning:", err?.message || err);
      // Graceful fallback in dev when backend is offline
      setWallet({ balance: 0, lockedBalance: 0, bankDetails: {} });
      setBank({ holderName: "", bankName: "", accountNumber: "", ifsc: "" });
      setTxns([]);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleWithdraw = async () => {
    try {
      await axios.post(`${API_BASE}/api/wallet/withdraw`, { amount: Number(withdrawAmount) }, { headers });
      setWithdrawOpen(false);
      setWithdrawAmount(0);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Withdrawal failed");
    }
  };

  const saveBank = async () => {
    try {
      await axios.put(`${API_BASE}/api/wallet/bank`, bank, { headers });
      setBankOpen(false);
      await fetchData();
    } catch (err) {
      alert("Failed to save bank details");
    }
  };

  const maskAccount = (acc) => acc ? acc.replace(/.(?=.{4})/g, "*") : "";

  return (
    <Box p={3} maxWidth={800} mx="auto">
      <Typography variant="h5" sx={{ mb: 2 }}>Rapido Wallet</Typography>

      {/* Recharge prompt when overdraft exceeds ₹2000 */}
      {Number(wallet?.balance || 0) < -2000 && (
        <Card sx={{ mb: 2, borderRadius: 3, borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
          <CardContent>
            <Typography variant="subtitle2" color="error">Recharge Required</Typography>
            <Typography variant="body2">
              Your wallet is overdrawn by ₹{Math.abs(Number(wallet?.balance || 0)).toFixed(2)}. Please recharge to continue.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Wallet Balance</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>₹{(Number(wallet?.balance || 0)).toFixed(2)}</Typography>
            </Box>
            <Box textAlign="right">
              {(() => {
                const bal = Number(wallet?.balance || 0);
                if (bal < -2000) return <Chip label="Recharge Required" size="small" color="error" />;
                if (bal < 0) return <Chip label="Negative Balance" size="small" color="warning" />;
                if (bal < 50) return <Chip label="Low Balance" size="small" color="warning" />;
                return null;
              })()}
              <Typography variant="caption" display="block" color="text.secondary">Locked: ₹{wallet?.lockedBalance?.toFixed(2) || "0.00"}</Typography>
            </Box>
          </Box>
          <Box mt={2} display="flex" gap={2}>
            <Button variant="contained" sx={{ bgcolor: "black" }} onClick={() => setWithdrawOpen(true)}>Withdraw</Button>
            <Button variant="outlined" onClick={() => setBankOpen(true)}>Bank details</Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Registered Bank</Typography>
          {wallet?.bankDetails?.accountNumber ? (
            <>
              <Typography>Holder: {wallet?.bankDetails?.holderName}</Typography>
              <Typography>Bank: {wallet?.bankDetails?.bankName}</Typography>
              <Typography>Account: {maskAccount(wallet?.bankDetails?.accountNumber)}</Typography>
              <Typography>IFSC: {wallet?.bankDetails?.ifsc}</Typography>
            </>
          ) : (
            <Typography color="text.secondary">No bank linked. Add details to withdraw earnings.</Typography>
          )}
          <Box mt={2}>
            <Button variant="text" onClick={() => setBankOpen(true)}>Edit / Add Bank</Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Recent Transactions</Typography>
          <Divider sx={{ mb: 1 }} />
          <List>
            {txns.length === 0 && <Typography color="text.secondary">No transactions yet</Typography>}
            {txns.map((t) => {
              const label = (() => {
                const desc = (t.description || "").toLowerCase();
                if (desc.includes("cash")) return "Cash";
                if (desc.includes("online")) return "Online";
                if (t.type === "withdraw_lock") return "Withdraw";
                return "Wallet";
              })();
              const color = label === "Cash" ? "default" : label === "Online" ? "success" : label === "Withdraw" ? "warning" : "primary";
              return (
                <ListItem key={t._id} sx={{ py: 0.75 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t.type.replace(/_/g, " ").toUpperCase()} • ₹{t.amount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.description || ""}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}
                      </Typography>
                    </Box>
                    <Chip label={label} color={color} size="small" />
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onClose={() => setWithdrawOpen(false)}>
        <DialogTitle>Withdraw Earnings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Enter amount to withdraw to your registered bank account.
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Amount (₹)"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawOpen(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: "black" }} onClick={handleWithdraw}>Request Withdraw</Button>
        </DialogActions>
      </Dialog>

      {/* Bank Details Dialog */}
      <Dialog open={bankOpen} onClose={() => setBankOpen(false)}>
        <DialogTitle>Bank Details</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Account Holder" sx={{ mt: 1 }} value={bank.holderName} onChange={(e) => setBank({ ...bank, holderName: e.target.value })} />
          <TextField fullWidth label="Bank Name" sx={{ mt: 2 }} value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} />
          <TextField fullWidth label="Account Number" sx={{ mt: 2 }} value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} />
          <TextField fullWidth label="IFSC" sx={{ mt: 2 }} value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBankOpen(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: "black" }} onClick={saveBank}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}