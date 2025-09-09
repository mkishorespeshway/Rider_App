import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import LiveTracker from "../components/LiveTracker";

export default function RideTrack() {
  const { id } = useParams();
  const [ride, setRide] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get(`/rides/${id}`);
        if (mounted) setRide(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || "Could not load ride");
      }
    };
    load();
    return () => (mounted = false);
  }, [id]);

  if (error) return <div>{error}</div>;
  if (!ride) return <div>Loading ride...</div>;

  return (
    <div>
      <h2>Ride Tracking</h2>
      <div>
        <strong>Driver:</strong> {ride.driver?.name || "Waiting for driver"}<br />
        <strong>Status:</strong> {ride.status}
      </div>

      <LiveTracker rideId={id} />
    </div>
  );
}

