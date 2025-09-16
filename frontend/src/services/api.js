// src/services/api.js
import axios from "axios";

// 🔹 Create a base axios instance
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// 🔹 Attach JWT token automatically to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔹 Auth APIs
export const signup = (formData) => api.post("/auth/signup", formData);
export const login = (formData) => api.post("/auth/login", formData);

// 🔹 OTP APIs
export const sendOtp = (mobile) => api.post("/otp/send", { mobile });
export const verifyOtp = (mobile, otp) => api.post("/otp/verify", { mobile, otp });

// ✅ Default export is axios instance
export default api;
