// src/services/socket.js
import { io } from "socket.io-client";

// Prefer explicit socket URL; fall back to API URL; then localhost:5000
const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

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