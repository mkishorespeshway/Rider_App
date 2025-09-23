// frontend/src/services/api.js
import axios from "axios";

const API_BASE = "http://localhost:5000"; // hardcoded for dev (you said no .env)

const AUTH_API = axios.create({ baseURL: `${API_BASE}/api/auth`, headers: { "Content-Type": "application/json" }});
const OTP_API = axios.create({ baseURL: `${API_BASE}/api/otp`, headers: { "Content-Type": "application/json" }});
const RIDER_API = axios.create({ baseURL: `${API_BASE}/api/rider`, headers: { "Content-Type": "application/json" }});
const ADMIN_API = axios.create({ baseURL: `${API_BASE}/api/admin`, headers: { "Content-Type": "application/json" }});
const RIDES_API = axios.create({ baseURL: `${API_BASE}/api/rides`, headers: { "Content-Type": "application/json" }});

// helper: get token either from auth object or legacy token key
const getToken = () => {
  try {
    const authRaw = localStorage.getItem("auth");
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      if (parsed && parsed.token) return parsed.token;
    }
  } catch (e) {
    // ignore
  }
  return localStorage.getItem("token") || null;
};

const attachToken = (config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // console.log("➡️ attachToken: set Authorization header");
  }
  return config;
};

RIDER_API.interceptors.request.use(attachToken);
RIDES_API.interceptors.request.use(attachToken);
ADMIN_API.interceptors.request.use(attachToken);

// exports
export const signupUser = (formData) => AUTH_API.post("/signup-user", formData);
export const signupRider = (formData) => AUTH_API.post("/signup-rider", formData);
export const sendOtp = (mobile, role) => OTP_API.post("/send", { mobile, role });
export const verifyOtp = (mobile, otp, role) => OTP_API.post("/verify", { mobile, otp, role });
export const checkRiderApproval = (mobile) => RIDER_API.get(`/check-approval?mobile=${mobile}`);
export const getRiderStatus = () => RIDER_API.get("/status");
export const uploadRiderDocs = (riderId, docs) => RIDER_API.post(`/upload-docs/${riderId}`, docs, { headers: { "Content-Type": "multipart/form-data" }});
export const loginAdmin = (data) => ADMIN_API.post("/login", data);
export const getAllRiders = () => ADMIN_API.get("/riders");
export const approveRider = (riderId) => ADMIN_API.post(`/approve/${riderId}`);
export const rejectRider = (riderId) => ADMIN_API.post(`/reject/${riderId}`);
export const getPendingCaptains = () => ADMIN_API.get("/pending-captains");
export const getCaptains = () => ADMIN_API.get("/captains");
export const getOverview = () => ADMIN_API.get("/overview");
export const getAllRides = () => ADMIN_API.get("/rides");
export const createRide = (data) => RIDES_API.post("/create", data);
export const findDrivers = () => RIDES_API.get("/drivers");
export const getRideHistory = () => RIDES_API.get("/history");

export default {
  signupUser, signupRider, sendOtp, verifyOtp, checkRiderApproval,
  getRiderStatus, uploadRiderDocs, loginAdmin, getAllRiders, approveRider, rejectRider,
  getPendingCaptains, getCaptains, getOverview, getAllRides, createRide, findDrivers, getRideHistory
};
