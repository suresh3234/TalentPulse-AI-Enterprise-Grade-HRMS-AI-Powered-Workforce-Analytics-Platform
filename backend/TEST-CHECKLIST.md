# ✅ HRMS Platform - Complete Test Checklist

## 📌 Pre-Test Checklist

- [ ] Backend server running on port 3000
- [ ] Thunder Client imported successfully
- [ ] Environment variable `baseUrl = http://localhost:3000` set
- [ ] Ready to test

---

## 🔐 1. AUTHENTICATION TESTS

### Test 1.1: Register User
**URL**: `POST http://localhost:3000/api/users/register`

**Request Body**:
```json
{
  "fullName": "John Doe",
  "email": "john.doe@company.com",
  "password": "SecurePass@123"
}
```

**Expected Status**: ✅ 201 Created

**Expected Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "...",
    "fullName": "John Doe",
    "email": "john.doe@company.com",
    "role": "employee"
  }
}
```

**✅ Test Status**: [ ] Pass

---

### Test 1.2: Login User
**URL**: `POST http://localhost:3000/api/users/login`

**Request Body**:
```json
{
  "email": "john.doe@company.com",
  "password": "SecurePass@123"
}
```

**Expected Status**: ✅ 200 OK

**Expected Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "user_id",
      "fullName": "John Doe",
      "email": "john.doe@company.com"
    }
  }
}
```

**Action**: 📋 Copy `token` value to environment

**✅ Test Status**: [ ] Pass

---

### Test 1.3: Get All Users
**URL**: `GET http://localhost:3000/api/users?page=1&limit=10`

**Expected Status**: ✅ 200 OK

**Expected Response**: Array of users with pagination

**✅ Test Status**: [ ] Pass

---

## 👥 2. EMPLOYEE MANAGEMENT TESTS

### Test 2.1: Create Employee
**URL**: `POST http://localhost:3000/api/employees/create`

**Headers**: `Authorization: Bearer {{token}}`

**Request Body**:
```json
{
  "user": "PASTE_USER_ID_FROM_REGISTER",
  "position": "Software Developer",
  "baseSalary": 50000,
  "allowances": 5000,
  "department": "Engineering",
  "role": "Developer",
  "joiningDate": "2026-04-16"
}
```

**Expected Status**: ✅ 201 Created

**✅ Test Status**: [ ] Pass

---

### Test 2.2: Get All Employees
**URL**: `GET http://localhost:3000/api/employees?page=1&limit=10`

**Expected Status**: ✅ 200 OK

**Expected Response**: Paginated list of employees

**✅ Test Status**: [ ] Pass

---

### Test 2.3: Get Employee by ID
**URL**: `GET http://localhost:3000/api/employees/:employeeId`

**Expected Status**: ✅ 200 OK

**✅ Test Status**: [ ] Pass

---

### Test 2.4: Update Employee
**URL**: `PUT http://localhost:3000/api/employees/:employeeId`

**Headers**: `Authorization: Bearer {{token}}`

**Request Body**:
```json
{
  "position": "Senior Developer",
  "baseSalary": 60000
}
```

**Expected Status**: ✅ 200 OK

**✅ Test Status**: [ ] Pass

---

### Test 2.5: Get Employee Stats
**URL**: `GET http://localhost:3000/api/employees/stats`

**Expected Status**: ✅ 200 OK

**Expected Response**: Department and status statistics

**✅ Test Status**: [ ] Pass

---

## 📋 3. ATTENDANCE MANAGEMENT TESTS

### Test 3.1: Mark Attendance
**URL**: `POST http://localhost:3000/api/attendance/create`

**Request Body**:
```json
{
  "employeeId": "PASTE_EMPLOYEE_ID",
  "date": "2026-04-16",
  "status": "Present",
  "checkIn": "09:00",
  "checkOut": "18:00"
}
```

**Expected Status**: ✅ 201 Created

**✅ Test Status**: [ ] Pass

---

### Test 3.2: Get Attendance Records
**URL**: `GET http://localhost:3000/api/attendance?page=1&limit=20&status=Present`

**Expected Status**: ✅ 200 OK

**Expected Response**: Paginated attendance records

**✅ Test Status**: [ ] Pass

---

### Test 3.3: Update Attendance
**URL**: `PUT http://localhost:3000/api/attendance`

