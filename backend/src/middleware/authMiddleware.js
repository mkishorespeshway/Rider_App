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

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");

    const user = await User.findById(decoded.id).lean();
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
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
    console.error("❌ Auth error:", err.message);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = authMiddleware;
