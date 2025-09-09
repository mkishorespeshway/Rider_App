import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/stats").then(r => setStats(r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h2>Admin Dashboard</h2>
      {!stats ? <div>Loading...</div> : (
        <div>
          <div>Total rides: {stats.totalRides}</div>
          <div>Active drivers: {stats.activeDrivers}</div>
          <div>Revenue: {stats.revenue}</div>
        </div>
      )}
    </div>
  );
}

