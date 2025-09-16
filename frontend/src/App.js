import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
  const role = localStorage.getItem("role");
  const location = useLocation();

  // 🔹 Pages where Navbar should NOT be shown
  const hideNavbarRoutes = ["/login", "/register"];
  const hideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main style={{ padding: 20 }}>
        <Routes>
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

          {/* Protected routes */}
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
