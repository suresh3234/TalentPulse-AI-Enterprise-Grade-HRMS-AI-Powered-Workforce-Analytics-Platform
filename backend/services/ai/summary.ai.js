const { analyzePerformance } = require("./performance.ai");
const { analyzeAttendance } = require("./attendance.ai");
const { generateAttendanceTriggers, generatePerformanceTriggers } = require("./automation.triggers");

/**
 * Improved AI summary generation with detailed insights and automation triggers
 * @param {string} employeeId - The employee ID
 * @param {Date} startDate - Optional start date
 * @param {Date} endDate - Optional end date
 */
const generateSummary = async (employeeId, startDate = null, endDate = null) => {
  try {
    // Get comprehensive analysis data
    const attendance = await analyzeAttendance(employeeId, startDate, endDate);
    const performance = await analyzePerformance(employeeId, startDate, endDate);

    // Generate automation triggers
    const attendanceTriggers = generateAttendanceTriggers(attendance);
    const performanceTriggers = generatePerformanceTriggers(performance);
    const allTriggers = [...attendanceTriggers, ...performanceTriggers];

    // Build comprehensive summary
    let summary = "";
    const highlights = [];

    // Performance Summary
    if (performance.performanceStatus === "Top Performer") {
      summary += `⭐ ${performance.performanceStatus} - Employee demonstrates exceptional performance across all metrics. `;
      highlights.push({
        type: "positive",
        text: "Top Performer",
        color: "green",
      });
    } else if (performance.performanceStatus === "Excellent") {
      summary += `✓ ${performance.performanceStatus} - Consistent and reliable performance. `;
      highlights.push({
        type: "positive",
        text: "Excellent Performance",
        color: "green",
      });
    } else if (performance.performanceStatus === "Good") {
      summary += `✓ ${performance.performanceStatus} - Solid performance with areas for growth. `;
      highlights.push({
        type: "good",
        text: "Good Performance",
        color: "blue",
      });
    } else if (performance.performanceStatus === "Satisfactory") {
      summary += `△ ${performance.performanceStatus} - Meeting basic expectations but room for improvement. `;
      highlights.push({
        type: "neutral",
        text: "Satisfactory Performance",
        color: "yellow",
      });
    } else {
      summary += `⚠ ${performance.performanceStatus} - Performance below expectations. Immediate intervention needed. `;
      highlights.push({
        type: "negative",
        text: "Needs Improvement",
        color: "red",
      });
    }

    // Attendance Summary
    if (attendance.attendancePercentage >= 95) {
      summary += `Attendance is excellent at ${attendance.attendancePercentage}%. `;
      highlights.push({
        type: "positive",
        text: `${attendance.attendancePercentage}% Attendance`,
        color: "green",
      });
    } else if (attendance.attendancePercentage >= 85) {
      summary += `Attendance is good at ${attendance.attendancePercentage}%. `;
      highlights.push({
        type: "good",
        text: `${attendance.attendancePercentage}% Attendance`,
        color: "blue",
      });
    } else if (attendance.attendancePercentage >= 75) {
      summary += `Attendance at ${attendance.attendancePercentage}% is acceptable but below target. `;
      highlights.push({
        type: "neutral",
        text: `${attendance.attendancePercentage}% Attendance`,
        color: "yellow",
      });
    } else {
      summary += `Attendance is concerning at ${attendance.attendancePercentage}% (below 75% threshold). `;
      highlights.push({
        type: "negative",
        text: `${attendance.attendancePercentage}% Attendance`,
        color: "red",
      });
    }

    // Working Hours Summary
    const avgHours = parseFloat(attendance.workingHours.averagePerDay);
    if (avgHours >= 7.5) {
      summary += `Working ${avgHours} hours daily, demonstrating good commitment. `;
    } else if (avgHours > 0) {
      summary += `Working ${avgHours} hours daily, slightly below 8-hour standard. `;
    }

    // Issues and Recommendations
    if (attendance.metrics.maxConsecutiveAbsences >= 3) {
      summary += `⚠️ Alert: ${attendance.metrics.maxConsecutiveAbsences} consecutive absences detected. `;
      highlights.push({
        type: "alert",
        text: `Consecutive Absences (${attendance.metrics.maxConsecutiveAbsences} days)`,
        color: "red",
      });
    }

    if (attendance.metrics.lateCount >= 5) {
      summary += `Frequent late arrivals (${attendance.metrics.lateCount}x this period). `;
      highlights.push({
        type: "alert",
        text: `${attendance.metrics.lateCount} Late Arrivals`,
        color: "orange",
      });
    }

    // Action Items
    summary += performance.recommendation;

    // Fallback to Groq API if configured
    let finalSummary = summary;

    if (process.env.GROQ_API_KEY) {
      try {
        const Groq = require("groq-sdk");
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const prompt = `You are an expert HR analytics assistant. Create a concise, professional 2-3 sentence performance summary based on this data:
        
Performance: ${performance.performanceStatus} (Score: ${performance.performanceScore}%)
Attendance: ${attendance.attendancePercentage}%
Working Hours: ${avgHours} hours/day
Late Arrivals: ${attendance.metrics.lateCount}
Absences: ${attendance.metrics.absentCount}
Key Issues: ${attendance.metrics.maxConsecutiveAbsences >= 3 ? `${attendance.metrics.maxConsecutiveAbsences} consecutive absences` : "None significant"}

Generate a brief, actionable summary suitable for HR review.`;

        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.1-8b-instant",
          temperature: 0.5,
        });

        finalSummary = chatCompletion.choices[0]?.message?.content || summary;
      } catch (error) {
        console.error("Groq API Error:", error.message);
        // Fallback to local summary
      }
    }

    return {
      summary: finalSummary,
      period: {
        start: attendance.dateRange.start,
        end: attendance.dateRange.end,
      },
      highlights,
      keyMetrics: {
        performanceScore: performance.performanceScore,
        performanceStatus: performance.performanceStatus,
        attendancePercentage: attendance.attendancePercentage,
        attendanceStatus: attendance.attendanceStatus,
        averageWorkingHours: avgHours,
      },
      alerts: [
        ...attendance.alerts,
        ...(performance.alerts || []),
      ],
      insights: [
        ...attendance.insights,
        ...(performance.insights || []),
      ],
      recommendations: performance.actionItems || [],
      automationTriggers: allTriggers,
      triggersSummary: {
        total: allTriggers.length,
        highPriority: allTriggers.filter((t) => t.priority === "high").length,
        mediumPriority: allTriggers.filter((t) => t.priority === "medium").length,
      },
    };
  } catch (error) {
    console.error("Summary generation error:", error);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
};

module.exports = { generateSummary };
