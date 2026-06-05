# 🧪 HRMS Backend - Thunder Client Testing Guide

## Quick Start (5 minutes)

### Step 1: Start Server
```bash
cd backend
npm run dev
```

Expected output:
```
✓ Server running on port 5000
✓ Swagger docs: http://localhost:5000/api-docs
✓ Health check: http://localhost:5000/api/health
```

### Step 2: Import Collection
1. Open Thunder Client
2. Click "Collections" → "Import"
3. Select `backend/HRMS-API.json`
4. Click "Import"

### Step 3: Set Variables
In Thunder Client, set variables:
- `baseUrl` = `http://localhost:5000`
- `token` = (get from login response)

---

## Complete Test Workflow

### Phase 1: Authentication (5 mins)

**Request 1: Register User**
```
Collection: 1. Authentication
Request: Register User

Body:
{
  "fullName": "John Developer",
  "email": "john.dev@company.com",
  "password": "SecurePass@123"
}
```

✅ Expected: `201 Created` with user data

**Request 2: Login User**
```
Collection: 1. Authentication
Request: Login User

Body:
{
  "email": "john.dev@company.com",
  "password": "SecurePass@123"
}
```

✅ Expected: `200 OK` with JWT token

⚠️ **Important**: Copy the token from response and paste in Thunder Client variables:
- Click "..." on collection
- Select "Edit Variables"
- Paste token in `token` field

---

### Phase 2: Employee Management (10 mins)

**Request 1: Create Employee**
```
Collection: 2. Employee Management
Request: Create Employee

Authorization: Bearer (auto-added from variables)

Body:
{
  "user": "PASTE_USER_ID_HERE",
  "position": "Senior Backend Developer",
  "baseSalary": 75000,
  "allowances": 8000,
  "department": "Engineering",
  "role": "Senior Developer",
  "joiningDate": "2026-01-15"
}
```

⚠️ Get `user` ID from Step 1 registration response

✅ Expected: `201 Created` with employee data
- Copy employee ID for later use

**Request 2: Get All Employees**
```
Collection: 2. Employee Management
Request: Get All Employees
```

✅ Expected: `200 OK` with list of employees

**Request 3: Get Employee by ID**
```
Collection: 2. Employee Management
Request: Get Employee by ID

URL: http://localhost:5000/api/employees/:employeeId
```

Replace `:employeeId` with actual ID

✅ Expected: `200 OK` with employee details

**Request 4: Update Employee**
```
Collection: 2. Employee Management
Request: Update Employee

URL: http://localhost:5000/api/employees/:employeeId

Body:
{
  "baseSalary": 85000,
  "position": "Tech Lead"
}
```

✅ Expected: `200 OK` with updated data

**Request 5: Get Employee Stats**
```
Collection: 2. Employee Management
Request: Get Employee Stats
```

✅ Expected: `200 OK` with statistics by department/status

---

### Phase 3: Attendance Tracking (10 mins)

**Request 1: Mark Attendance**
```
Collection: 3. Attendance Management
Request: Mark Attendance

Body:
{
  "employeeId": "PASTE_EMPLOYEE_ID_HERE",
  "date": "2026-04-16",
  "status": "Present",
  "checkIn": "09:30",
  "checkOut": "18:00"
}
```

✅ Expected: `201 Created` with attendance record

**Request 2: Get Attendance Records**
```
Collection: 3. Attendance Management
Request: Get Attendance Records

URL: ?page=1&limit=20&month=4&year=2026
```

✅ Expected: `200 OK` with attendance list

**Request 3: Update Attendance**
```
Collection: 3. Attendance Management
Request: Update Attendance

Body:
{
  "employeeId": "PASTE_EMPLOYEE_ID_HERE",
  "date": "2026-04-16",
  "status": "Late",
  "checkIn": "09:45"
}
```

✅ Expected: `200 OK` with updated record

**Request 4: Get Activities**
```
Collection: 3. Attendance Management
Request: Get Activities

URL: ?page=1&limit=10
```

✅ Expected: `200 OK` with activity feed

---

### Phase 4: Payroll Processing (10 mins)

**Request 1: Generate Payroll**
```
Collection: 4. Payroll Management
Request: Generate Payroll

Authorization: Bearer (auto-added)

Body:
{
  "month": 4,
  "year": 2026,
  "bonus": 2000,
  "taxRate": 10,
  "pfRate": 12
}
```

