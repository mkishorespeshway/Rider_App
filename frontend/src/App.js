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
import RiderWallet from "./pages/RiderWallet";
import UserDashboard from "./pages/dashboards/UserDashboard";
import DocumentUpload from "./pages/DocumentUpload";
import Booking from "./pages/Booking";
import Payment from "./pages/Payment.backup";
import RideTrack from "./pages/RideTrack";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";
import Parcel from "./pages/Parcel";
import Activity from "./pages/Activity";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBank from "./pages/admin/AdminBank";
import CaptainDetails from "./pages/CaptainDetails";
import RiderDetails from "./pages/RiderDetails";
 
// Wrapper
import ProtectedRoute from "./components/ProtectedRoutes";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import appTheme from "./theme/appTheme";
import "./theme.css";
 
export default function App() {
  const { auth } = useAuth();
  const isAuth = !!auth?.token;
  const redirectByRole = () => {
    const role = auth?.user?.role;
    if (role === "user") return "/booking";
    if (role === "rider") return "/rider-dashboard";
    if (role === "admin") return "/admin-dashboard";
    return "/login";
  };
 
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <div className="bw-theme app-ui">
        <Navbar />
        <main className="app-main" style={{ padding: 16 }}>
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
              path="/payment/:rideId?"
              element={
                <ProtectedRoute role="user">
                  <Payment />
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
              path="/rider-wallet"
              element={
                <ProtectedRoute role="rider">
                  <RiderWallet />
                </ProtectedRoute>
              }
            />

            {/* ADMIN */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-bank"
              element={
                <ProtectedRoute role="admin">
                  <AdminBank />
                </ProtectedRoute>
              }
            />
            <Route
              path="/captain/:id"
              element={
                <ProtectedRoute role="admin">
                  <CaptainDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider/:id"
              element={
                <ProtectedRoute role="admin">
                  <RiderDetails />
                </ProtectedRoute>
              }
            />
            {/* Shared History route for user and rider */}
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />

            {/* Shared Profile route for user and rider */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}

 
