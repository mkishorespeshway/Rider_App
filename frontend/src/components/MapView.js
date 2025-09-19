import React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function LocationSelector({ onMapClick, activeType }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onMapClick?.(lat, lng, activeType);
    },
  });
  return null;
}

export default function MapView({
  pickupCoords,
  dropCoords,
  onMapClick,
  activeType,
  onLoad,
}) {
  const defaultPosition = [14.42101, 78.231227];

  const mapCenter = pickupCoords
    ? [pickupCoords.lat, pickupCoords.lon]
    : dropCoords
    ? [dropCoords.lat, dropCoords.lon]
    : defaultPosition;

  return (
    <div style={{ height: "400px", width: "100%" }}> {/* ✅ Set container height */}
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ height: "100%", width: "100%" }} // ✅ Ensure full height/width
        whenCreated={(mapInstance) => {
          if (onLoad) onLoad(mapInstance); // ✅ Call onLoad when map is ready
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onMapClick && (
          <LocationSelector onMapClick={onMapClick} activeType={activeType} />
        )}

        {pickupCoords && (
          <Marker position={[pickupCoords.lat, pickupCoords.lon]}>
            <Popup>Pickup Location</Popup>
          </Marker>
        )}

        {dropCoords && (
          <Marker position={[dropCoords.lat, dropCoords.lon]}>
            <Popup>Drop Location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
