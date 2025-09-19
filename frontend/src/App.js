// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// 🔹 Pages
import UserLogin from "./pages/UserLogin";
import UserRegister from "./pages/UserRegister";
import RiderLogin from "./pages/RiderLogin";
import RiderRegister from "./pages/RiderRegister";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import RiderDashboard from "./pages/dashboards/RiderDashboard";
import UserDashboard from "./pages/dashboards/UserDashboard";
import DocumentUpload from "./pages/DocumentUpload";
import Booking from "./pages/Booking";
import RideTrack from "./pages/RideTrack";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";

export default function App() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const isAuth = Boolean(token);

  return (
    <>
      <Navbar />
      <main style={{ padding: 20 }}>
        <Routes>
          {/* Root Redirect */}
          <Route
            path="/"
            element={
              isAuth ? (
                role === "rider" ? (
                  <Navigate to="/rider-dashboard" />
                ) : role === "user" ? (
                  <Navigate to="/user-dashboard" />
                ) : role === "admin" ? (
                  <Navigate to="/admin-dashboard" />
                ) : (
                  <Navigate to="/login" />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* 🔹 User Routes */}
          <Route
            path="/login"
            element={
              isAuth && role === "user" ? (
                <Navigate to="/user-dashboard" />
              ) : (
                <UserLogin />
              )
            }
          />
          <Route
            path="/register"
            element={
              isAuth && role === "user" ? (
                <Navigate to="/user-dashboard" />
              ) : (
                <UserRegister />
              )
            }
          />
          <Route
            path="/user-dashboard"
            element={
              isAuth && role === "user" ? (
                <UserDashboard />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* 🔹 Rider Routes */}
          <Route
            path="/rider-login"
            element={
              isAuth && role === "rider" ? (
                <Navigate to="/rider-dashboard" />
              ) : (
                <RiderLogin />
              )
            }
          />
          <Route
            path="/rider-register"
            element={
              isAuth && role === "rider" ? (
                <Navigate to="/rider-dashboard" />
              ) : (
                <RiderRegister />
              )
            }
          />
          <Route
            path="/rider-dashboard"
            element={
              isAuth && role === "rider" ? (
                <RiderDashboard />
              ) : (
                <Navigate to="/rider-login" />
              )
            }
          />
          <Route
            path="/upload-docs"
            element={
              isAuth && role === "rider" ? (
                <DocumentUpload />
              ) : (
                <Navigate to="/rider-login" />
              )
            }
          />

          {/* 🔹 Admin Routes */}
          <Route
            path="/admin"
            element={
              isAuth && role === "admin" ? (
                <Navigate to="/admin-dashboard" />
              ) : (
                <AdminLogin />
              )
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              isAuth && role === "admin" ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/admin" />
              )
            }
          />

          {/* 🔹 Common Routes */}
          <Route path="/booking" element={isAuth ? <Booking /> : <Navigate to="/login" />} />
          <Route path="/ride/:id" element={isAuth ? <RideTrack /> : <Navigate to="/login" />} />
          <Route path="/history" element={isAuth ? <History /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuth ? <Profile /> : <Navigate to="/login" />} />

          {/* 404 */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </main>
    </>
  );
}
