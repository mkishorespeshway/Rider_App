// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("auth");
    return saved ? JSON.parse(saved) : { token: null, user: null, roles: [] };
  });

  // 🚀 Normalize login payload
  const login = (data) => {
    const role = data.role || data.user?.role;
    const payload = {
      token: data.token,
      user: data.user,
      roles: data.roles || (role ? [role] : []), // always array
    };
    setAuth(payload);
    localStorage.setItem("auth", JSON.stringify(payload));
  };

  const logout = () => {
    setAuth({ token: null, user: null, roles: [] });
    localStorage.removeItem("auth");
    localStorage.removeItem("token"); // ✅ clear leftover from old AdminLogin
  };

  useEffect(() => {
    const saved = localStorage.getItem("auth");
    if (saved) setAuth(JSON.parse(saved));
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
