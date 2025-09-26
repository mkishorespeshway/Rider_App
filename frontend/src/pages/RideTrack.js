import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function RideTrack() {
  const { id } = useParams();
  const [riderPos, setRiderPos] = useState(null);
  const [driverPos, setDriverPos] = useState(null);

  // Icons
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
    navigator.geolocation.watchPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setRiderPos(coords);
      socket.emit("riderLocation", { rideId: id, coords });
    });

    // Listen for driver updates
    socket.on("driverLocationUpdate", ({ rideId, coords }) => {
      if (rideId === parseInt(id)) {
        setDriverPos(coords);
      }
    });

    return () => {
      socket.off("driverLocationUpdate");
    };
  }, [id]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      {riderPos && (
        <MapContainer center={riderPos} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
