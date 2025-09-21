import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function RiderOtpLogin() {
  const [riderId, setRiderId] = useState(""); // ideally passed from approval link or stored in localStorage
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/rider/verify-otp", { riderId, otp });
      if (res.data.success) {
        localStorage.setItem("token", "dummy-jwt"); // replace with real token if you issue one
        localStorage.setItem("role", "rider");
        navigate("/rider-dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto" }}>
      <h2>Rider OTP Verification</h2>
      <form onSubmit={handleVerify}>
        <input
          type="text"
          placeholder="Rider ID"
          value={riderId}
          onChange={(e) => setRiderId(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
        />
        <button type="submit">Verify OTP</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