**Request Body**:
```json
{
  "employeeId": "employee_id",
  "date": "2026-04-16",
  "status": "Late",
  "checkIn": "10:00",
  "checkOut": "18:00"
}
```

**Expected Status**: ✅ 200 OK

**✅ Test Status**: [ ] Pass

---

### Test 3.4: Get Activity Feed
**URL**: `GET http://localhost:3000/api/attendance/activities?page=1&limit=10`

**Expected Status**: ✅ 200 OK

**✅ Test Status**: [ ] Pass

---

## 💰 4. PAYROLL MANAGEMENT TESTS

### Test 4.1: Generate Payroll
**URL**: `POST http://localhost:3000/api/payroll/generate`

**Headers**: `Authorization: Bearer {{token}}`

**Request Body**:
```json
{
  "month": 4,
  "year": 2026
}
```

**Expected Status**: ✅ 201 Created

**Expected Response**: Payroll records generated

**✅ Test Status**: [ ] Pass

---

### Test 4.2: Get Payroll Records
**URL**: `GET http://localhost:3000/api/payroll?page=1&limit=10&status=Pending`

**Expected Status**: ✅ 200 OK

**Expected Response**: Paginated payroll records

**✅ Test Status**: [ ] Pass

---

### Test 4.3: Get Payslip
**URL**: `GET http://localhost:3000/api/payroll/payslip/:payrollId`

**Expected Status**: ✅ 200 OK

**Expected Response**: Payslip details with deductions

**✅ Test Status**: [ ] Pass

---

### Test 4.4: Mark Payroll as Paid
**URL**: `PUT http://localhost:3000/api/payroll/pay/:payrollId`

**Headers**: `Authorization: Bearer {{token}}`

**Expected Status**: ✅ 200 OK

**Expected Response**: Status changed to "Paid"

**✅ Test Status**: [ ] Pass

---

### Test 4.5: Approve All Payroll
**URL**: `PUT http://localhost:3000/api/payroll/approve`

**Headers**: `Authorization: Bearer {{token}}`

**Expected Status**: ✅ 200 OK

**✅ Test Status**: [ ] Pass

---

## 🗓️ 5. LEAVE MANAGEMENT TESTS (NEW)

### Test 5.1: Request Leave
**URL**: `POST http://localhost:3000/api/leave/create`

**Request Body**:
```json
{
  "employeeId": "PASTE_EMPLOYEE_ID",
  "leaveType": "Casual Leave",
  "startDate": "2026-04-20",
  "endDate": "2026-04-22",
  "reason": "Family event",
  "numberOfDays": 3
}
```

**Expected Status**: ✅ 201 Created

**Expected Response**:
```json
{
  "success": true,
  "message": "Leave request created successfully",
  "data": {
    "_id": "...",
    "employeeId": "...",
    "leaveType": "Casual Leave",
    "status": "Pending",
    "startDate": "2026-04-20",
    "endDate": "2026-04-22",
    "numberOfDays": 3
  }
}
```

**✅ Test Status**: [ ] Pass

---

### Test 5.2: Get All Leaves
**URL**: `GET http://localhost:3000/api/leave?page=1&limit=10&status=Pending`

**Expected Status**: ✅ 200 OK

**Expected Response**: Paginated leave requests

**✅ Test Status**: [ ] Pass

---

### Test 5.3: Get Leave by ID
**URL**: `GET http://localhost:3000/api/leave/:leaveId`

**Expected Status**: ✅ 200 OK

**✅ Test Status**: [ ] Pass

---

### Test 5.4: Update Leave
**URL**: `PUT http://localhost:3000/api/leave/:leaveId`

**Request Body**:
```json
{
  "startDate": "2026-04-21",
  "endDate": "2026-04-23",
  "numberOfDays": 3
}
```

**Expected Status**: ✅ 200 OK

**⚠️ Note**: Only Pending leaves can be updated

**✅ Test Status**: [ ] Pass

---

### Test 5.5: Approve Leave
**URL**: `PUT http://localhost:3000/api/leave/approve/:leaveId`

**Headers**: `Authorization: Bearer {{token}}`

**Request Body**:
```json
{
  "status": "Approved",
  "remarks": "Approved - Enjoy your leave"
}
```

**Expected Status**: ✅ 200 OK

**Expected Response**: Status changed to "Approved"

**✅ Test Status**: [ ] Pass

---

