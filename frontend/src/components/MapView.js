import React, { useEffect, useState } from "react";

/**
 * Minimal MapView: shows pickup/drop coordinates or uses Geolocation.
 * Replace with real map (Leaflet / Google Maps) when integrating.
 */
export default function MapView({ pickup, drop }) {
  const [coords, setCoords] = useState({ lat: null, lng: null });
  useEffect(() => {
    if (pickup && pickup.includes(",")) {
      const [lat, lng] = pickup.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) setCoords({ lat, lng });
    } else {
      // try browser location
      navigator.geolocation?.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
  }, [pickup]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 8 }}>
      <h4>Map</h4>
      {coords.lat ? (
        <div>
          <div>Lat: {coords.lat.toFixed(6)}</div>
          <div>Lng: {coords.lng.toFixed(6)}</div>
          <div style={{ marginTop: 8 }}>
            {/* Simple static map using OpenStreetMap embed (no API key) */}
            <iframe
              title="map"
              width="100%"
              height="220"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng-0.01}%2C${coords.lat-0.01}%2C${coords.lng+0.01}%2C${coords.lat+0.01}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
              style={{ border: 0 }}
            />
          </div>
        </div>
      ) : (
        <div>Loading location...</div>
      )}
      {drop && <div style={{ marginTop: 8 }}><strong>Drop:</strong> {drop}</div>}
    </div>
  );
}

