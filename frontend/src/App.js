import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Booking from "./pages/Booking";
import RideTrack from "./pages/RideTrack";
import History from "./pages/History";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/dashboards/UserDashboard";
import RiderDashboard from "./pages/dashboards/RiderDashboard";
import Navbar from "./components/Navbar";

export default function App() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role"); // ✅ role comes from login response

  return (
    <>
      <Navbar />
      <main style={{ padding: 20 }}>
        <Routes>
          {/* Root route redirects based on login + role */}
          <Route
            path="/"
            element={
              token ? (
                role === "rider" ? (
                  <Navigate to="/rider-dashboard" />
                ) : (
                  <Navigate to="/user-dashboard" />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboards */}
          <Route
            path="/user-dashboard"
            element={token && role === "user" ? <UserDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/rider-dashboard"
            element={token && role === "rider" ? <RiderDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin"
            element={token ? <AdminDashboard /> : <Navigate to="/login" />}
          />

          {/* Protected pages (shared by both roles if logged in) */}
          <Route path="/booking" element={token ? <Booking /> : <Navigate to="/login" />} />
          <Route path="/ride/:id" element={token ? <RideTrack /> : <Navigate to="/login" />} />
          <Route path="/history" element={token ? <History /> : <Navigate to="/login" />} />
          <Route path="/profile" element={token ? <Profile /> : <Navigate to="/login" />} />

          {/* 404 */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </main>
    </>
  );
}
