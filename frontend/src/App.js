import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// Pages
import ForceLogout from "./pages/ForceLogout";  // ✅ add at top

import UserLogin from "./pages/UserLogin";
import UserRegister from "./pages/UserRegister";
import RiderLogin from "./pages/RiderLogin";
import RiderRegister from "./pages/RiderRegister";
import AdminLogin from "./pages/admin/AdminLogin";
import RiderDashboard from "./pages/dashboards/RiderDashboard";
import UserDashboard from "./pages/dashboards/UserDashboard";
import DocumentUpload from "./pages/DocumentUpload";
import Booking from "./pages/Booking";
import RideTrack from "./pages/RideTrack";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";
import Parcel from "./pages/Parcel";
import Activity from "./pages/Activity";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CaptainDetails from "./pages/CaptainDetails";
import RiderDetails from "./pages/RiderDetails";

// Wrapper
import ProtectedRoute from "./components/ProtectedRoutes";

export default function App() {
  const { auth } = useAuth();
  const token = auth?.token || null;
  const roles = auth?.roles || [];
  const isAuth = Boolean(token);

  const redirectByRole = () => {
    if (roles.includes("user")) return "/user-dashboard";
    if (roles.includes("rider")) return "/rider-dashboard";
    if (roles.includes("admin")) return "/admin-dashboard";
    return "/login";
  };

  return (
    <>
      <Navbar />
      <main style={{ padding: 20 }}>
        <Routes>
          {/* Root */}
          <Route
            path="/"
            element={<Navigate to={isAuth ? redirectByRole() : "/login"} />}
          />

          {/* USER */}
          <Route path="/force-logout" element={<ForceLogout />} />

          <Route
            path="/login"
            element={isAuth ? <Navigate to={redirectByRole()} /> : <UserLogin />}
          />
          <Route
            path="/register"
            element={isAuth ? <Navigate to={redirectByRole()} /> : <UserRegister />}
          />
          <Route
            path="/user-dashboard"
            element={
              <ProtectedRoute role="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking"
            element={
              <ProtectedRoute role="user">
                <Booking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parcel"
            element={
              <ProtectedRoute role="user">
                <Parcel />
              </ProtectedRoute>
            }
          />

          {/* RIDER */}
          <Route
            path="/rider-login"
            element={isAuth ? <Navigate to={redirectByRole()} /> : <RiderLogin />}
          />
          <Route
            path="/rider-register"
            element={isAuth ? <Navigate to={redirectByRole()} /> : <RiderRegister />}
          />
          <Route
            path="/rider-dashboard"
            element={
              <ProtectedRoute role="rider">
                <RiderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-docs"
            element={
              <ProtectedRoute role="rider">
                <DocumentUpload />
              </ProtectedRoute>
            }
          />

          {/* ADMIN */}
          <Route
            path="/admin"
            element={isAuth ? <Navigate to={redirectByRole()} /> : <AdminLogin />}
          />
          
          <Route
            path="/admin-dashboard/*"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/captain/:id"
            element={
              <ProtectedRoute role="admin">
                <CaptainDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rider/:id"
            element={
              <ProtectedRoute role="admin">
                <RiderDetails />
              </ProtectedRoute>
            }
          />

          {/* COMMON */}
          <Route
            path="/ride/:id"
            element={
              <ProtectedRoute>
                <RideTrack />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <Activity />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </main>
    </>
  );
}
