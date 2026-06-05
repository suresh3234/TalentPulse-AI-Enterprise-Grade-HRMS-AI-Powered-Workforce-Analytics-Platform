const Report = require("../models/report.model");
const { generateAttendanceReport } = require("../services/reports/attendance.report");
const { generatePerformanceReport } = require("../services/reports/performance.report");
const { generateRecruitmentReport } = require("../services/reports/recruitment.report");
const logger = require("../utils/logger");

/**
 * Get all reports or filter by type
 * GET /api/ai/reports?type=attendance&period=monthly&page=1&limit=10
 */
exports.getReports = async (req, res) => {
  try {
    const { type, period, page = 1, limit = 10 } = req.query;

    const query = {};
    if (type) query.type = type;
    if (period) query.period = period;

    const skip = (page - 1) * limit;

    const reports = await Report.find(query)
      .populate("generatedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Report.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Reports retrieved successfully",
      data: reports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get reports error", { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve reports",
      error: error.message,
    });
  }
};

/**
 * Get single report by ID
 * GET /api/ai/reports/:id
 */
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id)
      .populate("generatedBy", "firstName lastName email")
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report retrieved successfully",
      data: report,
    });
  } catch (error) {
    logger.error("Get report by ID error", { id, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve report",
      error: error.message,
    });
  }
};

/**
 * Generate new reports - analytics endpoint
 * POST /api/ai/analytics
 * Body: { reportType: 'attendance'|'performance'|'recruitment', period: 'weekly'|'monthly'|'custom', startDate?, endDate?, departmentId? }
 */
exports.generateAnalytics = async (req, res) => {
  try {
    const { reportType, period = "monthly", startDate, endDate, departmentId } = req.body;
    const userId = req.user?.id || req.user?._id;

    // Validate required fields
    if (!reportType) {
      return res.status(400).json({
        success: false,
        message: "reportType is required (attendance, performance, or recruitment)",
      });
    }

    if (!["attendance", "performance", "recruitment"].includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reportType. Must be: attendance, performance, or recruitment",
      });
    }

    // Calculate date range if not provided
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;

    if (!start || !end) {
      const now = new Date();
      end = end || now;

      if (period === "weekly") {
        start = start || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === "monthly") {
        start = start || new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        start = start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    const startTime = Date.now();
    logger.info("Report generation started", { reportType, period, userId });

    let reportData;

    // Generate appropriate report
    if (reportType === "attendance") {
      reportData = await generateAttendanceReport(start, end, period, departmentId);
    } else if (reportType === "performance") {
      reportData = await generatePerformanceReport(start, end, period, departmentId);
    } else if (reportType === "recruitment") {
      reportData = await generateRecruitmentReport(start, end, period);
    }

    // Save report to database
    const report = await Report.create({
      type: reportType,
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report - ${period}`,
      description: reportData.summary,
      period,
      startDate: start,
      endDate: end,
      generatedBy: userId,
      departmentId,
      data: reportData,
      summary: reportData.summary,
      metrics: reportData.metrics,
      insights: reportData.insights || [],
      status: "completed",
    });

    const durationMs = Date.now() - startTime;
    logger.info("Report generation successful", { 
      reportId: report._id, 
      reportType, 
      period, 
      durationMs,
      metrics: reportData.metrics 
    });

    return res.status(201).json({
      success: true,
      message: `${reportType} report generated successfully`,
      data: report,
    });
  } catch (error) {
    logger.error("Generate analytics error", { 
      reportType: req.body.reportType, 
      error: error.message, 
      stack: error.stack 
    });
    return res.status(500).json({
      success: false,
      message: "Failed to generate analytics report",
      error: error.message,
    });
  }
};

/**
 * Get analytics summary - quick overview of all metrics
 * GET /api/ai/summary?period=monthly
 */
exports.getAnalyticsSummary = async (req, res) => {
  try {
    const { period = "monthly" } = req.query;

    // Get latest report of each type
    const attendanceReport = await Report.findOne({ type: "attendance", period })
      .sort({ createdAt: -1 })
      .lean();

    const performanceReport = await Report.findOne({ type: "performance", period })
      .sort({ createdAt: -1 })
      .lean();

    const recruitmentReport = await Report.findOne({ type: "recruitment", period })
      .sort({ createdAt: -1 })
      .lean();

    // Build summary
    const summary = {
      period,
      generatedAt: new Date(),
      reports: {
        attendance: attendanceReport ? {
          attendancePercentage: attendanceReport.metrics?.attendancePercentage,
          totalRecords: attendanceReport.metrics?.totalRecords,
          presentCount: attendanceReport.metrics?.presentCount,
          absentCount: attendanceReport.metrics?.absentCount,
          lateCount: attendanceReport.metrics?.lateCount,
        } : null,
        performance: performanceReport ? {
          averageScore: performanceReport.metrics?.averageScore,
          totalEmployees: performanceReport.metrics?.totalEmployees,
          topPerformers: performanceReport.metrics?.topPerformers,
          needsImprovement: performanceReport.metrics?.needsImprovement,
        } : null,
        recruitment: recruitmentReport ? {
          totalPostings: recruitmentReport.metrics?.totalPostings,
          totalApplications: recruitmentReport.metrics?.totalApplications,
          selectedCandidates: recruitmentReport.metrics?.selectedCandidates,
          conversionRate: recruitmentReport.metrics?.conversionRate,
        } : null,
      },
      allInsights: [
        ...(attendanceReport?.insights || []),
        ...(performanceReport?.insights || []),
        ...(recruitmentReport?.insights || []),
      ],
    };

    return res.status(200).json({
      success: true,
      message: "Analytics summary retrieved successfully",
      data: summary,
    });
  } catch (error) {
    logger.error("Get analytics summary error", { period, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve analytics summary",
      error: error.message,
    });
  }
};

/**
 * Delete a report
 * DELETE /api/ai/reports/:id
 */
exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    logger.error("Delete report error", { id, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: "Failed to delete report",
      error: error.message,
    });
  }
};

/**
 * Get insights from latest reports
 * GET /api/ai/reports/insights
 */
exports.getInsights = async (req, res) => {
  try {
    const { period = "monthly", type } = req.query;

    const query = { period };
    if (type) query.type = type;

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const allInsights = [];
    reports.forEach((report) => {
      if (report.insights && Array.isArray(report.insights)) {
        allInsights.push(...report.insights);
      }
    });

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    allInsights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return res.status(200).json({
      success: true,
      message: "Insights retrieved successfully",
      data: allInsights,
      count: allInsights.length,
    });
  } catch (error) {
    logger.error("Get insights error", { period, type, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve insights",
      error: error.message,
    });
  }
};
