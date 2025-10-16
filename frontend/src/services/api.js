import axios from "axios";

// Use env, default to backend on 5000
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
// Debug: surface the base URL in the browser console to verify env usage
try {
  console.log("[API] Base URL:", API_BASE);
} catch {}
 
const AUTH_API = axios.create({
  baseURL: `${API_BASE}/api/auth`,
  headers: { "Content-Type": "application/json" },
});
const OTP_API = axios.create({
  baseURL: `${API_BASE}/api/otp`,
  headers: { "Content-Type": "application/json" },
});
try {
  console.log("[API] OTP baseURL:", OTP_API?.defaults?.baseURL);
} catch {}
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
// ✅ Payments API
const PAYMENTS_API = axios.create({
  baseURL: `${API_BASE}/api/payments`,
  headers: { "Content-Type": "application/json" },
});
// Wallet API
const WALLET_API = axios.create({
  baseURL: `${API_BASE}/api/wallet`,
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
 
// attach token
[AUTH_API, OTP_API, RIDER_API, ADMIN_API, RIDES_API, PAYMENTS_API, WALLET_API].forEach((inst) => {
  inst.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
});
 
// --- AUTH APIs ---
export const signupUser = (payload) => AUTH_API.post("/signup-user", payload);
export const signupRider = (formData) =>
  RIDER_API.post("/signup", formData, { headers: { "Content-Type": "multipart/form-data" } });
// Pass optional role to help backend dev fallback return correct role
export const sendOtp = (mobile, role) => OTP_API.post("/send", { mobile, role });
export const verifyOtp = (mobile, otp, role) => OTP_API.post("/verify", { mobile, otp, role });
export const getRiderStatus = () => RIDER_API.get("/status");
export const checkRiderApproval = (mobile) => RIDER_API.get(`/check-approval/${mobile}`);
 
// --- ADMIN APIs ---
export const loginAdmin = (payload) => ADMIN_API.post("/login", payload);
export const getAllRiders = () => ADMIN_API.get("/riders");
export const approveRider = (id) => ADMIN_API.post(`/captain/${id}/approve`);
export const rejectRider = (id) => ADMIN_API.post(`/captain/${id}/reject`);
export const getPendingCaptains = () => ADMIN_API.get("/pending-captains");
export const getAllUsers = () => ADMIN_API.get("/users");
export const getCaptains = () => ADMIN_API.get("/captains");
export const getOverview = () => ADMIN_API.get("/overview");
export const getAllRides = () => ADMIN_API.get("/rides");
export const getPaymentsSummary = () => ADMIN_API.get("/payments/summary");
// --- ADMIN SETTINGS ---
export const getAdminBankDetails = () => ADMIN_API.get("/bank");
export const updateAdminBankDetails = (data) => ADMIN_API.put("/bank", data);
 
// --- RIDE APIs ---
export const createRide = (data) => RIDES_API.post("/create", data);
export const findDrivers = () => RIDES_API.get("/drivers");
export const getRideHistory = () => RIDES_API.get("/history");
export const getRideById = (id) => RIDES_API.get(`/${id}`);
 
// --- Payments ---
export const initiatePayment = (data) => PAYMENTS_API.post("/initiate", data);
export const verifyPayment = (data) => PAYMENTS_API.post("/verify", data);
export const markCashPayment = (data) => PAYMENTS_API.post("/cash", data);
// Manual confirmation for online payments (UPI intent/collect)
export const confirmOnlinePayment = (data) => PAYMENTS_API.post("/manual-online", data);
export const getMerchantDetails = () => PAYMENTS_API.get("/merchant");
 
// --- Wallet ---
export const getWallet = () => WALLET_API.get("/me");
export const getWalletTransactions = () => WALLET_API.get("/transactions");
export const updateBankDetails = (data) => WALLET_API.put("/bank", data);
export const requestWithdrawal = (amount) => WALLET_API.post("/withdraw", { amount });
export const creditEarning = (amount, description) => WALLET_API.post("/credit", { amount, description });
 
// Upload rider documents (legacy usage in DocumentUpload)
export const uploadRiderDocs = (token, formData) =>
  axios.post(`${API_BASE}/api/rider/upload-docs`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
 
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
  getPaymentsSummary,
  createRide,
  findDrivers,
  getRideHistory,
  getRideById,
  initiatePayment,
  verifyPayment,
  markCashPayment,
  confirmOnlinePayment,
  getMerchantDetails,
  getWallet,
  getWalletTransactions,
  updateBankDetails,
  requestWithdrawal,
  creditEarning,
  sendSOS,
  getSOSAlerts,
  resolveSOS,
  getAllUsers,
};
 
 