const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '..', 'logs', 'app.log');

function analyzeLogs() {
  if (!fs.existsSync(logFilePath)) {
    console.error('Log file not found:', logFilePath);
    return;
  }

  let logsContent = fs.readFileSync(logFilePath, 'utf8');
  // Remove BOM if present
  if (logsContent.charCodeAt(0) === 0xFEFF) {
    logsContent = logsContent.slice(1);
  }
  const logs = logsContent.split('\n').map(line => line.trim()).filter(Boolean);
  
  const stats = {
    totalReportsRequested: 0,
    successfulReports: 0,
    failedReports: 0,
    durations: [],
    reportTypes: {},
    errors: []
  };

  logs.forEach(line => {
    try {
      const entry = JSON.parse(line);
      
      // Track report generation start
      if (entry.message === 'Report generation started') {
        stats.totalReportsRequested++;
        const type = entry.reportType || 'unknown';
        stats.reportTypes[type] = stats.reportTypes[type] || { started: 0, success: 0, failed: 0, durations: [] };
        stats.reportTypes[type].started++;
      }
      
      // Track report generation success
      if (entry.message === 'Report generation successful') {
        stats.successfulReports++;
        const type = entry.reportType || 'unknown';
        if (stats.reportTypes[type]) {
          stats.reportTypes[type].success++;
          if (entry.durationMs) {
            stats.reportTypes[type].durations.push(entry.durationMs);
            stats.durations.push(entry.durationMs);
          }
        }
      }
      
      // Track report generation errors
      if (entry.level === 'error' && entry.message.includes('Generate analytics error')) {
        stats.failedReports++;
        const type = entry.reportType || 'unknown';
        if (stats.reportTypes[type]) {
          stats.reportTypes[type].failed++;
        }
        stats.errors.push(entry.error || entry.message);
      }
    } catch (e) {
      // Skip invalid JSON lines
    }
  });

  const avgDuration = stats.durations.length > 0 
    ? (stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length).toFixed(2) 
    : 0;

  console.log('-------------------------------------------');
  console.log('AI Analytics Monitoring Summary');
  console.log('-------------------------------------------');
  console.log(`Total Reports Requested: ${stats.totalReportsRequested}`);
  console.log(`Successful Reports:      ${stats.successfulReports}`);
  console.log(`Failed Reports:          ${stats.failedReports}`);
  console.log(`Overall Success Rate:    ${stats.totalReportsRequested > 0 ? ((stats.successfulReports / stats.totalReportsRequested) * 100).toFixed(2) : 0}%`);
  console.log(`Average Duration:        ${avgDuration}ms`);
  console.log('-------------------------------------------');
  console.log('Breakdown by Type:');
  
  Object.entries(stats.reportTypes).forEach(([type, data]) => {
    const typeAvg = data.durations.length > 0 
      ? (data.durations.reduce((a, b) => a + b, 0) / data.durations.length).toFixed(2) 
      : 0;
    console.log(`- ${type.toUpperCase()}:`);
    console.log(`  Requests: ${data.started}`);
    console.log(`  Success:  ${data.success}`);
    console.log(`  Failed:   ${data.failed}`);
    console.log(`  Avg Time: ${typeAvg}ms`);
  });

  if (stats.errors.length > 0) {
    console.log('-------------------------------------------');
    console.log('Recent Errors:');
    stats.errors.slice(-5).forEach(err => console.log(`- ${err}`));
  }
  console.log('-------------------------------------------');
}

analyzeLogs();
