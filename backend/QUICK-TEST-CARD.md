# 🚀 QUICK TEST REFERENCE CARD

## TODAY'S TESTING PLAN - At A Glance

### ⏱️ Time Breakdown
- **Quick Test** (15 min): Core APIs only
- **Standard** (1 hour): Most important APIs  
- **Complete** (2 hours): All 36 APIs

---

## 🎯 TEST SEQUENCE (Quick Order)

### 1️⃣ Health Check (1 min)
```
GET /api/health
Expected: 200 ✓
```

### 2️⃣ Register User (2 min)
```
POST /api/users/register
Save: userId
Expected: 201 ✓
```

### 3️⃣ Login (2 min)
```
POST /api/users/login
Save: token
Expected: 200 ✓
```

### 4️⃣ Create Employee (3 min)
```
POST /api/employees/create (with token)
Save: employeeId
Expected: 201 ✓
```

### 5️⃣ Mark Attendance (2 min)
```
POST /api/attendance/create
Expected: 201 ✓
```

### 6️⃣ Generate Payroll (3 min)
```
POST /api/payroll/generate (with token)
Expected: 201 ✓
```

### 7️⃣ Request Leave (2 min)
```
POST /api/leave/create
Save: leaveId
Expected: 201 ✓
```

### 8️⃣ Post Job (2 min)
```
POST /api/recruitment/job/create (with token)
Save: jobId
Expected: 201 ✓
```

### 9️⃣ Apply for Job (2 min)
```
POST /api/recruitment/application/submit
Save: applicationId
Expected: 201 ✓
```

**⏱️ 15 Minutes Total** ✅

---

## 📋 KEY VARIABLES TO SAVE

```
After Register:
✓ userId = _____________________

After Login:
✓ token = _____________________

After Create Employee:
✓ employeeId = _____________________

After Request Leave:
✓ leaveId = _____________________

After Post Job:
✓ jobId = _____________________

After Apply:
✓ applicationId = _____________________
```

---

## 🔑 REQUIRED HEADERS

### For Protected Endpoints:
```
Authorization: Bearer {{token}}
```

**Protected Endpoints:**
- Create Employee
- Update Employee
- Delete Employee
- Generate Payroll
- Mark Paid
- Approve Payroll
- Post Job
- Update Job
- Delete Job
- Approve Leave
- Update Application Status

---

## ✅ RESPONSE CODES SUMMARY

| Code | Meaning | APIs |
|------|---------|------|
| **201** | Created | POST create endpoints |
| **200** | OK | GET and successful PUT/DELETE |
| **400** | Bad Request | Validation errors |
| **401** | Unauthorized | Missing/invalid token |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Duplicates/overlaps |

---

## 📝 COMMON REQUEST BODIES

### Register
```json
{
  "fullName": "John Doe",
  "email": "john.doe@company.com",
  "password": "SecurePass@123"
}
```

### Login
```json
{
  "email": "john.doe@company.com",
  "password": "SecurePass@123"
}
```

### Create Employee
```json
{
  "user": "{{userId}}",
  "position": "Software Developer",
  "baseSalary": 50000,
  "allowances": 5000,
  "department": "Engineering",
  "role": "Developer"
}
```

### Mark Attendance
```json
{
  "employeeId": "{{employeeId}}",
  "date": "2026-04-16",
  "status": "Present",
  "checkIn": "09:00",
  "checkOut": "18:00"
}
```

### Generate Payroll
```json
{
  "month": 4,
  "year": 2026
}
```

### Request Leave
```json
{
  "employeeId": "{{employeeId}}",
  "leaveType": "Casual Leave",
  "startDate": "2026-04-20",
  "endDate": "2026-04-22",
  "reason": "Family event",
  "numberOfDays": 3
}
```

### Post Job
```json
{
  "title": "Senior Python Developer",
  "description": "Looking for experienced Python developer",
  "department": "Engineering",
  "position": "Senior Developer",
  "requiredExperience": 5,
  "skills": ["Python", "FastAPI"],
  "salary": { "min": 80000, "max": 120000 },
  "location": "New York",
  "jobType": "Full-time",
  "numberOfPositions": 2,
  "closingDate": "2026-05-16"
}
```

### Apply for Job
```json
{
  "jobPostingId": "{{jobId}}",
  "candidateName": "Jane Smith",
  "candidateEmail": "jane.smith@email.com",
  "candidatePhone": "+1-555-0123",
  "candidateResume": "https://example.com/resume.pdf",
  "experience": 6,
  "skills": ["Python", "FastAPI"],
  "currentCompany": "Tech Corp"
}
```

