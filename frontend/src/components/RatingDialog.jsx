import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Rating from "@mui/material/Rating";

export default function RatingDialog({ open, onClose, onSubmit, ride, submitting = false, error = "" }) {
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");

  useEffect(() => {
    if (open) {
      setStars(5);
      setReview("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (stars < 1 || stars > 5) return;
    onSubmit?.({ rating: stars, review });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Rate your ride</DialogTitle>
      <DialogContent>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Rating name="ride-rating" value={stars} onChange={(_, v) => setStars(v || 1)} />
          <TextField
            label="Write a review (optional)"
            multiline
            minRows={2}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          {error ? (
            <div style={{ color: "#d32f2f", fontSize: 13 }}>{String(error)}</div>
          ) : null}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Later</Button>
        <Button variant="contained" type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}