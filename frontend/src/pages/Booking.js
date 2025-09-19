import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRide, findDrivers } from "../services/api";
import RideCard from "../components/RideCard";
import MapView from "../components/MapView";
import axios from "axios";

export default function Booking() {
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [driverLoading, setDriverLoading] = useState(false);
  const [activeLocationType, setActiveLocationType] = useState("pickup");

  const navigate = useNavigate();

  // ✅ detect "lat,lng"
  const isLatLng = (text) => /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(text);

  // 🔎 fetch suggestions
  const fetchSuggestions = async (query, type) => {
    if (!query || /^\d+$/.test(query)) {
      return type === "pickup"
        ? setPickupSuggestions([])
        : setDropSuggestions([]);
    }

    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: query, format: "json", addressdetails: 1, limit: 5 },
      });

      const suggestions = res.data.map((loc) => ({
        display_name: loc.display_name,
        lat: parseFloat(loc.lat),
        lon: parseFloat(loc.lon),
      }));

      type === "pickup"
        ? setPickupSuggestions(suggestions)
        : setDropSuggestions(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  // ✅ reverse geocode
  const reverseGeocode = async (lat, lon, type) => {
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: { lat, lon, format: "json" },
      });
      const addressName = res.data?.display_name || `${lat},${lon}`;
      if (type === "pickup") {
        setPickup(addressName);
        setPickupCoords({ lat, lon });
      } else {
        setDrop(addressName);
        setDropCoords({ lat, lon });
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    }
  };

  // ✅ select from autocomplete
  const selectPickup = (s) => {
    setPickup(s.display_name);
    setPickupCoords({ lat: s.lat, lon: s.lon });
    setPickupSuggestions([]);
  };

  const selectDrop = (s) => {
    setDrop(s.display_name);
    setDropCoords({ lat: s.lat, lon: s.lon });
    setDropSuggestions([]);
  };

  // 🗺 map click
  const handleMapClick = async (lat, lng, type) => {
    await reverseGeocode(lat, lng, type);
  };

  // 📍 use current location
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          await reverseGeocode(latitude, longitude, "pickup");
        },
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    }
  };

  // ✅ book ride
  const bookRide = async () => {
    if (!pickupCoords || !dropCoords)
      return alert("Please select pickup & drop location");

    try {
      setBookingLoading(true);

      const res = await createRide({
        pickup,
        drop,
        pickupCoords,
        dropCoords,
      });

      navigate(`/ride/${res.data.ride._id}`);
    } catch (err) {
      console.error("Booking error:", err.response?.data || err.message);
      alert(err?.response?.data?.error || "Failed to create ride");
    } finally {
      setBookingLoading(false);
    }
  };

  // ✅ find drivers
  const handleFindDrivers = async () => {
    if (!pickupCoords) return alert("Please select a pickup location first");
    try {
      setDriverLoading(true);
      const res = await findDrivers();
      setAvailableDrivers(res.data?.drivers || []);
    } catch (e) {
      console.error("Find drivers error:", e.response?.data || e.message);
      alert("Error fetching drivers");
    } finally {
      setDriverLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 font-sans">
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Booking Form */}
        <div className="bg-white shadow-md rounded-2xl p-6">
          <h2 className="text-3xl font-bold text-orange-600 mb-6">Book a Ride</h2>

          {/* Pickup input */}
          <div className="relative mb-4">
            <input
              className="w-full border-2 border-amber-200 rounded-xl p-3"
              placeholder="Pickup address or lat,lng"
              value={pickup}
              onFocus={() => setActiveLocationType("pickup")}
              onChange={(e) => {
                setPickup(e.target.value);
                if (isLatLng(e.target.value)) {
                  const [lat, lon] = e.target.value.split(",");
                  setPickupCoords({ lat: parseFloat(lat), lon: parseFloat(lon) });
                } else fetchSuggestions(e.target.value, "pickup");
              }}
            />
            <button
              onClick={handleUseCurrentLocation}
              className="mt-2 flex items-center gap-2 text-sm text-amber-600 hover:underline"
            >
              📍 Use Current Location
            </button>
            {pickupSuggestions.length > 0 && (
              <ul className="absolute bg-white shadow-md rounded-md mt-1 w-full z-10 max-h-40 overflow-y-auto">
                {pickupSuggestions.map((s, i) => (
                  <li
                    key={i}
                    className="px-3 py-2 cursor-pointer hover:bg-amber-100 text-sm"
                    onClick={() => selectPickup(s)}
                  >
                    {s.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Drop input */}
          <div className="relative mb-4">
            <input
              className="w-full border-2 border-amber-200 rounded-xl p-3"
              placeholder="Drop address"
              value={drop}
              onFocus={() => setActiveLocationType("drop")}
              onChange={(e) => {
                setDrop(e.target.value);
                if (isLatLng(e.target.value)) {
                  const [lat, lon] = e.target.value.split(",");
                  setDropCoords({ lat: parseFloat(lat), lon: parseFloat(lon) });
                } else fetchSuggestions(e.target.value, "drop");
              }}
            />
            {dropSuggestions.length > 0 && (
              <ul className="absolute bg-white shadow-md rounded-md mt-1 w-full z-10 max-h-40 overflow-y-auto">
                {dropSuggestions.map((s, i) => (
                  <li
                    key={i}
                    className="px-3 py-2 cursor-pointer hover:bg-amber-100 text-sm"
                    onClick={() => selectDrop(s)}
                  >
                    {s.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <button
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                pickupCoords && dropCoords
                  ? "bg-amber-300 hover:bg-amber-400"
                  : "bg-amber-200 cursor-not-allowed"
              }`}
              onClick={bookRide}
              disabled={!pickupCoords || !dropCoords || bookingLoading}
            >
              {bookingLoading ? "Booking..." : "Book Now"}
            </button>
            <button
              className="flex-1 py-3 rounded-xl border-2 border-amber-300 hover:bg-amber-100"
              onClick={handleFindDrivers}
              disabled={driverLoading}
            >
              {driverLoading ? "Loading..." : "Find Drivers"}
            </button>
          </div>

          {/* Drivers */}
          <h3 className="text-lg font-semibold text-orange-600 mb-2">Available Drivers</h3>
          {availableDrivers.length === 0 ? (
            <p className="italic text-slate-500">No drivers found yet.</p>
          ) : (
            availableDrivers.map((driver) => (
              <RideCard key={driver._id} driver={driver} />
            ))
          )}
        </div>

        {/* Right Panel */}
        <aside className="bg-white shadow-md rounded-2xl p-4 flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-orange-600">Map</h3>
          <div className="flex gap-2 mb-2">
            <button
              className={`px-3 py-1 text-sm rounded ${
                activeLocationType === "pickup"
                  ? "bg-orange-500 text-white"
                  : "bg-amber-100"
              }`}
              onClick={() => setActiveLocationType("pickup")}
            >
              Set Pickup
            </button>
            <button
              className={`px-3 py-1 text-sm rounded ${
                activeLocationType === "drop"
                  ? "bg-orange-500 text-white"
                  : "bg-amber-100"
              }`}
              onClick={() => setActiveLocationType("drop")}
            >
              Set Drop
            </button>
          </div>

          <div className="border border-amber-300 rounded-md overflow-hidden h-56">
            <MapView
              pickupCoords={pickupCoords}
              dropCoords={dropCoords}
              onMapClick={(lat, lng) => handleMapClick(lat, lng, activeLocationType)}
            />
          </div>

          <h3 className="text-lg font-semibold text-orange-600">Quick Actions</h3>
          <div className="flex flex-col gap-3">
            <button
              className="border border-amber-300 rounded-md py-2 hover:bg-amber-100"
              onClick={() => navigate("/history")}
            >
              Ride History
            </button>
            <button
              className="border border-amber-300 rounded-md py-2 hover:bg-amber-100"
              onClick={() => navigate("/profile")}
            >
              Profile
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