### Test 5.6: Reject Leave
**URL**: `PUT http://localhost:3000/api/leave/approve/:leaveId`

**Headers**: `Authorization: Bearer {{token}}`

**Request Body**:
```json
{
  "status": "Rejected",
  "remarks": "Staffing constraints"
}
```

**Expected Status**: ✅ 200 OK

**✅ Test Status**: [ ] Pass

---

### Test 5.7: Check Leave Balance
**URL**: `GET http://localhost:3000/api/leave/balance/:employeeId`

**Expected Status**: ✅ 200 OK

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "Casual Leave": 8,
    "Sick Leave": 10,
    "Earned Leave": 12
  }
}
```

**✅ Test Status**: [ ] Pass

---

## 🎓 6. RECRUITMENT SYSTEM TESTS (NEW)

### Test 6.1: Post Job
**URL**: `POST http://localhost:3000/api/recruitment/job/create`

**Headers**: `Authorization: Bearer {{token}}`

**Request Body**:
```json
{
  "title": "Senior Python Developer",
  "description": "Looking for an experienced Python developer with FastAPI knowledge",
  "department": "Engineering",
  "position": "Senior Developer",
  "requiredExperience": 5,
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "salary": {
    "min": 80000,
    "max": 120000
  },
  "location": "New York",
  "jobType": "Full-time",
  "numberOfPositions": 2,
  "closingDate": "2026-05-16"
}
```

**Expected Status**: ✅ 201 Created

**Expected Response**:
```json
{
  "success": true,
  "message": "Job posting created successfully",
  "data": {
    "_id": "job_id",
    "title": "Senior Python Developer",
    "status": "Open",
    "postedOn": "2026-04-16"
  }
}
```

**📋 Action**: Copy `_id` value as Job ID

**✅ Test Status**: [ ] Pass

---

### Test 6.2: Get All Jobs
**URL**: `GET http://localhost:3000/api/recruitment/job?page=1&limit=10&status=Open`

**Expected Status**: ✅ 200 OK

**Expected Response**: Paginated job listings

**✅ Test Status**: [ ] Pass

---

### Test 6.3: Get Job by ID
**URL**: `GET http://localhost:3000/api/recruitment/job/:jobId`

**Expected Status**: ✅ 200 OK

**✅ Test Status**: [ ] Pass

---

### Test 6.4: Update Job
**URL**: `PUT http://localhost:3000/api/recruitment/job/:jobId`

**Headers**: `Authorization: Bearer {{token}}`

**Request Body**:
```json
{
  "title": "Senior Python Developer (Updated)",
  "status": "Closed"
}
```

**Expected Status**: ✅ 200 OK

**✅ Test Status**: [ ] Pass

---

### Test 6.5: Submit Application
**URL**: `POST http://localhost:3000/api/recruitment/application/submit`

**Request Body**:
```json
{
  "jobPostingId": "PASTE_JOB_ID",
  "candidateName": "Jane Smith",
  "candidateEmail": "jane.smith@email.com",
  "candidatePhone": "+1-555-0123",
  "candidateResume": "https://example.com/resume.pdf",
  "coverLetter": "I am very interested in this position...",
  "experience": 6,
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "currentCompany": "Tech Corp"
}
```

**Expected Status**: ✅ 201 Created

**Expected Response**:
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "_id": "application_id",
    "candidateName": "Jane Smith",
    "status": "Applied"
  }
}
```

**✅ Test Status**: [ ] Pass

---

### Test 6.6: Get All Applications
**URL**: `GET http://localhost:3000/api/recruitment/application?page=1&limit=10&status=Applied`

**Expected Status**: ✅ 200 OK

**Expected Response**: Paginated applications

**✅ Test Status**: [ ] Pass

---

### Test 6.7: Get Application by ID
**URL**: `GET http://localhost:3000/api/recruitment/application/:applicationId`

**Expected Status**: ✅ 200 OK

**✅ Test Status**: [ ] Pass

---

### Test 6.8: Update Application Status
**URL**: `PUT http://localhost:3000/api/recruitment/application/:applicationId`

**Headers**: `Authorization: Bearer {{token}}`

**Request Body**:
```json
{
  "status": "Interview Scheduled",
  "rating": 4,
  "feedback": "Great technical background, schedule for round 1 interview"
}
```

**Expected Status**: ✅ 200 OK

