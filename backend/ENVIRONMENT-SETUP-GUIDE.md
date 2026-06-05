# Environment Setup & Configuration Guide

## Quick Start

### 1. Prerequisites Check

```bash
# Check Node.js
node --version   # Required: v16+
npm --version    # Required: v8+

# Check Python (for AI service)
python --version # Required: v3.9+

# Check MongoDB
mongod --version # Required: v4.4+

# Check Redis (optional)
redis-cli --version # Recommended: v6+
```

### 2. Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd HRMS-Platform

# Backend
cd backend
npm install

# AI Service (optional)
cd ../ai-service
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Frontend (optional)
cd ../frontend
npm install
```

### 3. Environment Files

#### Backend `.env`

```bash
cd backend
cp .env.example .env
nano .env  # or use your editor
```

**Required Variables:**
```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/hrms
JWT_SECRET=your-super-secret-key-change-in-production
```

**Optional Variables:**
```env
# Redis (if installed)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# AI Service
AI_SERVICE_URL=http://localhost:8001
GROQ_API_KEY=

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

#### AI Service `.env` (if using)

```bash
cd ../ai-service
cp .env.example .env
```

**Required Variables:**
```env
API_PORT=8001
GROQ_API_KEY=<your-groq-api-key>
```

Get GROQ API key from: https://console.groq.com

#### Frontend `.env`

```bash
cd ../frontend
cp .env.example .env
```

**Variables:**
```env
VITE_API_URL=http://localhost:3000/api
VITE_AI_URL=http://localhost:8001
```

---

## Service Startup

### Method 1: Individual Terminals (Recommended for Development)

**Terminal 1 - MongoDB:**
```bash
mongod
# Output: Listening on port 27017
```

**Terminal 2 - Redis (optional):**
```bash
redis-server
# Output: Ready to accept connections on port 6379
```

**Terminal 3 - Backend:**
```bash
cd backend
npm run dev
# Output: Server started on port 3000
```

**Terminal 4 - AI Service (optional):**
```bash
cd ai-service
source venv/bin/activate
python main.py
# Output: AI service running on port 8001
```

**Terminal 5 - Frontend (optional):**
```bash
cd frontend
npm run dev
# Output: Local: http://localhost:5173
```

### Method 2: Docker Compose (Recommended for Testing)

```bash
# From project root
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

### Method 3: Docker Individual Services

**MongoDB:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Redis:**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

**Backend (after building):**
```bash
cd backend
docker build -t hrms-backend:dev .
docker run -d -p 3000:3000 --name backend \
  -e MONGO_URI=mongodb://host.docker.internal:27017/hrms \
  -e REDIS_HOST=host.docker.internal \
  hrms-backend:dev
```

---

## Verification

### Health Checks

```bash
# Backend
curl http://localhost:3000/api/health
# Expected: {"success": true, "status": "ok", ...}

# Database
curl http://localhost:3000/api/health/ready
# Expected: {"success": true, "status": "ready", ...}

# AI Service
curl http://localhost:8001/health
# Expected: {"status": "ok", ...}
```

### Test Endpoints

```bash
# Register user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "role": "employee"
  }'

# Expected: User created with token
```

---

## Database Setup

### MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create account and organization
3. Create new cluster (M0 free tier recommended)
4. Add database user
5. Get connection string
6. Update `.env`:
   ```env
   MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/hrms?retryWrites=true&w=majority
   ```

### MongoDB Local

```bash
# macOS with Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
# Run installer
```

### Initial Data

```bash
# Create admin user
node scripts/createAdmin.js

# Seed data (optional)
node scripts/seedData.js
```

---

## API Documentation

### Swagger UI

Once backend is running:
```
http://localhost:3000/api-docs
```

### Testing APIs

**Postman:**
1. Import collection from `backend/HRMS-API.json`
2. Set environment variables
3. Test endpoints

**cURL:**
```bash
# With token
TOKEN="your-jwt-token"
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

**Thunder Client:**
1. Open VS Code
2. Install Thunder Client extension
3. Import `backend/test-workflows.http`

---

## Development Tools

### Essential Extensions (VS Code)

