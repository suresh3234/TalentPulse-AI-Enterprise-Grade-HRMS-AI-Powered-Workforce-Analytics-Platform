const os = require('os');
const { execSync } = require('child_process');

function getProcessStats() {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  const loadAvg = os.loadavg();
  const freeMem = os.freemem();
  const totalMem = os.totalmem();

  return {
    timestamp: new Date().toISOString(),
    process: {
      memory: {
        rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      },
      uptime: uptime.toFixed(2) + 's'
    },
    system: {
      loadAvg: loadAvg.map(l => l.toFixed(2)),
      freeMemory: (freeMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      totalMemory: (totalMem / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      memoryUsage: (((totalMem - freeMem) / totalMem) * 100).toFixed(2) + '%'
    }
  };
}

function startMonitoring(intervalMs = 5000) {
  console.log(`Starting system monitoring every ${intervalMs}ms...`);
  console.log('Press Ctrl+C to stop.');
  console.log('-------------------------------------------');

  setInterval(() => {
    const stats = getProcessStats();
    console.log(`[${stats.timestamp}]`);
    console.log(`Process: RAM: ${stats.process.memory.rss} | Uptime: ${stats.process.uptime}`);
    console.log(`System:  Load: ${stats.system.loadAvg.join(', ')} | Mem Usage: ${stats.system.memoryUsage}`);
    console.log('-------------------------------------------');
    
    // Log to file for historical tracking
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'system-resource.log'), JSON.stringify(stats) + '\n');
  }, intervalMs);
}

// If run directly
if (require.main === module) {
  startMonitoring();
}

module.exports = { getProcessStats };
