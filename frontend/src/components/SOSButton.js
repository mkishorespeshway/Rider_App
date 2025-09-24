import React from "react";
import { Fab } from "@mui/material";
import SOSIcon from "@mui/icons-material/ReportProblem";
import { sendSOS } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function SOSButton({ role }) {
  const { auth } = useAuth();

  const handleSOS = async () => {
  try {
    const id = auth?.user?._id || auth?._id; // fallback for plain auth object
    if (!id) {
      alert("❌ Cannot send SOS: missing user ID");
      return;
    }

    await sendSOS(role, id);
    alert("🚨 SOS sent successfully!");
  } catch (err) {
    console.error("❌ SOS failed:", err.response?.data || err.message);
    alert("Failed to send SOS");
  }
};
  return (
    <Fab
      color="error"
      onClick={handleSOS}
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1500,
      }}
    >
      <SOSIcon />
    </Fab>
  );
}
