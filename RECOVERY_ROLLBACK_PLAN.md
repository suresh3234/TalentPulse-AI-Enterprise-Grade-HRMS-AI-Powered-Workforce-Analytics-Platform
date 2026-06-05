# 🚨 AI HRMS - RECOVERY & ROLLBACK PLAN (DEVOPS 2)

This document outlines the standard operating procedures (SOPs) for disaster recovery and production rollback strategies for the AI-Powered HRMS Platform.

## 1. INCIDENT SEVERITY LEVELS

- **P1 (Critical):** Complete system outage, database corruption, or AI service global failure preventing core HR functions.
- **P2 (High):** Major feature broken (e.g., Attendance tracking, Recruitment workflows) but system remains partially accessible.
- **P3 (Medium):** Non-critical bug or AI feature degradation (e.g., slow response from recommendations).

## 2. DATABASE RECOVERY PROCEDURES

The platform utilizes MongoDB. Daily backups are scheduled via `npm run backup:db`.

### 2.1 Restoring from a Snapshot
If database corruption occurs:
1. Locate the latest backup in `backend/backups/`.
2. Run the restore script:
   ```bash
   cd backend
   node scripts/restoreMongo.js
   ```
3. Verify data consistency via the frontend dashboard.

### 2.2 Database Rollback
If a recent migration or data update caused issues:
- Identify the exact timestamp of the bad transaction.
- Use point-in-time recovery (if using MongoDB Atlas) or restore the latest good local snapshot.

## 3. APPLICATION ROLLBACK PROCEDURES

If a new deployment introduces a P1 or P2 incident, immediate rollback is required.

### 3.1 Vercel/Render Rollback
1. Navigate to the Vercel (Frontend) or Render (Backend) dashboard.
2. Go to the "Deployments" tab.
3. Select the previous stable deployment.
4. Click "Redeploy" or "Rollback" to instantly revert to the last working state.

### 3.2 Docker Rollback
If deployed via Docker:
```bash
# Stop current faulty containers
docker-compose down

# Pull or revert to the previous image tag (e.g., v1.0.42 instead of v1.0.43)
git checkout <previous_stable_commit_hash>

# Rebuild and start
docker-compose up -d --build
```

## 4. AI SERVICE FAILURE RECOVERY

The platform heavily relies on the Groq AI API. In case of API failures:

### 4.1 Automated Fallback (Graceful Degradation)
- The backend is configured to catch AI timeouts.
- If the AI service fails, endpoints will return standard database metrics without AI enhancements.
- Users will see a UI message: "AI features temporarily unavailable. Showing standard metrics."

### 4.2 Manual Intervention
If Groq API rate limits are hit permanently or keys are compromised:
1. Generate a new API key in the Groq console.
2. Update the `.env` file in production:
   ```
   GROQ_API_KEY=new_key_here
   ```
3. Restart the backend service:
   ```bash
   pm2 restart backend-api
   ```

## 5. MONITORING & ALERTING RESPONSE

The `scripts/alert-monitor.js` actively scans for errors.
- **If `CRITICAL_ERROR` is detected**: Check `backend/logs/error.log` immediately. Determine if it's a code exception or database timeout.
- **If `AI_SERVICE_DOWN` is detected**: Verify Groq API status. Check network connectivity from the server.
- **If `DB_CONNECTION_LOST` is detected**: Restart the MongoDB service or check database hosting provider status.

---
**Prepared By:** DevOps Team
**Last Updated:** Day 30 - Final Handover
