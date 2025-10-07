import React, { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import axios from "axios";

const containerStyle = {
  width: "100%",
  height: "600px",
};

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Default Hyderabad
const DEFAULT_PICKUP = { lat: 17.385044, lng: 78.486671 };

// Normalize any object that may have latitude/longitude instead of lat/lng
const normalizeLatLng = (pos) => {
  if (!pos) return null;
  const latRaw = pos.lat ?? pos.latitude;
  const lngRaw = pos.lng ?? pos.longitude;
  const lat = typeof latRaw === "number" ? latRaw : parseFloat(latRaw);
  const lng = typeof lngRaw === "number" ? lngRaw : parseFloat(lngRaw);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
};

export default function Map({
  apiKey,
  pickup,
  setPickup,
  setPickupAddress,
  drop,
  setDrop,
  setDropAddress,
  riderLocation,
  setDistance,
  setDuration,
  // NEW: send normal (baseline) duration to parent alongside current duration
  setNormalDuration,
}) {
  const mapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [routeColor, setRouteColor] = useState("blue");

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ["places"], // ✅ only "places", no "marker"
  });

  // Fetch pricing factors to determine traffic severity and set route color
  useEffect(() => {
    async function fetchFactorsAndSetColor() {
      try {
        const lat = (pickup?.lat ?? pickup?.latitude);
        const lng = (pickup?.lng ?? pickup?.longitude);
        if (!lat || !lng) return;
        const { data } = await axios.get(`${API_URL}/pricing/factors`, {
          params: { latitude: lat, longitude: lng },
        });
        const traffic = (data.currentTraffic || "light").toLowerCase();
        let color = "blue";
        if (traffic === "severe") color = "red";
        else if (traffic === "heavy") color = "#ff7f00"; // orange
        else if (traffic === "moderate") color = "#f1c40f"; // yellow
        else color = "#3498db"; // light → blue
        setRouteColor(color);
      } catch (e) {
        console.warn("Failed to fetch pricing factors:", e.message);
        setRouteColor("blue");
      }
    }
    fetchFactorsAndSetColor();
  }, [pickup]);

  // ✅ Ensure pickup always exists → try GPS first
  useEffect(() => {
    if (!pickup) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPickup(loc);
          getAddressFromCoords(loc.lat, loc.lng, setPickupAddress);

          if (mapRef.current) {
            mapRef.current.panTo(loc);
          }
        },
        (err) => {
          console.warn("Geolocation failed, fallback used:", err.message);
          setPickup(DEFAULT_PICKUP);
          getAddressFromCoords(
            DEFAULT_PICKUP.lat,
            DEFAULT_PICKUP.lng,
            setPickupAddress
          );
        }
      );
    }
  }, [pickup, setPickup, setPickupAddress]);

  // ✅ Fetch directions with traffic-aware duration when possible
  useEffect(() => {
    if (isLoaded && pickup && drop) {
      const directionsService = new window.google.maps.DirectionsService();

      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: { strokeColor: routeColor, strokeWeight: 5 },
        });
      }

      directionsRendererRef.current.setMap(mapRef.current);

      const origin = normalizeLatLng(pickup) || pickup; // fallback to original if already lat/lng
      const destination = normalizeLatLng(drop) || drop;

      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
          // driving options enable traffic-based ETA
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: "bestguess",
          },
        },
        (result, status) => {
          if (status === "OK" && result) {
            directionsRendererRef.current.setDirections(result);

            // ✅ repeat suppression each time and update polyline color
            directionsRendererRef.current.setOptions({
              suppressMarkers: true,
              polylineOptions: { strokeColor: routeColor, strokeWeight: 5 },
            });

            const leg = result.routes[0].legs[0];

            // Use numeric meters for exact km
            const meters = leg.distance?.value;
            if (typeof meters === "number") {
              const km = meters / 1000;
              setDistance(km.toFixed(2));
            } else if (leg.distance?.text) {
              // fallback to parsing text if numeric not available
              const parsed = parseFloat(leg.distance.text.replace(/[^0-9.]/g, ""));
              if (!isNaN(parsed)) setDistance(parsed.toFixed(2));
            }

            // Duration: current (traffic-aware) vs normal
            const normalText = leg.duration?.text || "";
            const currentText = leg.duration_in_traffic?.text || normalText;
            setDuration(currentText);
            if (typeof setNormalDuration === "function") {
              setNormalDuration(normalText);
            }
          } else {
            console.error("Directions request failed:", status);
          }
        }
      );
    } else if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
  }, [isLoaded, pickup, drop, setDistance, setDuration, routeColor, setNormalDuration]);

  // ❌ Remove imperative marker creation to avoid duplicate pins
  // useEffect(() => {
  //   if (pickup && mapRef.current) {
  //     new window.google.maps.Marker({
  //       position: pickup,
  //       map: mapRef.current,
  //       icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
  //     });
  //   }
  // }, [pickup]);

  if (!isLoaded) return <p>Loading Map...</p>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={normalizeLatLng(pickup) || DEFAULT_PICKUP}
      zoom={14}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
        mapTypeControl: false, // ❌ removes Map/Satellite toggle
      }}
      onLoad={(map) => {
        mapRef.current = map;
      }}
      onClick={(e) => {
        try {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          if (typeof setDrop === "function") {
            setDrop({ lat, lng });
          }
          getAddressFromCoords(lat, lng, setDropAddress);
        } catch (err) {
          console.warn("Map click to set drop failed:", err);
        }
      }}
    >
      {/* ✅ Pickup Marker */}
      {pickup && (
        <Marker
          key={`pickup-${(normalizeLatLng(pickup)?.lat ?? pickup.lat ?? pickup.latitude)}-${(normalizeLatLng(pickup)?.lng ?? pickup.lng ?? pickup.longitude)}`}
          position={normalizeLatLng(pickup) || pickup}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
            scaledSize: new window.google.maps.Size(40, 40),
          }}
          draggable={true}
          onDragEnd={(e) => {
            try {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              if (typeof setPickup === "function") {
                setPickup({ lat, lng });
              }
              getAddressFromCoords(lat, lng, setPickupAddress);
              if (mapRef.current) {
                mapRef.current.panTo({ lat, lng });
              }
            } catch (err) {
              console.warn("Pickup drag failed:", err);
            }
          }}
        />
      )}

      {/* ✅ Drop Marker */}
      {drop && (
        <Marker
          key={`drop-${(drop.lat ?? drop.latitude)}-${(drop.lng ?? drop.longitude)}`}
          position={normalizeLatLng(drop) || drop}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: new window.google.maps.Size(40, 40),
          }}
          draggable={true}
          onDragEnd={(e) => {
            try {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              if (typeof setDrop === "function") {
                setDrop({ lat, lng });
              }
              getAddressFromCoords(lat, lng, setDropAddress);
              if (mapRef.current) {
                mapRef.current.panTo({ lat, lng });
              }
            } catch (err) {
              console.warn("Drop drag failed:", err);
            }
          }}
        />
      )}

      {/* ✅ Rider Marker (Blue Car Icon) */}
      {riderLocation && (
        <Marker
          key={`rider-${(riderLocation.lat ?? riderLocation.latitude)}-${(riderLocation.lng ?? riderLocation.longitude)}`}
          position={normalizeLatLng(riderLocation) || riderLocation}
          icon={{
            url: "https://cdn-icons-png.flaticon.com/512/64/64113.png",
            scaledSize: new window.google.maps.Size(40, 40),
          }}
        />
      )}
    </GoogleMap>
  );
}

// Helper: Reverse geocode to get address
async function getAddressFromCoords(lat, lng, setter) {
  try {
    const geocoder = new window.google.maps.Geocoder();
    const { results } = await geocoder.geocode({ location: { lat, lng } });
    if (results && results[0]) setter(results[0].formatted_address);
  } catch (e) {
    console.warn("Reverse geocoding failed:", e.message);
  }
}
