const Attendance = require("../models/attendance.model");
const Employee = require("../models/employee.model");
const Application = require("../models/application.model");
const JobPosting = require("../models/jobPosting.model");
const logger = require("../utils/logger");

const employeePopulate = {
  path: "employeeId",
  select: "position department status joiningDate user",
  populate: {
    path: "user",
    select: "fullName email",
  },
};

const applicationPopulate = [
  {
    path: "jobPostingId",
    select: "title position department requiredExperience skills status closingDate",
  },
  {
    path: "reviewedBy",
    select: "fullName email",
  },
];

const CACHE_TTL_MS = Number(process.env.AI_CACHE_TTL_MS || 60_000);
const cache = new Map();

const STATUS_SCORE = {
  Present: 4,
  Late: 1,
  Leave: 0,
  Absent: -5,
};

const safeNumber = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createCacheKey = (prefix, payload) => `${prefix}:${JSON.stringify(payload)}`;

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCached = (key, value) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const buildDateRange = ({ month, year, windowDays = 30 }) => {
  if (month && year) {
    return {
      startDate: new Date(Number(year), Number(month) - 1, 1),
      endDate: new Date(Number(year), Number(month), 0, 23, 59, 59, 999),
    };
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - Math.max(safeNumber(windowDays, 30) - 1, 0));
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
};

const normalizeSkill = (skill) => String(skill || "").trim().toLowerCase();

const getEmployeeLabel = (employee) =>
  employee?.user?.fullName || employee?.position || employee?.user?.email || "Unknown employee";

const getDepartmentLabel = (employee) => employee?.department || "Unassigned";

const buildAttendanceBuckets = (records) => {
  const byEmployee = new Map();
  const byDay = new Map();

  for (const record of records) {
    const employee = record.employeeId;
    if (!employee?._id) {
      continue;
    }

    const employeeId = String(employee._id);
    const current = byEmployee.get(employeeId) || {
      employeeId,
      employeeName: getEmployeeLabel(employee),
      department: getDepartmentLabel(employee),
      position: employee.position || "N/A",
      status: employee.status || "Active",
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      total: 0,
      score: 0,
      recentStatuses: [],
    };

    current.total += 1;
    current.score += STATUS_SCORE[record.status] || 0;
    current.recentStatuses.push({
      status: record.status,
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
    });

    if (record.status === "Present") current.present += 1;
    if (record.status === "Late") current.late += 1;
    if (record.status === "Absent") current.absent += 1;
    if (record.status === "Leave") current.leave += 1;

    byEmployee.set(employeeId, current);

    const dayKey = startOfDay(record.date).toISOString().slice(0, 10);
    const dayBucket = byDay.get(dayKey) || { date: dayKey, Present: 0, Late: 0, Absent: 0, Leave: 0 };
    dayBucket[record.status] = (dayBucket[record.status] || 0) + 1;
    byDay.set(dayKey, dayBucket);
  }

  return { byEmployee, byDay };
};

const buildAttendanceAlert = (bucket) => {
  const attendanceRate = bucket.total > 0 ? ((bucket.present + bucket.late) / bucket.total) * 100 : 0;
  const anomalyScore = bucket.absent * 18 + bucket.late * 7 + bucket.leave * 3;

  if (bucket.absent >= 2 || attendanceRate < 65) {
    return {
      severity: "high",
      title: `${bucket.employeeName} needs attendance intervention`,
      insight: `${bucket.absent} absences and ${bucket.late} late marks detected in the current review window.`,
      recommendation: "Escalate to HRBP, verify manager follow-up, and check whether leave regularization is pending.",
      anomalyScore,
      attendanceRate,
    };
  }

  if (bucket.late >= 3 || attendanceRate < 80) {
    return {
      severity: "medium",
      title: `${bucket.employeeName} is trending toward attendance risk`,
      insight: `${bucket.late} late arrivals and an attendance rate of ${round(attendanceRate)}% were detected.`,
      recommendation: "Send a smart reminder, review shift timing, and monitor the next 5 working days.",
      anomalyScore,
      attendanceRate,
    };
  }

  return null;
};

