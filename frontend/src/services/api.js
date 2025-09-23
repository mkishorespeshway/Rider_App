import axios from "axios";

// ===== Base Axios Instances =====
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
  headers: { "Content-Type": "application/json" },
});

const ADMIN_API = axios.create({
  baseURL: "http://localhost:5000/api/admin",
  headers: { "Content-Type": "application/json" },
});

const RIDES_API = axios.create({
  baseURL: "http://localhost:5000/api/rides",
  headers: { "Content-Type": "application/json" },
});

// ===== Attach Token Middleware =====
const attachToken = (config) => {
  const token = localStorage.getItem("token"); // unified token for all roles
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
};

RIDER_API.interceptors.request.use(attachToken);
RIDES_API.interceptors.request.use(attachToken);
ADMIN_API.interceptors.request.use(attachToken);

// ===== User APIs =====
export const signupUser = (formData) => AUTH_API.post("/signup-user", formData);
export const signupRider = (formData) => AUTH_API.post("/signup-rider", formData);

// ===== OTP APIs =====
export const sendOtp = (mobile, role) =>
  OTP_API.post("/send", { mobile, role });

export const verifyOtp = (mobile, otp, role) =>
  OTP_API.post("/verify", { mobile, otp, role });

// ===== Rider APIs =====
export const checkRiderApproval = (mobile) =>
  RIDER_API.get(`/check-approval?mobile=${mobile}`);

export const getRiderStatus = () => RIDER_API.get("/status");

export const uploadRiderDocs = (riderId, docs) =>
  RIDER_API.post(`/upload-docs/${riderId}`, docs, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// ===== Admin APIs =====
export const loginAdmin = (data) => ADMIN_API.post("/login", data);
export const getAllRiders = () => ADMIN_API.get("/riders");
export const approveRider = (riderId) => ADMIN_API.post(`/approve/${riderId}`);
export const rejectRider = (riderId) => ADMIN_API.post(`/reject/${riderId}`);
export const getPendingCaptains = () => ADMIN_API.get("/pending-captains");
export const getCaptains = () => ADMIN_API.get("/captains");
export const getOverview = () => ADMIN_API.get("/overview");
export const getAllRides = () => ADMIN_API.get("/rides");

// ===== Rides APIs =====
export const createRide = (data) => RIDES_API.post("/create", data);
export const findDrivers = () => RIDES_API.get("/drivers");
export const getRideHistory = () => RIDES_API.get("/history");

// ===== Export all =====
export default {
  signupUser,
  signupRider,
  sendOtp,
  verifyOtp,
  checkRiderApproval,
  getRiderStatus,
  uploadRiderDocs,
  loginAdmin,
  getAllRiders,
  approveRider,
  rejectRider,
  getPendingCaptains,
  getCaptains,
  getOverview,
  getAllRides,
  createRide,
  findDrivers,
  getRideHistory,
};
