import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Map from "../../components/Map"; //  Google Maps component
import { getMerchantDetails, confirmOnlinePayment, markCashPayment } from "../../services/api";
 
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const API_URL = `${API_BASE}/api`;
const SHOW_PARCELS_ON_DASHBOARD = true;

// Create a new socket connection for each tab instance
const socket = io(API_BASE, {
  query: { tabId: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` },
  forceNew: true, // Force a new connection for each tab
  reconnection: true
});

// Rapido-style 50 km radius filtering (user pickup ↔ rider location)
const RIDE_RADIUS_KM = 50;
const toRad = (v) => (Number(v) * Math.PI) / 180;
const haversineKm = (a, b) => {
  try {
    const R = 6371; // Earth radius (km)
    const dLat = toRad(Number(b.lat) - Number(a.lat));
    const dLng = toRad(Number(b.lng) - Number(a.lng));
    const lat1 = toRad(Number(a.lat));
    const lat2 = toRad(Number(b.lat));
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  } catch {
    return Infinity;
  }
};
 
export default function RiderDashboard() {
  const [rides, setRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  
  // Generate a unique tab ID for this browser tab instance
  const [tabId] = useState(() => `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Check authentication and tab session on component mount
  useEffect(() => {
    // First check authentication
    if (!auth?.token) {
      // Only redirect if came from a different page (not from rider-login)
      const prevPath = sessionStorage.getItem('prevPath');
      if (prevPath !== '/rider-login') {
        sessionStorage.setItem('prevPath', '/rider-dashboard');
        window.location.href = "/rider-login";
      }
      return;
    }
    
    // We're authenticated, update prevPath
    sessionStorage.setItem('prevPath', '/rider-dashboard');
    
    // No need to check for active tabs or show popups
    // Each tab can have its own session now
    
    // We still generate a unique tab ID for this tab's internal use
    // but we don't restrict to one tab only
    localStorage.setItem(`riderDashboardTab-${tabId}`, 'active');
    
    // Cleanup function to remove tab registration when component unmounts
    return () => {
      // Clean up this tab's data
      localStorage.removeItem(`riderDashboardTab-${tabId}`);
    };
  }, [auth, navigate, tabId]);
  
  // Admin UPI info for scanner display
  const [merchantVpa, setMerchantVpa] = useState(process.env.REACT_APP_MERCHANT_VPA || null);
  const [merchantName, setMerchantName] = useState("Rider App");
 
  // OTP verification states
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // Ensure OTP input is fresh each time the dialog opens
  const openOtpDialog = () => {
    setOtp("");
    setOtpError("");
    setOtpDialogOpen(true);
  };
 
  // map state
  const [pickup, setPickup] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [drop, setDrop] = useState(null);
  const [dropAddress, setDropAddress] = useState("");
  const [riderLocation, setRiderLocation] = useState(null);
  const [userLiveCoords, setUserLiveCoords] = useState(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
 
  // Payment confirmation states
  const [paymentMsg, setPaymentMsg] = useState("");
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [confirmingOnline, setConfirmingOnline] = useState(false);
  // Parcel states
  const [parcels, setParcels] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);

  // Online/Offline toggle state
  const [isOnline, setIsOnline] = useState(() => {
    try { return localStorage.getItem("riderOnline") === "true"; } catch {}
    return true; // default online to preserve current behavior
  });
  useEffect(() => {
    try { localStorage.setItem("riderOnline", String(isOnline)); } catch {}
  }, [isOnline]);

  // Emit rider availability to server (online/offline + vehicle type)
  useEffect(() => {
    try {
      const vehicleType = String(
        auth?.user?.vehicleType || auth?.user?.vehicle?.type || ""
      ).trim().toLowerCase();
      const riderId = auth?.user?._id || auth?.user?.id;
      socket.emit("riderAvailability", { isOnline, vehicleType, riderId });
    } catch (e) {
      console.warn("Failed to emit riderAvailability:", e);
    }
  }, [isOnline, auth?.user?.vehicleType, auth?.user?.vehicle?.type, auth?.user?._id]);

  // Emit rider current available location to server when online
  useEffect(() => {
    if (!isOnline || !riderLocation || riderLocation.lat == null || riderLocation.lng == null) return;
    try {
      const vehicleType = String(
        auth?.user?.vehicleType || auth?.user?.vehicle?.type || ""
      ).trim().toLowerCase();
      const riderId = auth?.user?._id || auth?.user?.id;
      socket.emit("riderAvailableLocation", { coords: riderLocation, vehicleType, riderId });
    } catch (e) {
      console.warn("Failed to emit riderAvailableLocation:", e);
    }
  }, [riderLocation, isOnline]);
  
  // Parcel OTP verification states
  const [parcelOtpDialogOpen, setParcelOtpDialogOpen] = useState(false);
  const [parcelOtp, setParcelOtp] = useState("");
  const [parcelOtpError, setParcelOtpError] = useState("");
  const [verifyingParcelOtp, setVerifyingParcelOtp] = useState(false);
  //  Logout
  const handleLogout = () => {
    logout();
    // Use window.location instead of navigate to avoid the insecure operation error
    window.location.href = "/rider-login";
  };
 
  //  Get rider's live location (updates every 5s)
  useEffect(() => {
    // First try to get position with getCurrentPosition for initial location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setRiderLocation(loc);
      },
      (err) => console.warn("Initial geolocation error:", err),
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
    );
   
    // Then set up watchPosition for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setRiderLocation(loc);
      },
      (err) => console.warn("Geolocation warning:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ðŸ”’ Restore active ride on reload so dashboard stays on same page
  useEffect(() => {
    const activeId = typeof window !== "undefined" && localStorage.getItem("riderActiveRideId");
    if (!activeId || !auth?.token) return;
    (async () => {
      try {
        const res = await axios.get(
          `${API_URL}/rides/${activeId}`,
          { headers: { Authorization: `Bearer ${auth?.token}` } }
        );
        const ride = res?.data?.ride;
        const status = String(ride?.status || "");
        if (ride && ["accepted", "in_progress"].includes(status)) {
          setSelectedRide(ride);
          if (ride.pickupCoords) setPickup(ride.pickupCoords);
          if (ride.dropCoords) setDrop(ride.dropCoords);
        } else {
          localStorage.removeItem("riderActiveRideId");
        }
      } catch (e) {
        console.warn("restore active ride warning:", e?.message || e);
      }
    })();
  }, [auth?.token]);



  //  Broadcast rider GPS to user in real time (Rapido-style)
  useEffect(() => {
    try {
      if (!riderLocation || !selectedRide?._id) return;
      // Only emit while ride is accepted or in progress
      const status = selectedRide.status || "accepted";
      if (["accepted", "in_progress"].includes(status)) {
        socket.emit("riderLocation", { rideId: selectedRide._id, coords: riderLocation });
      }
    } catch (e) {
      console.warn("riderLocation emit warning:", e.message);
    }
  }, [riderLocation, selectedRide]);
 
  // ðŸ”„ Fetch pending rides
  const fetchPendingRides = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/rides/pending`, {
        headers: { Authorization: `Bearer ${auth?.token}` },
      });
      const data = res.data.rides || [];
      const riderVehicleType = String(
        auth?.user?.vehicleType || auth?.user?.vehicle?.type || ""
      ).trim().toLowerCase();
      const filtered = riderVehicleType
        ? data.filter((r) => String(r?.requestedVehicleType || "").trim().toLowerCase() === riderVehicleType)
        : data;
      setRides(filtered);
    } catch (err) {
      console.warn("Rides fetch warning:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch parcels (recent)
  useEffect(() => {
    if (!SHOW_PARCELS_ON_DASHBOARD) return;
    (async () => {
      try {
        const riderVehicleType = String(
          auth?.user?.vehicleType || auth?.user?.vehicle?.type || ""
        ).trim().toLowerCase();
        const res = await axios.get(`${API_URL}/parcels`, {
          params: riderVehicleType ? { vehicleType: riderVehicleType } : {},
          headers: { Authorization: `Bearer ${auth?.token}` },
        });
        const parcels = res.data?.parcels || [];
        const filtered = riderVehicleType
          ? parcels.filter(
              (p) => {
                const reqType = String(p?.requiredVehicleType || "").trim().toLowerCase();
                const cat = String(p?.parcelCategory || "").trim().toLowerCase();
                if (reqType) return reqType === riderVehicleType;
                if (cat === "xerox") return riderVehicleType === "bike";
                return true;
              }
            )
          : parcels;
        // Hide completed parcels from dashboard; they appear in history
        const visible = filtered.filter((p) => String(p?.status || "").toLowerCase() !== "completed");
        setParcels(visible);
      } catch (err) {
        console.warn("Parcels fetch warning:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (isOnline) {
      fetchPendingRides();
      // Receive live ride requests (especially when DB is offline)
      const handleRideRequest = (ride) => {
        void 0;
        const riderVehicleType = String(
          auth?.user?.vehicleType || auth?.user?.vehicle?.type || ""
        ).trim().toLowerCase();
        const requestedType = String(ride?.requestedVehicleType || "").trim().toLowerCase();

        // Ignore rides that are not pending or already assigned
        if (String(ride?.status) !== "pending" || !!ride?.driverId) return;

        // Radius gate: only consider rides within 50 km of rider's current location
        let withinRadius = true;
        try {
          const p = ride?.pickupCoords;
          if (p && riderLocation && riderLocation.lat != null && riderLocation.lng != null && p.lat != null && p.lng != null) {
            const d = haversineKm(
              { lat: Number(riderLocation.lat), lng: Number(riderLocation.lng) },
              { lat: Number(p.lat), lng: Number(p.lng) }
            );
            withinRadius = Number.isFinite(d) ? d <= RIDE_RADIUS_KM : true; // keep if cannot compute
          }
        } catch (e) {
          withinRadius = true;
        }

        // Strict filter: show only rides that match this rider's vehicle type AND within radius
        if (withinRadius && requestedType && riderVehicleType && requestedType === riderVehicleType) {
          setRides((prev) => {
            const exists = prev.some((r) => r._id === ride._id);
            return exists ? prev : [ride, ...prev];
          });
        }
      };
      socket.on("rideRequest", handleRideRequest);
    } else {
      socket.off("rideRequest");
    }

    socket.on("rideAccepted", (ride) => {
      void 0;
      setSelectedRide(ride);
      try { localStorage.setItem("riderActiveRideId", ride._id); } catch {}
      if (ride.pickupCoords) setPickup(ride.pickupCoords);
      if (ride.dropCoords) setDrop(ride.dropCoords);
    });

    socket.on("rideRejected", () => {
      void 0;
      if (isOnline) fetchPendingRides();
    });

    // Remove accepted rides from other riders' lists
    socket.on("rideLocked", ({ rideId }) => {
      setRides((prev) => prev.filter((r) => String(r._id) !== String(rideId)));
    });

    // Remove accepted parcels from other riders' lists
    socket.on("parcelLocked", ({ parcelId }) => {
      setParcels((prev) => prev.filter((p) => String(p._id) !== String(parcelId)));
    });

    // Listen for parcel requests (bike riders only)
    const riderVehicleType = String(
      auth?.user?.vehicleType || auth?.user?.vehicle?.type || ""
    ).trim().toLowerCase();
    if (riderVehicleType === "bike") {
      socket.on("parcelRequest", (parcel) => {
        console.log("📦 Received parcel request:", parcel);
        // Add to parcels list if not already present
        setParcels((prev) => {
          const exists = prev.some((p) => p._id === parcel._id);
          return exists ? prev : [parcel, ...prev];
        });
      });
    } else {
      socket.off("parcelRequest");
    }

    return () => {
      socket.off("rideRequest");
      socket.off("rideAccepted");
      socket.off("rideRejected");
      socket.off("rideLocked");
      socket.off("parcelLocked");
      socket.off("parcelRequest");
    };
  }, [isOnline, riderLocation]);

  // Register rider into vehicle-type socket room
  useEffect(() => {
    try {
      const vType = String(
        auth?.user?.vehicleType || auth?.user?.vehicle?.type || ""
      ).trim().toLowerCase();
      if (vType) {
        socket.emit("registerRiderVehicleType", vType);
      }
    } catch (e) {
      console.warn("registerRiderVehicleType emit warning:", e.message);
    }
  }, [auth?.user?.vehicleType, auth?.user?.vehicle?.type]);

  // ðŸ‘‚ Listen for user's live GPS updates and display on map for accepted/in-progress ride
  useEffect(() => {
    const handler = ({ rideId, coords }) => {
      try {
        if (!selectedRide?._id) return;
        if (String(rideId) === String(selectedRide._id)) {
          setUserLiveCoords(coords);
        }
      } catch {
        setUserLiveCoords(coords);
      }
    };
    socket.on("userLocationUpdate", handler);
    return () => {
      socket.off("u2serLocationUpdate", handler);
    };
  }, [selectedRide]);

  // Fetch Admin UPI settings for QR scanner
  useEffect(() => {
    (async () => {
      try {
        const res = await getMerchantDetails();
        const bd = res?.data?.bankDetails;
        if (bd?.upiVpa) setMerchantVpa(bd.upiVpa);
        if (bd?.holderName) setMerchantName(bd.holderName);
      } catch (e) {
        // ignore; fallback to env
      }
    })();
  }, []);
 
  // ðŸš– Accept ride
  const handleAccept = async (rideId) => {
    try {
      const res = await axios.post(
        `${API_URL}/rides/${rideId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      setSelectedRide(res.data.ride);
      try { localStorage.setItem("riderActiveRideId", res.data.ride._id); } catch {}
 
      if (res.data.ride.pickupCoords) setPickup(res.data.ride.pickupCoords);
      if (res.data.ride.dropCoords) setDrop(res.data.ride.dropCoords);
     
      // Generate and send OTP to user
      generateAndSendOtp(res.data.ride._id);
    } catch (err) {
      alert("Failed to accept ride");
    }
  };
 
  // No need to generate OTP - user already has it
  const generateAndSendOtp = async (rideId) => {
    // We don't need to generate OTP here anymore
    // The user already has the OTP displayed on their booking page
    void 0;
  };

  // Restore ride OTP verification handler
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 4) {
      setOtpError("Please enter the 4-digit OTP");
      return;
    }

    setVerifyingOtp(true);
    setOtpError("");

    try {
      const res = await axios.post(
        `${API_URL}/rides/${selectedRide._id}/verify-otp`,
        { otp },
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const ok = res.data?.success || res.data?.ride?.status === "in_progress";
      if (ok) {
        setOtpDialogOpen(false);
        const updatedRide = res.data?.ride || { ...selectedRide, status: "in_progress" };
        // Preserve rider details if missing in response
        if (!updatedRide?.riderId && selectedRide?.riderId) {
          updatedRide.riderId = selectedRide.riderId;
        }
        setSelectedRide(updatedRide);
        alert("Ride started successfully!");
      } else {
        setOtpError(res.data?.message || "Invalid OTP");
      }
    } catch (apiError) {
      console.warn("Ride OTP API error:", apiError);
      const msg = apiError?.response?.data?.message || "Failed to verify OTP";
      setOtpError(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  

  // Accept parcel
  const handleAcceptParcel = async (parcelId) => {
    try {
      const res = await axios.post(
        `${API_URL}/parcels/${parcelId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const updated = res.data?.parcel;
      setParcels((prev) => prev.map((p) => (p._id === parcelId ? updated : p)));
      setSelectedParcel(updated);
      const p = updated?.pickup || updated?.pickupCoords;
      const d = updated?.drop || updated?.dropCoords;
      if (p) setPickup(p);
      if (d) setDrop(d);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (err?.response?.status === 401 ? "Authentication error. Please login again." : null) ||
        err?.message ||
        "Failed to accept parcel";
      alert(msg);
      try { console.warn("Accept parcel warning:", err?.response?.data || err); } catch {}
    }
  };

  // Reject parcel
  const handleRejectParcel = async (parcelId) => {
    try {
      const res = await axios.post(
        `${API_URL}/parcels/${parcelId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const updated = res.data?.parcel;
      setParcels((prev) => prev.map((p) => (p._id === parcelId ? updated : p)));
      if (selectedParcel?._id === parcelId) setSelectedParcel(updated);
    } catch (err) {
      alert("Failed to reject parcel");
    }
  };

  // View/select a parcel and sync map context
  const handleViewParcel = (parcel) => {
    try {
      if (!parcel) return;
      setSelectedParcel(parcel);
      const p = parcel?.pickup || parcel?.pickupCoords;
      const d = parcel?.drop || parcel?.dropCoords;
      if (p) setPickup(p);
      if (d) setDrop(d);
    } catch (e) {
      console.warn("handleViewParcel error:", e?.message || e);
    }
  };

  // Verify Parcel OTP
  const handleVerifyParcelOtp = async () => {
    if (!parcelOtp || parcelOtp.length !== 4) {
      setParcelOtpError("Please enter the 4-digit OTP");
      return;
    }
    setVerifyingParcelOtp(true);
    setParcelOtpError("");
    try {
      const res = await axios.post(
        `${API_URL}/parcels/${selectedParcel._id}/verify-otp`,
        { otp: parcelOtp },
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const ok = res.data?.success && res.data?.parcel?.status === "in_progress";
      if (ok) {
        setParcelOtpDialogOpen(false);
        const upd = res.data.parcel;
        setSelectedParcel(upd);
        const p = upd?.pickup || upd?.pickupCoords;
        const d = upd?.drop || upd?.dropCoords;
        if (p) setPickup(p);
        if (d) setDrop(d);
      } else {
        setParcelOtpError(res.data?.message || "Invalid OTP");
      }
    } catch (e) {
      const msg = e?.response?.data?.message || "Invalid OTP";
      setParcelOtpError(msg);
    } finally {
      setVerifyingParcelOtp(false);
    }
  };

  // One-time: mark parcel documents copied/hidden
  const handleMarkDocsCopied = async (parcelId) => {
    try {
      const res = await axios.post(
        `${API_URL}/parcels/${parcelId}/mark-docs-copied`,
        {},
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const updated = res.data?.parcel;
      setParcels((prev) => prev.map((p) => (p._id === parcelId ? updated : p)));
      if (selectedParcel?._id === parcelId) setSelectedParcel(updated);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to mark documents as copied";
      alert(msg);
      try { console.warn("Mark docs copied warning:", err?.response?.data || err); } catch {}
    }
  };

  // Download Xerox copy then mark deleted
  const handleDownloadXeroxCopy = async (parcel) => {
    try {
      const copy = parcel?.xeroxCopy;
      if (!copy?.url) {
        alert("No Xerox copy available");
        return;
      }
      const fileRes = await axios.get(copy.url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([fileRes.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = copy.originalName || 'xerox_copy';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      const res = await axios.post(
        `${API_URL}/parcels/${parcel._id}/copy/downloaded`,
        {},
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const updated = res.data?.parcel;
      setParcels((prev) => prev.map((p) => (p._id === parcel._id ? updated : p)));
      if (selectedParcel?._id === parcel._id) setSelectedParcel(updated);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to download/delete Xerox copy';
      alert(msg);
    }
  };
 

    
  //  Complete ride
  const handleCompleteRide = async () => {
    try {
      if (!selectedRide?._id) return;
      const res = await axios.post(
        `${API_URL}/rides/${selectedRide._id}/complete`,
        {},
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      const updated = res.data?.ride || { ...selectedRide, status: "completed" };
      // Preserve rider details if missing in response
      if (!updated?.riderId && selectedRide?.riderId) {
        updated.riderId = selectedRide.riderId;
      }
      setSelectedRide(updated);
      alert("Ride completed. User will proceed to payment.");
      // Keep selected ride visible so scanner appears here after completion
    } catch (err) {
      console.warn("Complete ride warning:", err);
      // graceful fallback
      const updated = { ...selectedRide, status: "completed" };
      setSelectedRide(updated);
      alert("Ride marked completed locally.");
      // Keep selected ride so scanner can be shown
    }
  };
 
  // Confirm payment as Online (manual confirmation by rider)
  const handleConfirmOnline = async () => {
    try {
      if (!selectedRide?._id) return;
      setConfirmingOnline(true);
      await confirmOnlinePayment({ rideId: selectedRide._id });
      setPaymentMsg("Online payment confirmed.");
      setSelectedRide(null);
      navigate("/rider-dashboard");
    } catch (err) {
      console.warn("Confirm online payment warning:", err);
      alert("Failed to confirm online payment");
    } finally {
      setConfirmingOnline(false);
    }
  };
 
  // Confirm payment as Cash (COD)
  const handleConfirmCash = async () => {
    try {
      if (!selectedRide?._id) return;
      setConfirmingCash(true);
      await markCashPayment({ rideId: selectedRide._id });
      setPaymentMsg("Cash payment confirmed.");
      setSelectedRide(null);
      navigate("/rider-dashboard");
    } catch (err) {
      console.warn("Confirm cash payment warning:", err);
      alert("Failed to confirm cash payment");
    } finally {
      setConfirmingCash(false);
    }
  };
 
  //  Reject ride
  const handleReject = async (rideId) => {
    try {
      await axios.post(
        `${API_URL}/rides/${rideId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      fetchPendingRides();
    } catch (err) {
      alert("Failed to reject ride");
    }
  };
 
  // Memo: display only rides within 50 km of rider's location; keep rides without coords
  const displayedRides = React.useMemo(() => {
    try {
      if (!Array.isArray(rides)) return [];
      const onlyPending = rides.filter((r) => String(r?.status) === "pending");
      const loc = riderLocation;
      const haveLoc = !!(loc && loc.lat != null && loc.lng != null);
      if (!haveLoc) return onlyPending;
      return onlyPending.filter((r) => {
        const p = r && r.pickupCoords;
        if (!p || p.lat == null || p.lng == null) return true; // keep if missing coords
        const d = haversineKm(
          { lat: Number(loc.lat), lng: Number(loc.lng) },
          { lat: Number(p.lat), lng: Number(p.lng) }
        );
        return Number.isFinite(d) && d <= RIDE_RADIUS_KM;
      });
    } catch {
      return rides.filter((r) => String(r?.status) === "pending");
    }
  }, [rides, riderLocation]);

  return (
    // Blue header + white card layout to match login/register pages
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a3d62, #1266f1)' }}>
      {/* Header with circular brand */}
      <Box sx={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 32, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          R
        </Box>
      </Box>

      {/* White form/content card overlapping header */}
      <Box sx={{ maxWidth: 980, mx: 'auto', px: 2 }}>
        <Paper elevation={6} sx={{ p: 3, borderRadius: 3, mt: '-80px', background: '#fff' }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, color: '#0a3d62' }}>
            Rider Dashboard
          </Typography>
 
          <Button
            variant="contained"
        sx={{
          bgcolor: "black",
          color: "white",
          mb: 2,
          "&:hover": { bgcolor: "#333" },
        }}
        onClick={handleLogout}
      >
        Logout
      </Button>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => setIsOnline((prev) => !prev)}
          sx={{
            bgcolor: isOnline ? "success.main" : "error.main",
            "&:hover": { bgcolor: isOnline ? "success.dark" : "error.dark" },
            fontWeight: 700,
          }}
        >
          {isOnline ? "Online" : "Offline"}
        </Button>
        <Typography variant="body2" color={isOnline ? "success.main" : "text.secondary"}>
          {isOnline ? "You are available for new rides." : "You are offline."}
        </Typography>
      </Box>
 
      {loading ? (
        <CircularProgress />
      ) : selectedRide ? (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6"> Ride Accepted</Typography>
              <Typography>
                <b>User:</b> {selectedRide.riderId?.fullName}
              </Typography>
              <Typography>
                <b>Phone:</b> {selectedRide.riderId?.mobile}
              </Typography>
              <Typography>
                <b>Pickup:</b> {selectedRide.pickup}
              </Typography>
              <Typography>
                <b>Drop:</b> {selectedRide.drop}
              </Typography>
              <Typography>
                <b>Distance:</b> {distance} km
              </Typography>
              <Typography>
                <b>ETA:</b> {duration}
              </Typography>
              <Typography>
                <b>Status:</b> {selectedRide.status === "in_progress" ? "Ride in Progress" : selectedRide.status === "completed" ? "Ride Completed" : "Waiting for OTP Verification"}
              </Typography>
              <Box mt={2}>
                <Button variant="contained" color="success" sx={{ mr: 2 }}>
                  Call 
                </Button>
                <Button variant="outlined" color="primary" sx={{ mr: 2 }}>
                  Chat 
                </Button>
                {selectedRide.status !== "in_progress" && selectedRide.status !== "completed" && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={openOtpDialog}
                  >
                    Verify OTP 
                  </Button>
                )}
                {selectedRide.status === "in_progress" && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleCompleteRide}
                    sx={{ ml: 2 }}
                  >
                    Complete Ride 
                  </Button>
                )}
                {selectedRide.status === "completed" && (
                  <Box sx={{ ml: 2, mt: 2 }}>
                    <Typography sx={{ fontWeight: "bold", color: "green", mb: 1 }}>
                      Ride Completed show this scanner to the user
                    </Typography>
                    {(() => {
                      const amount = Number(selectedRide?.finalPrice || 0);
                      if (!merchantVpa || !amount) return (
                        <Typography variant="caption" color="text.secondary">
                          Admin UPI not configured.
                        </Typography>
                      );
                      const qrParams = new URLSearchParams({
                        pa: merchantVpa,
                        pn: merchantName || 'Rider App',
                        am: String(amount.toFixed(2)),
                        cu: 'INR',
                        tn: 'Ride Payment',
                      });
                      const qrUpiUrl = `upi://pay?${qrParams.toString()}`;
                      const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUpiUrl)}`;
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                          <img src={qrImg} alt="Admin UPI QR" style={{ width: 180, height: 180 }} />
                          <Box>
                            <Typography variant="body2">Payee: {merchantName || 'Rider App'}</Typography>
                            <Typography variant="body2">UPI: {merchantVpa}</Typography>
                            <Typography variant="body2">Amount: ₹{amount.toFixed(2)}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              Ask user to scan and pay. Payment status updates on their side.
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })()}
                    {paymentMsg && (
                      <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                        {paymentMsg}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleConfirmOnline}
                        disabled={confirmingOnline}
                      >
                        {confirmingOnline ? "Confirming..." : "Confirm Paid (Online)"}
                      </Button>
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={handleConfirmCash}
                        disabled={confirmingCash}
                      >
                        {confirmingCash ? "Confirming..." : "Confirm Paid (Cash)"}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
 
          {/*  Google Map */}
          <Paper sx={{ p: 1 }}>
            <Map
              apiKey="AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo"
              pickup={pickup}
              setPickup={setPickup}
              setPickupAddress={setPickupAddress}
              drop={drop}
              setDrop={setDrop}
              setDropAddress={setDropAddress}
              riderLocation={riderLocation}
              setDistance={setDistance}
              setDuration={setDuration}
              // Show post-OTP route and vehicle overlays using ride status
              rideStarted={selectedRide?.status === "in_progress"}
              vehicleType={auth?.user?.vehicleType || auth?.user?.vehicle?.type}
              vehicleImage={auth?.user?.vehicle?.images?.[0]}

            />
          </Paper>
        </>
      ) : selectedParcel ? (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">Parcel Details</Typography>
              <Typography><b>Sender:</b> {selectedParcel.senderName} ({selectedParcel.senderMobile})</Typography>
              <Typography><b>Receiver:</b> {selectedParcel.receiverName} ({selectedParcel.receiverMobile})</Typography>
              <Typography><b>Category:</b> {selectedParcel.parcelCategory}</Typography>
              <Typography><b>Details:</b> {selectedParcel.parcelDetails}</Typography>
              <Typography><b>Pickup:</b> {selectedParcel.pickupAddress}</Typography>
              <Typography><b>Drop:</b> {selectedParcel.dropAddress}</Typography>
              <Typography><b>Status:</b> {selectedParcel.status || "pending"}</Typography>
              {selectedParcel.status === "pending" && (
                <Box mt={2}>
                  <Button variant="contained" color="success" onClick={() => handleAcceptParcel(selectedParcel._id)}>Accept</Button>
                  <Button variant="contained" color="error" sx={{ ml: 2 }} onClick={() => handleRejectParcel(selectedParcel._id)}>Reject</Button>
                </Box>
              )}
              {selectedParcel.status === "accepted" && (
                <Box mt={2}>
                  <Button variant="contained" color="primary" onClick={() => setParcelOtpDialogOpen(true)}>
                    Verify Parcel OTP
                  </Button>
                </Box>
              )}
              {/* Parcel documents — show only until rider marks copied */}
              {selectedParcel?.status === "in_progress"
                && String(selectedParcel?.parcelCategory || '').trim().toLowerCase() === 'xerox'
                && Array.isArray(selectedParcel?.documents)
                && selectedParcel.documents.length > 0
                && (selectedParcel.documentsVisibleToRider !== false) && (
              <Box mt={3}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {selectedParcel.documents.map((doc, idx) => {
                    const isImage = String(doc.mimetype || '').startsWith('image/');
                    const isPdf = String(doc.mimetype || '') === 'application/pdf';
                    return (
                      <Box key={idx} sx={{ border: '1px solid #eee', borderRadius: 2, p: 1 }}>
                        {isImage ? (
                          <img src={doc.url.startsWith('/') ? `${API_BASE}${doc.url}` : doc.url} alt={doc.originalName || `Doc ${idx+1}`} style={{ maxWidth: 220, maxHeight: 180, display: 'block' }} />
                        ) : (
                          <Button variant="outlined" size="small" onClick={() => window.open(doc.url.startsWith('/') ? `${API_BASE}${doc.url}` : doc.url, '_blank')}>{doc.originalName || 'View Document'}</Button>
                        )}
                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                          <Button variant="contained" size="small" onClick={() => handleDownloadDoc(doc, idx)}>Download</Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
                <Box mt={2}>
                  <Button variant="contained" color="warning" onClick={() => handleMarkDocsCopied(selectedParcel._id)}>
                    Xerox Documents
                  </Button>
                </Box>
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  After xerox documents will no longer be visible here.
                </Typography>
              </Box>
            )}
          </CardContent>
          </Card>

          <Paper sx={{ p: 1 }}>
            <Map
              apiKey="AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo"
              pickup={pickup}
              setPickup={setPickup}
              setPickupAddress={setPickupAddress}
              drop={drop}
              setDrop={setDrop}
              setDropAddress={setDropAddress}
              riderLocation={riderLocation}
              setDistance={setDistance}
              setDuration={setDuration}
              rideStarted={selectedParcel?.status === "in_progress"}
              vehicleType={auth?.user?.vehicleType || auth?.user?.vehicle?.type}
              vehicleImage={auth?.user?.vehicle?.images?.[0]}
            />
          </Paper>
        </>
      ) : (
        <>
          <Typography variant="h5" gutterBottom>
            Pending Ride Requests
          </Typography>
          {displayedRides.length === 0 ? (
            <Typography>No pending rides</Typography>
          ) : (
            displayedRides.map((ride) => (
              <Card key={ride._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography>
                    <b>Pickup:</b> {ride.pickup}
                  </Typography>
                  <Typography>
                    <b>Drop:</b> {ride.drop}
                  </Typography>
                  <Typography>Status: {ride.status}</Typography>
                  <Box mt={2}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleAccept(ride._id)}
                    >
                      Accept  
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      sx={{ ml: 2 }}
                      onClick={() => handleReject(ride._id)}
                    >
                      Reject 
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}

{SHOW_PARCELS_ON_DASHBOARD ? (
          <>
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Recent Parcels
          </Typography>
          {parcels.filter(p => String(p.status || '').toLowerCase() !== 'completed').length === 0 ? (
            <Typography>No parcels</Typography>
          ) : (
            parcels.filter(p => String(p.status || '').toLowerCase() !== 'completed').map((p) => (
              <Card key={p._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography><b>Sender:</b> {p.senderName} ({p.senderMobile})</Typography>
                  <Typography><b>Receiver:</b> {p.receiverName} ({p.receiverMobile})</Typography>
                  <Typography><b>Category:</b> {p.parcelCategory}</Typography>
                  <Typography><b>Pickup:</b> {p.pickupAddress}</Typography>
                  <Typography><b>Drop:</b> {p.dropAddress}</Typography>
                  <Typography>Status: {p.status || 'pending'}</Typography>
                  <Box mt={2}>
                     {p.status === "pending" && (
                       <>
                         <Button variant="contained" color="success" sx={{ ml: 2 }} onClick={() => handleAcceptParcel(p._id)}>Accept</Button>
                         <Button variant="contained" color="error" sx={{ ml: 2 }} onClick={() => handleRejectParcel(p._id)}>Reject</Button>
                       </>
                     )}
                     {p.status === "accepted" && (
                       <Button variant="contained" color="primary" sx={{ ml: 2 }} onClick={() => { handleViewParcel(p); setParcelOtpDialogOpen(true); }}>
                         Verify OTP
                       </Button>
                     )}
                     {p?.status === "in_progress" && Array.isArray(p?.documents) && p.documents.length > 0 && (p.documentsVisibleToRider !== false) && (String(p?.assignedRider?.id || '') === String(auth?.user?._id || '')) && (
                       <>
                         <Button variant="outlined" sx={{ ml: 2 }} onClick={() => handleViewParcel(p)}>
                           View Documents
                         </Button>
                         {String(p?.parcelCategory || '').trim().toLowerCase() === 'xerox' && (
                           <Button variant="contained" color="primary" sx={{ ml: 2 }} onClick={() => handleDownloadXeroxCopy(p)}>
                             Download & mark copied
                           </Button>
                         )}
                       </>
                     )}

                  </Box>
                </CardContent>
              </Card>
            ))
          )}
          </>
        ) : null}
        </>
      )}
 
      {/* OTP Verification Dialog */}
      {/* OTP Verification Dialog */}
<Dialog open={otpDialogOpen} onClose={() => { setOtpDialogOpen(false); setOtp(""); setOtpError(""); }}>
  <DialogTitle>Enter OTP to Start Ride</DialogTitle>
  <DialogContent>
    <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
      Ask the user for the 4-digit OTP displayed on their booking page.
    </Typography>
    <Typography variant="body2" sx={{ mb: 2 }}>
      The user can see this OTP in their ride details. Enter it below to start the ride.
    </Typography>
    <TextField
  fullWidth
  label="Enter 4-digit OTP"
  value={otp}
  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} // only digits
  error={!!otpError}
  helperText={otpError}
  margin="normal"
  type="text"   // changed from number
  inputProps={{ maxLength: 4 }}
  autoFocus
/>
 
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOtpDialogOpen(false)}>Cancel</Button>
    <Button
      onClick={handleVerifyOtp}
      variant="contained"
      color="primary"
      disabled={verifyingOtp || (otp || "").length !== 4}
    >
      {verifyingOtp ? <CircularProgress size={24} /> : "Verify & Start Ride"}
    </Button>
  </DialogActions>
</Dialog>

      {/* Parcel OTP Verification Dialog */}
<Dialog open={parcelOtpDialogOpen} onClose={() => setParcelOtpDialogOpen(false)}>
  <DialogTitle>Enter OTP to Start Parcel Pickup</DialogTitle>
  <DialogContent>
    <Typography variant="body2" sx={{ mb: 2 }}>
      Ask the sender for the 4-digit OTP shown on their Activity page.
    </Typography>
    <TextField
      fullWidth
      label="Enter 4-digit OTP"
      value={parcelOtp}
      onChange={(e) => setParcelOtp(e.target.value.replace(/\D/g, ""))}
      error={!!parcelOtpError}
      helperText={parcelOtpError}
      margin="normal"
      type="text"
      inputProps={{ maxLength: 4 }}
      autoFocus
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setParcelOtpDialogOpen(false)}>Cancel</Button>
    <Button
      onClick={handleVerifyParcelOtp}
      variant="contained"
      color="primary"
      disabled={verifyingParcelOtp || (parcelOtp || "").length !== 4}
    >
      {verifyingParcelOtp ? <CircularProgress size={24} /> : "Verify & Start Parcel"}
    </Button>
  </DialogActions>
</Dialog>

        </Paper>
      </Box>
    </Box>
  );
}
 

// Helper: sanitize URL strings coming from DB or user input
const sanitizeUrl = (raw) => {
  try {
    let s = String(raw || "");
    s = s.trim();
    // remove wrapping backticks or quotes
    s = s.replace(/^`+|`+$/g, "");
    s = s.replace(/^"+|"+$/g, "");
    s = s.replace(/^'+|'+$/g, "");
    return s;
  } catch (_) {
    return String(raw || "").trim();
  }
};

// Helper: build Cloudinary attachment URL to force download
// ... existing code ...

// Trigger download for a single document
const _handleDownloadDocLegacy = async (doc, idx) => {
  const raw = String(doc?.url || "");
  const url = sanitizeUrl(raw);
  const filename = doc?.originalName || "document";
  try {
    // Prefer backend streaming endpoint to avoid Cloudinary auth/CORS issues
    const hasSelected = typeof selectedParcel !== "undefined" && selectedParcel && selectedParcel._id != null;
    if (hasSelected && Number.isInteger(idx)) {
      try {
        const dlRes = await axios.get(`${API_URL}/parcels/${selectedParcel._id}/documents/${idx}/download`, { responseType: "blob", headers: { Authorization: `Bearer ${auth?.token}` } });
        const blob = new Blob([dlRes.data], { type: doc?.mimetype || dlRes.headers["content-type"] || "application/octet-stream" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename.replace(/[\\\/:*?"<>|]+/g, "_");
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
        return;
      } catch (e) {
        console.warn("Backend streaming download failed", e?.response?.status, e?.response?.data);
        // Fall through to direct URL attempts
      }
    }
 
    // Cloudinary direct attachment URL
    if (url?.includes("res.cloudinary.com")) {
      const attachmentUrl = toCloudinaryAttachmentUrl(url, filename);
      // Try programmatic fetch first
      try {
        const resp = await fetch(attachmentUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename.replace(/[\\\/:*?"<>|]+/g, "_");
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      } catch (e) {
        console.warn("Direct Cloudinary fetch failed", e);
        // Fallback to original Cloudinary URL (no attachment flag)
        try {
          const resp2 = await fetch(url);
          if (!resp2.ok) throw new Error(`HTTP ${resp2.status}`);
          const blob2 = await resp2.blob();
          const a2 = document.createElement("a");
          a2.href = URL.createObjectURL(blob2);
          a2.download = filename.replace(/[\\\/:*?"<>|]+/g, "_");
          a2.click();
          URL.revokeObjectURL(a2.href);
          return;
        } catch (e2) {
          console.warn("Fallback to original Cloudinary URL failed", e2);
          // Final fallback: open the original URL in a new tab (cross-origin safe)
          try {
            const a3 = document.createElement("a");
            a3.href = url;
            a3.target = "_blank";
            a3.rel = "noopener";
            document.body.appendChild(a3);
            a3.click();
            a3.remove();
            return;
          } catch (_) {}
        }
      }
    }
 
    // Local or other URLs
    const fileUrl = url.startsWith("/") ? `${API_BASE}${url}` : url;
    try {
      const res = await axios.get(fileUrl, { responseType: "blob" });
      const blob = new Blob([res.data], { type: doc?.mimetype || res.headers["content-type"] || "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename.replace(/[\\\/:*?"<>|]+/g, "_");
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
      return;
    } catch (xhrErr) {
      console.warn("XHR blob fetch failed, opening URL directly", xhrErr?.message || xhrErr);
      // Last resort: open the URL directly in a new tab
      const a = document.createElement("a");
      a.href = fileUrl;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
  } catch (err) {
    console.warn("Download warning", err?.response?.status, err?.response?.data || err);
    alert("Failed to download document");
  }
};

// Helper: build Cloudinary attachment URL to force download
const _toCloudinaryAttachmentUrlLegacy = (url, filename) => {
  try {
    const clean = sanitizeUrl(url);
    const u = new URL(clean);
    if (!u.hostname.includes("res.cloudinary.com")) return clean;
    const parts = u.pathname.split("/");
    const idx = parts.indexOf("upload");
    if (idx === -1) return clean;
    const safeName = (filename || "document").replace(/[\/:*?"<>|]+/g, "_");
    const attach = `fl_attachment:${safeName}`;
    const next = parts[idx + 1] || "";
    // If there's already a transformation chain, merge into it; otherwise insert a new segment
    if (next && (next.includes(":") || next.includes(","))) {
      if (!next.includes("fl_attachment")) {
        parts[idx + 1] = `${next},${attach}`;
      }
    } else {
      parts.splice(idx + 1, 0, attach);
    }
    u.pathname = parts.join("/");
    return u.toString();
  } catch (e) {
    return sanitizeUrl(url);
  }
};
 
// Trigger download for a single document
const handleDownloadDoc = async (doc, idx) => {
  const raw = String(doc?.url || "");
  const url = sanitizeUrl(raw);
  const filename = doc?.originalName || "document";
  try {
    // Prefer backend streaming endpoint to avoid Cloudinary auth/CORS issues
    const hasSelected = typeof selectedParcel !== "undefined" && selectedParcel && selectedParcel._id != null;
    if (hasSelected && Number.isInteger(idx)) {
      try {
        const dlRes = await axios.get(`${API_URL}/parcels/${selectedParcel._id}/documents/${idx}/download`, { responseType: "blob", headers: { Authorization: `Bearer ${auth?.token}` } });
        const blob = new Blob([dlRes.data], { type: doc?.mimetype || dlRes.headers["content-type"] || "application/octet-stream" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename.replace(/[\\\/:*?"<>|]+/g, "_");
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
        return;
      } catch (e) {
        console.warn("Backend streaming download failed", e?.response?.status, e?.response?.data);
        // Fall through to direct URL attempts
      }
    }
 
    // Cloudinary direct attachment URL
    if (url?.includes("res.cloudinary.com")) {
      const attachmentUrl = toCloudinaryAttachmentUrl(url, filename);
      // Try programmatic fetch first
      try {
        const resp = await fetch(attachmentUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename.replace(/[\\\/:*?"<>|]+/g, "_");
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      } catch (e) {
        console.warn("Direct Cloudinary fetch failed", e);
        // Fallback to original Cloudinary URL (no attachment flag)
        try {
          const resp2 = await fetch(url);
          if (!resp2.ok) throw new Error(`HTTP ${resp2.status}`);
          const blob2 = await resp2.blob();
          const a2 = document.createElement("a");
          a2.href = URL.createObjectURL(blob2);
          a2.download = filename.replace(/[\\\/:*?"<>|]+/g, "_");
          a2.click();
          URL.revokeObjectURL(a2.href);
          return;
        } catch (e2) {
          console.warn("Fallback to original Cloudinary URL failed", e2);
          // Final fallback: open the original URL in a new tab (cross-origin safe)
          try {
            const a3 = document.createElement("a");
            a3.href = url;
            a3.target = "_blank";
            a3.rel = "noopener";
            document.body.appendChild(a3);
            a3.click();
            a3.remove();
            return;
          } catch (_) {}
        }
      }
    }
 
    // Local or other URLs
    const fileUrl = url.startsWith("/") ? `${API_BASE}${url}` : url;
    try {
      const res = await axios.get(fileUrl, { responseType: "blob" });
      const blob = new Blob([res.data], { type: doc?.mimetype || res.headers["content-type"] || "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename.replace(/[\\\/:*?"<>|]+/g, "_");
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
      return;
    } catch (xhrErr) {
      console.warn("XHR blob fetch failed, opening URL directly", xhrErr?.message || xhrErr);
      // Last resort: open the URL directly in a new tab
      const a = document.createElement("a");
      a.href = fileUrl;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
  } catch (err) {
    console.warn("Download warning", err?.response?.status, err?.response?.data || err);
    alert("Failed to download document");
  }
};