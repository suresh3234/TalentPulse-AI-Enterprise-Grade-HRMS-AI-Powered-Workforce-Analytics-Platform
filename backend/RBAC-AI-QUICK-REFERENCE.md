# RBAC & AI Integration - Quick Reference Guide

**Date**: April 17, 2026  
**Version**: 1.0  

---

## 🔐 RBAC Quick Start

### 1. Update User Role During Registration

**Step 1**: Register user
```bash
POST /api/users/register
{
  "fullName": "Alice HR Manager",
  "email": "alice@company.com",
  "password": "SecurePass123"
}
```

**Step 2**: Manually update role in database (or via admin panel)
```javascript
// Connect to MongoDB
db.users.updateOne(
  { email: "alice@company.com" },
  { $set: { role: "hr", department: "HR", isActive: true } }
);
```

### 2. Using Protected Endpoints

```bash
# Login to get token
POST /api/users/login
{
  "email": "alice@company.com",
  "password": "SecurePass123"
}
→ Response: { token: "eyJhbGciOi..." }

# Use token for protected requests
GET /api/recruitment/application
Authorization: Bearer eyJhbGciOi...
```

### 3. Role Hierarchy & Access

| Endpoint | Admin | HR | Recruiter | Interviewer | Manager | Employee |
|----------|-------|----|---------|-----------|---------|----|
| Create Job | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Evaluate Candidate | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Schedule Interview | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Record Interview Result | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Workflow | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Personal Data | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🤖 AI Integration Quick Start

### 1. Enable AI Evaluation (No API Key - Uses Local Algorithm)

```bash
# Automatic - works out of the box
POST /api/recruitment/application/:applicationId/evaluate-ai
Authorization: Bearer <token>

# Response will include AI score (0-100) and match level
{
  "score": 82,
  "match": "High",
  "feedback": "Strong match with required skills"
}
```

### 2. Configure External AI API (Optional)

**Update .env file**:
```env
AI_API_KEY=sk-your-openai-key
AI_API_ENDPOINT=https://api.openai.com/v1
AI_MODEL=gpt-3.5-turbo
```

**Service automatically uses external AI if configured**, falls back to local otherwise.

### 3. AI Evaluation Scoring

| Score | Level | Action |
|-------|-------|--------|
| 75-100 | High | Auto-shortlist |
| 50-74 | Medium | Review needed |
| < 50 | Low | Likely reject |

---

## 📋 Candidate Workflow States

### State Transitions

```
1. Applied
   ↓
2. Under Review (Recruiter reviews)
   ↓
3. Shortlisted (AI score >= 75 OR manual review)
   ↓
4. Interview Scheduled (Interview date set)
   ↓
5a. Selected (Positive interview result)
    OR
5b. Rejected (Negative review/interview)
   ↓
6. Offered (For selected candidates)
   ↓
7. Joined (For accepted offers)
```

### State Update Endpoints

```bash
# Auto-update via AI evaluation (Applied → Shortlisted)
POST /api/recruitment/application/:id/evaluate-ai

# Manual update
PUT /api/recruitment/application/:id
{
  "status": "Under Review",
  "feedback": "Good technical fit",
  "rating": 4.5
}

# Interview scheduling (Shortlisted → Interview Scheduled)
POST /api/recruitment/application/:id/schedule-interview

# Interview result (Interview Scheduled → Selected/Rejected)
POST /api/recruitment/application/:id/interview-result
```

---

## 🚀 Common Workflows

### Workflow 1: AI-Powered Candidate Screening (5 min)

```
1. Candidate applies
   POST /api/recruitment/application/submit
   
2. Recruiter triggers AI evaluation
   POST /api/recruitment/application/:id/evaluate-ai
   → Auto-scores candidate
   → Auto-shortlists if score >= 75
   
3. Recruiter reviews result
   GET /api/recruitment/application/:id
   
4. If interested, schedule interview
   POST /api/recruitment/application/:id/schedule-interview
```

### Workflow 2: Complete Interview Cycle (20 min)

```
1. Get interview questions
   GET /api/recruitment/application/:id/interview-questions?count=5
   
2. Send questions to candidate (email/manual)
   
3. Record interview result
   POST /api/recruitment/application/:id/interview-result
   {
     "result": "Selected",
     "score": 9,
     "feedback": "Excellent communication"
   }
   
4. Track workflow progress
   GET /api/recruitment/application/:id/workflow
```

### Workflow 3: Bulk Candidate Evaluation

```bash
# Get all applications
GET /api/recruitment/application?limit=50

# For each application:
for app_id in $(jq -r '.data[].id'):
  POST /api/recruitment/application/$app_id/evaluate-ai
done

# Get shortlisted candidates
GET /api/recruitment/application?status=Shortlisted
```

---

## 🔧 Troubleshooting

### Issue: "Access denied" error

**Solution**: Check user role
```bash
# Get user from token
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"

# Check role in response - must match endpoint requirements
```

### Issue: AI evaluation not working

**Solution**: Check AI service configuration
```bash
# Local evaluation works by default
# No API key needed!

# If using external AI:
- Verify AI_API_KEY in .env
- Check API endpoint is correct
- Service will fall back to local if API fails
```

### Issue: Candidate workflow not updating

**Solution**: Use correct workflow transitions
```bash
# Wrong: Can't go directly from Applied to Selected
POST /api/recruitment/application/:id
{ "status": "Selected" } → ❌ Will fail

# Right: Follow state machine
Applied → Shortlisted → Interview Scheduled → Selected
```

---

## 📊 Monitoring & Logs

### Access Control Logs

Every access is logged with:
```javascript
{
  userId: "...",
  role: "recruiter",
  method: "POST",
  path: "/api/recruitment/application/123/evaluate-ai",
  timestamp: "2026-04-17T10:30:00Z",
  ipAddress: "192.168.1.1"
}
```

### Check Application History

```bash
# Get single application with all history
GET /api/recruitment/application/:id

# View complete workflow timeline
GET /api/recruitment/application/:id/workflow
→ Shows: Applied → Under Review → Shortlisted → Interview Scheduled → Selected
  With dates, reviewers, and feedback at each stage
```

---

## 🎯 Best Practices

### ✅ DO:
- ✅ Use role-based endpoints matching user authority
- ✅ Always include Bearer token for protected endpoints
- ✅ Follow candidate workflow state transitions
- ✅ Document interview results immediately
- ✅ Use AI evaluation for initial screening
- ✅ Update user roles through admin panel

### ❌ DON'T:
- ❌ Expose API tokens in code/logs
- ❌ Skip role verification on sensitive operations
- ❌ Try to create job postings without recruiter role
- ❌ Use invalid state transitions
- ❌ Store passwords in plain text
- ❌ Assume unauthenticated access for protected endpoints

---

## 📞 Support

**Documentation**: `/backend/README.md`
**Implementation Details**: `/backend/DAY-14-IMPLEMENTATION.md`
**API Reference**: `http://localhost:3000/api-docs`

**For issues**:
1. Check role assignment
2. Verify token is valid
3. Check workflow state transitions
4. Review error message and logs
5. Refer to troubleshooting section

---

**Last Updated**: April 17, 2026  
**Status**: Production Ready ✅