⚠️ First time only! Will fail if already generated for month.

✅ Expected: `201 Created` with payroll records

**Request 2: Get Payroll**
```
Collection: 4. Payroll Management
Request: Get Payroll

URL: ?month=4&year=2026&status=Pending&page=1&limit=10
```

✅ Expected: `200 OK` with payroll list

**Request 3: Get Payslip**
```
Collection: 4. Payroll Management
Request: Get Payslip by Details

URL: ?employeeId=PASTE_EMPLOYEE_ID&month=4&year=2026
```

✅ Expected: `200 OK` with detailed payslip

**Request 4: Mark as Paid**
```
Collection: 4. Payroll Management
Request: Mark as Paid

URL: /api/payroll/pay/:payrollId
```

Get payrollId from Get Payroll response

✅ Expected: `200 OK` with status "Paid"

---

### Phase 5: Leave Management (NEW) (10 mins)

**Request 1: Create Leave Request**
```
Collection: 5. Leave Management
Request: Create Leave Request

Body:
{
  "employeeId": "PASTE_EMPLOYEE_ID_HERE",
  "leaveType": "Casual Leave",
  "startDate": "2026-04-20",
  "endDate": "2026-04-22",
  "reason": "Personal appointments",
  "numberOfDays": 3
}
```

✅ Expected: `201 Created` with leave request

**Request 2: Get All Leaves**
```
Collection: 5. Leave Management
Request: Get All Leaves

URL: ?page=1&limit=10&status=Pending
```

✅ Expected: `200 OK` with leave list

**Request 3: Approve Leave**
```
Collection: 5. Leave Management
Request: Approve Leave

URL: /api/leave/approve/:leaveId

Authorization: Bearer (required)

Body:
{
  "status": "Approved",
  "remarks": "Approved by HR Manager"
}
```

Get leaveId from Create Leave response

✅ Expected: `200 OK` with status "Approved"

**Request 4: Get Leave Balance**
```
Collection: 5. Leave Management
Request: Get Leave Balance

URL: /api/leave/balance/:employeeId
```

✅ Expected: `200 OK` with balance breakdown:
```json
{
  "Annual Leave": { "total": 20, "used": 3, "remaining": 17 },
  "Casual Leave": { "total": 8, "used": 3, "remaining": 5 },
  "Sick Leave": { "total": 10, "used": 0, "remaining": 10 }
}
```

---

### Phase 6: Recruitment System (NEW) (15 mins)

#### Part A: Post Job

**Request 1: Create Job Posting**
```
Collection: 6. Recruitment - Jobs
Request: Create Job Posting

Authorization: Bearer (required)

Body:
{
  "title": "Senior Python Developer",
  "description": "We are seeking an experienced Python developer with expertise in FastAPI, PostgreSQL, and Docker. You will work on microservices architecture.",
  "department": "Engineering",
  "position": "Senior Developer",
  "requiredExperience": 5,
  "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes"],
  "salary": {
    "min": 100000,
    "max": 150000
  },
  "location": "San Francisco, CA",
  "jobType": "Full-time",
  "numberOfPositions": 2,
  "closingDate": "2026-05-31"
}
```

✅ Expected: `201 Created` with job posting

⚠️ Copy job ID for next requests

**Request 2: Get All Job Postings**
```
Collection: 6. Recruitment - Jobs
Request: Get All Job Postings

URL: ?page=1&limit=10&status=Open&department=Engineering
```

✅ Expected: `200 OK` with jobs list

#### Part B: Submit & Manage Applications

**Request 3: Submit Application**
```
Collection: 7. Recruitment - Applications
Request: Submit Application

Body:
{
  "jobPostingId": "PASTE_JOB_ID_HERE",
  "candidateName": "Jane Smith",
  "candidateEmail": "jane.smith@techmail.com",
  "candidatePhone": "+1-555-0198",
  "experience": 7,
  "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
  "currentCompany": "Tech Startup Inc",
  "coverLetter": "I am very interested in this role. I have 7 years of Python development experience and have built several microservices using FastAPI.",
  "candidateResume": "https://example.com/jane-smith-resume.pdf"
}
```

✅ Expected: `201 Created` with application

⚠️ Copy application ID for next requests

