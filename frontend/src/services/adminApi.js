import axios from "axios";

// Full backend URL to avoid 404 in development
const API = axios.create({
  baseURL: "http://localhost:5000/api/admin",
  headers: { "Content-Type": "application/json" },
});

// ✅ Attach token automatically to all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Admin login with automatic token save
export const loginAdmin = async (data) => {
  const res = await API.post("/login", data);
  if (res.data.success && res.data.token) {
    localStorage.setItem("token", res.data.token); // Save token
  }
  return res;
};

// Admin API endpoints
export const getOverview = () => API.get("/overview");
export const getUsers = () => API.get("/users");
export const getRiders = () => API.get("/riders");
export const getApprovedCaptains = () => API.get("/captains");
export const getPendingCaptains = () => API.get("/pending-captains");
export const getRides = () => API.get("/rides");

export const approveCaptain = (id) => API.post(`/captain/${id}/approve`);
export const rejectCaptain = (id) => API.post(`/captain/${id}/reject`);
