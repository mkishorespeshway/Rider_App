import React from "react";

export default function DriverCard({ driver }) {
  return (
    <div style={{ padding: 8, border: "1px solid #ddd", borderRadius: 6 }}>
      <div>{driver.name}</div>
      <div>{driver.vehicle?.model}</div>
    </div>
  );
}

