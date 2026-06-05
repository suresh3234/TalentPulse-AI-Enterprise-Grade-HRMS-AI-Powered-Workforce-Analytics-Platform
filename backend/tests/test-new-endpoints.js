const axios = require("axios");
const logger = require("../utils/logger");

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("\n==================================================");
  console.log("     VERIFYING NEW AI REAL-TIME ENDPOINTS");
  console.log("==================================================\n");

  // Test 1: Health Check
  try {
    const res = await axios.get(`${BASE_URL}/api/health`);
    console.log("✅ 1. Health Endpoint: PASS");
    console.log(`   Status: ${res.data.status}, DB: ${res.data.database}, AI Service: ${res.data.aiService}\n`);
  } catch (error) {
    console.error("❌ 1. Health Endpoint: FAIL", error.message);
  }

  // Test 2: Live Analytics
  try {
    const res = await axios.get(`${BASE_URL}/api/ai/live-analytics`);
    console.log("✅ 2. Live Analytics: PASS");
    console.log(`   Active Employees: ${res.data.data?.liveMetrics?.employees?.active}`);
    console.log(`   Monthly Attendance Rate: ${res.data.data?.liveMetrics?.attendance?.monthlyAttendanceRate}%`);
    console.log(`   Pending Leave Requests: ${res.data.data?.liveMetrics?.operations?.pendingLeaveRequests}`);
    console.log(`   Active Job Postings: ${res.data.data?.liveMetrics?.recruitment?.openJobPostings}\n`);
  } catch (error) {
    console.error("❌ 2. Live Analytics: FAIL", error.message);
    if (error.response) console.log(JSON.stringify(error.response.data));
  }

  // Test 3: Realtime Insights
  try {
    const res = await axios.get(`${BASE_URL}/api/ai/realtime-insights`);
    console.log("✅ 3. Realtime Corporate Insights: PASS");
    console.log(`   Active Risks Count: ${res.data.data?.summary?.activeRisksCount}`);
    console.log(`   Strategic Insights: ${res.data.data?.insights?.map(ins => ins.title).join(", ")}`);
    console.log(`   Action recommendations: ${res.data.data?.recommendations?.map(rec => rec.title).join(", ")}\n`);
  } catch (error) {
    console.error("❌ 3. Realtime Corporate Insights: FAIL", error.message);
    if (error.response) console.log(JSON.stringify(error.response.data));
  }

  // Test 4: Workflow Monitor
  try {
    const res = await axios.get(`${BASE_URL}/api/ai/workflow-monitor`);
    console.log("✅ 4. AI Workflow Monitor: PASS");
    console.log(`   Total Tracked Runs: ${res.data.data?.summary?.totalTrackedRuns}`);
    console.log(`   Local Fallback Queue Count: ${res.data.data?.summary?.activeFallbackQueueCount}`);
    console.log(`   Redis Queue Status: ${res.data.data?.queueSystem?.redisQueueEnabled ? "Enabled" : "Disabled"}\n`);
  } catch (error) {
    console.error("❌ 4. AI Workflow Monitor: FAIL", error.message);
    if (error.response) console.log(JSON.stringify(error.response.data));
  }

  // Test 5: Manual DevOps Performance Test Execution (Quick Mode)
  try {
    console.log("Running manual DevOps performance validation suite (quick mode)...");
    const res = await axios.get(`${BASE_URL}/api/devops/performance-tests?quick=true`);
    console.log("✅ 5. Manual Performance Validation Suite: PASS");
    console.log(`   Tests Executed: ${res.data.data?.summary?.total}`);
    console.log(`   Passes: ${res.data.data?.summary?.passed}, Failures: ${res.data.data?.summary?.failed}, Warnings: ${res.data.data?.summary?.skipped}`);
    console.log(`   System Health Status: ${res.data.data?.summary?.status}\n`);
  } catch (error) {
    console.error("❌ 5. Manual Performance Validation Suite: FAIL", error.message);
    if (error.response) console.log(JSON.stringify(error.response.data));
  }

  console.log("==================================================");
  console.log("           ALL TEST SEQUENCES COMPLETED");
  console.log("==================================================\n");
}

runTests();
