import React, { useEffect, useRef } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "600px",
};

// Default Hyderabad
const DEFAULT_PICKUP = { lat: 17.385044, lng: 78.486671 };

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
}) {
  const mapRef = useRef(null);
  const directionsRendererRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ["places"], // ✅ only "places", no "marker"
  });

  // ✅ Reverse geocode
  const getAddressFromCoords = async (lat, lng, cb) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await res.json();
      cb(data.results[0]?.formatted_address || "");
    } catch (err) {
      console.error("Reverse geocode failed:", err);
    }
  };

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

  // ✅ Fetch directions
  useEffect(() => {
    if (isLoaded && pickup && drop) {
      const directionsService = new window.google.maps.DirectionsService();

      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: { strokeColor: "blue", strokeWeight: 5 },
        });
      }

      directionsRendererRef.current.setMap(mapRef.current);

      directionsService.route(
        {
          origin: pickup,
          destination: drop,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result) {
            directionsRendererRef.current.setDirections(result);

            // ✅ repeat suppression each time
            directionsRendererRef.current.setOptions({ suppressMarkers: true });

            const leg = result.routes[0].legs[0];
            setDistance(leg.distance.text.replace(" km", ""));
            setDuration(leg.duration.text);
          } else {
            console.error("Directions request failed:", status);
          }
        }
      );
    } else if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
  }, [isLoaded, pickup, drop, setDistance, setDuration]);

  // ✅ Recenter map when pickup changes
 // ✅ Recenter map when pickup changes
useEffect(() => {
  if (pickup && mapRef.current) {
    new window.google.maps.Marker({
      position: pickup,
      map: mapRef.current,
      icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
    });
  }
}, [pickup]);


  if (!isLoaded) return <p>Loading Map...</p>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={pickup || DEFAULT_PICKUP}
      zoom={14}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
            mapTypeControl: false,      // ❌ removes Map/Satellite toggle
            rotateControl: false,       // ❌ removes rotate control (map compass)
            scaleControl: true,         // ✅ adds scale bar
      }}
      onLoad={(map) => (mapRef.current = map)}
      onClick={(e) => {
        const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setDrop(loc);
        getAddressFromCoords(loc.lat, loc.lng, setDropAddress);
      }}
    >
      {/* ✅ Pickup Marker (Green, never disappears) */}
      {pickup && (
        <Marker
         // key={`pickup-${pickup.lat}-${pickup.lng}`} // 🔑 stable key
         key={`pickup-${pickup.lat.toFixed(5)}-${pickup.lng.toFixed(5)}-${Date.now()}`}

          position={pickup}
          draggable={true}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
          }}
          onDragEnd={(e) => {
            const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setPickup(loc);
            getAddressFromCoords(loc.lat, loc.lng, setPickupAddress);
          }}
        />
      )}

      {/* ✅ Drop Marker (Red) */}
      {drop && (
        <Marker
          key={`drop-${drop.lat}-${drop.lng}`}
          position={drop}
          draggable={true}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
          }}
          onDragEnd={(e) => {
            const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setDrop(loc);
            getAddressFromCoords(loc.lat, loc.lng, setDropAddress);
          }}
        />
      )}

      {/* ✅ Rider Marker (Blue Car Icon) */}
      {riderLocation && (
        <Marker
          key={`rider-${riderLocation.lat}-${riderLocation.lng}`}
          position={riderLocation}
          icon={{
            url: "https://cdn-icons-png.flaticon.com/512/64/64113.png",
            scaledSize: new window.google.maps.Size(40, 40),
          }}
        />
      )}
    </GoogleMap>
  );
}
