// frontend/src/contexts/AuthContext.js
import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("auth");
      return saved ? JSON.parse(saved) : { token: null, role: null, user: null };
    } catch (e) {
      return { token: null, role: null, user: null };
    }
  });

  const login = (data) => {
    // data: { token, role, user }
    const normalized = {
      token: data.token || null,
      role: data.role || (data.user && data.user.role) || null,
      user: data.user || null,
    };
    setAuth(normalized);
    localStorage.setItem("auth", JSON.stringify(normalized));
    // convenience keys for older code / axios
    if (normalized.token) localStorage.setItem("token", normalized.token);
    if (normalized.role) localStorage.setItem("role", normalized.role);
  };

  const logout = () => {
    setAuth({ token: null, role: null, user: null });
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/rider-login";
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
