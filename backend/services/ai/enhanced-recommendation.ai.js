/**
 * Enhanced AI Recommendation Engine
 * Generates intelligent, context-aware recommendations
 * Features:
 * - Multi-factor analysis
 * - Personalized recommendations
 * - Priority-based suggestions
 * - Action-oriented guidance
 * - Impact-focused insights
 */

const Attendance = require("../../models/attendance.model");
const Leave = require("../../models/leave.model");
const Employee = require("../../models/employee.model");
const Payroll = require("../../models/payroll.model");
const mongoose = require("mongoose");
const logger = require("../../utils/logger");

/**
 * Generate comprehensive employee recommendations
 * @param {string} employeeId - Employee ID
 * @param {string} scope - Scope of recommendations (all, performance, attendance, development)
 */
const generateEnhancedRecommendations = async (employeeId, scope = "all") => {
  try {
    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    const employee = await Employee.findById(employeeObjectId)
      .select("firstName lastName department role status user")
      .populate("user", "email")
      .lean();

    if (!employee) {
      return { success: false, message: "Employee not found" };
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); // Last 3 months

    // Fetch all relevant data
    const [attendanceData, leaveData, payrollData] = await Promise.all([
      Attendance.find({
        employeeId: employeeObjectId,
        date: { $gte: startDate, $lte: endDate },
      }).lean(),
      Leave.find({
        employeeId: employeeObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
      }).lean(),
      Payroll.find({
        employeeId: employeeObjectId,
        month: { $gte: startDate.getMonth(), $lte: endDate.getMonth() },
      }).lean(),
    ]);

    // Calculate metrics
    const metrics = calculateMetrics(attendanceData, leaveData, payrollData);

    // Generate recommendations based on scope
    let recommendations = [];

    if (scope === "all" || scope === "attendance") {
      recommendations.push(...generateAttendanceRecommendations(metrics));
    }

    if (scope === "all" || scope === "performance") {
      recommendations.push(...generatePerformanceRecommendations(metrics, employee));
    }

    if (scope === "all" || scope === "development") {
      recommendations.push(...generateDevelopmentRecommendations(metrics, employee));
    }

    // Prioritize and rank recommendations
    recommendations = prioritizeRecommendations(recommendations);

    // Add impact scoring
    recommendations = recommendations.map(rec => ({
      ...rec,
      estimatedImpact: calculateImpactScore(rec, metrics),
    }));

    return {
      success: true,
      employee: {
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        role: employee.role,
        email: employee.user?.email,
      },
      metrics: {
        attendancePercentage: metrics.attendancePercentage.toFixed(2),
        lateArrivals: metrics.lateCount,
        leavesUsed: metrics.approvedLeaves,
        averageWorkingHours: metrics.averageWorkingHours.toFixed(2),
      },
      recommendations: recommendations.slice(0, 10), // Top 10 recommendations
      summary: {
        totalRecommendations: recommendations.length,
        criticalRecommendations: recommendations.filter(r => r.priority === "CRITICAL").length,
        highRecommendations: recommendations.filter(r => r.priority === "HIGH").length,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error("Error generating enhanced recommendations:", { error: error.message });
    return {
      success: false,
      error: error.message,
      recommendations: [],
    };
  }
};

/**
 * Calculate key metrics for recommendations
 */
const calculateMetrics = (attendance, leaves, payroll) => {
  const presentCount = attendance.filter(a => a.status === "Present").length;
  const absentCount = attendance.filter(a => a.status === "Absent").length;
  const lateCount = attendance.filter(a => a.status === "Late").length;
  const totalDays = attendance.length || 1;

  let totalWorkingHours = 0;
  let daysWorked = 0;

  attendance.forEach(record => {
    if (record.status === "Present" && record.checkIn && record.checkOut) {
      const [inH, inM] = record.checkIn.split(":").map(Number);
      const [outH, outM] = record.checkOut.split(":").map(Number);
      const hours = (outH - inH) + (outM - inM) / 60;
      if (hours > 0) {
        totalWorkingHours += hours;
        daysWorked++;
      }
    }
  });

  const approvedLeaves = leaves.filter(l => l.status === "Approved").length;
  const rejectedLeaves = leaves.filter(l => l.status === "Rejected").length;

  return {
    attendancePercentage: ((presentCount + lateCount) / totalDays) * 100,
    presentCount,
    absentCount,
    lateCount,
    totalDays,
    averageWorkingHours: daysWorked > 0 ? totalWorkingHours / daysWorked : 0,
    approvedLeaves,
    rejectedLeaves,
    totalLeaves: leaves.length,
  };
};

/**
 * Generate attendance-related recommendations
 */
const generateAttendanceRecommendations = (metrics) => {
  const recommendations = [];

  // Recommendation 1: Low attendance
  if (metrics.attendancePercentage < 85) {
    recommendations.push({
      id: "ATT_001",
      type: "ATTENDANCE",
      title: "Improve Attendance Record",
      description: `Current attendance: ${metrics.attendancePercentage.toFixed(1)}%. Target: 90%.`,
      actionItems: [
        "Investigate barriers to attendance",
        "Create action plan with specific targets",
        "Schedule weekly check-ins",
      ],
      priority: metrics.attendancePercentage < 75 ? "CRITICAL" : "HIGH",
      timeline: "30 days",
      expectedOutcome: "Increase attendance to 90%+",
      category: "ATTENDANCE",
    });
  }

  // Recommendation 2: Late arrivals pattern
  if (metrics.lateCount >= 3) {
    const latePercentage = (metrics.lateCount / metrics.totalDays) * 100;
    recommendations.push({
      id: "ATT_002",
      type: "ATTENDANCE",
      title: "Address Punctuality Issues",
      description: `${metrics.lateCount} late arrivals (${latePercentage.toFixed(1)}% of days)`,
      actionItems: [
        "Discuss timing challenges",
        "Adjust work schedule if needed",
        "Set daily arrival accountability",
      ],
      priority: latePercentage > 10 ? "HIGH" : "MEDIUM",
      timeline: "14 days",
      expectedOutcome: "Achieve 100% on-time arrivals",
      category: "ATTENDANCE",
    });
  }

  // Recommendation 3: Excessive absences
  if (metrics.absentCount > 5) {
    recommendations.push({
      id: "ATT_003",
      type: "ATTENDANCE",
      title: "Investigate Excessive Absences",
      description: `${metrics.absentCount} absences in analysis period`,
      actionItems: [
        "One-on-one meeting to understand reasons",
        "Check for health or personal issues",
        "Provide support or accommodations if needed",
      ],
      priority: "CRITICAL",
      timeline: "7 days",
      expectedOutcome: "Understand and address root causes",
      category: "ATTENDANCE",
    });
  }

  // Recommendation 4: Perfect attendance
  if (metrics.attendancePercentage >= 98 && metrics.lateCount === 0) {
    recommendations.push({
      id: "ATT_004",
      type: "RECOGNITION",
      title: "Recognize Outstanding Attendance",
      description: `Perfect attendance: ${metrics.attendancePercentage.toFixed(1)}%`,
      actionItems: [
        "Send appreciation message",
        "Include in performance review",
        "Consider for recognition program",
      ],
      priority: "MEDIUM",
      timeline: "Immediate",
      expectedOutcome: "Boost morale and reinforce positive behavior",
      category: "RECOGNITION",
    });
  }

  return recommendations;
};

/**
 * Generate performance-related recommendations
 */
const generatePerformanceRecommendations = (metrics, employee) => {
  const recommendations = [];

  // Recommendation 1: Working hours concerns
  if (metrics.averageWorkingHours < 7) {
    recommendations.push({
      id: "PERF_001",
      type: "PERFORMANCE",
      title: "Address Low Working Hours",
      description: `Average: ${metrics.averageWorkingHours.toFixed(1)} hours/day (Expected: 8 hours)`,
      actionItems: [
        "Review workload and capacity",
        "Check for personal/health issues",
        "Establish clear work hour expectations",
      ],
      priority: "HIGH",
      timeline: "14 days",
      expectedOutcome: "Achieve standard 8-hour workday",
      category: "PERFORMANCE",
    });
  }

  // Recommendation 2: Excessive working hours
  if (metrics.averageWorkingHours > 9.5) {
    recommendations.push({
      id: "PERF_002",
      type: "PERFORMANCE",
      title: "Monitor Overtime and Burnout Risk",
      description: `Average: ${metrics.averageWorkingHours.toFixed(1)} hours/day`,
      actionItems: [
        "Review workload distribution",
        "Encourage work-life balance",
        "Monitor for burnout signs",
        "Consider workload adjustment",
      ],
      priority: "MEDIUM",
      timeline: "30 days",
      expectedOutcome: "Maintain sustainable work hours",
      category: "WELLBEING",
    });
  }

  // Recommendation 3: Leave balance
  if (metrics.approvedLeaves < 2 && metrics.totalDays > 60) {
    recommendations.push({
      id: "PERF_003",
      type: "PERFORMANCE",
      title: "Encourage Leave Usage",
      description: `Only ${metrics.approvedLeaves} leaves used in 3 months`,
      actionItems: [
        "Remind of leave policy",
        "Encourage time off for wellness",
        "Plan coverage if needed",
      ],
      priority: "LOW",
      timeline: "Ongoing",
      expectedOutcome: "Employee takes adequate breaks",
      category: "WELLBEING",
    });
  }

  return recommendations;
};

/**
 * Generate development-related recommendations
 */
const generateDevelopmentRecommendations = (metrics, employee) => {
  const recommendations = [];

  // Development recommendation 1: Skills assessment
  recommendations.push({
    id: "DEV_001",
    type: "DEVELOPMENT",
    title: "Schedule Skills Assessment",
    description: "Evaluate current skill levels and identify gaps",
    actionItems: [
      "Conduct skills assessment interview",
      "Identify development areas",
      "Create learning plan",
    ],
    priority: "MEDIUM",
    timeline: "30 days",
    expectedOutcome: "Clear development roadmap",
    category: "DEVELOPMENT",
  });

  // Development recommendation 2: Training opportunities
  recommendations.push({
    id: "DEV_002",
    type: "DEVELOPMENT",
    title: "Recommend Training Programs",
    description: "Identify relevant training for role and career growth",
    actionItems: [
      "Research relevant courses",
      "Discuss career aspirations",
      "Enroll in appropriate programs",
    ],
    priority: "MEDIUM",
    timeline: "45 days",
    expectedOutcome: "Enhanced skills and career readiness",
    category: "DEVELOPMENT",
  });

  // Development recommendation 3: Mentoring
  recommendations.push({
    id: "DEV_003",
    type: "DEVELOPMENT",
    title: "Assign Mentoring Relationship",
    description: "Pair with senior team member for guidance",
    actionItems: [
      "Identify potential mentor",
      "Schedule initial meeting",
      "Define mentoring goals",
    ],
    priority: "LOW",
    timeline: "Ongoing",
    expectedOutcome: "Accelerated professional growth",
    category: "DEVELOPMENT",
  });

  return recommendations;
};

/**
 * Prioritize and rank recommendations
 */
const prioritizeRecommendations = (recommendations) => {
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const categoryPriority = {
    ATTENDANCE: 0,
    PERFORMANCE: 1,
    WELLBEING: 2,
    RECOGNITION: 3,
    DEVELOPMENT: 4,
  };

  return recommendations.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return categoryPriority[a.category] - categoryPriority[b.category];
  });
};

/**
 * Calculate impact score for recommendation
 */
const calculateImpactScore = (recommendation, metrics) => {
  let score = 0;

  switch (recommendation.id) {
    case "ATT_001":
      score = Math.abs(90 - metrics.attendancePercentage);
      break;
    case "ATT_002":
      score = metrics.lateCount * 10;
      break;
    case "PERF_001":
      score = Math.abs(8 - metrics.averageWorkingHours) * 10;
      break;
    default:
      score = 50;
  }

  return Math.min(score, 100);
};

module.exports = {
  generateEnhancedRecommendations,
  calculateMetrics,
  generateAttendanceRecommendations,
  generatePerformanceRecommendations,
  generateDevelopmentRecommendations,
};
