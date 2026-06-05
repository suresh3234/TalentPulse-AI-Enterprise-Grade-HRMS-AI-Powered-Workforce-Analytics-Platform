const fs = require('fs');
const path = require('path');

const APP_LOG = path.join(__dirname, '..', 'logs', 'app.log');
const ERROR_LOG = path.join(__dirname, '..', 'logs', 'error.log');

const ALERT_PATTERNS = [
  { pattern: /"level":"error"/, label: 'CRITICAL_ERROR' },
  { pattern: /AI service temporarily unavailable/, label: 'AI_SERVICE_DOWN' },
  { pattern: /Database unavailable/, label: 'DB_CONNECTION_LOST' },
  { pattern: /"status":"failure"/, label: 'REQUEST_FAILURE' },
  { pattern: /rate limit exceeded/i, label: 'RATE_LIMIT_HIT' }
];

let lastAppSize = 0;
let lastErrorSize = 0;

function checkLogs() {
  if (fs.existsSync(APP_LOG)) {
    const stats = fs.statSync(APP_LOG);
    if (stats.size > lastAppSize) {
      processNewLines(APP_LOG, lastAppSize, stats.size);
      lastAppSize = stats.size;
    }
  }

  if (fs.existsSync(ERROR_LOG)) {
    const stats = fs.statSync(ERROR_LOG);
    if (stats.size > lastErrorSize) {
      processNewLines(ERROR_LOG, lastErrorSize, stats.size, true);
      lastErrorSize = stats.size;
    }
  }
}

function processNewLines(filePath, start, end, isErrorLog = false) {
  const stream = fs.createReadStream(filePath, { start, end });
  let data = '';
  stream.on('data', (chunk) => {
    data += chunk;
  });
  stream.on('end', () => {
    const lines = data.split('\n').filter(Boolean);
    lines.forEach(line => {
      ALERT_PATTERNS.forEach(ap => {
        if (ap.pattern.test(line)) {
          console.log(`\x1b[31m[ALERT][${new Date().toISOString()}][${ap.label}]\x1b[0m ${line}`);
        }
      });
    });
  });
}

console.log('Starting AI HRMS Alert Monitor...');
console.log('Monitoring logs for critical failures...');
console.log('-------------------------------------------');

// Initialize sizes
if (fs.existsSync(APP_LOG)) lastAppSize = fs.statSync(APP_LOG).size;
if (fs.existsSync(ERROR_LOG)) lastErrorSize = fs.statSync(ERROR_LOG).size;

setInterval(checkLogs, 2000);
