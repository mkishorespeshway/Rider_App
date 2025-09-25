import axios from "axios";

const API_BASE = "http://localhost:5000"; // dev URL

const AUTH_API = axios.create({
  baseURL: `${API_BASE}/api/auth`,
  headers: { "Content-Type": "application/json" },
});
const OTP_API = axios.create({
  baseURL: `${API_BASE}/api/otp`,
  headers: { "Content-Type": "application/json" },
});
// ❌ removed "Content-Type" here, let browser decide
const RIDER_API = axios.create({
  baseURL: `${API_BASE}/api/rider`,
});
const ADMIN_API = axios.create({
  baseURL: `${API_BASE}/api/admin`,
  headers: { "Content-Type": "application/json" },
});
const RIDES_API = axios.create({
  baseURL: `${API_BASE}/api/rides`,
  headers: { "Content-Type": "application/json" },
});

// helper: get token either from auth object or legacy token key
const getToken = () => {
  try {
    const authRaw = localStorage.getItem("auth");
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      if (parsed && parsed.token) return parsed.token;
    }
  } catch (e) {}
  return localStorage.getItem("token") || null;
};

const attachToken = (config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

RIDER_API.interceptors.request.use(attachToken);
RIDES_API.interceptors.request.use(attachToken);
ADMIN_API.interceptors.request.use(attachToken);

// --- AUTH & RIDER APIs ---
export const signupUser = (formData) => AUTH_API.post("/signup-user", formData);

// ✅ FIXED: sends FormData correctly
export const signupRider = (formData) =>
  RIDER_API.post("/signup", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const sendOtp = (mobile, role) => OTP_API.post("/send", { mobile, role });
export const verifyOtp = (mobile, otp, role) => OTP_API.post("/verify", { mobile, otp, role });
export const checkRiderApproval = (mobile) =>
  RIDER_API.get(`/check-approval?mobile=${mobile}`);
export const getRiderStatus = () => RIDER_API.get("/status");
export const uploadRiderDocs = (riderId, docs) =>
  RIDER_API.post(`/upload-docs/${riderId}`, docs, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// --- ADMIN APIs ---
export const loginAdmin = (data) => ADMIN_API.post("/login", data);
export const getAllRiders = () => ADMIN_API.get("/riders");
export const getAllUsers = () => ADMIN_API.get("/users");

export const approveRider = (id) => ADMIN_API.post(`/captain/${id}/approve`);
export const rejectRider = (id) => ADMIN_API.post(`/captain/${id}/reject`);

export const getPendingCaptains = () => ADMIN_API.get("/pending-captains");
export const getCaptains = () => ADMIN_API.get("/captains");
export const getOverview = () => ADMIN_API.get("/overview");
export const getAllRides = () => ADMIN_API.get("/rides");

// --- RIDE APIs ---
export const createRide = (data) => RIDES_API.post("/create", data);
export const findDrivers = () => RIDES_API.get("/drivers");
export const getRideHistory = () => RIDES_API.get("/history");

// --- 🚨 SOS APIs ---
export const sendSOS = (role, id) =>
  axios.post(
    `${API_BASE}/api/sos`,
    { role, id },
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );

export const getSOSAlerts = () =>
  axios.get(`${API_BASE}/api/admin/sos-alerts`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

export const resolveSOS = (id) =>
  axios.put(
    `${API_BASE}/api/admin/sos/${id}/resolve`,
    {},
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );

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
  sendSOS,
  getSOSAlerts,
  resolveSOS,
  getAllUsers,
};