**Status Options**:
- Applied
- Screening
- Interview Scheduled
- Interview Completed
- Offer Extended
- Accepted
- Rejected

**✅ Test Status**: [ ] Pass

---

### Test 6.9: Get Applications for Job
**URL**: `GET http://localhost:3000/api/recruitment/job/:jobId/applications?page=1&limit=10`

**Expected Status**: ✅ 200 OK

**Expected Response**: All applications for that job

**✅ Test Status**: [ ] Pass

---

## 🔍 7. ERROR HANDLING TESTS

### Test 7.1: Missing Required Field
**URL**: `POST http://localhost:3000/api/users/register`

**Request Body** (invalid - missing password):
```json
{
  "fullName": "John Doe",
  "email": "john@example.com"
}
```

**Expected Status**: ❌ 400 Bad Request

**Expected Response**: Validation error message

**✅ Test Status**: [ ] Pass

---

### Test 7.2: Duplicate Email
**URL**: `POST http://localhost:3000/api/users/register`

**Request Body** (using existing email):
```json
{
  "fullName": "Jane Doe",
  "email": "john.doe@company.com",
  "password": "Password@123"
}
```

**Expected Status**: ❌ 409 Conflict

**Expected Response**: "Email already exists" message

**✅ Test Status**: [ ] Pass

---

### Test 7.3: Invalid Token
**URL**: `POST http://localhost:3000/api/employees/create`

**Headers**: `Authorization: Bearer invalidtoken123`

**Expected Status**: ❌ 401 Unauthorized

**Expected Response**: Authentication error

**✅ Test Status**: [ ] Pass

---

### Test 7.4: Invalid Employee ID
**URL**: `GET http://localhost:3000/api/employees/invalidid123`

**Expected Status**: ❌ 404 Not Found

**Expected Response**: Employee not found message

**✅ Test Status**: [ ] Pass

---

### Test 7.5: Leave Overlap
**URL**: `POST http://localhost:3000/api/leave/create`

**Request Body** (overlapping with approved leave):
```json
{
  "employeeId": "same_employee_id",
  "leaveType": "Casual Leave",
  "startDate": "2026-04-21",
  "endDate": "2026-04-23",
  "reason": "Overlapping leave",
  "numberOfDays": 3
}
```

**Expected Status**: ❌ 409 Conflict

**Expected Response**: "Leave overlap detected" message

**✅ Test Status**: [ ] Pass

---

## 📊 8. PERFORMANCE TESTS

### Test 8.1: List Employees (Pagination)
**URL**: `GET http://localhost:3000/api/employees?page=1&limit=50`

**Measure**: Response time

**Expected**: < 500ms

**Time Taken**: ______ ms

**✅ Test Status**: [ ] Pass

---

### Test 8.2: Search Attendance Records
**URL**: `GET http://localhost:3000/api/attendance?page=1&limit=100&status=Present`

**Measure**: Response time

**Expected**: < 500ms

**Time Taken**: ______ ms

**✅ Test Status**: [ ] Pass

---

### Test 8.3: Generate Payroll
**URL**: `POST http://localhost:3000/api/payroll/generate`

**Measure**: Response time

**Expected**: < 2000ms

**Time Taken**: ______ ms

**✅ Test Status**: [ ] Pass

---

## 📋 FINAL CHECKLIST

- [ ] All 9 authentication & user tests passed
- [ ] All 5 employee management tests passed
- [ ] All 4 attendance tests passed
- [ ] All 5 payroll tests passed
- [ ] All 7 leave management tests passed (NEW)
- [ ] All 9 recruitment tests passed (NEW)
- [ ] All 5 error handling tests passed
- [ ] All 3 performance tests passed
- [ ] Response format is consistent
- [ ] Pagination works correctly
- [ ] Bearer token authentication works
- [ ] Database indexes are working (fast queries)
- [ ] No sensitive data exposed in responses

---

## 🎯 SUMMARY

**Total Tests**: 47  
**Tests Passed**: ____  
**Tests Failed**: ____  
**Success Rate**: _____%

---

## 📝 NOTES

Use this space to record any issues found:

```
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
```

---

## ✅ SIGN OFF

- **Tested By**: _______________
- **Date**: _______________
- **Status**: [ ] All Tests Passed ✅ | [ ] Some Tests Failed ❌
- **Notes**: _______________________________________________

---

**Ready to Deploy**: [ ] Yes | [ ] No
