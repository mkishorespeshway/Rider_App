import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { auth } = useAuth();
  const token = auth?.token || null;
  const roles = auth?.roles || [];

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role && !roles.includes(role)) {
    // 🚀 If role mismatch, send them to correct dashboard
    if (roles.includes("user")) return <Navigate to="/user-dashboard" replace />;
    if (roles.includes("rider")) return <Navigate to="/rider-dashboard" replace />;
    if (roles.includes("admin")) return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}
