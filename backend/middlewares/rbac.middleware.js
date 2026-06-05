const devopsService = require("../services/devops.service");

// RBAC (Role-Based Access Control) Middleware
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: "Authentication required" 
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        devopsService.recordSecurityEvent("RBAC_VIOLATION", {
          userId: req.user._id || req.user.id,
          role: req.user.role,
          action: "ROLE_CHECK",
          path: req.originalUrl,
          requiredRoles: allowedRoles
        });
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. Required role: ${allowedRoles.join(", ")}. Your role: ${req.user.role}` 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Authorization error", 
        error: error.message 
      });
    }
  };
};

// Permission-based access control
const authorizePermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: "Authentication required" 
        });
      }

      const hasPermission = req.user.permissions && 
                           req.user.permissions.includes(requiredPermission);

      if (!hasPermission) {
        devopsService.recordSecurityEvent("RBAC_VIOLATION", {
          userId: req.user._id || req.user.id,
          action: "PERMISSION_CHECK",
          path: req.originalUrl,
          requiredPermission: requiredPermission
        });
        return res.status(403).json({ 
          success: false, 
          message: `Permission denied. Required: ${requiredPermission}` 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Permission check failed", 
        error: error.message 
      });
    }
  };
};

module.exports = { authorizeRole, authorizePermission };
