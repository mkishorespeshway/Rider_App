import axios from "axios";

const AUTH_API = axios.create({
  baseURL: "http://localhost:5000/api/auth",
  headers: { "Content-Type": "application/json" },
});

const OTP_API = axios.create({
  baseURL: "http://localhost:5000/api/otp",
  headers: { "Content-Type": "application/json" },
});

const RIDER_API = axios.create({
  baseURL: "http://localhost:5000/api/rider",
});

const ADMIN_API = axios.create({
  baseURL: "http://localhost:5000/api/admin",
  headers: { "Content-Type": "application/json" },
});

// ===== User APIs =====
export const signupUser = (formData) => AUTH_API.post("/signup-user", formData);

// ===== Rider APIs =====
export const signupRider = (formData) => AUTH_API.post("/signup-rider", formData);

// ===== OTP APIs =====
export const sendOtp = (mobile, role) => OTP_API.post("/send", { mobile, role });
export const verifyOtp = (mobile, otp, role) =>
  OTP_API.post("/verify", { mobile, otp, role });

// ===== Rider docs/status =====
export const getRiderStatus = (token) =>
  RIDER_API.get("/status", { headers: { Authorization: `Bearer ${token}` } });

// 🚨 FIXED: Upload docs by riderId (no JWT needed yet)
export const uploadRiderDocs = (riderId, docs) =>
  RIDER_API.post(`/upload-docs/${riderId}`, docs, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// ===== Admin APIs =====
export const getAllRiders = () => ADMIN_API.get("/riders");
export const approveRider = (riderId) => ADMIN_API.post(`/approve/${riderId}`);
export const rejectRider = (riderId) => ADMIN_API.post(`/reject/${riderId}`);

// ✅ default export
export default {
  signupUser,
  signupRider,
  sendOtp,
  verifyOtp,
  getRiderStatus,
  uploadRiderDocs,
  getAllRiders,
  approveRider,
  rejectRider,
};