const buildAttendanceAnalytics = async ({ month, year, windowDays } = {}) => {
  const cacheKey = createCacheKey("attendance-analytics", { month, year, windowDays });
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const { startDate, endDate } = buildDateRange({ month, year, windowDays });
  const records = await Attendance.find({
    date: { $gte: startDate, $lte: endDate },
  })
    .populate(employeePopulate)
    .lean()
    .sort({ date: -1 });

  const { byEmployee, byDay } = buildAttendanceBuckets(records);
  const employeeBuckets = Array.from(byEmployee.values()).map((bucket) => {
    const attendanceRate = bucket.total > 0 ? ((bucket.present + bucket.late) / bucket.total) * 100 : 0;
    const punctualityRate = bucket.total > 0 ? (bucket.present / bucket.total) * 100 : 0;

    return {
      ...bucket,
      attendanceRate: round(attendanceRate),
      punctualityRate: round(punctualityRate),
      recentStatuses: bucket.recentStatuses
        .sort((left, right) => new Date(right.date) - new Date(left.date))
        .slice(0, 5),
    };
  });

  const alerts = employeeBuckets
    .map((bucket) => {
      const alert = buildAttendanceAlert(bucket);
      if (!alert) {
        return null;
      }

      return {
        id: `attendance-${bucket.employeeId}`,
        type: "attendance",
        employeeId: bucket.employeeId,
        employeeName: bucket.employeeName,
        department: bucket.department,
        position: bucket.position,
        ...alert,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.anomalyScore - left.anomalyScore);

  const sortedTrend = Array.from(byDay.values())
    .sort((left, right) => new Date(left.date) - new Date(right.date))
    .slice(-7)
    .map((item) => ({
      date: item.date,
      remote: item.Present + item.Late,
      office: Math.max(item.Present - item.Late, 0),
      present: item.Present,
      late: item.Late,
      absent: item.Absent,
      leave: item.Leave,
    }));

  const result = {
    reviewWindow: {
      startDate,
      endDate,
    },
    recordsCount: records.length,
    employeeBuckets,
    alerts,
    attendanceTrend: sortedTrend,
    summary: {
      employeesTracked: employeeBuckets.length,
      flaggedEmployees: alerts.length,
      highSeverity: alerts.filter((item) => item.severity === "high").length,
      mediumSeverity: alerts.filter((item) => item.severity === "medium").length,
    },
  };

  setCached(cacheKey, result);
  return result;
};

const scoreCandidate = (application) => {
  const job = application.jobPostingId;
  const requiredSkills = new Set((job?.skills || []).map(normalizeSkill).filter(Boolean));
  const candidateSkills = new Set((application.skills || []).map(normalizeSkill).filter(Boolean));
  const overlappingSkills = Array.from(candidateSkills).filter((skill) => requiredSkills.has(skill));
  const missingSkills = Array.from(requiredSkills).filter((skill) => !candidateSkills.has(skill));

  const skillCoverage = requiredSkills.size > 0 ? overlappingSkills.length / requiredSkills.size : 0.6;
  const experienceGap = Math.max(safeNumber(job?.requiredExperience) - safeNumber(application.experience), 0);
  const experienceScore = clamp(1 - experienceGap / Math.max(safeNumber(job?.requiredExperience, 1), 1), 0, 1);
  const reviewerBoost = clamp((safeNumber(application.rating) || 0) / 5, 0, 1);
  const statusBoostMap = {
    Applied: 0.1,
    "Under Review": 0.18,
    Shortlisted: 0.26,
    Selected: 0.35,
    Offered: 0.32,
    Joined: 0.3,
    Rejected: 0,
  };
  const statusBoost = statusBoostMap[application.status] || 0.12;

  const rawScore = skillCoverage * 55 + experienceScore * 25 + reviewerBoost * 12 + statusBoost * 8;
  const matchPercentage = clamp(Math.round(rawScore), 35, 99);

  let hiringSuggestion = "Monitor";
  if (matchPercentage >= 85) hiringSuggestion = "Prioritize interview";
  else if (matchPercentage >= 75) hiringSuggestion = "Shortlist";
  else if (matchPercentage < 60) hiringSuggestion = "Consider only if pipeline is shallow";

  const reasons = [];
  if (overlappingSkills.length > 0) {
    reasons.push(`${overlappingSkills.length} required skill${overlappingSkills.length > 1 ? "s" : ""} matched`);
  }
  if (experienceGap <= 0) {
    reasons.push("meets experience requirement");
  } else if (experienceGap > 0) {
    reasons.push(`${experienceGap} year experience gap`);
  }
  if (application.rating) {
    reasons.push(`review rating ${application.rating}/5`);
  }

  return {
    applicationId: String(application._id),
    candidateName: application.candidateName,
    candidateEmail: application.candidateEmail,
    status: application.status,
    currentCompany: application.currentCompany || "N/A",
    experience: safeNumber(application.experience),
    jobPostingId: String(job?._id || ""),
    jobTitle: job?.title || job?.position || "Unknown role",
    department: job?.department || "Unassigned",
    matchPercentage,
    scoreBreakdown: {
      skillCoverage: round(skillCoverage * 100),
      experienceFit: round(experienceScore * 100),
      reviewerSignal: round(reviewerBoost * 100),
    },
    overlappingSkills,
    missingSkills,
    hiringSuggestion,
    reasons,
    updatedAt: application.updatedAt,
  };
};

const buildRecruitmentAnalytics = async ({ jobPostingId, limit = 10 } = {}) => {
  const cacheKey = createCacheKey("recruitment-analytics", { jobPostingId, limit });
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const filter = {};
  if (jobPostingId) {
    filter.jobPostingId = jobPostingId;
  }

  const applications = await Application.find(filter)
    .populate(applicationPopulate)
    .lean()
    .sort({ updatedAt: -1, createdAt: -1 });

  const rankedCandidates = applications
    .filter((application) => application.jobPostingId)
    .map(scoreCandidate)
    .sort((left, right) => right.matchPercentage - left.matchPercentage)
    .slice(0, safeNumber(limit, 10))
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));

  const byJob = rankedCandidates.reduce((accumulator, candidate) => {
    const key = candidate.jobPostingId;
    const current = accumulator[key] || {
      jobPostingId: candidate.jobPostingId,
      jobTitle: candidate.jobTitle,
      department: candidate.department,
      candidates: [],
    };

    current.candidates.push(candidate);
    accumulator[key] = current;
    return accumulator;
  }, {});

  const result = {
    rankedCandidates,
    jobs: Object.values(byJob).map((job) => ({
      ...job,
      topMatch: job.candidates[0]?.matchPercentage || 0,
      hiringSuggestion:
        job.candidates[0]?.matchPercentage >= 85
          ? "Move fastest on the top 2 profiles before the market closes."
          : "Broaden sourcing or revisit required skills for stronger fit.",
    })),
    summary: {
      totalApplicationsReviewed: applications.length,
      shortlistedReady: rankedCandidates.filter((candidate) => candidate.matchPercentage >= 75).length,
      strongMatches: rankedCandidates.filter((candidate) => candidate.matchPercentage >= 85).length,
    },
  };

  setCached(cacheKey, result);
  return result;
};

