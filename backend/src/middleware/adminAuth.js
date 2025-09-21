const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader)
      return res.status(401).json({ success: false, message: "No token provided" });

    const token = authHeader.split(" ")[1];
    if (!token)
      return res.status(401).json({ success: false, message: "Invalid token format" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");

    if (decoded.role !== "admin")
      return res.status(403).json({ success: false, message: "Forbidden: Admins only" });

    req.admin = decoded; // attach admin info
    next();
  } catch (err) {
    console.error("AdminAuth error:", err);
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
