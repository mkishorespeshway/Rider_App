const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Authorization token missing" });
    }

    const token = (authHeader.split(" ")[1] || "").trim();
    if (!token || token === "null" || token === "undefined") {
      return res
        .status(401)
        .json({ success: false, message: "Authorization token missing" });
    }

    // Minimal logging for debugging in development without leaking full token
    try {
      const preview = token.length > 12 ? token.slice(0, 12) + "…" : token;
      console.log(`🔐 Auth header OK, token preview: ${preview}`);
    } catch {}

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");

    let user = null;
    try {
      
      user = await User.findById(decoded.id).lean();
    } catch (dbErr) {
      console.warn("⚠️ Auth DB lookup failed, using token payload:", dbErr.message);
    }

    if (!user) {
      // Fallback to token payload to keep dev flow working when DB is offline
      req.user = { _id: decoded.id, role: decoded.role };
      return next();
    }

    req.user = {
      _id: user._id,
      fullName: user.fullName,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
    };

    next();
  } catch (err) {
    console.error("❌ Auth error:", err && err.message ? err.message : err);
    // Provide a slightly clearer hint for the client while preserving 401 semantics
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = authMiddleware;