const buildPerformanceAnalytics = async ({ month, year, employeeId, department, windowDays } = {}) => {
  const cacheKey = createCacheKey("performance-analytics", {
    month,
    year,
    employeeId,
    department,
    windowDays,
  });
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const [attendanceAnalytics, employees] = await Promise.all([
    buildAttendanceAnalytics({ month, year, windowDays }),
    Employee.find(department || employeeId ? {
      ...(department ? { department } : {}),
      ...(employeeId ? { _id: employeeId } : {}),
    } : {})
      .populate("user", "fullName email")
      .lean(),
  ]);

  const employeeMap = new Map(attendanceAnalytics.employeeBuckets.map((bucket) => [bucket.employeeId, bucket]));

  const records = employees.map((employee) => {
    const attendance = employeeMap.get(String(employee._id));
    const attendanceRate = attendance?.attendanceRate ?? 0;
    const punctualityRate = attendance?.punctualityRate ?? 0;
    const riskPenalty = (attendance?.absent || 0) * 10 + (attendance?.late || 0) * 4 + (attendance?.leave || 0) * 1.5;
    const consistencyBonus = attendanceRate >= 95 ? 8 : attendanceRate >= 90 ? 5 : attendanceRate >= 85 ? 2 : 0;
    const performanceScore = clamp(
      Math.round(55 + attendanceRate * 0.35 + punctualityRate * 0.12 + consistencyBonus - riskPenalty),
      25,
      100,
    );

    let performanceBand = "Needs support";
    if (performanceScore >= 85) performanceBand = "High performer";
    else if (performanceScore >= 70) performanceBand = "Stable";

    return {
      employeeId: String(employee._id),
      employeeName: employee.user?.fullName || employee.position || "Unknown employee",
      email: employee.user?.email || "",
      department: employee.department || "Unassigned",
      position: employee.position || "N/A",
      status: employee.status || "Active",
      attendanceRate,
      punctualityRate,
      presentDays: attendance?.present || 0,
      lateDays: attendance?.late || 0,
      absentDays: attendance?.absent || 0,
      leaveDays: attendance?.leave || 0,
      performanceScore,
      performanceBand,
      recommendation:
        performanceScore >= 85
          ? "Consider for stretch goals, mentorship, or recognition."
          : performanceScore >= 70
            ? "Keep on track with manager check-ins and weekly goal visibility."
            : "Create a support plan focused on attendance reliability and workload blockers.",
    };
  });

  const filteredRecords = records.sort((left, right) => right.performanceScore - left.performanceScore);
  const departmentSummary = filteredRecords.reduce((accumulator, record) => {
    const current = accumulator[record.department] || {
      department: record.department,
      employees: 0,
      avgPerformanceScore: 0,
      avgAttendanceRate: 0,
      flaggedEmployees: 0,
    };

    current.employees += 1;
    current.avgPerformanceScore += record.performanceScore;
    current.avgAttendanceRate += record.attendanceRate;
    if (record.performanceScore < 70) current.flaggedEmployees += 1;
    accumulator[record.department] = current;
    return accumulator;
  }, {});

  const departmentBreakdown = Object.values(departmentSummary).map((item) => ({
    ...item,
    avgPerformanceScore: round(item.avgPerformanceScore / Math.max(item.employees, 1)),
    avgAttendanceRate: round(item.avgAttendanceRate / Math.max(item.employees, 1)),
  }));

  const result = {
    records: filteredRecords,
    topPerformers: filteredRecords.slice(0, 5),
    needsAttention: filteredRecords.filter((item) => item.performanceScore < 70).slice(0, 5),
    departmentBreakdown: departmentBreakdown.sort((left, right) => right.avgPerformanceScore - left.avgPerformanceScore),
    summary: {
      employeesReviewed: filteredRecords.length,
      highPerformers: filteredRecords.filter((item) => item.performanceBand === "High performer").length,
      needsSupport: filteredRecords.filter((item) => item.performanceBand === "Needs support").length,
      averagePerformanceScore:
        filteredRecords.length > 0
          ? round(filteredRecords.reduce((sum, item) => sum + item.performanceScore, 0) / filteredRecords.length)
          : 0,
    },
  };

  setCached(cacheKey, result);
  return result;
};

