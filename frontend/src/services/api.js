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

const RIDES_API = axios.create({
  baseURL: "http://localhost:5000/api/rides",
  headers: { "Content-Type": "application/json" },
});

// 🆕 Middleware to attach token
RIDES_API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // 👈 ensure you save token at login
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===== User APIs =====
export const signupUser = (formData) => AUTH_API.post("/signup-user", formData);
export const signupRider = (formData) => AUTH_API.post("/signup-rider", formData);

// ===== OTP APIs =====
export const sendOtp = (mobile, role) => OTP_API.post("/send", { mobile, role });
export const verifyOtp = (mobile, otp, role) =>
  OTP_API.post("/verify", { mobile, otp, role });

// ===== Rider docs/status =====
export const getRiderStatus = (token) =>
  RIDER_API.get("/status", { headers: { Authorization: `Bearer ${token}` } });

// 🚨 Upload docs by riderId
export const uploadRiderDocs = (riderId, docs) =>
  RIDER_API.post(`/upload-docs/${riderId}`, docs, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// ===== Admin APIs =====
export const getAllRiders = () => ADMIN_API.get("/riders");
export const approveRider = (riderId) => ADMIN_API.post(`/approve/${riderId}`);
export const rejectRider = (riderId) => ADMIN_API.post(`/reject/${riderId}`);

// ===== Rides APIs =====
export const createRide = (data) => RIDES_API.post("/create", data);
export const findDrivers = () => RIDES_API.get("/drivers");
export const getRideHistory = () => RIDES_API.get("/history");

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
  createRide,
  findDrivers,
  getRideHistory,
};
