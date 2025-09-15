import axios from "axios";

const AUTH_API = axios.create({
  baseURL: "http://localhost:5000/api/auth",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

const OTP_API = axios.create({
  baseURL: "http://localhost:5000/api/otp",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// 🔹 Auth APIs
export const signup = (formData) => AUTH_API.post("/signup", formData);
export const login = (formData) => AUTH_API.post("/login", formData);

// 🔹 OTP APIs
export const sendOtp = (mobile) => OTP_API.post("/send", { mobile });
export const verifyOtp = (mobile, otp) => OTP_API.post("/verify", { mobile, otp });

// ✅ Keep both: named exports + default export (backward compatibility)
const api = { signup, login, sendOtp, verifyOtp };
export default api;
