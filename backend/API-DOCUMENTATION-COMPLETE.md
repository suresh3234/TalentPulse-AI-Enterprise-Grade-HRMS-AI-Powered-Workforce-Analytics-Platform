# AI Backend - Complete API Documentation

## Overview

Secure, validated, rate-limited API for HRMS platform with AI-driven analytics and workflows.

**Base URL:** `http://localhost:3000/api`
**AI Service:** `http://localhost:8001`
**Documentation:** `http://localhost:3000/api-docs`

---

## Authentication

All protected endpoints require JWT bearer token.

### Headers
```
Authorization: Bearer {jwt_token}
X-Request-ID: {unique_request_id}  # Optional, auto-generated if not provided
```

### Roles
- `admin` - Full system access
- `hr` - HR operations access
- `employee` - Own data access
- `recruiter` - Recruitment access
- `manager` - Team management access

---

## Rate Limiting

All endpoints are rate-limited. Check `X-RateLimit-*` response headers.

| Endpoint Type | Limit | Window |
|---|---|---|
| Global | 100 req | 15 min |
| Auth (login/register) | 5 req | 15 min |
| AI Endpoints | 30 req | 15 min |
| Queue Operations | 10 req | 15 min |
| Payroll Operations | 5 req | 1 hour |

**Rate Limit Response (429):**
```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 900
}
```

---

## User Management

### POST /users/register
Register a new user.

**Request:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "employee"
}
```

**Validation Rules:**
- `fullName`: 3-50 chars, letters and spaces only
- `email`: Valid email format
- `password`: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- `role`: One of: admin, employee, hr, recruiter, interviewer, manager

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "60d5ec49c1234567890abc12",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "employee"
  }
}
```

---

### POST /users/login
Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60d5ec49c1234567890abc12",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "employee"
  }
}
```

---

### GET /users
Get all users (Admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "_id": "60d5ec49c1234567890abc12",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "employee"
    }
  ]
}
```

---

## Employee Management

### POST /employees
Create a new employee record.

**Request:**
```json
{
  "user": "60d5ec49c1234567890abc12",
  "position": "Senior Developer",
  "baseSalary": 75000,
  "department": "Engineering",
  "role": "employee"
}
```

**Validation Rules:**
- `user`: Valid MongoDB ObjectId
- `position`: Required
- `baseSalary`: Numeric value
- `department`: Required
- `role`: Required

**Response (201):**
```json
{
  "success": true,
  "message": "Employee created successfully",
  "employee": {
    "_id": "60d5ec49c1234567890def34",
    "user": "60d5ec49c1234567890abc12",
    "position": "Senior Developer",
    "baseSalary": 75000,
    "department": "Engineering"
  }
}
```

---

## Attendance Tracking

### POST /attendance
Record attendance for an employee.

**Request:**
```json
{
  "employeeId": "60d5ec49c1234567890def34",
  "date": "2026-05-20",
  "status": "Present",
  "checkInTime": "09:00",
  "checkOutTime": "17:30",
  "remarks": "Regular working day"
}
```

**Validation Rules:**
- `employeeId`: Valid MongoDB ObjectId
- `date`: ISO8601 format
- `status`: One of: Present, Absent, Leave, Half Day, Remote
- `checkInTime`: HH:MM format
- `checkOutTime`: HH:MM format

**Response (201):**
```json
{
  "success": true,
  "message": "Attendance recorded successfully",
  "data": {
    "_id": "60d5ec49c1234567890ghi56",
    "employeeId": "60d5ec49c1234567890def34",
    "date": "2026-05-20",
    "status": "Present",
    "checkInTime": "09:00",
    "checkOutTime": "17:30"
  }
}
```

---

### GET /attendance
Get attendance records (filtered).

**Query Parameters:**
```
?employeeId={id}&startDate={date}&endDate={date}&status={status}
```

**Response (200):**
```json
{
  "success": true,
  "records": [
    {
      "_id": "60d5ec49c1234567890ghi56",
      "employeeId": "60d5ec49c1234567890def34",
      "date": "2026-05-20",
      "status": "Present"
    }
  ]
}
```

---

## Leave Management

### POST /leave
Request leave.

**Request:**
```json
{
  "employeeId": "60d5ec49c1234567890def34",
  "leaveType": "Annual Leave",
  "startDate": "2026-06-01",
  "endDate": "2026-06-05",
  "reason": "Vacation",
  "numberOfDays": 5
}
```

**Validation Rules:**
- `leaveType`: One of: Sick Leave, Casual Leave, Annual Leave, Maternity Leave, Paternity Leave, Unpaid Leave
- `startDate`, `endDate`: ISO8601 format
- `numberOfDays`: 1-365 days

**Response (201):**
```json
{
  "success": true,
  "message": "Leave request created",
  "leave": {
    "_id": "60d5ec49c1234567890jkl78",
    "employeeId": "60d5ec49c1234567890def34",
    "leaveType": "Annual Leave",
    "status": "Pending"
  }
}
```

---

## AI Analytics

### GET /ai/optimized/attendance
Analyze attendance with AI insights.

**Query Parameters:**
```
?employeeId={id}&startDate={date}&endDate={date}&useCache=true
```