**Request 4: Get All Applications**
```
Collection: 7. Recruitment - Applications
Request: Get All Applications

URL: ?page=1&limit=10&status=Applied
```

✅ Expected: `200 OK` with applications

**Request 5: Update Status - Shortlist**
```
Collection: 7. Recruitment - Applications
Request: Update Application Status - Shortlist

URL: /api/recruitment/application/:applicationId

Authorization: Bearer (required)

Body:
{
  "status": "Shortlisted",
  "rating": 4.5,
  "feedback": "Excellent technical skills, strong Python background, perfect for the role"
}
```

✅ Expected: `200 OK` with updated status

**Request 6: Update Status - Select**
```
Collection: 7. Recruitment - Applications
Request: Update Application Status - Select

URL: /api/recruitment/application/:applicationId

Body:
{
  "status": "Selected",
  "rating": 5,
  "feedback": "Top candidate, excellent technical and communication skills"
}
```

✅ Expected: `200 OK` with status "Selected"

**Request 7: Get Job Applications**
```
Collection: 7. Recruitment - Applications
Request: Get Job Applications

URL: /api/recruitment/job/:jobPostingId/applications?page=1&limit=10
```

✅ Expected: `200 OK` with all applications for this job

---

## 🧪 Error Testing

### Test Error Handling

**1. Validation Error (400)**
```
POST /api/employees/create

Body (missing required field):
{
  "position": "Developer"
}
```

✅ Expected: `400 Bad Request` with validation details

**2. Duplicate Email (409)**
```
POST /api/users/register

Body (repeat same email):
{
  "fullName": "Test",
  "email": "john.dev@company.com",
  "password": "pass"
}
```

✅ Expected: `409 Conflict` - "Email already exists"

**3. Not Found (404)**
```
GET /api/employees/invalid-id-123
```

✅ Expected: `404 Not Found` - "Employee not found"

**4. Unauthorized (401)**
```
POST /api/payroll/generate

(without Authorization header)
```

✅ Expected: `401 Unauthorized` - "Invalid token"

---

## 📊 Response Format Reference

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* object or array */ },
  "pagination": { "page": 1, "limit": 10, "total": 100 },
  "timestamp": "2026-04-16T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": { /* details, dev only */ },
  "timestamp": "2026-04-16T10:30:00Z"
}
```

---

## ⚡ Performance Verification

### Test Query Performance

**Test 1: Large Attendance List**
```
GET /api/attendance?page=1&limit=100&month=3&year=2026
```

Should return in < 200ms

**Test 2: Employee Filtering**
```
GET /api/employees?page=1&limit=50&department=Engineering
```

Should return in < 100ms

**Test 3: Payroll Bulk**
```
POST /api/payroll/generate

Body:
{
  "month": 3,
  "year": 2026,
  "bonus": 1000
}
```

Should complete in < 5 seconds for 100+ employees

---

## 🐛 Troubleshooting

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Token may be expired or formatted wrong. Ensure "Bearer " prefix exists. |
| 404 Not Found | Resource ID is incorrect. Copy exact ID from previous response. |
| 409 Conflict | Email already exists. Use different email for new user. |
| Duplicate Leave Error | Leave dates overlap with existing approved leave. Choose different dates. |
| No Applications | Create job first, then submit application for that job. |

---

## 📝 Test Checklist

- [ ] Server starts successfully
- [ ] Thunder Client imports collection
- [ ] Register new user
- [ ] Login and get token
- [ ] Create employee
- [ ] Mark attendance
- [ ] Generate payroll
- [ ] Create leave request
- [ ] Approve leave
- [ ] Post job opening
- [ ] Submit job application
- [ ] Update application status
- [ ] Error handling works (400, 401, 404, 409)
- [ ] Pagination works (page, limit params)
- [ ] Response format is consistent

---

## 🎓 Key Endpoints Summary

| Module | Endpoints | Status |
|--------|-----------|--------|
| Authentication | 3 | ✅ |
| Employees | 6 | ✅ |
| Attendance | 4 | ✅ |
| Payroll | 5 | ✅ |
| Leave | 7 | ✅ NEW |
| Recruitment | 11 | ✅ NEW |
| **Total** | **36** | **✅** |

---

**Ready to test!** 🚀

Start with Phase 1 (Authentication) and work through each phase in order. Each phase builds on the previous one.

**Questions?** Check the API documentation: `http://localhost:5000/api-docs`
