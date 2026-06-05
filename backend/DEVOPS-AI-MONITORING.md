# DevOps Guide: Monitoring AI Reports & Analytics

This guide provides instructions on how to monitor the performance, stability, and resource usage of the AI-powered reporting features in the HRMS system.

## 1. Monitoring Scripts

We have provided two utility scripts in the `backend/scripts` directory to help with monitoring.

### AI Performance Monitor (`monitor-ai.js`)
This script parses the application logs to provide a summary of report generation activities.

**Usage:**
```bash
cd backend
node scripts/monitor-ai.js
```

**Metrics Provided:**
- Total reports requested vs. successful vs. failed.
- Success rate percentage.
- Average generation time (overall and by report type).
- List of recent errors.

### System Resource Monitor (`system-monitor.js`)
This script monitors the CPU and Memory usage of the Node.js process and the host system.

**Usage:**
```bash
cd backend
node scripts/system-monitor.js
```

**Metrics Provided:**
- Process RAM usage (RSS, Heap).
- System load averages.
- Overall system memory usage.
- Process uptime.

## 2. Health Checks

The backend health check endpoint now includes the status of the AI Service.

- **Endpoint:** `GET /api/health`
- **Field:** `aiService`
- **Possible Values:**
    - `connected`: AI Service is up and responding.
    - `unavailable`: AI Service is down or unreachable.
    - `unknown`: Status could not be determined.

## 3. Log Analysis

Logs are stored in `backend/logs/`.

- `app.log`: Contains structured JSON entries for all application events. Look for `message: "Report generation successful"` or `message: "Report generation started"`.
- `error.log`: Contains all errors and warnings. AI-specific errors are logged with `reportType` and `error` metadata.

### Example AI Log Entry (Success):
```json
{
  "timestamp": "2026-05-07T15:30:00.000Z",
  "level": "info",
  "message": "Report generation successful",
  "reportId": "645a...",
  "reportType": "attendance",
  "durationMs": 1240,
  "metrics": { ... }
}
```

## 4. Troubleshooting AI Issues

### High Failure Rate
- **Check Groq API Key**: Ensure `GROQ_API_KEY` is set correctly in the `ai-service/.env`.
- **Rate Limits**: Groq has rate limits. Check `error.log` for 429 status codes.
- **Service Downtime**: Check if the `ai-service` (Python) is running on port 8000.

### Slow Report Generation
- **Database Latency**: Large date ranges in reports can slow down data retrieval.
- **AI Response Time**: Groq latency varies. Check `durationMs` in logs to see if the delay is in the AI generation phase.

### Resource Spikes
- **Memory Leak**: Monitor `system-monitor.js` during back-to-back report generation. If RSS continues to climb without dropping, there may be a leak in the reporting service.
