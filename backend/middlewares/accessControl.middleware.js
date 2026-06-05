// Access Control Middleware
const accessControl = (req, res, next) => {
  try {
    // Check if user is active
    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated"
      });
    }

    // Log access attempt
    req.accessLog = {
      userId: req.user._id,
      role: req.user.role,
      method: req.method,
      path: req.path,
      timestamp: new Date(),
      ipAddress: req.ip
    };

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Access control error",
      error: error.message
    });
  }
};

// Resource ownership check
const checkResourceOwnership = async (resourceModel, resourceIdParam = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found"
        });
      }

      // Check if user owns resource or is admin
      const isOwner = resource.userId === req.user._id || 
                     resource.postedBy === req.user._id ||
                     resource.createdBy === req.user._id;
      
      const isAdmin = req.user.role === "admin";

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this resource"
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Resource check failed",
        error: error.message
      });
    }
  };
};

// Department-based access
const checkDepartmentAccess = (req, res, next) => {
  try {
    // HR and admins can access all departments
    if (req.user.role === "admin" || req.user.role === "hr") {
      return next();
    }

    // Employees can only access their own department
    const departmentParam = req.query.department || req.body.department;
    
    if (departmentParam && req.user.department !== departmentParam) {
      return res.status(403).json({
        success: false,
        message: "You can only access your department's data"
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Department access check failed",
      error: error.message
    });
  }
};

module.exports = {
  accessControl,
  checkResourceOwnership,
  checkDepartmentAccess
};
