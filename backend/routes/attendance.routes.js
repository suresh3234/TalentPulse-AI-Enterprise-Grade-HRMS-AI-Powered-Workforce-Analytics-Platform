const express = require("express");
const {
  createAttendance,
  getAttendance,
  updateAttendance,
  getActivities,
} = require("../controllers/attendance.controller");

const router = express.Router();

router.route("/").get(getAttendance).put(updateAttendance).post(createAttendance);
router.get("/activities", getActivities);

module.exports = router;