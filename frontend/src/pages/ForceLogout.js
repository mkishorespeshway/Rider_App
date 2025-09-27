import React, { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function ForceLogout() {
  const { auth, logout } = useAuth();
  const roleBeforeLogout = useRef(auth?.roles?.[0] || null);

  useEffect(() => {
    logout(); // clear token + localStorage
  }, [logout]);

  // redirect based on role before logout
  if (roleBeforeLogout.current === "admin") {
    return <Navigate to="/admin" replace />;
  }
  if (roleBeforeLogout.current === "rider") {
    return <Navigate to="/rider-login" replace />;
  }
  return <Navigate to="/login" replace />; // default for user
}
