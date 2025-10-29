import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, Avatar, Grid, Chip, Button } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { getRiderStatus } from "../services/api";

export default function Profile() {
  const { auth, logout } = useAuth();
  const role = (auth?.roles || [])[0] || (auth?.user?.role || "");
  const baseUser = auth?.user || {};
  const [riderInfo, setRiderInfo] = useState(null);
  const [loading, setLoading] = useState(role === "rider");

  useEffect(() => {
    if (role === "rider") {
      (async () => {
        try {
          const res = await getRiderStatus();
          const data = res?.data?.rider || res?.data?.data || res?.data || {};
          setRiderInfo(data);
        } catch (e) {
          // non-blocking
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [role]);

  const user = role === "rider" ? { ...baseUser, ...riderInfo } : baseUser;

  const displayName = user.fullName || user.name || "";
  const mobile = user.mobile || user.phone || "";
  const email = user.email || "";
  const avatar = user.profilePicture || user.avatarUrl || null;

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar src={avatar || undefined} sx={{ width: 64, height: 64, mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>{displayName || "Profile"}</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip label={(role || "user").toUpperCase()} size="small" />
            </Box>
          </Box>
          <Button variant="outlined" color="error" onClick={logout}>Logout</Button>
        </Box>

        {loading ? (
          <Typography>Loading rider profile…</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography><b>Mobile:</b> {mobile || "—"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography><b>Email:</b> {email || "—"}</Typography>
            </Grid>

            {role === "rider" && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography><b>Vehicle Type:</b> {user.vehicleType || user?.vehicle?.type || "—"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><b>Vehicle Number:</b> {user.vehicleNumber || user?.vehicle?.registrationNumber || "—"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><b>Approval Status:</b> {user.approvalStatus || user.status || "—"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography><b>Preferred Language:</b> {user.preferredLanguage || "—"}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography><b>Address:</b> {user.address || "—"}</Typography>
                </Grid>
              </>
            )}

            {role !== "rider" && (
              <Grid item xs={12}>
                <Typography><b>Name:</b> {displayName || "—"}</Typography>
              </Grid>
            )}
          </Grid>
        )}
      </Paper>
    </Box>
  );
}

