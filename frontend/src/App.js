import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext"; // ✅ context-based auth

// Pages
import UserLogin from "./pages/UserLogin";
import UserRegister from "./pages/UserRegister";
import RiderLogin from "./pages/RiderLogin";
import RiderRegister from "./pages/RiderRegister";
import RiderOtpLogin from "./pages/RiderOtpLogin";
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

// Detail Pages
import CaptainDetails from "./pages/CaptainDetails";
import RiderDetails from "./pages/RiderDetails";

export default function App() {
  const { auth } = useAuth(); // ✅ get auth state from context
  const { token, role } = auth || {};
  const isAuth = Boolean(token);

  const redirectByRole = () => {
    if (role === "user") return "/user-dashboard";
    if (role === "rider") return "/rider-dashboard";
    if (role === "admin") return "/admin-dashboard";
    return "/";
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

          {/* User Routes */}
          <Route
            path="/login"
            element={isAuth && role === "user" ? <Navigate to="/user-dashboard" /> : <UserLogin />}
          />
          <Route
            path="/register"
            element={!isAuth ? <UserRegister /> : <Navigate to={redirectByRole()} />}
          />
          <Route
            path="/user-dashboard"
            element={isAuth && role === "user" ? <UserDashboard /> : <Navigate to="/login" />}
          />

          {/* Rider Routes */}
          <Route
            path="/rider-login"
            element={isAuth && role === "rider" ? <Navigate to="/rider-dashboard" /> : <RiderLogin />}
          />
          <Route
            path="/rider-register"
            element={!isAuth ? <RiderRegister /> : <Navigate to={redirectByRole()} />}
          />
          <Route
            path="/rider-otp-login"
            element={!isAuth ? <RiderOtpLogin /> : <Navigate to={redirectByRole()} />}
          />
          <Route
            path="/rider-dashboard"
            element={isAuth && role === "rider" ? <RiderDashboard /> : <Navigate to="/rider-login" />}
          />
          <Route
            path="/upload-docs"
            element={isAuth && role === "rider" ? <DocumentUpload /> : <Navigate to="/rider-login" />}
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={isAuth && role === "admin" ? <Navigate to="/admin-dashboard" /> : <AdminLogin />}
          />
          <Route
            path="/admin-dashboard"
            element={isAuth && role === "admin" ? <AdminDashboard /> : <Navigate to="/admin" />}
          />
          <Route
            path="/admin/captain/:id"
            element={isAuth && role === "admin" ? <CaptainDetails /> : <Navigate to="/admin" />}
          />
          <Route
            path="/admin/rider/:id"
            element={isAuth && role === "admin" ? <RiderDetails /> : <Navigate to="/admin" />}
          />

          {/* Common Routes */}
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
