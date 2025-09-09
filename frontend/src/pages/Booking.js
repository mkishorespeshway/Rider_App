import React, { useState, useEffect } from "react";
import api from "../services/api";
import RideCard from "../components/RideCard";
import MapView from "../components/MapView";
import { useNavigate } from "react-router-dom";

export default function Booking() {
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // optionally fetch something on mount
  }, []);

  const book = async () => {
    try {
      setLoading(true);
      const res = await api.post("/rides", { pickup, drop });
      // server returns ride id
      const ride = res.data;
      navigate(`/ride/${ride._id}`);
    } catch (err) {
      alert(err?.response?.data?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const findDrivers = async () => {
    // example API to list nearest drivers
    try {
      const res = await api.get("/drivers/nearby", { params: { pickup } });
      setAvailableDrivers(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
      <div>
        <h2>Book a Ride</h2>
        <div>
          <label>Pickup</label>
          <input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Pickup address or lat,lng" />
        </div>
        <div>
          <label>Drop</label>
          <input value={drop} onChange={(e) => setDrop(e.target.value)} placeholder="Drop address" />
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={book} disabled={!pickup || !drop || loading}>Book Now</button>
          <button onClick={findDrivers} style={{ marginLeft: 8 }}>Find Drivers</button>
        </div>

        <h3 style={{ marginTop: 20 }}>Available drivers</h3>
        {availableDrivers.map((d) => <RideCard key={d._id} driver={d} />)}
      </div>

      <aside style={{ borderLeft: "1px solid #eee", paddingLeft: 16 }}>
        <MapView pickup={pickup} drop={drop} />
        <div style={{ marginTop: 12 }}>
          <h4>Quick actions</h4>
          <button onClick={() => navigate("/history")}>Ride History</button>
          <button onClick={() => navigate("/profile")} style={{ marginLeft: 8 }}>Profile</button>
        </div>
      </aside>
    </div>
  );
}