### Approve Leave
```json
{
  "status": "Approved",
  "remarks": "Approved - Enjoy your leave"
}
```

### Update Application
```json
{
  "status": "Interview Scheduled",
  "rating": 4,
  "feedback": "Great technical background"
}
```

---

## 🐛 ERROR TESTS

### Invalid Password
```
POST /api/users/login
{
  "email": "john@example.com",
  "password": "wrongpassword"
}
Expected: 400 or 401
```

### Duplicate Email
```
POST /api/users/register
{
  "fullName": "New User",
  "email": "john.doe@company.com",
  "password": "Pass@123"
}
Expected: 409 - Email already exists
```

### Missing Token
```
POST /api/employees/create
(No Authorization header)
Expected: 401
```

### Invalid ID
```
GET /api/employees/invalidid123
Expected: 404
```

### Leave Overlap
```
POST /api/leave/create
(Dates overlap with approved leave)
Expected: 409 - Leave overlap detected
```

---

## 📊 QUICK CHECKLIST

### Setup Phase
- [ ] Server running (3000)
- [ ] Database connected
- [ ] Thunder Client imported
- [ ] Base URL set

### Core Testing
- [ ] Health check (201)
- [ ] Register (201)
- [ ] Login (200)
- [ ] Create Employee (201)
- [ ] Mark Attendance (201)
- [ ] Generate Payroll (201)

### Advanced Testing
- [ ] Request Leave (201)
- [ ] Approve Leave (200)
- [ ] Post Job (201)
- [ ] Apply (201)
- [ ] Update Application (200)

### Error Testing
- [ ] Duplicate email (409)
- [ ] Invalid token (401)
- [ ] Not found (404)
- [ ] Leave overlap (409)

### Final Checks
- [ ] All response codes correct
- [ ] No sensitive data exposed
- [ ] Pagination working
- [ ] Data consistent

---

## ⚡ QUICK COMMANDS

### Get IDs from Response
```
Register: data._id → userId
Login: data.token → token
Employees: data._id → employeeId
Leave: data._id → leaveId
Job: data._id → jobId
Application: data._id → applicationId
```

### Set in Environment
```
Thunder Client → Environments
Set these variables:
- baseUrl = http://localhost:3000
- token = (from login)
- userId = (from register)
- employeeId = (from create employee)
- leaveId = (from request leave)
- jobId = (from post job)
- applicationId = (from apply)
```

### Replace Placeholders
```
:employeeId → Copy actual ID
{{token}} → Auto-filled from environment
{{baseUrl}} → Auto-filled from environment
```

---

## 🎯 SUCCESS CRITERIA

### ✅ Test Passes If:
1. Status code is correct (201 for create, 200 for others)
2. Response includes success: true
3. Data object present (except deletes)
4. No password in response
5. No server errors (5xx)

### ❌ Test Fails If:
1. Wrong status code
2. success: false
3. Error message instead of data
4. Server error (500)
5. Timeout

---

## 📞 TROUBLESHOOTING QUICK FIX

| Issue | Fix |
|-------|-----|
| 401 Unauthorized | Copy fresh token from login |
| 404 Not Found | Verify ID is correct |
| 409 Conflict | Use different email/ID |
| 400 Bad Request | Check request body format |
| Server not running | Run: npm run dev |
| Token expired | Login again |

---

## 🎓 TESTING TIPS

1. **Copy IDs immediately** after creation
2. **Set environment variables** after getting values
3. **Use {{variable}}** instead of hardcoding
4. **Test in order** (auth first, then data)
5. **Save responses** for error analysis
6. **Check pagination** on list endpoints
7. **Verify token** in Authorization header
8. **Watch for 409** (duplicates/overlaps)

---

## ⏰ TIME TRACKING

```
Start: __________

Phase 1 (Setup): __________ ✓/✗
Phase 2 (Auth): __________ ✓/✗
Phase 3 (Employee): __________ ✓/✗
Phase 4 (Attendance): __________ ✓/✗
Phase 5 (Payroll): __________ ✓/✗
Phase 6 (Leave): __________ ✓/✗
Phase 7 (Recruitment): __________ ✓/✗
Phase 8 (Errors): __________ ✓/✗

End: __________
Total Time: __________ (Target: 2 hours)
```

---

## ✨ FINAL STATUS

- [ ] All 36 APIs tested
- [ ] All responses correct
- [ ] Error handling verified
- [ ] No sensitive data exposed
- [ ] Performance acceptable
- [ ] Ready for production

---

**Document**: TODAY'S TASK Quick Reference  
**Version**: 1.0  
**Date**: April 16, 2026  
**Status**: Ready to Use ✅

Keep this card visible while testing!
