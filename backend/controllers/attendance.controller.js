const Attendance = require("../models/attendance.model");
const Employee = require("../models/employee.model");
const { validationResult } = require("express-validator");
const workflowService = require("../services/ai/workflow.service");

const validStatuses = ["Present", "Absent", "Leave", "Late"];
const employeePopulate = {
  path: "employeeId",
  select: "position department baseSalary user",
  populate: {
    path: "user",
    select: "fullName email",
  },
};

module.exports.createAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, status, checkIn, checkOut } = req.body;

    // Validate required fields
    if (!employeeId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: "Employee ID, date, and status are required",
      });
    }

    // Validate status enum
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Create attendance record
    const attendance = new Attendance({
      employeeId,
      date,
      status,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
    });

    await attendance.save();

    // Trigger AI Workflow
    workflowService.queueWorkflow("attendance", { type: "attendance", id: employeeId });

    res.status(201).json({
      success: true,
      message: "Attendance record created successfully",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.getAttendance = async (req, res, next) => {
  try {
    const { employeeId, month, year, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        });
      }
      filter.status = status;
    }

    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(filter)
      .populate(employeePopulate)
      .lean()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1 });

    const total = await Attendance.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Attendance records retrieved successfully",
      data: attendanceRecords,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

module.exports.updateAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, status, checkIn, checkOut } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and date are required",
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    let finalStatus = status;
    if (!finalStatus) {
      finalStatus = checkIn || checkOut ? "Present" : "Absent";
    }

    if (!validStatuses.includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const updatedAttendance = await Attendance.findOneAndUpdate(
      { employeeId, date: new Date(date) },
      {
        $set: {
          status: finalStatus,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    ).populate("employeeId", "position department");
    
    await updatedAttendance.populate(employeePopulate);

    // Trigger AI Workflow
    workflowService.queueWorkflow("attendance", { type: "attendance", id: employeeId });

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: updatedAttendance,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.getActivities = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const recentAttendance = await Attendance.find()
      .populate(employeePopulate)
      .lean()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Attendance.countDocuments();

    const activities = recentAttendance.map((att) => ({
      id: att._id,
      employeeId: att.employeeId?._id,
      employeeName: att.employeeId?.user?.fullName || att.employeeId?.position || "Unknown",
      name: att.employeeId?.user?.fullName || "Unknown",
      action: `Marked as ${att.status} on ${new Date(att.date).toLocaleDateString()}`,
      tag: "ATTENDANCE",
      tagColor: "bg-green-100 text-green-700",
      time: `${Math.floor((Date.now() - new Date(att.createdAt)) / 60000)} mins ago`,
      status: att.status,
      dot: att.status === "Present" ? "bg-emerald-400" : att.status === "Leave" ? "bg-blue-400" : "bg-red-400",
    }));

    return res.json({
      success: true,
      message: "Activities retrieved successfully",
      data: activities,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};
