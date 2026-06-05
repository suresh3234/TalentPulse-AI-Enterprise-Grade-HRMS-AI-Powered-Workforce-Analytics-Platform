/**
 * DevOps Load & Alert Simulation Script
 * Generates AI traffic, injects resource overrides, and simulates security anomalies.
 * 
 * Usage:
 *   node scripts/simulate-load.js --mode <normal|load|error|security> --requests <number>
 */

const axios = require("axios");

const BASE_URL = process.env.BACKEND_URL || "http://localhost:5000";

// Command line arguments parsing
const args = {};
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith("--")) {
    const parts = arg.split("=");
    const key = parts[0].substring(2);
    const value = parts[1] || true;
    args[key] = value;
  }
});

const mode = args.mode || "normal";
const requestsLimit = parseInt(args.requests) || 30;
const intervalMs = parseInt(args.interval) || 300;

console.log("\x1b[35m%s\x1b[0m", "==================================================================");
console.log("\x1b[36m%s\x1b[0m", "        HRMS ELITE - ADVANCED DEVOPS LOAD SIMULATOR");
console.log("\x1b[35m%s\x1b[0m", "==================================================================");
console.log(`- Base URL:      ${BASE_URL}`);
console.log(`- Active Mode:   \x1b[33m${mode.toUpperCase()}\x1b[0m`);
console.log(`- Request Limit: ${requestsLimit}`);
console.log(`- Interval:      ${intervalMs}ms`);
console.log("------------------------------------------------------------------");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runSimulation() {
  try {
    // 1. Initial State Sync
    console.log("Initializing simulator and clearing old overrides...");
    await axios.post(`${BASE_URL}/api/devops/simulate`, {
      action: "set_overrides",
      value: null
    }).catch(() => {});

    if (mode === "load") {
      console.log("\x1b[33m%s\x1b[0m", "[LOAD MODE] Injecting high system resource usage simulation overrides...");
      // Set high CPU load average (e.g. 3.90 load average on 4 cores = 0.97 load per core)
      // Set high process memory RSS (e.g. 485 MB rss)
      // Set high OS memory usage (e.g. total 16GB, free 1.2GB = 92.5% usage)
      await axios.post(`${BASE_URL}/api/devops/simulate`, {
        action: "set_overrides",
        value: {
          loadAvg: [3.90, 3.10, 2.50],
          rssMb: 485,
          totalMemMb: 16384,
          freeMemMb: 1200
        }
      });
      console.log("\x1b[32m%s\x1b[0m", "✓ Simulation overrides injected. SYSTEM_HIGH_CPU & PROCESS_HIGH_MEMORY will trigger!");
    } else if (mode === "error") {
      console.log("\x1b[31m%s\x1b[0m", "[ERROR MODE] Preparing high error rate triggers...");
      // Trigger a direct AI high failure alert
      await axios.post(`${BASE_URL}/api/devops/simulate`, {
        action: "trigger_alert",
        type: "AI_HIGH_FAILURE_RATE",
        value: "AI failure rate reached 34%, exceeding critical threshold of 10%"
      });
    }

    // 2. Generate Requests Loop
    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i <= requestsLimit; i++) {
      const start = Date.now();
      let route = "";
      
      // Select endpoint to target
      if (mode === "security") {
        // Trigger unauthorized access & failed logins
        if (i % 2 === 0) {
          route = "/api/ai/cache/clear"; // Needs auth, triggers UNAUTHORIZED_ACCESS
        } else {
          route = "/api/users/login"; // We will post bad credentials below
        }
      } else {
        // Target AI endpoints
        const endpoint = i % 2 === 0 ? "/api/ai/optimized/attendance" : "/api/ai/optimized/performance";
        // Alternate between employee IDs to trigger cache hits and misses
        const empId = i % 3 === 0 ? "EMP001" : i % 3 === 1 ? "EMP002" : "EMP003";
        // Alternate using cache to show cache hits/misses differences
        const useCache = mode === "normal" ? (i % 5 !== 0) : false; // Always miss cache in high load
        route = `${endpoint}?employeeId=${empId}&useCache=${useCache}`;
      }

      try {
        let response;
        if (mode === "security" && route === "/api/users/login") {
          // Send bad credentials to trigger failed logins
          response = await axios.post(`${BASE_URL}${route}`, {
            email: `malicious_user_${i}@bruteforce.com`,
            password: "wrongpassword123"
          }, { validateStatus: () => true });
          
          console.log(`[REQ ${i}/${requestsLimit}] POST ${route} -> Status: ${response.status} (Failed Login Attempt Recorded)`);
          failCount++;
        } else if (mode === "security" && route === "/api/ai/cache/clear") {
          // Send unauthorized request (missing bearer token)
          response = await axios.post(`${BASE_URL}${route}`, {}, { validateStatus: () => true });
          console.log(`[REQ ${i}/${requestsLimit}] POST ${route} -> Status: ${response.status} (Unauthorized Event Triggered)`);
          failCount++;
        } else {
          // Standard GET request on AI routes
          response = await axios.get(`${BASE_URL}${route}`);
          const latency = Date.now() - start;
          const cacheHeader = response.data?.cached || response.data?.data?.cached ? "HIT" : "MISS";
          console.log(`[REQ ${i}/${requestsLimit}] GET ${route.split("?")[0]} -> \x1b[32mOK\x1b[0m | Latency: \x1b[33m${latency}ms\x1b[0m | Cache: \x1b[34m${cacheHeader}\x1b[0m`);
          successCount++;
        }
      } catch (err) {
        const latency = Date.now() - start;
        console.log(`[REQ ${i}/${requestsLimit}] GET ${route.split("?")[0]} -> \x1b[31mFAIL\x1b[0m | Latency: ${latency}ms | Error: ${err.message}`);
        failCount++;
        
        // Log custom error into backend's error.log if in error mode
        if (mode === "error") {
          // Also trigger a system warning alert
          await axios.post(`${BASE_URL}/api/devops/simulate`, {
            action: "trigger_alert",
            type: "AI_TIMEOUT",
            value: `Critical Timeout on analytical AI endpoint. Latency of ${latency}ms exceeded limits.`
          }).catch(() => {});
        }
      }

      await sleep(intervalMs);
    }

    // 3. Post-run actions
    console.log("------------------------------------------------------------------");
    console.log(`Traffic simulation complete. Hits: ${successCount}, Failures/Blocked: ${failCount}`);
    
    if (mode === "load") {
      console.log("\x1b[33m%s\x1b[0m", "\nTIP: High load overrides are still active on the server so you can review them in the browser.");
      console.log("\x1b[33m%s\x1b[0m", "To clear overrides and restore natural values, run:");
      console.log("\x1b[36m%s\x1b[0m", "  node scripts/simulate-load.js --mode=normal --requests=1");
    } else if (mode === "security") {
      console.log("\x1b[32m%s\x1b[0m", "\n✓ Brute-force & unauthorized logins simulated. Open the 'System Monitor' page to inspect security alerts!");
    } else if (mode === "error") {
      console.log("\x1b[31m%s\x1b[0m", "\n✓ AI errors and timeouts simulated. Warnings have been added to the Active Warnings log feed!");
    }
    console.log("\x1b[35m%s\x1b[0m", "==================================================================");

  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "Simulation failed:", error.message);
  }
}

// Start simulation
runSimulation();
