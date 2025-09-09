import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user && user.token) {
      api.setToken(user.token);
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const loginWithOtp = async (phone, otp) => {
    const res = await api.post("/auth/verify-otp", { phone, otp });
    // expected: { token, user }
    const payload = res.data;
    setUser(payload.user ? { ...payload.user, token: payload.token } : { token: payload.token });
    return payload;
  };

  const requestOtp = async (phone) => {
    await api.post("/auth/request-otp", { phone });
  };

  const logout = () => {
    setUser(null);
    api.setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loginWithOtp, requestOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

