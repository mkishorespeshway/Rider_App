import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Booking from "./pages/Booking";
import RideTrack from "./pages/RideTrack";
import History from "./pages/History";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Navbar from "./components/Navbar";
import { useAuth } from "./contexts/AuthContext";

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main style={{ padding: 20 }}>
        <Routes>
          <Route path="/" element={<Navigate to={user ? "/booking" : "/login"} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/booking" element={user ? <Booking /> : <Navigate to="/login" />} />
          <Route path="/ride/:id" element={user ? <RideTrack /> : <Navigate to="/login" />} />
          <Route path="/history" element={user ? <History /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </main>
    </>
  );
}
