# Deployment Guide - AI Backend

## Table of Contents
1. [Local Development](#local-development)
2. [Production Deployment](#production-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)
8. [Performance Tuning](#performance-tuning)

---

## Local Development

### Prerequisites
- Node.js 16+ ([Download](https://nodejs.org))
- MongoDB 4.4+ ([Download](https://www.mongodb.com/try/download/community))
- Redis 6+ ([Download](https://redis.io/download)) - Optional, can run in degraded mode
- Python 3.9+ ([Download](https://www.python.org)) - For AI service

### Setup Steps

**1. Clone Repository**
```bash
git clone <repository-url>
cd HRMS-Platform
```

**2. Backend Setup**
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**3. AI Service Setup** (Optional)
```bash
cd ../ai-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env
nano .env
```

**4. MongoDB Setup**
```bash
# Start MongoDB locally
mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**5. Redis Setup** (Optional)
```bash
# Start Redis locally
redis-server

# Or use Docker
docker run -d -p 6379:6379 --name redis redis:latest
```

**6. Start Services**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

Terminal 2 - AI Service (Optional):
```bash
cd ai-service
python main.py
# AI Service runs on http://localhost:8001
```

Frontend (if developing):
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

**7. Verify Setup**
```bash
# Check health endpoints
curl http://localhost:3000/api/health
curl http://localhost:8001/health
```

---

## Production Deployment

### Environment: AWS/GCP/Azure/Render

#### Option 1: Render.com (Recommended for Simplicity)

**1. Prepare Deployment**
```bash
# Ensure all dependencies locked
npm ci

# Build frontend if needed
cd ../frontend
npm run build
```

**2. Connect Repository**
- Go to render.com
- Click "New +"
- Select "Web Service"
- Connect GitHub repository
- Select branch to deploy

**3. Configure Environment**
```
Build Command: npm install
Start Command: npm start
Port: 3000

Environment Variables:
- NODE_ENV=production
- PORT=3000
- MONGO_URI={production-mongodb-url}
- JWT_SECRET={secure-random-secret}
- REDIS_HOST={production-redis-host}
- REDIS_PORT=6379
- REDIS_PASSWORD={if-required}
- AI_SERVICE_URL={deployed-ai-service-url}
- CORS_ORIGIN=https://yourdomain.com
- LOG_LEVEL=info
```

**4. Deploy**
- Click "Deploy Web Service"
- Monitor deployment logs
- Verify health endpoint responds

#### Option 2: Docker + Kubernetes

**1. Build Docker Image**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

**2. Build & Push**
```bash
docker build -t hrms-backend:latest .
docker tag hrms-backend:latest your-registry/hrms-backend:latest
docker push your-registry/hrms-backend:latest
```

**3. Kubernetes Deployment**
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hrms-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hrms-backend
  template:
    metadata:
      labels:
        app: hrms-backend
    spec:
      containers:
      - name: backend
        image: your-registry/hrms-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongo-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

**4. Deploy**
```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl rollout status deployment/hrms-backend
```

---

## Docker Deployment

### Docker Compose (All Services)

**1. Create docker-compose.yml**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}

  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
      - redis
    environment:
      NODE_ENV: production
      PORT: 3000
      MONGO_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/hrms?authSource=admin
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - ./backend/logs:/app/logs

  ai-service:
    build: ./ai-service
    ports:
      - "8001:8001"
    environment:
      API_PORT: 8001
      GROQ_API_KEY: ${GROQ_API_KEY}
      LOG_LEVEL: info

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000/api
      VITE_AI_URL: http://localhost:8001

volumes:
  mongodb_data:
  redis_data:
```

**2. Deploy**
```bash
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

---

## Environment Configuration

### .env Example (Production)

```env
# Node
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
LOG_TO_FILE=true

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/hrms?retryWrites=true&w=majority
MONGO_TIMEOUT=10000

# Redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_SSL=true
REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379

# JWT
JWT_SECRET=your-super-secret-key-with-high-entropy-minimum-32-chars
JWT_EXPIRE=24h

# AI Service
AI_SERVICE_URL=https://ai-service.example.com
GROQ_API_KEY=your-groq-api-key
OPENAI_API_KEY=optional-if-using-openai

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Features
ENABLE_CACHE=true
ENABLE_QUEUE=true
ENABLE_AI_WORKFLOWS=true

# Monitoring
SENTRY_DSN=https://your-sentry-url
DD_API_KEY=your-datadog-api-key

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_GLOBAL_MAX=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_AI_MAX=30
```

---

## Security Hardening

### Pre-Deployment Checklist

**1. Dependencies**
```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Update packages
npm update
```

**2. Secrets Management**
```bash
# Use environment variables, NOT config files
# Store in: .env (local), Secrets Manager (production)

# Example: AWS Secrets Manager
aws secretsmanager create-secret \
  --name hrms-backend-secrets \
  --secret-string '{"MONGO_URI":"...","JWT_SECRET":"..."}'
```

**3. Database Security**
```
✓ Enable authentication
✓ Use SSL/TLS connections
✓ Enable IP whitelisting
✓ Regular backups (daily)
✓ Encryption at rest
```

**4. API Security**
```
✓ HTTPS/TLS enforced
✓ CORS properly configured
✓ Rate limiting enabled
✓ Input validation strict
✓ SQL/NoSQL injection prevention
✓ XSS prevention (helmet)
✓ CSRF protection
```

**5. Application Security**
```
✓ No secrets in code/logs
✓ Password hashing (bcrypt)
✓ Sensitive data redaction in logs
✓ Security headers set
✓ OWASP Top 10 addressed
```

**6. Infrastructure**
```
✓ Firewall rules configured
✓ DDoS protection enabled
✓ WAF rules set
✓ Regular security patches applied
✓ Monitoring & alerting active
```

---

## Monitoring & Logging

### Health Checks

```bash
# Basic health
curl https://yourdomain.com/api/health

# Readiness
curl https://yourdomain.com/api/health/ready

# Full metrics
curl https://yourdomain.com/api/devops/metrics \
  -H "Authorization: Bearer {admin-token}"
```

### Log Aggregation

**ELK Stack:**
```yaml
# elasticsearch
# kibana
# logstash

# Send logs from backend
filebeat:
  inputs:
  - type: log
    enabled: true
    paths:
      - /app/logs/*.log
    json.message_key: message
    json.keys_under_root: true
```

**Datadog:**
```
1. Install Datadog agent on server
2. Enable MongoDB integration
3. Enable Redis integration
4. Set up log collection for /app/logs
5. Create dashboards for monitoring
```

### Alerting

```
Critical:
- Error rate > 1%
- Response time > 5s
- Database connection lost
- Redis connection lost
- AI service unavailable

Warning:
- Error rate > 0.5%
- Response time > 2s
- Rate limit hits
- Queue backlog > 100
```

---

## Troubleshooting

### Common Issues

**1. MongoDB Connection**
```
Error: MongoServerSelectionError

Solution:
- Check MONGO_URI is correct
- Verify MongoDB is running
- Check network/firewall
- Verify authentication credentials
```

**2. Redis Connection**
```
Error: Redis max reconnection attempts reached

Solution:
- Check REDIS_HOST and port
- Verify Redis is running
- Check network/firewall
- App will operate in degraded mode
```

**3. Rate Limiting Issues**
```
Error: 429 Too Many Requests

Solution:
- Wait for reset time in X-RateLimit-Reset header
- Reduce request frequency
- Contact admin for elevated limits
- Check for bot/automation tools
```

**4. High Memory Usage**
```
Solution:
- Check log rotation
- Clear old cache entries
- Reduce QUEUE_MAX_SIZE
- Increase memory allocation
- Check for memory leaks
```

**5. Slow Responses**
```
Solution:
- Check database indexes
- Enable caching
- Use CDN for static assets
- Check AI service latency
- Scale horizontally if needed
```

---

## Performance Tuning

### Database Optimization

```javascript
// Add these indexes to MongoDB
db.users.createIndex({ email: 1 })
db.employees.createIndex({ department: 1 })
db.employees.createIndex({ status: 1 })
db.attendance.createIndex({ employeeId: 1, date: 1 })
db.attendance.createIndex({ date: 1 })
db.payroll.createIndex({ employeeId: 1, month: 1, year: 1 })
```

### Caching Strategy

```
1. Cache AI analysis results (5 min TTL)
2. Cache employee lists (1 hour TTL)
3. Cache department data (1 hour TTL)
4. Cache validation rules (24 hour TTL)
5. Use cache keys with versioning
```

### Query Optimization

```javascript
// Always use lean() for read-only operations
await Employee.find().lean().populate("user");

// Use select to limit fields
await User.find({}, "email name role").lean();

// Use pagination for large queries
await Attendance.find({})
  .limit(20)
  .skip((page - 1) * 20)
  .lean();
```

### Node.js Optimization

```
- Use clustering for multi-core systems
- Enable gzip compression
- Use connection pooling
- Set appropriate timeouts
- Monitor event loop delay
```

---

## Rollback Procedure

```bash
# If deployment fails:
1. Check deployment logs
2. Revert to previous version
3. Verify health checks pass
4. Monitor for issues

# Kubernetes rollback
kubectl rollout undo deployment/hrms-backend

# Docker rollback
docker pull hrms-backend:previous-tag
docker-compose up -d backend --force-recreate
```

---

## Support

- **Documentation:** [API Docs](API-DOCUMENTATION-COMPLETE.md)
- **Issues:** GitHub Issues
- **Email:** support@yourdomain.com

---

**Last Updated:** May 20, 2026
**Version:** 1.0.0