const buildSmartRecommendations = async ({ scope = "all", jobPostingId, month, year, windowDays, limit } = {}) => {
  const [attendanceAnalytics, recruitmentAnalytics, performanceAnalytics, openJobs] = await Promise.all([
    buildAttendanceAnalytics({ month, year, windowDays }),
    buildRecruitmentAnalytics({ jobPostingId, limit }),
    buildPerformanceAnalytics({ month, year, windowDays }),
    JobPosting.find({ status: "Open" }).select("title department closingDate").lean().sort({ createdAt: -1 }).limit(5),
  ]);

  const attendanceRecommendations = attendanceAnalytics.alerts.slice(0, 4).map((alert) => ({
    id: alert.id,
    category: "attendance",
    title: alert.title,
    priority: alert.severity,
    recommendation: alert.recommendation,
    context: `${alert.department} • ${round(alert.attendanceRate)}% attendance rate`,
  }));

  const recruitmentRecommendations = recruitmentAnalytics.rankedCandidates.slice(0, 4).map((candidate) => ({
    id: `candidate-${candidate.applicationId}`,
    category: "recruitment",
    title: `${candidate.candidateName} is a ${candidate.matchPercentage}% match for ${candidate.jobTitle}`,
    priority: candidate.matchPercentage >= 85 ? "high" : "medium",
    recommendation: candidate.hiringSuggestion,
    context: candidate.reasons.join(" • "),
  }));

  const performanceRecommendations = performanceAnalytics.needsAttention.slice(0, 4).map((employee) => ({
    id: `performance-${employee.employeeId}`,
    category: "performance",
    title: `${employee.employeeName} needs a support plan`,
    priority: employee.performanceScore < 60 ? "high" : "medium",
    recommendation: employee.recommendation,
    context: `${employee.department} • score ${employee.performanceScore} • attendance ${employee.attendanceRate}%`,
  }));

  const smartSummary = [
    attendanceAnalytics.summary.highSeverity > 0
      ? `${attendanceAnalytics.summary.highSeverity} high-severity attendance alert(s) need HR action today.`
      : "No high-severity attendance risk detected in the active review window.",
    recruitmentAnalytics.summary.strongMatches > 0
      ? `${recruitmentAnalytics.summary.strongMatches} strong candidate match(es) are ready for fast-track review.`
      : "Recruitment pipeline needs more strong-fit candidates for current openings.",
    performanceAnalytics.summary.needsSupport > 0
      ? `${performanceAnalytics.summary.needsSupport} employee(s) need coaching or workload support.`
      : "Operational performance indicators look healthy across the current workforce snapshot.",
  ];

  const payload = {
    scope,
    generatedAt: new Date().toISOString(),
    smartSummary,
    attendance: {
      summary: attendanceAnalytics.summary,
      alerts: attendanceAnalytics.alerts.slice(0, 6),
      recommendations: attendanceRecommendations,
      trend: attendanceAnalytics.attendanceTrend,
    },
    recruitment: {
      summary: recruitmentAnalytics.summary,
      rankedCandidates: recruitmentAnalytics.rankedCandidates,
      jobs: recruitmentAnalytics.jobs,
      recommendations: recruitmentRecommendations,
      openJobs: openJobs.map((job) => ({
        id: String(job._id),
        title: job.title,
        department: job.department,
        closingDate: job.closingDate,
      })),
    },
    performance: {
      summary: performanceAnalytics.summary,
      topPerformers: performanceAnalytics.topPerformers,
      needsAttention: performanceAnalytics.needsAttention,
      departmentBreakdown: performanceAnalytics.departmentBreakdown,
      recommendations: performanceRecommendations,
    },
  };

  logger.info("AI recommendations generated", {
    scope,
    attendanceAlerts: payload.attendance.alerts.length,
    rankedCandidates: payload.recruitment.rankedCandidates.length,
    performanceFlags: payload.performance.needsAttention.length,
  });

  return payload;
};

