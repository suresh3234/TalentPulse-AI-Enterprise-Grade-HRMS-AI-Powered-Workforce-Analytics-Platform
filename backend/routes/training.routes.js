const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");
const ctrl = require("../controllers/training.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", ctrl.getAllTrainings);
router.get("/my", ctrl.getMyTrainings);
router.post("/", authorizeRole("admin", "hr"), ctrl.createTraining);
router.put("/:id", authorizeRole("admin", "hr"), ctrl.updateTraining);
router.delete("/:id", authorizeRole("admin", "hr"), ctrl.deleteTraining);
router.post("/:id/enroll", ctrl.enrollEmployee);
router.post("/:id/complete", ctrl.markCompleted);

module.exports = router;
