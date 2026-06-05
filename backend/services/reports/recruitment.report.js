const JobPosting = require("../../models/jobPosting.model");
const Application = require("../../models/application.model");
const { analyzeRecruitment } = require("../ai/recruitment.ai");
const logger = require("../../utils/logger");

/**
 * Generates recruitment reports for specified period
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 * @param {string} period - Period type: 'weekly', 'monthly', 'custom'
 */
const generateRecruitmentReport = async (startDate, endDate, period = "monthly") => {
  try {
    // Get job postings in the period
    const jobPostings = await JobPosting.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    // Get applications in the period
    const applications = await Application.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("jobId", "title department")
      .lean();

    logger.info("Fetched recruitment data for report", {
      jobPostingsCount: jobPostings.length,
      applicationsCount: applications.length,
      startDate,
      endDate
    });

    const postingIds = jobPostings.map((j) => j._id.toString());
    const applicationsForPeriod = applications.filter((a) =>
      postingIds.includes(a.jobId?._id?.toString())
    );

    // Calculate metrics
    const totalPostings = jobPostings.length;
    const totalApplications = applicationsForPeriod.length;
    const selectedCandidates = applicationsForPeriod.filter((a) => a.status === "Selected").length;
    const rejectedCandidates = applicationsForPeriod.filter((a) => a.status === "Rejected").length;
    const pendingCandidates = applicationsForPeriod.filter((a) => a.status === "Pending").length;

    const conversionRate =
      totalApplications > 0 ? ((selectedCandidates / totalApplications) * 100).toFixed(2) : 0;

    // Job posting wise breakdown
    const jobStats = [];
    for (const job of jobPostings) {
      const jobApplications = applicationsForPeriod.filter(
        (a) => a.jobId?._id?.toString() === job._id.toString()
      );

      const selected = jobApplications.filter((a) => a.status === "Selected").length;
      const rejected = jobApplications.filter((a) => a.status === "Rejected").length;
      const pending = jobApplications.filter((a) => a.status === "Pending").length;

      jobStats.push({
        jobId: job._id,
        title: job.title,
        department: job.department,
        totalApplications: jobApplications.length,
        selected,
        rejected,
        pending,
        fillRate: jobApplications.length > 0 ? ((selected / jobApplications.length) * 100).toFixed(2) : 0,
      });
    }

    // Top performing applicants analysis
    const topCandidates = applicationsForPeriod
      .filter((a) => a.status === "Selected")
      .map((a) => ({
        applicationId: a._id,
        candidateName: a.candidateName,
        email: a.email,
        jobTitle: a.jobId?.title,
        status: a.status,
        appliedDate: a.createdAt,
      }))
      .sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
      .slice(0, 10);

    // Generate insights
    const insights = [];
    if (conversionRate > 30) {
      insights.push({
        title: "Strong Conversion Rate",
        description: `${conversionRate}% of applicants were selected. This indicates good candidate quality.`,
        severity: "info",
      });
    }
    if (conversionRate < 10 && totalApplications > 10) {
      insights.push({
        title: "Low Conversion Rate",
        description: `Only ${conversionRate}% of applicants selected. Consider adjusting requirements or job descriptions.`,
        severity: "warning",
      });
    }
    if (pendingCandidates > totalApplications * 0.5) {
      insights.push({
        title: "High Pending Applications",
        description: `${pendingCandidates} applications still pending. Expedite the review process.`,
        severity: "warning",
      });
    }
    if (totalPostings > 5) {
      insights.push({
        title: "Active Recruitment",
        description: `${totalPostings} job postings active. Significant hiring activity in progress.`,
        severity: "info",
      });
    }

    return {
      reportType: "recruitment",
      period,
      dateRange: { startDate, endDate },
      metrics: {
        totalPostings,
        totalApplications,
        selectedCandidates,
        rejectedCandidates,
        pendingCandidates,
        conversionRate: parseFloat(conversionRate),
      },
      jobStats,
      topCandidates,
      insights,
      summary: `Recruitment report for period ${startDate.toDateString()} to ${endDate.toDateString()}. ${totalPostings} positions active, ${totalApplications} applications received, ${selectedCandidates} candidates selected (${conversionRate}% conversion).`,
    };
  } catch (error) {
    throw new Error(`Failed to generate recruitment report: ${error.message}`);
  }
};

module.exports = { generateRecruitmentReport };
