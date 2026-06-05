const Leave = require("../models/leave.model");
const Employee = require("../models/employee.model");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// Create Leave Request
const createLeave = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const { employeeId, leaveType, startDate, endDate, reason, numberOfDays } = req.body;

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      employeeId,
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
      ],
      status: { $ne: "Rejected" },
    });

    if (overlappingLeave) {
      return res.status(409).json({ success: false, message: "Overlapping leave already exists" });
    }

    const leave = new Leave({
      employeeId,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      numberOfDays,
      status: "Pending",
    });

    await leave.save();

    return res.status(201).json({
      success: true,
      message: "Leave request created successfully",
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// Get All Leave Requests
const getAllLeaves = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, employeeId } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;

    const leaves = await Leave.find(filter)
      .populate("employeeId", "position department baseSalary")
      .populate("approvedBy", "fullName email")
      .lean()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Leave.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Leaves retrieved successfully",
      data: leaves,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

// Get Leave by ID
const getLeaveById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const leave = await Leave.findById(id)
      .populate("employeeId", "position department baseSalary")
      .populate("approvedBy", "fullName email");

    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Leave retrieved successfully",
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// Update Leave Request (only if pending)
const updateLeave = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const { id } = req.params;
    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave not found" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({ success: false, message: `Cannot update ${leave.status} leave` });
    }

    Object.assign(leave, req.body);
    await leave.save();

    return res.status(200).json({
      success: true,
      message: "Leave updated successfully",
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// Approve/Reject Leave
const approveLeave = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const { id } = req.params;
    const { status, remarks, approvedBy } = req.body;

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave not found" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Only pending leaves can be approved/rejected" });
    }

    leave.status = status;
    if (approvedBy) {
      leave.approvedBy = approvedBy;
    }
    leave.approvalDate = new Date();
    if (remarks) leave.remarks = remarks;

    await leave.save();

    return res.status(200).json({
      success: true,
      message: `Leave ${status.toLowerCase()} successfully`,
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Leave Request
const deleteLeave = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const { id } = req.params;
    const leave = await Leave.findByIdAndDelete(id);

    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Leave deleted successfully",
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// Get Leave Balance for Employee
const getLeaveBalance = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const year = new Date().getFullYear();

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Calculate approved leaves for the year
    const approvedLeaves = await Leave.aggregate([
      {
        $match: {
          employeeId: new mongoose.Types.ObjectId(employeeId),
          status: "Approved",
          startDate: { $gte: new Date(`${year}-01-01`) },
        },
      },
      {
        $group: {
          _id: "$leaveType",
          totalDays: { $sum: "$numberOfDays" },
        },
      },
    ]);

    const leaveBalance = {
      "Annual Leave": 20,
      "Sick Leave": 10,
      "Casual Leave": 8,
      "Maternity Leave": 180,
      "Paternity Leave": 15,
      "Unpaid Leave": -1, // Unlimited
    };

    const used = {};
    approvedLeaves.forEach((leave) => {
      used[leave._id] = leave.totalDays;
    });

    const balance = {};
    Object.keys(leaveBalance).forEach((type) => {
      if (leaveBalance[type] === -1) {
        balance[type] = { total: -1, used: used[type] || 0, remaining: "Unlimited" };
      } else {
        balance[type] = {
          total: leaveBalance[type],
          used: used[type] || 0,
          remaining: leaveBalance[type] - (used[type] || 0),
        };
      }
    });

    return res.status(200).json({
      success: true,
      message: "Leave balance retrieved successfully",
      data: { employeeId, year, balance },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLeave,
  getAllLeaves,
  getLeaveById,
  updateLeave,
  approveLeave,
  deleteLeave,
  getLeaveBalance,
};