```json
{
  "extensions": [
    "ms-vscode.vscode-mongodb",
    "rangav.vscode-thunder-client",
    "REST Client",
    "Prettier - Code formatter",
    "ESLint",
    "Thunder Client"
  ]
}
```

### Debugging

**Node.js Debug:**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/backend/server.js",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

---

## Common Issues & Solutions

### MongoDB Connection Error

```
Error: MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
```bash
# Check if MongoDB is running
mongod --version
mongosh  # Connect to test

# Start MongoDB
mongod
# or
docker run -d -p 27017:27017 mongo:latest
```

### Redis Connection Error

```
Error: Redis connection failed - cache disabled
```

**Solution:**
- Backend operates in degraded mode without Redis
- Optional: Start Redis if available
- ```bash
  redis-server
  # or
  docker run -d -p 6379:6379 redis:latest
  ```

### Port Already in Use

```bash
# Find process using port
# macOS/Linux:
lsof -i :3000

# Windows:
netstat -ano | findstr :3000

# Kill process
# macOS/Linux:
kill -9 <PID>

# Windows:
taskkill /PID <PID> /F
```

### Rate Limit Issues During Development

Disable rate limiting in development:

```env
RATE_LIMIT_ENABLED=false
```

### Module Not Found Error

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Performance Testing

### Load Testing with Artillery

```bash
npm install -g artillery

# Create test file
cat > load-test.yml << 'EOF'
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "API Test"
    flow:
      - get:
          url: "/api/health"
EOF

# Run test
artillery run load-test.yml
```

### Memory Profiling

```bash
# Run with profiler
node --inspect=9229 backend/server.js

# Open Chrome DevTools
# chrome://inspect
```

---

## Security Best Practices

### Local Development

```env
# .env.development (DO NOT commit)
NODE_ENV=development
JWT_SECRET=dev-secret-change-in-production
MONGO_URI=mongodb://localhost:27017/hrms-dev
CORS_ORIGIN=http://localhost:*
LOG_LEVEL=debug
```

### Production

```env
# .env.production (USE environment variables)
NODE_ENV=production
JWT_SECRET=<use-strong-random-secret>
MONGO_URI=<use-secure-connection>
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
LOG_TO_FILE=true
```

### Secrets Management

```bash
# Option 1: Environment variables
export JWT_SECRET="your-secret"
npm start

# Option 2: .env file (development only)
# .env (add to .gitignore!)

# Option 3: Secrets manager (production)
# AWS Secrets Manager
# Google Secret Manager
# Azure Key Vault
```

---

## Database Migrations

### Create Migration

```bash
node scripts/create-migration.js create-user-index
```

### Run Migrations

```bash
node scripts/migrate.js up
```

### Rollback

```bash
node scripts/migrate.js down
```

---

## Backup & Restore

### MongoDB Backup

```bash
# Backup
mongodump --db hrms --out ./backups/hrms-$(date +%Y%m%d)

# Restore
mongorestore --db hrms ./backups/hrms-20260520/
```

### Export Data

```bash
mongoexport --db hrms --collection employees --out employees.json
```

---

## Monitoring

### Application Logs

```bash
# View real-time logs
tail -f backend/logs/app.log
tail -f backend/logs/error.log

# Alert monitor
node backend/scripts/alert-monitor.js

# System monitor
node backend/scripts/system-monitor.js
```

### Database Monitoring

```bash
# MongoDB stats
db.stats()

# Check indexes
db.collection.getIndexes()

# Slow query log
db.setProfilingLevel(1)
```

---

## Production Checklist

- [ ] All dependencies updated and audited
- [ ] Environment variables set securely
- [ ] Database backups configured
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting enabled
- [ ] Logging enabled
- [ ] Monitoring active
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Secrets not in codebase
- [ ] Database indexes created
- [ ] Error tracking (Sentry) setup
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Security audit completed

---

## Support

- **Documentation:** See [API-DOCUMENTATION-COMPLETE.md](API-DOCUMENTATION-COMPLETE.md)
- **Deployment:** See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
- **Issues:** GitHub Issues

---

**Last Updated:** May 20, 2026
**Version:** 1.0.0
