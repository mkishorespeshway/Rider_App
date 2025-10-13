import React, { useEffect, useState, useRef } from "react";
import api from "../services/api";

/**
 * LiveTracker polls the backend for ride location/updates.
 * For production, prefer WebSocket or push notifications.
 */
export default function LiveTracker({ rideId }) {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    let mounted = true;
    const fetchLocation = async () => {
      try {
        const res = await api.get(`/rides/${rideId}/location`);
        if (!mounted) return;
        setPosition(res.data.position);
        setStatus(res.data.status);
      } catch (e) {
        console.warn("LiveTracker warning:", e);
      }
    };

    fetchLocation();
    timer.current = setInterval(fetchLocation, 4000);

    return () => {
      mounted = false;
      clearInterval(timer.current);
    };
  }, [rideId]);

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Live Tracker</h3>
      <div>Status: {status}</div>
      {position ? (
        <div>
          <div>Driver Location: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</div>
          <iframe
            title="live-map"
            width="100%"
            height="280"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${position.lng-0.01}%2C${position.lat-0.01}%2C${position.lng+0.01}%2C${position.lat+0.01}&layer=mapnik&marker=${position.lat}%2C${position.lng}`}
            style={{ border: 0, marginTop: 8 }}
          />
        </div>
      ) : (
        <div>Waiting for driver location...</div>
      )}
    </div>
  );
}

