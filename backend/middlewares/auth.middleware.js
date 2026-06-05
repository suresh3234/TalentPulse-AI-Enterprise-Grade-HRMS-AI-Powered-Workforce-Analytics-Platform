const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const devopsService = require("../services/devops.service");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      devopsService.recordSecurityEvent("UNAUTHORIZED_ACCESS", { 
        path: req.originalUrl, 
        reason: "Missing or malformed token",
        ip: req.ip 
      });
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();

  } catch (error) {
    devopsService.recordSecurityEvent("UNAUTHORIZED_ACCESS", { 
      path: req.originalUrl, 
      reason: "Invalid token",
      ip: req.ip 
    });
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = authMiddleware;
