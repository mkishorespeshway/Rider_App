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
const socket = io(API_BASE);
 
export default function RiderDashboard() {
  const [rides, setRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  // Admin UPI info for scanner display
  const [merchantVpa, setMerchantVpa] = useState(process.env.REACT_APP_MERCHANT_VPA || null);
  const [merchantName, setMerchantName] = useState("Rider App");
 
  // OTP verification states
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
 
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
 
  //  Logout
  const handleLogout = () => {
    logout();
    navigate("/rider-login");
  };
 
  //  Get rider's live location (updates every 5s)
  useEffect(() => {
    // First try to get position with getCurrentPosition for initial location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setRiderLocation(loc);
      },
      (err) => console.log("Initial geolocation error:", err),
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

  // 🔒 Restore active ride on reload so dashboard stays on same page
  useEffect(() => {
    const activeId = typeof window !== "undefined" && localStorage.getItem("riderActiveRideId");
    if (!activeId || !auth?.token) return;
    (async () => {
      try {
        const res = await axios.get(
  `http://localhost:5000/api/rides/${activeId}`,
  {
    headers: {
      Authorization: `Bearer ${auth?.token}`
    }
  }
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
        // If fetch fails, keep normal dashboard flow
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
 
  // 🔄 Fetch pending rides
  const fetchPendingRides = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/rides/pending", {
        headers: { Authorization: `Bearer ${auth?.token}` },
      });
      const data = res.data.rides || [];
      // Frontend safety filter: ensure only rides matching this rider's vehicle type are shown
      const riderVehicleType = String(
        auth?.user?.vehicleType || auth?.user?.vehicle?.type || ""
      ).trim().toLowerCase();
      const filtered = riderVehicleType
        ? data.filter((r) => String(r?.requestedVehicleType || "").trim().toLowerCase() === riderVehicleType)
        : data;
      setRides(filtered);
    } catch (err) {
      console.warn("❌ Rides fetch warning:", err);
    } finally {
      setLoading(false);
    }
  };

 
  useEffect(() => {
    fetchPendingRides();

    // Receive live ride requests (especially when DB is offline)
    socket.on("rideRequest", (ride) => {
      console.log(" 🚖 Incoming ride request:", ride);
      const riderVehicleType = String(
        auth?.user?.vehicleType || auth?.user?.vehicle?.type || ""
      ).trim().toLowerCase();
      const requestedType = String(ride?.requestedVehicleType || "").trim().toLowerCase();

       // Strict filter: show only rides that match this rider's vehicle type
      if (requestedType && riderVehicleType && requestedType === riderVehicleType) {
        setRides((prev) => {
          const exists = prev.some((r) => r._id === ride._id);
          return exists ? prev : [ride, ...prev];
        });
      }
    });

    socket.on("rideAccepted", (ride) => {
      console.log("✅ Ride accepted event:", ride);
      setSelectedRide(ride);
      try { localStorage.setItem("riderActiveRideId", ride._id); } catch {}

      if (ride.pickupCoords) setPickup(ride.pickupCoords);
      if (ride.dropCoords) setDrop(ride.dropCoords);
    });
 
    socket.on("rideRejected", () => {
      console.log("❌ Ride rejected event");
      fetchPendingRides();
    });
 
    return () => {
      socket.off("rideRequest");
      socket.off("rideAccepted");
      socket.off("rideRejected");
    };
  }, []);

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

  // 👂 Listen for user's live GPS updates and display on map for accepted/in-progress ride
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
 
  // 🚖 Accept ride
  const handleAccept = async (rideId) => {
    try {
      const res = await axios.post(
        `http://localhost:5000/api/rides/${rideId}/accept`,
        {},
        {headers: { Authorization: `Bearer ${auth?.token}` }, }
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
    console.log("Ride accepted, waiting for user to share OTP");
  };
 
 // Verify OTP
  const handleVerifyOtp = async () => {
    // Basic input validation
    if (!otp || otp.length !== 4) {
      setOtpError("Please enter the 4-digit OTP");
      return;
    }
 
    setVerifyingOtp(true);
    setOtpError("");

    try {
      // 1) Fetch ride to compare locally with stored OTP
      const rideRes = await axios.get(
  `http://localhost:5000/api/rides/${selectedRide._id}`,
  {
    headers: {
      Authorization: `Bearer ${auth?.token}`
    }
  }
);

      const serverRide = rideRes?.data?.ride;
      let serverOtp = serverRide?.rideOtp ? String(serverRide.rideOtp) : null;

      if (!serverOtp) {
        // OTP may be in-flight from user's booking page; wait and retry a few times
        let fetchedOtp = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise((r) => setTimeout(r, 700));
          try {
            const retryRes = await axios.get(
  `http://localhost:5000/api/rides/${selectedRide._id}`,
  {
    headers: {
      Authorization: `Bearer ${auth?.token}`
    }
  }
);

            const retryRide = retryRes?.data?.ride;
            const retryOtp = retryRide?.rideOtp ? String(retryRide.rideOtp) : null;
            if (retryOtp) {
              fetchedOtp = retryOtp;
              break;
            }
          } catch {}
        }
        if (!fetchedOtp) {
          // Socket fallback: request OTP from the booking user and wait briefly
          try {
            const userId =
              (serverRide && serverRide.riderId && serverRide.riderId._id) ||
              (serverRide && serverRide.riderId) ||
              (selectedRide && selectedRide.riderId && selectedRide.riderId._id) ||
              (selectedRide && selectedRide.riderId) ||
              null;
            if (userId) {
              fetchedOtp = await new Promise((resolve) => {
                const handler = ({ rideId, otp }) => {
                  if (String(rideId) === String(selectedRide._id) && otp) {
                    socket.off("rideOtpForRider", handler);
                    resolve(String(otp));
                  }
                };
                const timeout = setTimeout(() => {
                  socket.off("rideOtpForRider", handler);
                  resolve(null);
                }, 2000);
                socket.on("rideOtpForRider", handler);
                socket.emit("requestRideOtp", { userId, rideId: selectedRide._id });
              });
            }
          } catch {}
          if (!fetchedOtp) {
            // Final fallback: attempt backend verification which safely persists OTP when allowed
            try {
              const res = await axios.post(
  `http://localhost:5000/api/rides/${selectedRide._id}/verify-otp`,
  { otp },
  {
    headers: {
      Authorization: `Bearer ${auth?.token}`
    }
  }
);

              const ok = res.data?.success && res.data?.ride?.status === "in_progress";
              if (ok) {
                setOtpDialogOpen(false);
                const updatedRide = { ...selectedRide, status: "in_progress" };
                setSelectedRide(updatedRide);
                setVerifyingOtp(false);
                setOtpError("");
                return;
              }
            } catch (e) {
              // continue to show guidance below
            }
            setOtpError("OTP not set yet by user. Ask user to share.");
            return;
          }
        }
        // Use fetched OTP for subsequent checks
        serverOtp = fetchedOtp;
      }
      if (String(otp) !== serverOtp) {
        setOtpError("Invalid OTP. Please enter the code shared by user.");
        return;
      }

      // 2) Call server to start ride after local match
      const res = await axios.post(
  `http://localhost:5000/api/rides/${selectedRide._id}/verify-otp`,
  { otp },
  {
    headers: {
      Authorization: `Bearer ${auth?.token}`
    }
  }
);


      const serverStatusOk = res.data?.success && res.data?.ride?.status === "in_progress";
      const serverOtpEcho = res.data?.ride?.rideOtp ? String(res.data.ride.rideOtp) : null;
      const serverOtpMatches = serverOtpEcho && serverOtpEcho === String(otp);

      if (serverStatusOk && serverOtpMatches) {
        setOtpDialogOpen(false);
        const updatedRide = { ...selectedRide, status: "in_progress" };
        setSelectedRide(updatedRide);
        try { localStorage.setItem("riderActiveRideId", selectedRide._id); } catch {}
      } else {
        setOtpError(res.data?.message || "Invalid OTP");
      }
    } catch (apiError) {
      const msg = apiError?.response?.data?.message || "Invalid OTP";
      setOtpError(msg);
    } finally {
      setVerifyingOtp(false);
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
      const amount = Number(selectedRide?.finalPrice || selectedRide?.estimatedPrice || 0);
      await confirmOnlinePayment({ rideId: selectedRide._id, amount });
      setPaymentMsg("Online payment confirmed.");
      setSelectedRide((prev) => ({ ...prev, paymentStatus: "completed", paymentMethod: "online" }));
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
      const amount = Number(selectedRide?.finalPrice || selectedRide?.estimatedPrice || 0);
      await markCashPayment({ rideId: selectedRide._id, amount });
      setPaymentMsg("Cash payment confirmed.");
      setSelectedRide((prev) => ({ ...prev, paymentStatus: "completed", paymentMethod: "COD" }));
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
 
  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
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
 
      {loading ? (
        <CircularProgress />
      ) : selectedRide ? (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">🚖 Ride Accepted</Typography>
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
                  Call 📞
                </Button>
                <Button variant="outlined" color="primary" sx={{ mr: 2 }}>
                  Chat 💬
                </Button>
                {selectedRide.status !== "in_progress" && selectedRide.status !== "completed" && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setOtpDialogOpen(true)}
                  >
                    Verify OTP 🔐
                  </Button>
                )}
                {selectedRide.status === "in_progress" && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleCompleteRide}
                    sx={{ ml: 2 }}
                  >
                    Complete Ride ✅
                  </Button>
                )}
                {selectedRide.status === "completed" && (
                  <Box sx={{ ml: 2, mt: 2 }}>
                    <Typography sx={{ fontWeight: "bold", color: "green", mb: 1 }}>
                      Ride Completed � show this scanner to the user
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
                            <Typography variant="body2">Amount: ?{amount.toFixed(2)}</Typography>
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
      ) : (
        <>
          <Typography variant="h5" gutterBottom>
            Pending Ride Requests
          </Typography>
          {rides.length === 0 ? (
            <Typography>No pending rides</Typography>
          ) : (
            rides.map((ride) => (
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
                      Accept  ✅
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      sx={{ ml: 2 }}
                      onClick={() => handleReject(ride._id)}
                    >
                      Reject ❌
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}
 
      {/* OTP Verification Dialog */}
      {/* OTP Verification Dialog */}
<Dialog open={otpDialogOpen} onClose={() => setOtpDialogOpen(false)}>
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
 
    </Box>
  );
}
 
