import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, List, ListItem, ListItemText } from "@mui/material";
import { socket } from "../services/socket";
import { useAuth } from "../contexts/AuthContext";

export default function ChatDialog({ open, onClose, rideId, otherName }) {
  const { auth } = useAuth();
  const userId = auth?.user?._id || auth?.user?.id;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!rideId) return;
    try { socket.emit("joinRideRoom", rideId); } catch {}
  }, [rideId]);

  useEffect(() => {
    const handler = (msg) => {
      if (String(msg?.rideId) === String(rideId)) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on("chatMessage", handler);
    return () => socket.off("chatMessage", handler);
  }, [rideId]);

  const send = () => {
    const t = (text || "").trim();
    if (!t) return;
    const payload = { rideId, fromUserId: userId, text: t };
    try { socket.emit("chatMessage", payload); } catch {}
    setMessages((prev) => [...prev, { ...payload, at: Date.now() }]);
    setText("");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Chat with {otherName || "User"}</DialogTitle>
      <DialogContent>
        <List dense>
          {messages.map((m, idx) => (
            <ListItem key={idx} sx={{ py: 0.5 }}>
              <ListItemText
                primary={m.text}
                secondary={String(m.fromUserId) === String(userId) ? "You" : otherName || "User"}
              />
            </ListItem>
          ))}
        </List>
        <TextField
          fullWidth
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          sx={{ mt: 1 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#1976d2 !important' }}>Close</Button>
        <Button onClick={send} variant="contained" sx={{ color: '#1976d2 !important' }}>Send</Button>
      </DialogActions>
    </Dialog>
  );
}