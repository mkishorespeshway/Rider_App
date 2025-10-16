import React, { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  Marker as GoogleMarker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import { MapContainer as LMap, TileLayer, Marker as LMarker, Popup } from "react-leaflet";
import L from "leaflet";
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

// Slightly offset a coordinate so a second marker can sit above the base pin
// Approximation: 1 degree latitude ≈ 111,320 meters
const offsetLatLng = (pos, northMeters = 8, eastMeters = 0) => {
  const base = normalizeLatLng(pos) || pos;
  if (!base || !Number.isFinite(base.lat) || !Number.isFinite(base.lng)) return null;
  const dLat = northMeters / 111320;
  const dLng = eastMeters / (111320 * Math.cos((base.lat * Math.PI) / 180));
  return { lat: base.lat + dLat, lng: base.lng + dLng };
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
  // When true, show ONLY riderâ€™s exact location (OTP phase)
  showRiderOnly,
  userLiveCoords,
  // Indicates ride has started (OTP verified) to adjust marker visibility
  rideStarted,
  // New: vehicle info to render correct pin + image
  vehicleType,
  vehicleImage,
}) {
  const mapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [routeColor, setRouteColor] = useState("blue");

  // Vehicle-aware icon selection for rider marker (both Google & Leaflet)
  const normalizedType = String(vehicleType || "").trim().toLowerCase();
  // Prefer vehicle image if provided; otherwise use Twemoji PNGs per vehicle type
  const riderIconUrl = vehicleImage || (
    normalizedType === "bike"
      ? "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f6b2.png" // bicycle
      : normalizedType === "auto"
      ? "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f6fa.png" // auto rickshaw
      : normalizedType === "car"
      ? "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f697.png" // automobile
      : "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f699.png" // taxi as default
  );
  const riderLabelText =
    normalizedType === "bike"
      ? "🚲"
      : normalizedType === "auto"
      ? "🛺"
      : normalizedType === "car"
      ? "🚗"
      : "🚖";
  // Use same vehicle-aware icon for pickup/drop in post-OTP map-only view
  const pickupDropIconUrl = riderIconUrl;

  // Leaflet icons (CDN) for pickup/drop when Google key is missing
  const leafletPickupIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  const leafletDropIcon = L.icon({
    iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png",
    iconRetinaUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  // Vehicle icon for rider in Leaflet fallback (pin-shaped)
  const leafletRiderIcon = L.icon({
    iconUrl: riderIconUrl,
    iconSize: [46, 46],
    iconAnchor: [23, 44],
  });

  const nominatimReverse = async (lat, lng) => {
    try {
      const { data } = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: { format: "json", lat, lon: lng, zoom: 18, addressdetails: 1 },
        headers: { "Accept-Language": "en" },
      });
      return data?.display_name || "";
    } catch {
      return "";
    }
  };

  // ðŸš« If API key is missing, render a Leaflet map fallback powered by OpenStreetMap
  if (!apiKey) {
    const center = normalizeLatLng(pickup) || DEFAULT_PICKUP;
    return (
      <LMap
        center={[center.lat, center.lng]}
        zoom={14}
        style={containerStyle}
        whenCreated={(map) => { mapRef.current = map; }}
        onclick={(e) => { /* noop for typing */ }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pickup && (
          <LMarker
            position={[normalizeLatLng(pickup)?.lat ?? pickup.lat ?? pickup.latitude, normalizeLatLng(pickup)?.lng ?? pickup.lng ?? pickup.longitude]}
            icon={leafletPickupIcon}
            draggable={true}
            eventHandlers={{
              dragend: async (ev) => {
                try {
                  const { lat, lng } = ev.target.getLatLng();
                  setPickup && setPickup({ lat, lng });
                  const addr = await nominatimReverse(lat, lng);
                  setPickupAddress && setPickupAddress(addr);
                } catch {}
              },
            }}
          >
            <Popup>{rideStarted ? `Pickup ${riderLabelText}` : "Pickup"}</Popup>
          </LMarker>
        )}
        {rideStarted && pickup && (
          <LMarker
            position={[offsetLatLng(pickup)?.lat ?? normalizeLatLng(pickup)?.lat ?? pickup.lat, offsetLatLng(pickup)?.lng ?? normalizeLatLng(pickup)?.lng ?? pickup.lng]}
            icon={leafletRiderIcon}
          >
            <Popup>{`Vehicle ${riderLabelText}`}</Popup>

          </LMarker>
        )}

        {drop && rideStarted && (
          <LMarker
            position={[normalizeLatLng(drop)?.lat ?? drop.lat ?? drop.latitude, normalizeLatLng(drop)?.lng ?? drop.lng ?? drop.longitude]}
            icon={leafletDropIcon}
            draggable={true}
            eventHandlers={{
              dragend: async (ev) => {
                try {
                  const { lat, lng } = ev.target.getLatLng();
                  setDrop && setDrop({ lat, lng });
                  const addr = await nominatimReverse(lat, lng);
                  setDropAddress && setDropAddress(addr);
                } catch {}
              },
            }}
          >
            <Popup>{rideStarted ? `Drop ${riderLabelText}` : "Drop"}</Popup>

          </LMarker>
        )}
        {rideStarted && drop && (
          <LMarker
            position={[offsetLatLng(drop)?.lat ?? normalizeLatLng(drop)?.lat ?? drop.lat, offsetLatLng(drop)?.lng ?? normalizeLatLng(drop)?.lng ?? drop.lng]}
            icon={leafletRiderIcon}
          >
            <Popup>{`Vehicle ${riderLabelText}`}</Popup>
          </LMarker>
        )}

        {riderLocation && !rideStarted && (
          <LMarker
            position={[normalizeLatLng(riderLocation)?.lat ?? riderLocation.lat ?? riderLocation.latitude, normalizeLatLng(riderLocation)?.lng ?? riderLocation.lng ?? riderLocation.longitude]}
            icon={leafletRiderIcon}
          >
            <Popup>{`Rider ${normalizedType ? `(${normalizedType})` : ""}`}</Popup>

          </LMarker>
        )}
        {/* Hide user live marker to keep pre-OTP view strictly rider + pickup */}
        {false && userLiveCoords && !rideStarted && !showRiderOnly && (
          <LMarker
            position={[normalizeLatLng(userLiveCoords)?.lat ?? userLiveCoords.lat ?? userLiveCoords.latitude, normalizeLatLng(userLiveCoords)?.lng ?? userLiveCoords.lng ?? userLiveCoords.longitude]}
            icon={leafletDropIcon}
          >
            <Popup>User (live)</Popup>
          </LMarker>
        )}
      </LMap>
    );
  }

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ["places"], // âœ… only "places", no "marker"
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
        else color = "#3498db"; // light â†’ blue
        setRouteColor(color);
      } catch (e) {
        console.warn("Failed to fetch pricing factors:", e.message);
        setRouteColor("blue");
      }
    }
    fetchFactorsAndSetColor();
  }, [pickup]);

  // âœ… Ensure pickup always exists â†’ try GPS first
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

  // âœ… Fetch directions with traffic-aware duration when possible
  useEffect(() => {
    // Skip directions only during pre-OTP rider-only view.
    // After OTP (rideStarted), render the route between pickup and drop.
    if (showRiderOnly && !rideStarted) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      return;
    }
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

            // âœ… repeat suppression each time and update polyline color
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

            // ðŸ“Œ Auto-fit map to the exact route bounds (pickup â†” drop)
            try {
              const bounds = new window.google.maps.LatLngBounds();
              // include start/end
              if (leg.start_location) bounds.extend(leg.start_location);
              if (leg.end_location) bounds.extend(leg.end_location);
              // include overview path for better fit
              const path = result.routes[0].overview_path || [];
              path.forEach((p) => bounds.extend(p));
              if (!bounds.isEmpty() && mapRef.current) {
                mapRef.current.fitBounds(bounds, {
                  top: 60,
                  right: 60,
                  bottom: 60,
                  left: 60,
                });
              }
            } catch (e) {
              // Fallback: fit to pickup & drop only
              try {
                const b = new window.google.maps.LatLngBounds();
                const o = normalizeLatLng(origin) || origin;
                const d = normalizeLatLng(destination) || destination;
                if (o?.lat && o?.lng) b.extend(new window.google.maps.LatLng(o.lat, o.lng));
                if (d?.lat && d?.lng) b.extend(new window.google.maps.LatLng(d.lat, d.lng));
                if (!b.isEmpty() && mapRef.current) {
                  mapRef.current.fitBounds(b, {
                    top: 60,
                    right: 60,
                    bottom: 60,
                    left: 60,
                  });
                }
              } catch {}
            }
          } else {
            // Downgrade error to warning to avoid noisy console
            console.warn("Directions request failed:", status);
            // Fallback: Attempt to set straight-line bounds if possible
            try {
              const o = normalizeLatLng(origin) || origin;
              const d = normalizeLatLng(destination) || destination;
              const b = new window.google.maps.LatLngBounds();
              if (o?.lat && o?.lng) b.extend(new window.google.maps.LatLng(o.lat, o.lng));
              if (d?.lat && d?.lng) b.extend(new window.google.maps.LatLng(d.lat, d.lng));
              if (!b.isEmpty() && mapRef.current) {
                mapRef.current.fitBounds(b, { top: 60, right: 60, bottom: 60, left: 60 });
              }
            } catch {}
          }
        }
      );
    } else if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
  }, [isLoaded, pickup, drop, setDistance, setDuration, routeColor, setNormalDuration, showRiderOnly, rideStarted]);

  // ðŸš´ Auto-center/fit to rider's exact live location (pre-OTP only)
  useEffect(() => {
    try {
      if (!mapRef.current) return;
      // After OTP (rideStarted), keep the directions view stable
      if (rideStarted) return;

      const loc = normalizeLatLng(riderLocation) || riderLocation;
      if (!loc?.lat || !loc?.lng) return;

      // Always try to show both rider and pickup for accepted ride context
      const pick = normalizeLatLng(pickup) || pickup;
      if (pick?.lat && pick?.lng) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(new window.google.maps.LatLng(loc.lat, loc.lng));
        bounds.extend(new window.google.maps.LatLng(pick.lat, pick.lng));
        mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      } else {
        // Otherwise, simply pan to the rider's exact location
        mapRef.current.panTo({ lat: loc.lat, lng: loc.lng });
      }
    } catch (e) {
      // Non-blocking: keep map stable if pan/fit fails
      console.warn("Map auto-pan to rider failed:", e.message);
    }
  }, [riderLocation, pickup, rideStarted]);

  // âŒ Remove imperative marker creation to avoid duplicate pins
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
        mapTypeControl: false, // âŒ removes Map/Satellite toggle
      }}
      onLoad={(map) => {
        mapRef.current = map;
      }}
      onClick={(e) => {
        // Prevent changing drop after OTP verification; keep map stable until ride completes
        if (rideStarted) return;
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
      {/* Hide user live marker to keep pre-OTP view strictly rider + pickup */}
      {false && userLiveCoords && !rideStarted && !showRiderOnly && (
        <GoogleMarker
          key={`userlive-${userLiveCoords.lat ?? userLiveCoords.latitude}-${userLiveCoords.lng ?? userLiveCoords.longitude}`}
          position={normalizeLatLng(userLiveCoords) || userLiveCoords}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            scaledSize: new window.google.maps.Size(38, 38),
          }}
        />
      )}

      {/* 🚖 Rider Marker with vehicle-specific pin & emoji label — shown only before OTP */}
      {riderLocation && !rideStarted && (
        <GoogleMarker
          key={`rider-${riderLocation.lat ?? riderLocation.latitude}-${riderLocation.lng ?? riderLocation.longitude}`}
          position={normalizeLatLng(riderLocation) || riderLocation}
          icon={{
            url: riderIconUrl,
            scaledSize: new window.google.maps.Size(46, 46),
            anchor: new window.google.maps.Point(23, 44),
            labelOrigin: new window.google.maps.Point(23, 10),
          }}
          label={{ text: riderLabelText, fontSize: "16px" }}
        />
      )}

      {/* 📍 Pickup & Drop markers (custom) */}
      {pickup && (
        <GoogleMarker
          key={`pickup-${pickup.lat ?? pickup.latitude}-${pickup.lng ?? pickup.longitude}`}
          position={normalizeLatLng(pickup) || pickup}
          icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                scaledSize: new window.google.maps.Size(38, 38),
          }}
          label={undefined}
        />
      )}
      {rideStarted && pickup && (
        <GoogleMarker
          key={`pickup-vehicle-${pickup.lat ?? pickup.latitude}-${pickup.lng ?? pickup.longitude}`}
          position={offsetLatLng(pickup) || normalizeLatLng(pickup) || pickup}
          icon={{
            url: riderIconUrl,
            scaledSize: new window.google.maps.Size(36, 36),
            anchor: new window.google.maps.Point(18, 34),
          }}
        />
      )}
      {drop && rideStarted && (
        <GoogleMarker
          key={`drop-${drop.lat ?? drop.latitude}-${drop.lng ?? drop.longitude}`}
          position={normalizeLatLng(drop) || drop}
          icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                scaledSize: new window.google.maps.Size(38, 38),
          }}
          label={undefined}
        />
      )}
      {rideStarted && drop && (
        <GoogleMarker
          key={`drop-vehicle-${drop.lat ?? drop.latitude}-${drop.lng ?? drop.longitude}`}
          position={offsetLatLng(drop) || normalizeLatLng(drop) || drop}
          icon={{
            url: riderIconUrl,
            scaledSize: new window.google.maps.Size(36, 36),
            anchor: new window.google.maps.Point(18, 34),
          }}
        />
      )}

      {/* Simple line from rider to pickup to visualize approach (accepted pre-OTP) */}
      {!rideStarted && riderLocation && pickup && (
        <Polyline
          path={[normalizeLatLng(riderLocation) || riderLocation, normalizeLatLng(pickup) || pickup]}
          options={{ strokeColor: "#111", strokeOpacity: 0.9, strokeWeight: 4 }}
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
 