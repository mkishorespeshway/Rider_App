// src/middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error(err);

  if (err.name === "ValidationError") {
    const firstError = Object.values(err.errors)[0].message;
    return res.status(400).json({ success: false, message: firstError });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server error",
  });
};
