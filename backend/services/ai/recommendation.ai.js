const { analyzePerformance } = require("./performance.ai");
const { analyzeAttendance } = require("./attendance.ai");
const { getAiResponse } = require("../../utils/ai-service-client");
const Employee = require("../../models/employee.model");

/**
 * Provides recommendations and smart insights
 * @param {string} employeeId - Optional employee ID
 * @param {string} scope - Optional scope (e.g., 'dashboard')
 */
const generateRecommendations = async (employeeId, scope = null) => {
  if (scope === "dashboard") {
    return await generateDashboardInsights();
  }

  const recommendations = [];
  const attendance = await analyzeAttendance(employeeId);
  const performance = await analyzePerformance(employeeId);

  if (attendance.lateCount > 2) {
    recommendations.push("Improve punctuality: Consider one-on-one meeting to discuss late arrivals.");
  }

  if (performance.status === "Top Performer") {
    recommendations.push("Reward employee: Recognize their excellent performance and consistency.");
  }

  if (performance.status === "Needs Improvement") {
    recommendations.push("Conduct review: Schedule a performance appraisal or provide training.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Maintain current workflows and encourage continuous learning.");
  }

  return recommendations;
};

/**
 * Aggregates workforce data and gets AI insights for the dashboard
 */
const generateDashboardInsights = async () => {
  const employees = await Employee.find({ status: "Active" }).populate("user", "firstName lastName");
  
  // Aggregate high-level metrics
  const totalEmployees = employees.length;
  const departments = [...new Set(employees.map(e => e.department))];
  
  // Create a prompt for the AI
  const prompt = `
    Analyze the current workforce status for HR:
    - Total Active Employees: ${totalEmployees}
    - Departments: ${departments.join(", ")}
    - Employees: ${employees.slice(0, 5).map(e => `${e.user?.firstName} (${e.department})`).join(", ")}
    
    Provide 3 high-level HR strategic recommendations for this workforce.
    Return only the recommendations as a bulleted list.
  `;

  const aiResponse = await getAiResponse(prompt);
  
  if (aiResponse) {
    // Split by bullets or newlines and clean up
    return aiResponse.split("\n")
      .map(line => line.replace(/^[\s•*-]+|^\d+\.\s*/, "").trim())
      .filter(line => line.length > 10);
  }

  return [
    "Scale performance reviews across all departments.",
    "Monitor attendance trends for early burnout signals.",
    "Initialize department-wise leadership training programs."
  ];
};

module.exports = { generateRecommendations };
