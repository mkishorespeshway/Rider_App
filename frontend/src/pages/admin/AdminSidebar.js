// src/components/AdminSidebar.js
import React, { useEffect, useState } from "react";
import { List, ListItem, ListItemText, ListItemIcon, Badge } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import LocalTaxiIcon from "@mui/icons-material/LocalTaxi";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [counts, setCounts] = useState({
    users: 0,
    riders: 0,
    captains: 0,
    pendingCaptains: 0,
    rides: 0,
  });

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        if (!token) return; // skip if no token
        const res = await axios.get(`${API}/api/admin/overview`, { headers });
        setCounts({
          users: res.data.users || 0,
          riders: res.data.riders || 0,
          captains: res.data.captains || 0,
          pendingCaptains: res.data.pendingCaptains || 0,
          rides: res.data.rides || 0,
        });
      } catch (err) {
        console.error("Failed to fetch overview", err);
        setCounts({ users:0, riders:0, captains:0, pendingCaptains:0, rides:0 });
      }
    };

    fetchOverview();
  }, [token]); // refetch if token changes

  const menuItems = [
    { label: "Dashboard", icon: <DashboardIcon />, path: "/admin-dashboard", count: 0 },
    { label: "Pending Captains", icon: <PendingActionsIcon />, path: "/admin/pending-captains", count: counts.pendingCaptains },
    { label: "Approved Captains", icon: <PeopleIcon />, path: "/admin/captains", count: counts.captains },
    { label: "Rides", icon: <LocalTaxiIcon />, path: "/rides", count: counts.rides },
  ];

  return (
    <List>
      {menuItems.map((item) => (
        <ListItem
          key={item.label}
          button
          selected={location.pathname === item.path}
          onClick={() => navigate(item.path)}
        >
          <ListItemIcon>
            {item.icon ? (
              item.count > 0 ? (
                <Badge badgeContent={item.count} color="primary">{item.icon}</Badge>
              ) : item.icon
            ) : null}
          </ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItem>
      ))}
    </List>
  );
}
