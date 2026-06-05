const Attendance = require("../../models/attendance.model");
const Employee = require("../../models/employee.model");
const mongoose = require("mongoose");
const logger = require("../../utils/logger");

/**
 * Generates attendance analytics report for specified period
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 * @param {string} period - Period type: 'weekly', 'monthly', 'custom'
 * @param {string} departmentId - Optional department filter
 */
const generateAttendanceReport = async (startDate, endDate, period = "monthly", departmentId = null) => {
  try {
    const query = {
      date: { $gte: startDate, $lte: endDate },
    };

    const attendanceRecords = await Attendance.find(query)
      .populate("employeeId", "firstName lastName email department")
      .lean();

    logger.info("Fetched attendance records for report", { 
      count: attendanceRecords.length,
      startDate,
      endDate
    });

    // If departmentId specified, filter further
    let filteredRecords = attendanceRecords;
    if (departmentId) {
      filteredRecords = attendanceRecords.filter(
        (rec) => rec.employeeId?.department?.toString() === departmentId
      );
    }

    // Calculate metrics
    const totalRecords = filteredRecords.length;
    const presentCount = filteredRecords.filter((r) => r.status === "Present").length;
    const absentCount = filteredRecords.filter((r) => r.status === "Absent").length;
    const lateCount = filteredRecords.filter((r) => r.status === "Late").length;
    const leaveCount = filteredRecords.filter((r) => r.status === "Leave").length;

    const attendancePercentage = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(2) : 0;

    // Employee-wise breakdown
    const employeeStats = {};
    filteredRecords.forEach((record) => {
      const empId = record.employeeId._id;
      if (!employeeStats[empId]) {
        employeeStats[empId] = {
          employeeId: empId,
          name: `${record.employeeId.firstName} ${record.employeeId.lastName}`,
          email: record.employeeId.email,
          department: record.employeeId.department,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          totalDays: 0,
        };
      }
      employeeStats[empId].totalDays += 1;
      if (record.status === "Present") employeeStats[empId].present += 1;
      if (record.status === "Absent") employeeStats[empId].absent += 1;
      if (record.status === "Late") employeeStats[empId].late += 1;
      if (record.status === "Leave") employeeStats[empId].leave += 1;
    });

    // Convert to array and calculate attendance percentage per employee
    const employeeList = Object.values(employeeStats).map((emp) => ({
      ...emp,
      attendancePercentage: emp.totalDays > 0 ? ((emp.present / emp.totalDays) * 100).toFixed(2) : 0,
    }));

    // Generate insights
    const insights = [];
    if (absentCount > totalRecords * 0.1) {
      insights.push({
        title: "High Absence Rate",
        description: `Absence rate is ${((absentCount / totalRecords) * 100).toFixed(2)}%. Consider reviewing leave policies.`,
        severity: "warning",
      });
    }
    if (lateCount > totalRecords * 0.15) {
      insights.push({
        title: "Frequent Late Arrivals",
        description: `${lateCount} late arrivals detected. Consider implementing punctuality initiatives.`,
        severity: "warning",
      });
    }
    if (attendancePercentage < 75) {
      insights.push({
        title: "Low Attendance",
        description: `Overall attendance percentage is ${attendancePercentage}%, which is below target of 90%.`,
        severity: "critical",
      });
    }

    return {
      reportType: "attendance",
      period,
      dateRange: { startDate, endDate },
      metrics: {
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        attendancePercentage: parseFloat(attendancePercentage),
      },
      employeeStats: employeeList,
      insights,
      summary: `Attendance report for period ${startDate.toDateString()} to ${endDate.toDateString()}. Overall attendance: ${attendancePercentage}%.`,
    };
  } catch (error) {
    throw new Error(`Failed to generate attendance report: ${error.message}`);
  }
};

module.exports = { generateAttendanceReport };
