// middleware/accessGuard.js
// Small wrapper if you prefer middleware that accepts multiple roles (uses normalizeRole)
const { normalizeRole } = require("./authMiddleware");

function accessGuard(roles = []) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: No token" });
      }
      const userRole = normalizeRole(req.user.role);
      if (userRole === "SuperAdmin") return next();
      if (roles.length > 0 && !roles.map(r => normalizeRole(r)).includes(userRole)) {
        return res.status(403).json({ message: "Forbidden: Insufficient role" });
      }
      next();
    } catch (err) {
      console.error("accessGuard error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

module.exports = accessGuard;
