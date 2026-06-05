# DevOps Monitoring and Backup Runbook

## Output

Secure and monitored HRMS backend with request logs, error logs, health checks, security headers, and MongoDB backup/recovery commands.

## Monitoring

- Request monitoring: every API request logs method, URL, status code, response time, IP, user agent, and request id.
- Error monitoring: global errors, 4xx/5xx responses, unhandled promise rejections, and uncaught exceptions are logged.
- Log files:
  - `backend/logs/app.log`
  - `backend/logs/error.log`
- Health endpoints:
  - `GET /api/health` checks API uptime and database status.
  - `GET /api/health/ready` returns `200` only when MongoDB is connected, otherwise `503`.

## Security

- Sensitive log fields such as password, token, authorization, cookie, JWT, and secret are redacted.
- Basic security headers are added to all responses:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- CORS remains restricted to configured local frontend origins.

## Backup

MongoDB backups use MongoDB Database Tools. Install them first if `mongodump` is not available in your terminal.

```bash
cd backend
npm run backup:db
```

Backups are saved in:

```text
backend/backups/mongo-YYYY-MM-DDTHH-MM-SS-sssZ
```

## Recovery

Restore from a backup folder:

```bash
cd backend
npm run restore:db -- ./backups/mongo-YYYY-MM-DDTHH-MM-SS-sssZ
```

The restore command uses `--drop`, so it replaces the current database contents with the selected backup.

## Environment

```env
MONGO_URI=mongodb://127.0.0.1:27017/hrms
JWT_SECRET=your_jwt_secret_here
LOG_TO_FILE=true
BACKUP_DIR=./backups
```

## Verification Checklist

- Start backend with `npm run dev`.
- Open `http://localhost:5000/api/health`.
- Open `http://localhost:5000/api/health/ready`.
- Call any API endpoint and verify `backend/logs/app.log` is created.
- Trigger a bad route and verify warning/error details are written.
- Run `npm run backup:db` and confirm a folder appears in `backend/backups`.
- Restore only after confirming the backup path is correct.