const buildRecruitmentChatReply = async ({ message, jobPostingId, limit = 25 } = {}) => {
  const question = String(message || "").trim();
  const normalized = question.toLowerCase();

  const [recruitmentAnalytics, selectedJob] = await Promise.all([
    buildRecruitmentAnalytics({ jobPostingId, limit }),
    jobPostingId ? JobPosting.findById(jobPostingId).lean() : Promise.resolve(null),
  ]);

  const candidates = recruitmentAnalytics.rankedCandidates || [];
  const topCandidate = candidates[0] || null;
  const namedCandidate = candidates.find((candidate) =>
    normalized.includes(candidate.candidateName.toLowerCase()),
  );
  const candidate = namedCandidate || topCandidate;

  if (!question) {
    return {
      reply: "Ask about candidate fit, top priority, missing skills, interview readiness, or the selected role.",
      context: {
        selectedJobId: jobPostingId || "",
        candidateCount: candidates.length,
      },
    };
  }

  if (!candidate && !selectedJob) {
    return {
      reply: "No live recruitment data is available yet. Select an open role to start candidate analysis.",
      context: {
        selectedJobId: jobPostingId || "",
        candidateCount: 0,
      },
    };
  }

  let reply;

  if (normalized.includes("top") || normalized.includes("best") || normalized.includes("priority")) {
    reply = topCandidate
      ? `${topCandidate.candidateName} is the current top priority at ${topCandidate.matchPercentage}% match. ${topCandidate.hiringSuggestion}.`
      : "There is no ranked candidate for the selected role yet.";
  } else if (
    normalized.includes("missing") ||
    normalized.includes("gap") ||
    normalized.includes("skill")
  ) {
    if (!candidate) {
      reply = "No ranked candidate is available to inspect skill gaps right now.";
    } else if (!candidate.missingSkills?.length) {
      reply = `${candidate.candidateName} has no critical skill gap against the selected role requirements.`;
    } else {
      reply = `${candidate.candidateName} is missing ${candidate.missingSkills.join(", ")}. Strong overlap: ${candidate.overlappingSkills.slice(0, 3).join(", ") || "not available"}.`;
    }
  } else if (
    normalized.includes("experience") ||
    normalized.includes("fit") ||
    normalized.includes("match") ||
    normalized.includes("why")
  ) {
    if (!candidate) {
      reply = "No candidate match data is available yet for this role.";
    } else {
      reply = `${candidate.candidateName} has ${candidate.experience} years of experience and a ${candidate.matchPercentage}% match. Key fit signals: ${candidate.reasons.join(", ")}.`;
    }
  } else if (
    normalized.includes("job") ||
    normalized.includes("role") ||
    normalized.includes("position") ||
    normalized.includes("requirement")
  ) {
    if (!selectedJob) {
      reply = "No open job is selected right now.";
    } else {
      reply = `${selectedJob.title} in ${selectedJob.department} needs ${selectedJob.requiredExperience} years experience. Core skills: ${(selectedJob.skills || []).slice(0, 5).join(", ") || "not defined"}.`;
    }
  } else if (
    normalized.includes("interview") ||
    normalized.includes("shortlist") ||
    normalized.includes("hire") ||
    normalized.includes("suggest")
  ) {
    if (!candidate) {
      reply = recruitmentAnalytics.jobs?.[0]?.hiringSuggestion || "There is no candidate ready for interview guidance yet.";
    } else {
      reply = `${candidate.candidateName} is ranked #${candidate.rank} for ${candidate.jobTitle}. Recommended next step: ${candidate.hiringSuggestion}.`;
    }
  } else if (candidate) {
    reply = `${candidate.candidateName} is ranked #${candidate.rank} for ${candidate.jobTitle} with ${candidate.matchPercentage}% match. Recommended next step: ${candidate.hiringSuggestion}.`;
  } else {
    reply = "RecruitAI can help with candidate fit, ranking priority, skill gaps, and role requirements for the selected job.";
  }

  return {
    reply,
    context: {
      selectedJobId: jobPostingId || "",
      candidateCount: candidates.length,
      topCandidate: topCandidate
        ? {
            candidateName: topCandidate.candidateName,
            matchPercentage: topCandidate.matchPercentage,
            jobTitle: topCandidate.jobTitle,
          }
        : null,
    },
  };
};

module.exports = {
  buildAttendanceAnalytics,
  buildRecruitmentAnalytics,
  buildPerformanceAnalytics,
  buildSmartRecommendations,
  buildRecruitmentChatReply,
};
