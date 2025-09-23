// backend/src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // NOTE: our tokens use "id" (not "_id")
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // attach safe user object to req
    req.user = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      approvalStatus: user.approvalStatus,
    };

    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = authMiddleware;
