import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("auth");
      return saved
        ? JSON.parse(saved)
        : { token: null, role: null, user: null };
    } catch (e) {
      return { token: null, role: null, user: null };
    }
  });

  const login = (data) => {
    const normalized = {
      token: data.token || null,
      role: data.role || data.user?.role || null, // ✅ fallback to user.role
      user: data.user || null,
    };
    setAuth(normalized);
    localStorage.setItem("auth", JSON.stringify(normalized));
    if (normalized.token) localStorage.setItem("token", normalized.token);
    if (normalized.role) localStorage.setItem("role", normalized.role);
  };

  const logout = () => {
    setAuth({ token: null, role: null, user: null });
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    // ✅ redirect correctly
    if (auth?.role === "rider") {
      window.location.href = "/rider-login";
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
