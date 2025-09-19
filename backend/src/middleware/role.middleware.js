// Usage: roleMiddleware(['rider']) or roleMiddleware(['driver','admin'])
module.exports = function (allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // 🔑 FIX: use req.user.role instead of req.user.type
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient role" });
    }

    next();
  };
};