**Response (200):**
```json
{
  "success": true,
  "analysis": {
    "employeeId": "60d5ec49c1234567890def34",
    "attendanceRate": "98.5%",
    "insights": "Excellent attendance record",
    "trends": ["Consistent presence", "Minimal absences"],
    "recommendations": ["Maintain current pattern"],
    "cacheHit": true
  }
}
```

---

### GET /ai/optimized/performance
Analyze employee performance.

**Query Parameters:**
```
?employeeId={id}&startDate={date}&endDate={date}&useCache=true
```

**Response (200):**
```json
{
  "success": true,
  "analysis": {
    "employeeId": "60d5ec49c1234567890def34",
    "performanceScore": "4.5/5",
    "strengths": ["Technical skills", "Problem solving"],
    "improvements": ["Communication", "Documentation"],
    "recommendations": ["Attend communication workshop"]
  }
}
```

---

### POST /ai/optimized/queue-analytics
Queue background analytics job.

**Request:**
```json
{
  "employeeId": "60d5ec49c1234567890def34",
  "analysisType": "comprehensive"
}
```

**Response (202):**
```json
{
  "success": true,
  "message": "Analytics job queued for processing",
  "jobId": "analyze-1621234567890",
  "status": "queued"
}
```

---

## Health & Monitoring

### GET /health
System health status.

**Response (200):**
```json
{
  "success": true,
  "status": "ok",
  "service": "hrms-backend",
  "uptimeSeconds": 3600,
  "database": "connected",
  "aiService": "connected",
  "timestamp": "2026-05-20T10:30:00Z"
}
```

---

### GET /devops/metrics
Get system metrics (Admin only).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "system": {
      "uptime": 3600,
      "memory": {...},
      "cpu": {...}
    },
    "ai": {
      "totalRequests": 1250,
      "successfulRequests": 1225,
      "failedRequests": 25,
      "averageLatencyMs": 245,
      "successRate": "98%"
    },
    "database": {
      "totalCollections": 8,
      "totalDocuments": 5420
    },
    "queue": {
      "analytics": {
        "waiting": 0,
        "active": 0,
        "completed": 145,
        "failed": 2
      }
    }
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "field": "email",
    "message": "Email already exists"
  },
  "timestamp": "2026-05-20T10:30:00Z"
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async job) |
| 400 | Bad request/Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 429 | Rate limit exceeded |
| 500 | Server error |
| 503 | Service unavailable |

---

## Request/Response Headers

### Request Headers
```
Authorization: Bearer {token}
Content-Type: application/json
X-Request-ID: {uuid}  # Auto-generated if missing
```

### Response Headers
```
X-Request-ID: {uuid}
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1621234567
Content-Type: application/json
```

---

## Integration Examples

### Complete Login & Fetch Data Flow

```bash
# 1. Register
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "role": "employee"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Extract token from response: {token}

# 3. Get Attendance
curl -X GET "http://localhost:3000/api/attendance?employeeId=60d5ec49c1234567890def34" \
  -H "Authorization: Bearer {token}"

# 4. Analyze Performance
curl -X GET "http://localhost:3000/api/ai/optimized/performance?employeeId=60d5ec49c1234567890def34" \
  -H "Authorization: Bearer {token}"
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
```
?page=1&limit=20&sort=createdAt&order=desc
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Caching

AI endpoints support response caching:

**Query Parameter:**
```
?useCache=true  (default: true)
```

**Cached responses include:**
```
X-Cache: HIT  or X-Cache: MISS
X-Cache-Ttl: 300  (seconds)
```

---

## Retry Logic

Failed requests automatically retry with exponential backoff:

- Max retries: 3
- Base delay: 1000ms
- Backoff multiplier: 2x

**Retryable errors:**
- Connection refused
- Timeout
- 5xx server errors
- Rate limit exceeded (429)

---

## WebSocket Events (Future)

Real-time updates for:
- Attendance check-in/out
- Leave approvals
- AI analysis completion
- System alerts

---

## SDK Examples

### JavaScript/Node.js
```javascript
const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

api.interceptors.request.use(config => {
  config.headers['X-Request-ID'] = uuid();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Use: await api.get('/attendance');
```

### Python
```python
import requests
import uuid

class HRMSClient:
    def __init__(self, base_url='http://localhost:3000/api'):
        self.base_url = base_url
        self.token = None
    
    def request(self, method, endpoint, **kwargs):
        headers = kwargs.get('headers', {})
        headers['X-Request-ID'] = str(uuid.uuid4())
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        kwargs['headers'] = headers
        return requests.request(method, f'{self.base_url}{endpoint}', **kwargs)
```

---

## Support & Troubleshooting

### Common Issues

**Rate Limit Exceeded**
- Wait for `X-RateLimit-Reset` header value
- Reduce request frequency
- Contact admin for elevated limits

**Token Expired**
- Re-login to get new token
- Token TTL: 24 hours

**AI Service Unavailable**
- Check AI service status: `GET /health`
- Retry failed requests
- Fall back to basic endpoints

**Database Connection**
- Check MongoDB is running
- Verify connection string in `.env`
- Check network connectivity

---

**Last Updated:** May 20, 2026
**Version:** 1.0.0
