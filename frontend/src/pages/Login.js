import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const { requestOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const sendOtp = async () => {
    setErr("");
    try {
      setLoading(true);
      await requestOtp(phone);
      setSent(true);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setErr("");
    try {
      setLoading(true);
      const res = await loginWithOtp(phone, otp);
      // redirect to booking after login
      navigate("/booking");
    } catch (e) {
      setErr(e?.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>Login / OTP</h2>
      <div>
        <label>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+911234567890" />
      </div>
      {!sent ? (
        <button onClick={sendOtp} disabled={!phone || loading}>Send OTP</button>
      ) : (
        <>
          <div>
            <label>OTP</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
          </div>
          <button onClick={verify} disabled={!otp || loading}>Verify & Login</button>
        </>
      )}
      {err && <div style={{ color: "red" }}>{err}</div>}
      <div style={{ marginTop: 16 }}>
        <small>Don't have an account? <a href="/register">Register</a></small>
      </div>
    </div>
  );
}

