import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// Pages
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
import AdminDashboard from "./pages/admin/AdminDashboard"; // ✅ fixed import

// Detail Pages
import CaptainDetails from "./pages/CaptainDetails";
import RiderDetails from "./pages/RiderDetails";

export default function App() {
  const { auth } = useAuth();
  const { token, role } = auth || {};
  const isAuth = Boolean(token);

  const redirectByRole = () => {
    if (role === "user") return "/user-dashboard";
    if (role === "rider") return "/rider-dashboard";
    if (role === "admin") return "/admin-dashboard";
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

          {/* ================= USER ROUTES ================= */}
          <Route
            path="/login"
            element={
              isAuth ? <Navigate to={redirectByRole()} /> : <UserLogin />
            }
          />
          <Route
            path="/register"
            element={
              isAuth ? <Navigate to={redirectByRole()} /> : <UserRegister />
            }
          />
          <Route
            path="/user-dashboard"
            element={isAuth && role === "user" ? <UserDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/booking"
            element={isAuth && role === "user" ? <Booking /> : <Navigate to={redirectByRole()} />}
          />
          <Route
            path="/parcel"
            element={isAuth && role === "user" ? <Parcel /> : <Navigate to={redirectByRole()} />}
          />

          {/* ================= RIDER ROUTES ================= */}
          <Route
            path="/rider-login"
            element={
              isAuth ? <Navigate to={redirectByRole()} /> : <RiderLogin />
            }
          />
          <Route
            path="/rider-register"
            element={
              isAuth ? <Navigate to={redirectByRole()} /> : <RiderRegister />
            }
          />
          <Route
            path="/rider-dashboard"
            element={isAuth && role === "rider" ? <RiderDashboard /> : <Navigate to="/rider-login" />}
          />
          <Route
            path="/upload-docs"
            element={isAuth && role === "rider" ? <DocumentUpload /> : <Navigate to="/rider-login" />}
          />

          {/* ================= ADMIN ROUTES ================= */}
          <Route
            path="/admin"
            element={isAuth ? <Navigate to={redirectByRole()} /> : <AdminLogin />}
          />
          <Route
            path="/admin-dashboard/*"
            element={
              isAuth && role === "admin" ? (
                <AdminDashboard /> // ✅ replaced AdminLayout with AdminDashboard
              ) : (
                <Navigate to="/admin" />
              )
            }
          />
          <Route
            path="/admin/captain/:id"
            element={isAuth && role === "admin" ? <CaptainDetails /> : <Navigate to="/admin" />}
          />
          <Route
            path="/admin/rider/:id"
            element={isAuth && role === "admin" ? <RiderDetails /> : <Navigate to="/admin" />}
          />

          {/* ================= COMMON ROUTES ================= */}
          
          <Route
            path="/booking"
            element={
              isAuth && role === "user" ? <Booking /> : <Navigate to={redirectByRole()} />
           }
            />
          
          <Route
           path="/parcel"
        element={
          isAuth && role === "user" ? <Parcel /> : <Navigate to={redirectByRole()} />
          }
           />
          <Route
            path="/ride/:id"
            element={isAuth ? <RideTrack /> : <Navigate to="/login" />}
          />
          <Route
            path="/history"
            element={isAuth ? <History /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={
            isAuth ? <Profile /> : <Navigate to="/login" />
               }
              />
          <Route
            path="/activity"
            element={isAuth ? <Activity /> : <Navigate to="/login" />}
          />

          {/* 404 */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </main>
    </>
  );
}
// end