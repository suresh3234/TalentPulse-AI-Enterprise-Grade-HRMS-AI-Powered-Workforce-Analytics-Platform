const Employee = require("../../models/employee.model");
const Attendance = require("../../models/attendance.model");
const Leave = require("../../models/leave.model");
const JobPosting = require("../../models/jobPosting.model");
const Application = require("../../models/application.model");
const performanceMonitor = require("../performanceMonitor.service");
const logger = require("../../utils/logger");

// Simple in-memory cache fallback for high-performance retrieval
let localCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5000; // 5 seconds refresh rate for "live" feel but high efficiency

class LiveAnalyticsService {
  /**
   * Fetch and aggregate real-time system analytics
   * @param {boolean} forceRefresh - Skip cache and force database aggregation
   */
  async getLiveAnalytics(forceRefresh = false) {
    const startTime = Date.now();
    const now = Date.now();

    // Return cached value if valid
    if (!forceRefresh && localCache && (now - lastCacheTime < CACHE_TTL_MS)) {
      performanceMonitor.recordCacheAccess("live-analytics", true);
      logger.info("Serving live analytics from memory cache");
      return localCache;
    }

    performanceMonitor.recordCacheAccess("live-analytics", false);
    logger.info("Aggregating live analytics from database");

    try {
      // 1. Employee Overview
      const employeeOverview = await Employee.aggregate([
        {
          $group: {
            _id: null,
            totalEmployees: { $sum: 1 },
            activeCount: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
            onLeaveCount: { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } },
            onboardingCount: { $sum: { $cond: [{ $eq: ["$status", "Onboarding"] }, 1, 0] } },
            inactiveCount: { $sum: { $cond: [{ $eq: ["$status", "Inactive"] }, 1, 0] } },
            totalBaseSalary: { $sum: "$baseSalary" },
            averageBaseSalary: { $avg: "$baseSalary" }
          }
        }
      ]);

      const empStats = employeeOverview[0] || {
        totalEmployees: 0,
        activeCount: 0,
        onLeaveCount: 0,
        onboardingCount: 0,
        inactiveCount: 0,
        totalBaseSalary: 0,
        averageBaseSalary: 0
      };

      // 2. Department-wise breakdown
      const departmentBreakdown = await Employee.aggregate([
        {
          $group: {
            _id: "$department",
            count: { $sum: 1 },
            activeCount: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
            averageSalary: { $avg: "$baseSalary" }
          }
        },
        {
          $project: {
            department: "$_id",
            count: 1,
            activeCount: 1,
            averageSalary: { $round: ["$averageSalary", 2] },
            _id: 0
          }
        }
      ]);

      // 3. Attendance Aggregation (Current Month)
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      const attendanceOverview = await Attendance.aggregate([
        { $match: { date: { $gte: currentMonthStart } } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      let totalAttendanceRecords = 0;
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      attendanceOverview.forEach(item => {
        const c = item.count;
        totalAttendanceRecords += c;
        if (item._id === "Present") presentCount = c;
        else if (item._id === "Late") lateCount = c;
        else if (item._id === "Absent") absentCount = c;
        else if (item._id === "Leave") leaveCount = c;
      });

      const totalPresent = presentCount + lateCount;
      const attendancePercentage = totalAttendanceRecords > 0 
        ? parseFloat(((totalPresent / (totalAttendanceRecords - leaveCount)) * 100).toFixed(2)) 
        : 100.00;

      // 4. Recruitment Metrics
      const totalJobs = await JobPosting.countDocuments({ status: "Open" });
      const applicationStats = await Application.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      const applications = {
        total: 0,
        applied: 0,
        shortlisted: 0,
        interviewed: 0,
        offered: 0,
        rejected: 0
      };

      applicationStats.forEach(item => {
        applications.total += item.count;
        const status = item._id ? item._id.toLowerCase() : "";
        if (status === "applied") applications.applied = item.count;
        else if (status === "shortlisted") applications.shortlisted = item.count;
        else if (status === "interviewed") applications.interviewed = item.count;
        else if (status === "offered") applications.offered = item.count;
        else if (status === "rejected") applications.rejected = item.count;
      });

      // 5. Leave metrics
      const pendingLeaves = await Leave.countDocuments({ status: "Pending" });
      const approvedLeavesThisMonth = await Leave.countDocuments({ 
        status: "Approved", 
        startDate: { $gte: currentMonthStart } 
      });

      // Construct live analytics dataset
      const result = {
        success: true,
        timestamp: new Date().toISOString(),
        liveMetrics: {
          employees: {
            total: empStats.totalEmployees,
            active: empStats.activeCount,
            onLeave: empStats.onLeaveCount,
            onboarding: empStats.onboardingCount,
            inactive: empStats.inactiveCount,
            occupancyRate: empStats.totalEmployees > 0 
              ? parseFloat(((empStats.activeCount / empStats.totalEmployees) * 100).toFixed(2)) 
              : 0
          },
          attendance: {
            monthlyAttendanceRate: attendancePercentage,
            presentThisMonth: presentCount,
            lateThisMonth: lateCount,
            absentThisMonth: absentCount,
            leavesThisMonth: leaveCount,
            livePunctualityRate: totalPresent > 0 
              ? parseFloat(((presentCount / totalPresent) * 100).toFixed(2)) 
              : 100
          },
          recruitment: {
            openJobPostings: totalJobs,
            totalApplications: applications.total,
            pipelineBreakdown: {
              applied: applications.applied,
              shortlisted: applications.shortlisted,
              interviewed: applications.interviewed,
              offered: applications.offered,
              rejected: applications.rejected
            }
          },
          operations: {
            pendingLeaveRequests: pendingLeaves,
            approvedLeavesThisMonth,
            monthlyPayrollCommitment: empStats.totalBaseSalary,
            averageBaseSalary: parseFloat(empStats.averageBaseSalary.toFixed(2))
          }
        },
        departmentDistribution: departmentBreakdown,
        cacheStatus: {
          cached: false,
          generatedInMs: Date.now() - startTime
        }
      };

      // Update cache
      localCache = result;
      lastCacheTime = Date.now();

      // Record analytics processing metrics
      performanceMonitor.recordAnalyticsProcessing("live-aggregation", Date.now() - startTime, empStats.totalEmployees + totalAttendanceRecords, true);

      return result;
    } catch (error) {
      logger.error("Live Analytics Aggregation failed:", error);
      performanceMonitor.recordAnalyticsProcessing("live-aggregation", Date.now() - startTime, 0, false);
      throw error;
    }
  }
}

module.exports = new LiveAnalyticsService();
