import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";  

// Suppress noisy Chrome dev warning: "ResizeObserver loop completed with undelivered notifications"
// This is harmless and commonly triggered by map/layout measurements.
// We stop propagation of that specific error and avoid overlay noise.
try {
  const suppressRoError = (event) => {
    const msg = event?.message || (event?.reason && event.reason.message) || "";
    if (typeof msg === "string" && msg.includes("ResizeObserver loop completed with undelivered notifications")) {
      event.stopImmediatePropagation?.();
      event.preventDefault?.();
      return true; // handled
    }
    return false;
  };
  window.addEventListener("error", suppressRoError);
  window.addEventListener("unhandledrejection", suppressRoError);
  // Also patch console.error to ignore the same message if any library logs it
  const origError = console.error.bind(console);
  console.error = (...args) => {
    try {
      const first = args && args[0];
      if (typeof first === "string" && first.includes("ResizeObserver loop completed with undelivered notifications")) {
        return; // swallow
      }
    } catch {}
    origError(...args);
  };
} catch {}

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
