// src/services/socket.js
import { io } from "socket.io-client";

// Prefer explicit socket URL; fall back to API URL; then current origin.
// In development, ensure we connect to backend port 5000 even if the app runs on 3000/3001.
function resolveSocketUrl() {
  const explicit = process.env.REACT_APP_SOCKET_URL;
  if (explicit) return explicit;
  const api = process.env.REACT_APP_API_URL;
  if (api) return api;
  if (typeof window !== "undefined" && window.location) {
    const origin = window.location.origin;
    try {
      const u = new URL(origin);
      const isLocalhost = /^localhost$|^127\.0\.0\.1$|^\[::1\]$/.test(u.hostname);
      if (isLocalhost) {
        // Always point sockets to backend dev server on 5000
        return `${u.protocol}//${u.hostname}:5000`;
      }
    } catch {}
    return origin;
  }
  return undefined;
}

const SOCKET_URL = resolveSocketUrl();

// Single shared Socket.IO client with sane reconnection settings
export const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 20000,
});

// Minimal error logging with rate limit to avoid console spam
let lastErrorLog = 0;
function rateLimitedLog(msg) {
  const now = Date.now();
  if (now - lastErrorLog > 15000) {
    // log at most once every 15s
    // eslint-disable-next-line no-console
    console.warn(msg);
    lastErrorLog = now;
  }
}

socket.on("connect_error", (err) => {
  rateLimitedLog(`Socket connect error: ${err?.message || err}`);
});
socket.on("error", (err) => {
  rateLimitedLog(`Socket error: ${err?.message || err}`);
});

export default socket;