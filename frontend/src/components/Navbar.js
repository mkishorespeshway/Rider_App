import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user } = useAuth();
  return (
    <nav style={{ padding: 12, borderBottom: "1px solid #ddd", display: "flex", gap: 12 }}>
      <Link to="/">Home</Link>
      {user ? (
        <>
          <Link to="/booking">Book</Link>
          <Link to="/history">History</Link>
          <Link to="/profile">Profile</Link>
          {user.role === "admin" && <Link to="/admin">Admin</Link>}
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </nav>
  );
}

