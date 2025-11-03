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
import "leaflet/dist/leaflet.css";
import {
  Card,
  CardHeader,
  CardContent,
  Paper,
  Chip,
  Button,
  Stack,
  Avatar,
  Typography,
  Divider,
  Tooltip,
  IconButton,
  Box,
} from "@mui/material";
import {
  DirectionsCar,
  Navigation as NavigationIcon,
  MyLocation as MyLocationIcon,
  AccessTime as AccessTimeIcon,
  AltRoute as AltRouteIcon,
} from "@mui/icons-material";

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "320px",
};

const API_URL = (process.env.REACT_APP_API_URL || (typeof window !== "undefined" ? window.location.origin : "")) + "/api";

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
  // When true, show ONLY rider’s exact location (OTP phase)
  showRiderOnly,
  userLiveCoords,
  // Indicates ride has started (OTP verified) to adjust marker visibility
  rideStarted,
  // New: vehicle info to render correct pin + image
  vehicleType,
  vehicleImage,
  // Follow rider on map updates during accepted/in_progress rides
  followRider = true,
}) {
  // Detect Booking page context (Booking passes showRiderOnly; dashboards don’t)
  const isBookingContext = typeof showRiderOnly !== "undefined";
  const mapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [routeColor, setRouteColor] = useState("#000");
  // Local address display to mimic Google Maps info panel
  const [pickupAddrDisplay, setPickupAddrDisplay] = useState("");
  const [dropAddrDisplay, setDropAddrDisplay] = useState("");
  // Local route metrics for overlay (avoid relying on parent props)
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeEtaText, setRouteEtaText] = useState(null);
  const [navNextText, setNavNextText] = useState("");
  const [navThenText, setNavThenText] = useState("");
  const [navArrivalTimeText, setNavArrivalTimeText] = useState("");
  const [navDurationMins, setNavDurationMins] = useState(null);
  const [navDistanceKm, setNavDistanceKm] = useState(null);
  const [navManeuver, setNavManeuver] = useState("");
  const routeBoundsRef = useRef(null);

  // Helper to open navigation URLs reliably on mobile and inside iframes
  const openNavUrl = (url) => {
    try {
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth < 768);
      // Prefer in-tab navigation on mobile to avoid popup blockers
      if (isMobile) {
        try {
          window.location.assign(url);
          return;
        } catch {}
      }
      const win = window.open(url, isMobile ? "_self" : "_blank");
      if (!win) {
        // Popup blocked or inside iframe – force same-tab navigation
        try {
          window.location.assign(url);
        } catch (e1) {
          try {
            window.top.location.href = url;
          } catch {}
        }
      }
    } catch (e) {
      try {
        window.location.href = url;
      } catch {}
    }
  };

  // Persist OTP verification locally so page refresh keeps the same state
  const rideStartedEffective = !!rideStarted;

  // Treat obviously invalid or placeholder API keys as missing
  const isValidGoogleKey =
    typeof apiKey === "string" &&
    apiKey.length >= 30 &&
    !/YOUR_|REPLACE|INSERT|ADD_YOUR/i.test(apiKey);

  // Simple Haversine distance in meters (pre-OTP ETA support)
  const haversineMeters = (a, b) => {
    const A = normalizeLatLng(a) || a;
    const B = normalizeLatLng(b) || b;
    if (!A || !B || A?.lat == null || A?.lng == null || B?.lat == null || B?.lng == null) return null;
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad((B.lat ?? B.latitude) - (A.lat ?? A.latitude));
    const dLng = toRad((B.lng ?? B.longitude) - (A.lng ?? A.longitude));
    const s1 = Math.sin(dLat / 2) ** 2;
    const s2 = Math.sin(dLng / 2) ** 2;
    const aHarv = s1 + Math.cos(toRad(A.lat ?? A.latitude)) * Math.cos(toRad(B.lat ?? B.latitude)) * s2;
    const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
    return R * c;
  };

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

  // Keep Pickup Overview card addresses in sync when pickup/drop change externally
  useEffect(() => {
    try {
      const p = normalizeLatLng(pickup) || pickup;
      if (!p || p.lat == null || p.lng == null) return;
      if (isValidGoogleKey && window.google?.maps) {
        getAddressFromCoords(p.lat, p.lng, (addr) => {
          setPickupAddrDisplay(addr);
          setPickupAddress && setPickupAddress(addr);
        });
      } else {
        (async () => {
          const addr = await nominatimReverse(p.lat, p.lng);
          setPickupAddrDisplay(addr);
          setPickupAddress && setPickupAddress(addr);
        })();
      }
    } catch {}
  }, [pickup, isValidGoogleKey, setPickupAddress]);

  useEffect(() => {
    try {
      const d = normalizeLatLng(drop) || drop;
      if (!d || d.lat == null || d.lng == null) return;
      if (isValidGoogleKey && window.google?.maps) {
        getAddressFromCoords(d.lat, d.lng, (addr) => {
          setDropAddrDisplay(addr);
          setDropAddress && setDropAddress(addr);
        });
      } else {
        (async () => {
          const addr = await nominatimReverse(d.lat, d.lng);
          setDropAddrDisplay(addr);
          setDropAddress && setDropAddress(addr);
        })();
      }
    } catch {}
  }, [drop, isValidGoogleKey, setDropAddress]);

  // Auto-zoom to PICKUP in Leaflet fallback after OTP (Booking & Dashboard)
  useEffect(() => {
    try {
      if (isValidGoogleKey) return; // Google branch handles its own view management
      if (!rideStartedEffective) return; // Only post-OTP
      const o = normalizeLatLng(pickup) || pickup;
      if (!o || !mapRef.current) return;
      // Focus tightly on pickup; maintains live GPS if pickup updates
      mapRef.current.panTo([o.lat, o.lng]);
      const currentZoom = mapRef.current.getZoom?.();
      if (typeof currentZoom !== "number" || currentZoom < 16) {
        mapRef.current.setZoom?.(16);
      }
    } catch (e) {
      // Non-blocking: maintain current view on failure
      console.warn("Leaflet pickup auto-zoom post-OTP failed:", e.message);
    }
  }, [apiKey, rideStartedEffective, pickup]);

  // 🚦 If API key is missing or invalid, render Leaflet fallback (OSM)
  if (!isValidGoogleKey) {
    const center = normalizeLatLng(pickup) || DEFAULT_PICKUP;
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <LMap
          center={[center.lat, center.lng]}
          zoom={14}
          style={containerStyle}
          whenCreated={(map) => { mapRef.current = map; }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {pickup && (
            <LMarker
              position={[normalizeLatLng(pickup)?.lat ?? pickup.lat ?? pickup.latitude, normalizeLatLng(pickup)?.lng ?? pickup.lng ?? pickup.longitude]}
              icon={leafletPickupIcon}
              draggable={!rideStartedEffective}
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
              <Popup>{rideStartedEffective ? `Pickup ${riderLabelText}` : "Pickup"}</Popup>
            </LMarker>
          )}
          {rideStartedEffective && !isBookingContext && pickup && (
            <LMarker
              position={[offsetLatLng(pickup)?.lat ?? normalizeLatLng(pickup)?.lat ?? pickup.lat, offsetLatLng(pickup)?.lng ?? normalizeLatLng(pickup)?.lng ?? pickup.lng]}
              icon={leafletRiderIcon}
            >
              <Popup>{`Vehicle ${riderLabelText}`}</Popup>
            </LMarker>
          )}

          {drop && (
            <LMarker
              position={[normalizeLatLng(drop)?.lat ?? drop.lat ?? drop.latitude, normalizeLatLng(drop)?.lng ?? drop.lng ?? drop.longitude]}
              icon={leafletDropIcon}
              draggable={!rideStartedEffective}
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
              <Popup>{rideStartedEffective ? `Drop ${riderLabelText}` : "Drop"}</Popup>
            </LMarker>
          )}
          {rideStartedEffective && !isBookingContext && drop && (
            <LMarker
              position={[offsetLatLng(drop)?.lat ?? normalizeLatLng(drop)?.lat ?? drop.lat, offsetLatLng(drop)?.lng ?? normalizeLatLng(drop)?.lng ?? drop.lng]}
              icon={leafletRiderIcon}
            >
              <Popup>{`Vehicle ${riderLabelText}`}</Popup>
            </LMarker>
          )}

          {riderLocation && !rideStartedEffective && (
            <LMarker
              position={[normalizeLatLng(riderLocation)?.lat ?? riderLocation.lat ?? riderLocation.latitude, normalizeLatLng(riderLocation)?.lng ?? riderLocation.lng ?? riderLocation.longitude]}
              icon={leafletRiderIcon}
            >
              <Popup>{`Rider ${normalizedType ? `(${normalizedType})` : ""}`}</Popup>
            </LMarker>
          )}
        </LMap>

        {pickup && drop && (
          <div style={{ position: "absolute", right: 12, bottom: 16, zIndex: 9999 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<NavigationIcon />}
              onClick={() => {
                try {
                  const o = normalizeLatLng(pickup) || pickup;
                  const d = normalizeLatLng(drop) || drop;
                  if (!o || !d) return;
                  const origin = `${o.lat},${o.lng}`;
                  const destination = `${d.lat},${d.lng}`;
                  const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
                  openNavUrl(url);
                } catch {}
              }}
            >
              Start
            </Button>
          </div>
        )}
      </div>
    );
  }

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: isValidGoogleKey ? apiKey : undefined,
    libraries: ["places"], // âœ… only "places", no "marker"
  });

  // Fetch pricing factors; keep route color black to match requested style
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
        let color = "#000";
        if (traffic === "severe") color = "red";
        else if (traffic === "heavy") color = "#ff7f00"; // orange
        else if (traffic === "moderate") color = "#f1c40f"; // yellow
        else color = "#3498db"; // light â†’ blue
        // Force black regardless of traffic for consistent appearance
        setRouteColor("#000");
      } catch (e) {
        console.warn("Failed to fetch pricing factors:", e.message);
        setRouteColor("#000");
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
          getAddressFromCoords(loc.lat, loc.lng, (addr) => {
            setPickupAddress && setPickupAddress(addr);
            setPickupAddrDisplay(addr);
          });

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
            (addr) => {
              setPickupAddress && setPickupAddress(addr);
              setPickupAddrDisplay(addr);
            }
          );
        }
      );
    }
  }, [pickup, setPickup, setPickupAddress]);

  // âœ… Fetch directions with traffic-aware duration when possible
  useEffect(() => {
    // Pre-OTP: if rider accepted, show Google route from rider → pickup.
    // Post-OTP: show Google route from pickup → drop.
    if (!isLoaded) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
      });
    }

    directionsRendererRef.current.setMap(mapRef.current);

    

    let origin = null;
    let destination = null;

    // Prefer rider → pickup route before OTP on all pages
    if (!rideStartedEffective && riderLocation && pickup) {
      origin = normalizeLatLng(riderLocation) || riderLocation; // rider → pickup
      destination = normalizeLatLng(pickup) || pickup;
    } else if (pickup && drop) {
      origin = normalizeLatLng(pickup) || pickup; // pickup → drop
      destination = normalizeLatLng(drop) || drop;
    } else {
      // No valid routing state
      directionsRendererRef.current.setMap(null);
      return;
    }

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
          });

          const leg = result.routes[0].legs[0];

          // Use numeric meters for exact km
          const meters = leg.distance?.value;
          if (typeof meters === "number") {
            const km = meters / 1000;
            setDistance(km.toFixed(2));
            setRouteDistance(km.toFixed(2));
            setNavDistanceKm(km.toFixed(2));
          } else if (leg.distance?.text) {
            // fallback to parsing text if numeric not available
            const parsed = parseFloat(leg.distance.text.replace(/[^0-9.]/g, ""));
            if (!isNaN(parsed)) {
              const val = parsed.toFixed(2);
              setDistance(val);
              setRouteDistance(val);
              setNavDistanceKm(val);
            }
          }

          // Duration: current (traffic-aware) vs normal
          const normalText = leg.duration?.text || "";
          const currentText = leg.duration_in_traffic?.text || normalText;
          setDuration(currentText);
          setRouteEtaText(currentText);
          // Compute navigation overlay texts and arrival time
          try {
            const steps = leg.steps || [];
            const strip = (html) => String(html || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
            setNavNextText(strip(steps[0]?.instructions) || strip(result.routes?.[0]?.summary) || "Proceed");
            setNavThenText(strip(steps[1]?.instructions) || "");
            setNavManeuver(String(steps[0]?.maneuver || ""));
            const durationSec = (leg.duration_in_traffic?.value ?? leg.duration?.value) || null;
            if (typeof durationSec === "number") {
              const mins = Math.max(1, Math.round(durationSec / 60));
              setNavDurationMins(mins);
              const arrival = new Date(Date.now() + durationSec * 1000);
              setNavArrivalTimeText(arrival.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
            } else {
              setNavArrivalTimeText("");
            }
          } catch {}
          if (typeof setNormalDuration === "function") {
            setNormalDuration(normalText);
          }

          // ðŸ“Œ Auto-fit map to the exact route bounds (origin â†” destination)
          try {
            const bounds = new window.google.maps.LatLngBounds();
            // include start/end
            if (leg.start_location) bounds.extend(leg.start_location);
            if (leg.end_location) bounds.extend(leg.end_location);
            // include overview path for better fit
            const path = result.routes[0].overview_path || [];
            path.forEach((p) => bounds.extend(p));
            if (!bounds.isEmpty() && mapRef.current) {
    if (!rideStartedEffective && isBookingContext) {
                const o = normalizeLatLng(pickup) || pickup;
                if (o?.lat && o?.lng) {
                  mapRef.current.panTo({ lat: o.lat, lng: o.lng });
                  const currentZoom = mapRef.current.getZoom();
                  if (typeof currentZoom !== "number" || currentZoom < 16) {
                    mapRef.current.setZoom(16);
                  }
                }
                routeBoundsRef.current = bounds;
              } else {
                mapRef.current.fitBounds(bounds, {
                  top: 60,
                  right: 60,
                  bottom: 60,
                  left: 60,
                });
                routeBoundsRef.current = bounds;
              }
            }
          } catch (e) {
            // Fallback: fit to origin & destination only
            try {
              const b = new window.google.maps.LatLngBounds();
              const o = normalizeLatLng(origin) || origin;
              const d = normalizeLatLng(destination) || destination;
              if (o?.lat && o?.lng) b.extend(new window.google.maps.LatLng(o.lat, o.lng));
              if (d?.lat && d?.lng) b.extend(new window.google.maps.LatLng(d.lat, d.lng));
              if (!b.isEmpty() && mapRef.current) {
    if (!rideStartedEffective && isBookingContext) {
                  const pickOnly = normalizeLatLng(pickup) || pickup;
                  if (pickOnly?.lat && pickOnly?.lng) {
                    mapRef.current.panTo({ lat: pickOnly.lat, lng: pickOnly.lng });
                    const currentZoom = mapRef.current.getZoom();
                    if (typeof currentZoom !== "number" || currentZoom < 16) {
                      mapRef.current.setZoom(16);
                    }
                  }
                  routeBoundsRef.current = b;
                } else {
                  mapRef.current.fitBounds(b, {
                    top: 60,
                    right: 60,
                    bottom: 60,
                    left: 60,
                  });
                  routeBoundsRef.current = b;
                }
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
              routeBoundsRef.current = b;
            }
          } catch {}
        }
      }
    );
  }, [isLoaded, pickup, drop, riderLocation, setDistance, setDuration, routeColor, setNormalDuration, showRiderOnly, rideStartedEffective]);

  // Post-OTP: auto-zoom to show ONLY pickup & drop with full zoom
  useEffect(() => {
    try {
      if (!mapRef.current) return;
    if (!rideStartedEffective) return;

      const o = normalizeLatLng(pickup) || pickup;
      const d = normalizeLatLng(drop) || drop;

      // If both points exist, fit bounds tightly to show just them
      if (apiKey) {
        const b = new window.google.maps.LatLngBounds();
        if (o?.lat && o?.lng) b.extend(new window.google.maps.LatLng(o.lat, o.lng));
        if (d?.lat && d?.lng) b.extend(new window.google.maps.LatLng(d.lat, d.lng));
        if (!b.isEmpty()) {
          mapRef.current.fitBounds(b, { top: 60, right: 60, bottom: 60, left: 60 });
          routeBoundsRef.current = b;
        } else if (o?.lat && o?.lng) {
          // Fallback: focus pickup if drop missing
          mapRef.current.panTo({ lat: o.lat, lng: o.lng });
          const currentZoom = mapRef.current.getZoom();
          if (typeof currentZoom !== "number" || currentZoom < 16) {
            mapRef.current.setZoom(16);
          }
        }
      } else {
        // Leaflet fallback
        const pts = [];
        if (o?.lat && o?.lng) pts.push([o.lat, o.lng]);
        if (d?.lat && d?.lng) pts.push([d.lat, d.lng]);
        if (pts.length >= 2) {
          const b = L.latLngBounds(pts);
          mapRef.current.fitBounds(b, { padding: [60, 60] });
        } else if (o?.lat && o?.lng) {
          mapRef.current.panTo([o.lat, o.lng]);
          const currentZoom = mapRef.current.getZoom?.();
          if (typeof currentZoom !== "number" || currentZoom < 16) {
            mapRef.current.setZoom?.(16);
          }
        }
      }
    } catch (e) {
      console.warn("Post-OTP auto-zoom failed:", e.message);
    }
  }, [rideStartedEffective, pickup, drop, apiKey]);

  // ðŸš´ Auto-center/fit to rider's exact live location (pre-OTP only)
  useEffect(() => {
    try {
      if (!mapRef.current) return;
  // After OTP, keep the directions view stable
  if (rideStartedEffective) return;

      // Booking page: focus on PICKUP only with close zoom (auto-zoom)
      if (isBookingContext) {
        const pick = normalizeLatLng(pickup) || pickup;
        if (pick?.lat && pick?.lng) {
          try {
            mapRef.current.panTo({ lat: pick.lat, lng: pick.lng });
            const currentZoom = mapRef.current.getZoom();
            if (typeof currentZoom !== "number" || currentZoom < 16) {
              mapRef.current.setZoom(16);
            }
          } catch {}
          return; // Keep pickup-focused view on Booking pre-OTP
        }
      }

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
  }, [riderLocation, pickup, rideStartedEffective]);

  // ✅ Follow rider during accepted/in_progress ride
  useEffect(() => {
    try {
      if (!mapRef.current) return;
  if (!rideStartedEffective || !followRider) return;
      // After OTP, keep the route view stable: avoid panning away.
      // Directions callback already fits bounds to the full route.
      // Only adjust very low zooms to a comfortable level without changing center.
      const currentZoom = mapRef.current.getZoom();
      if (typeof currentZoom === "number" && currentZoom < 12) {
        mapRef.current.setZoom(12);
      }
    } catch (e) {
      console.warn("Follow rider movement failed:", e.message);
    }
  }, [riderLocation, rideStartedEffective, followRider]);

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

  // If Google fails to load, show Leaflet fallback immediately
  if (!isLoaded) {
    const center = normalizeLatLng(pickup) || DEFAULT_PICKUP;
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <LMap
          center={[center.lat, center.lng]}
          zoom={14}
          style={containerStyle}
          whenCreated={(map) => { mapRef.current = map; }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LMap>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={normalizeLatLng(pickup) || DEFAULT_PICKUP}
      zoom={14}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        gestureHandling: "cooperative",
        mapTypeControl: true,
        rotateControl: true,
        scaleControl: true,
      }}
      onLoad={(map) => {
        mapRef.current = map;
      }}
      onClick={(e) => {
        // Prevent changing drop after OTP verification; keep map stable until ride completes
  if (rideStartedEffective) return;
        try {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          if (typeof setDrop === "function") {
            setDrop({ lat, lng });
          }
          getAddressFromCoords(lat, lng, (addr) => {
            setDropAddress && setDropAddress(addr);
            setDropAddrDisplay(addr);
          });
        } catch (err) {
          console.warn("Map click to set drop failed:", err);
        }
      }}
    >
      {/* Hide user live marker to keep pre-OTP view strictly rider + pickup */}
        {false && userLiveCoords && !rideStartedEffective && !showRiderOnly && (
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
        {riderLocation && !rideStartedEffective && (
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
            draggable={!rideStartedEffective}
          onDragEnd={(e) => {
            try {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              setPickup && setPickup({ lat, lng });
              getAddressFromCoords(lat, lng, (addr) => {
                setPickupAddress && setPickupAddress(addr);
                setPickupAddrDisplay(addr);
              });
            } catch (err) {
              console.warn("Pickup drag update failed:", err);
            }
          }}
        />
      )}
        {rideStartedEffective && !isBookingContext && pickup && (
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
      {drop && (
        <GoogleMarker
          key={`drop-${drop.lat ?? drop.latitude}-${drop.lng ?? drop.longitude}`}
          position={normalizeLatLng(drop) || drop}
          icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                scaledSize: new window.google.maps.Size(38, 38),
          }}
          label={undefined}
            draggable={!rideStartedEffective}
          onDragEnd={(e) => {
            try {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              setDrop && setDrop({ lat, lng });
              getAddressFromCoords(lat, lng, (addr) => {
                setDropAddress && setDropAddress(addr);
                setDropAddrDisplay(addr);
              });
            } catch (err) {
              console.warn("Drop drag update failed:", err);
            }
          }}
        />
      )}
        {rideStartedEffective && !isBookingContext && drop && (
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

      {/* In-map Autocomplete search inputs removed per request. */}

      {/* Approach path styled like Google walking dots + ETA badge */}
        {!rideStartedEffective && riderLocation && pickup && (
        <>
          <Polyline
            path={[normalizeLatLng(riderLocation) || riderLocation, normalizeLatLng(pickup) || pickup]}
            options={{
              strokeOpacity: 0,
              icons: [
                {
                  icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 4,
                    fillOpacity: 1,
                    strokeOpacity: 1,
                  },
                  offset: "0",
                  repeat: "26px",
                },
              ],
            }}
          />
          {(() => {
            const start = normalizeLatLng(riderLocation) || riderLocation;
            const end = normalizeLatLng(pickup) || pickup;
            if (!start || !end) return null;
            const m = haversineMeters(start, end);
            if (!m) return null;
            const km = m / 1000;
            const avg = 20; // km/h assumed
            const mins = Math.max(1, Math.round((km / avg) * 60));
            const mid = { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 };
            const etaText = `${mins} min`;
            const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='28'><rect rx='14' ry='14' width='80' height='28' fill='#1a73e8'/><text x='40' y='18' text-anchor='middle' font-size='14' fill='#fff' font-family='Arial, sans-serif'>${etaText}</text></svg>`;
            return (
              <GoogleMarker
                position={mid}
                icon={{
                  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
                  scaledSize: new window.google.maps.Size(80, 28),
                }}
                label={undefined}
              />
            );
          })()}
        </>
      )}
      {/* Pre-OTP Booking: Pickup Overview card (MUI) */}
        {!rideStartedEffective && isBookingContext && (
        <div style={{ position: "absolute", left: 12, top: 12, zIndex: 6 }}>
          <Card
            className="backdrop-blur-lg"
            sx={{
              borderRadius: 3,
              boxShadow: 6,
              maxWidth: 560,
              bgcolor: "rgba(255,255,255,0.92)",
              border: "1px solid",
              borderColor: "#e5e7eb",
            }}
          >
            <CardHeader
              avatar={<Avatar sx={{ bgcolor: "#ef4444" }}><DirectionsCar fontSize="small" /></Avatar>}
              title={<Typography variant="subtitle1" fontWeight={700}>Pickup Overview</Typography>}
              subheader={routeEtaText ? `ETA ${routeEtaText}` : undefined}
              sx={{ pb: 0 }}
            />
            <CardContent sx={{ pt: 1 }}>
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Pickup</Typography>
                  <Typography variant="body2" fontWeight={600}>{pickupAddrDisplay || (() => {
                    const p = normalizeLatLng(pickup) || pickup;
                    if (!p) return "";
                    const lat = (p.lat ?? p.latitude)?.toFixed?.(5) ?? p.lat ?? p.latitude;
                    const lng = (p.lng ?? p.longitude)?.toFixed?.(5) ?? p.lng ?? p.longitude;
                    return `${lat}, ${lng}`;
                  })()}</Typography>
                </Box>
                {drop && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>Drop</Typography>
                      <Typography variant="body2" fontWeight={600}>{dropAddrDisplay || (() => {
                        const d = normalizeLatLng(drop) || drop;
                        if (!d) return "";
                        const lat = (d.lat ?? d.latitude)?.toFixed?.(5) ?? d.lat ?? d.latitude;
                        const lng = (d.lng ?? d.longitude)?.toFixed?.(5) ?? d.lng ?? d.longitude;
                        return `${lat}, ${lng}`;
                      })()}</Typography>
                    </Box>
                  </>
                )}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.5 }}>
                  <Chip
                    icon={<AccessTimeIcon />}
                    color="warning"
                    label={(() => {
                      if (typeof navDurationMins === "number" && navDurationMins > 0) return `${navDurationMins} min`;
                      const start = normalizeLatLng(riderLocation) || riderLocation;
                      const end = normalizeLatLng(pickup) || pickup;
                      if (!start || !end) return routeEtaText || "--";
                      const m = haversineMeters(start, end);
                      if (!m) return routeEtaText || "--";
                      const km = m / 1000;
                      const avg = 20; // km/h assumed
                      const mins = Math.max(1, Math.round((km / avg) * 60));
                      return `${mins} min`;
                    })()}
                    sx={{ bgcolor: "#fff" }}
                  />
                  <Chip
                    icon={<AltRouteIcon />}
                    variant="outlined"
                    label={routeDistance ? `${routeDistance} km` : (navDistanceKm ? `${navDistanceKm} km` : "--")}
                    sx={{ bgcolor: "#fff" }}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Post-OTP navigation-style overlays (mimic screenshot) */}
        {rideStartedEffective && pickup && drop && (
        <>
          {/* Top instruction bar (MUI) */}
          <Paper elevation={10} className="backdrop-blur" sx={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 12, zIndex: 6, bgcolor: "#1a73e8", color: "#fff", borderRadius: 3, px: 2.25, py: 1.25, maxWidth: 460, border: "1px solid rgba(255,255,255,0.25)" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ bgcolor: "#0c5bd3", width: 28, height: 28 }}>
                <Typography component="span" sx={{ fontSize: 16 }}>
                  {(() => {
                    const m = String(navManeuver || "");
                    if (m.includes("left")) return "↰";
                    if (m.includes("right")) return "↱";
                    if (m.includes("straight") || m.includes("continue")) return "↑";
                    if (m.includes("uturn")) return "↶";
                    return "↑";
                  })()}
                </Typography>
              </Avatar>
              <Typography fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {navNextText || "Start navigation"}
                {navThenText ? `, then ${navThenText}` : ""}
              </Typography>
            </Stack>
          </Paper>

          {/* Top-left status chip */}
          <div style={{ position: "absolute", left: 12, top: 12, zIndex: 6 }}>
            <Chip size="small" color="success" label="OTP Verified" sx={{ bgcolor: "#10b981", color: "#fff", fontWeight: 700 }} />
          </div>

          {/* Bottom overlays: left speed pill, centered ETA pill, right Re-centre */}
          {/* Left speed/limit-like pill (MUI Chip) */}
          <div style={{ position: "absolute", left: 12, bottom: 16, zIndex: 6 }}>
            <Chip label={(() => {
              const d = parseFloat(navDistanceKm || routeDistance || "");
              const m = parseFloat(navDurationMins || "");
              const spd = d && m ? Math.round((d / (m / 60)) || 0) : null;
              return spd ? `${spd} km/h` : "";
            })()} variant="outlined" icon={<MyLocationIcon />} sx={{ bgcolor: "#fff", borderRadius: 999 }} />
          </div>

          {/* Center ETA pill (MUI Chip) */}
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 18, zIndex: 6 }}>
            <Chip color="warning" icon={<AccessTimeIcon />} label={navDurationMins ? `${navDurationMins} min` : (routeEtaText || "ETA") } sx={{ bgcolor: "#fff", fontWeight: 800, fontSize: 16, px: 1.75, borderRadius: 999 }} />
          </div>

          {/* Right controls (MUI Buttons) */}
          <div style={{ position: "absolute", right: 12, bottom: 16, zIndex: 6, display: "flex", gap: 8 }}>
            <Tooltip title="Fit route to view">
              <Button
                variant="outlined"
                startIcon={<MyLocationIcon />}
                onClick={() => {
                  try {
                    if (routeBoundsRef.current && mapRef.current) {
                      mapRef.current.fitBounds(routeBoundsRef.current, { top: 60, right: 60, bottom: 60, left: 60 });
                    }
                  } catch {}
                }}
                sx={{ bgcolor: "#fff" }}
              >
                Re-centre
              </Button>
            </Tooltip>
            <Tooltip title="Open route in Google Maps">
              <Button
                variant="contained"
                color="primary"
                startIcon={<NavigationIcon />}
                onClick={() => {
                  try {
                    const o = normalizeLatLng(pickup) || pickup;
                    const d = normalizeLatLng(drop) || drop;
                    if (!o || !d) return;
                    const origin = `${o.lat},${o.lng}`;
                    const destination = `${d.lat},${d.lng}`;
                    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
                    openNavUrl(url);
                  } catch {}
                }}
              >
                Navigate in Google Maps
              </Button>
            </Tooltip>
          </div>
        </>
      )}
      {/* Pre-OTP: Start navigation button when both points are set */}
      {!rideStartedEffective && pickup && drop && (
        <div style={{ position: "absolute", right: 12, bottom: 16, zIndex: 6 }}>
          <Tooltip title="Open route in Google Maps">
            <Button
              variant="contained"
              color="primary"
              startIcon={<NavigationIcon />}
              onClick={() => {
                try {
                  const o = normalizeLatLng(pickup) || pickup;
                  const d = normalizeLatLng(drop) || drop;
                  if (!o || !d) return;
                  const origin = `${o.lat},${o.lng}`;
                  const destination = `${d.lat},${d.lng}`;
                  const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
                  openNavUrl(url);
                } catch {}
              }}
            >
              Start
            </Button>
          </Tooltip>
        </div>
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
 