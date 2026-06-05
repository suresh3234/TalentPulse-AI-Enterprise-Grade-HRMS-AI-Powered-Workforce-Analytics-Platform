const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");
const {
  getMyNotifications,
  markAsRead,
  markAllRead,
} = require("../controllers/notification.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/my", getMyNotifications);
router.put("/:id/read", markAsRead);
router.put("/read-all", markAllRead);

module.exports = router;
