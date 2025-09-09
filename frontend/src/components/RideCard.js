import React from "react";

export default function RideCard({ driver }) {
  if (!driver) return null;
  return (
    <div style={{ padding: 8, border: "1px solid #eee", marginBottom: 8, borderRadius: 6 }}>
      <div><strong>{driver.name}</strong> • {driver.vehicle?.model || "Vehicle"}</div>
      <div>Rating: {driver.rating || "N/A"}</div>
      <div>ETA: {driver.eta || "—"}</div>
      <div style={{ marginTop: 6 }}>
        <button>Request</button>
      </div>
    </div>
  );
}

