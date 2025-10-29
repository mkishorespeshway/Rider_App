import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
// Create a new socket connection for each tab instance
const socket = io(API_BASE, {
  query: { tabId: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` },
  forceNew: true, // Force a new connection for each tab
  reconnection: true
});

function AutoFitBounds({ riderPos, driverPos }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (!riderPos && !driverPos) return;
    const bounds = [];
    if (riderPos) bounds.push([riderPos.lat, riderPos.lng]);
    if (driverPos) bounds.push([driverPos.lat, driverPos.lng]);
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [map, riderPos, driverPos]);
  return null;
}

export default function RideTrack() {
  const { id } = useParams();
  const [riderPos, setRiderPos] = useState(null);
  const [driverPos, setDriverPos] = useState(null);

  // Icons (black & white theme friendly)
  const riderIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    iconSize: [30, 30],
  });
  const driverIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/1946/1946406.png",
    iconSize: [35, 35],
  });

  useEffect(() => {
    // Rider GPS
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setRiderPos(coords);
      socket.emit("riderLocation", { rideId: id, coords });
    });

    // Listen for driver updates
    const handler = ({ rideId, coords }) => {
      if (String(rideId) === String(id)) {
        setDriverPos(coords);
      }
    };
    socket.on("driverLocationUpdate", handler);

    return () => {
      socket.off("driverLocationUpdate", handler);
      navigator.geolocation.clearWatch?.(watchId);
    };
  }, [id]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      {riderPos && (
        <MapContainer center={riderPos} zoom={14} className="map-fullscreen">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <AutoFitBounds riderPos={riderPos} driverPos={driverPos} />
          {riderPos && <Marker position={riderPos} icon={riderIcon} />}
          {driverPos && <Marker position={driverPos} icon={driverIcon} />} 
          {riderPos && driverPos && (
            <Polyline positions={[riderPos, driverPos]} pathOptions={{ color: "black", weight: 4 }} />
          )}
        </MapContainer>
      )}
    </div>
  );
}
