# 📅 TODAY'S TASK - Complete API Testing Guide

**Date**: April 16, 2026  
**Status**: Ready for Testing  
**Objective**: Verify all 36 APIs work correctly  

---

## ⏰ TASK OVERVIEW

### Today's Goal
Test all HRMS Platform APIs systematically using Thunder Client and verify:
- ✅ All endpoints respond correctly
- ✅ Response formats are consistent
- ✅ Authentication works
- ✅ Data persistence works
- ✅ Error handling works

### Time Required
- **Quick Test** (15 min): Core functionality
- **Standard Test** (1 hour): Most important APIs
- **Complete Test** (2-3 hours): All 47 test cases

### What You'll Verify
- 36 API endpoints
- Request/response formats
- Authentication flow
- CRUD operations
- Error scenarios
- Data validation

---

## 🎯 PHASE 1: PRE-TEST SETUP (5 Minutes)

### Step 1: Verify Server
```
✓ Check terminal shows "Server running on port 3000"
✓ Check database is connected
✓ Check "✓ Swagger docs: http://localhost:3000/api-docs"
```

### Step 2: Test Health Check
```
Thunder Client:
GET http://localhost:3000/api/health

Expected Response (201):
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-04-16T..."
}
```

**Status**: ✅ If you see this, server is ready

### Step 3: Import Collection
```
1. Thunder Client → Collections → Import
2. Select: backend/HRMS-API.json
3. Verify: 36 requests imported
4. Set: baseUrl = http://localhost:3000
```

**Status**: ✅ Ready to test

---

## 🔐 PHASE 2: AUTHENTICATION (15 Minutes)

### Test 2.1: Register User
**Purpose**: Create user account  
**Thunder Client Folder**: 1. Authentication → Register User

```
POST /api/users/register

REQUEST BODY:
{
  "fullName": "John Doe",
  "email": "john.doe@company.com",
  "password": "SecurePass@123"
}

EXPECTED RESPONSE (201):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "xxx",
    "fullName": "John Doe",
    "email": "john.doe@company.com",
    "role": "employee"
  }
}

✅ TEST PASSED if:
- Status code is 201
- Response includes _id
- No password in response
- All fields present
```

**📋 Action**: Copy `_id` → Save as `userId` in environment

---

### Test 2.2: Login User
**Purpose**: Get authentication token  
**Thunder Client Folder**: 1. Authentication → Login User

```
POST /api/users/login

REQUEST BODY:
{
  "email": "john.doe@company.com",
  "password": "SecurePass@123"
}

EXPECTED RESPONSE (200):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "xxx",
      "fullName": "John Doe",
      "email": "john.doe@company.com"
    }
  }
}

✅ TEST PASSED if:
- Status code is 200
- Token is provided
- User data included
- No password in response
```

**📋 Action**: Copy `token` → Set in environment

---

### Test 2.3: Get All Users
**Purpose**: Verify user listing works  
**Thunder Client Folder**: 1. Authentication → Get All Users

```
GET /api/users?page=1&limit=10

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": [
    { "_id": "xxx", "fullName": "...", "email": "..." }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}

✅ TEST PASSED if:
- Status code is 200
- At least 1 user in data array
- Pagination info present
```

---

## 👥 PHASE 3: EMPLOYEE MANAGEMENT (30 Minutes)

### Test 3.1: Create Employee
**Purpose**: Add employee to system  
**Thunder Client Folder**: 2. Employee Management → Create Employee

```
POST /api/employees/create
Authorization: Bearer {{token}}

REQUEST BODY:
{
  "user": "PASTE_USER_ID_HERE",
  "position": "Software Developer",
  "baseSalary": 50000,
  "allowances": 5000,
  "department": "Engineering",
  "role": "Developer"
}

EXPECTED RESPONSE (201):
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "_id": "emp_xxx",
    "user": "user_xxx",
    "position": "Software Developer",
    "baseSalary": 50000,
    "department": "Engineering",
    "status": "Active"
  }
}

✅ TEST PASSED if:
- Status code is 201
- Employee _id provided
- All fields correct
- Status is "Active"
```

**📋 Action**: Copy `_id` → Save as `employeeId` in environment

---

### Test 3.2: Get All Employees
**Purpose**: Verify employee listing  
**Thunder Client Folder**: 2. Employee Management → Get All Employees

```
GET /api/employees?page=1&limit=10

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": [
    {
      "_id": "emp_xxx",
      "position": "Software Developer",
      "department": "Engineering",
      "status": "Active"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1 }
}

✅ TEST PASSED if:
- Status code is 200
- Employee list returned
- Pagination included
```

---

### Test 3.3: Get Employee by ID
**Purpose**: Get single employee details  
**Thunder Client Folder**: 2. Employee Management → Get Employee by ID

```
GET /api/employees/:employeeId
(Replace :employeeId with your employee ID)

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": {
    "_id": "emp_xxx",
    "user": { "_id": "...", "fullName": "..." },
    "position": "Software Developer",
    "baseSalary": 50000,
    "department": "Engineering"
  }
}

✅ TEST PASSED if:
- Status code is 200
- Employee details returned
- User info populated
```

---

### Test 3.4: Update Employee
**Purpose**: Modify employee information  
**Thunder Client Folder**: 2. Employee Management → Update Employee

```
PUT /api/employees/:employeeId
Authorization: Bearer {{token}}

REQUEST BODY:
{
  "position": "Senior Developer",
  "baseSalary": 60000
}

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": {
    "_id": "emp_xxx",
    "position": "Senior Developer",
    "baseSalary": 60000
  }
}

✅ TEST PASSED if:
- Status code is 200
- Changes applied
```

---

### Test 3.5: Get Employee Stats
**Purpose**: Get analytics  
**Thunder Client Folder**: 2. Employee Management → Get Employee Stats

```
GET /api/employees/stats

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": {
    "byDepartment": { "Engineering": 1 },
    "byStatus": { "Active": 1 }
  }
}

✅ TEST PASSED if:
- Status code is 200
- Statistics provided
```

---

## 📋 PHASE 4: ATTENDANCE (20 Minutes)

### Test 4.1: Mark Attendance
**Purpose**: Record check-in/out  
**Thunder Client Folder**: 3. Attendance Management → Mark Attendance

```
POST /api/attendance/create

REQUEST BODY:
{
  "employeeId": "emp_xxx",
  "date": "2026-04-16",
  "status": "Present",
  "checkIn": "09:00",
  "checkOut": "18:00"
}

EXPECTED RESPONSE (201):
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "_id": "att_xxx",
    "employeeId": "emp_xxx",
    "date": "2026-04-16T00:00:00Z",
    "status": "Present",
    "checkIn": "09:00",
    "checkOut": "18:00"
  }
}

✅ TEST PASSED if:
- Status code is 201
- Attendance record created
```

---

### Test 4.2: Get Attendance Records
**Purpose**: View attendance logs  
**Thunder Client Folder**: 3. Attendance Management → Get Attendance

```
GET /api/attendance?page=1&limit=20

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": [{ attendance record }],
  "pagination": { ... }
}

✅ TEST PASSED if:
- Status code is 200
- Attendance records returned
```

---

### Test 4.3: Update Attendance
**Purpose**: Modify attendance  
**Thunder Client Folder**: 3. Attendance Management → Update Attendance

```
PUT /api/attendance

REQUEST BODY:
{
  "employeeId": "emp_xxx",
  "date": "2026-04-16",
  "status": "Late",
  "checkIn": "10:00",
  "checkOut": "18:00"
}

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": { updated attendance }
}

✅ TEST PASSED if:
- Status code is 200
- Status changed to "Late"
```

---

### Test 4.4: Get Activity Feed
**Purpose**: View recent activities  
**Thunder Client Folder**: 3. Attendance Management → Get Activity Feed

```
GET /api/attendance/activities?page=1&limit=10

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": [{ activity records }]
}

✅ TEST PASSED if:
- Status code is 200
- Activities returned
```

---

## 💰 PHASE 5: PAYROLL (20 Minutes)

### Test 5.1: Generate Payroll
**Purpose**: Create monthly payroll  
**Thunder Client Folder**: 4. Payroll Management → Generate Payroll

```
POST /api/payroll/generate
Authorization: Bearer {{token}}

REQUEST BODY:
{
  "month": 4,
  "year": 2026
}

EXPECTED RESPONSE (201):
{
  "success": true,
  "message": "Payroll generated successfully",
  "data": {
    "generated": 1,
    "errors": []
  }
}

✅ TEST PASSED if:
- Status code is 201
- At least 1 payroll generated
```

---

### Test 5.2: Get Payroll Records
**Purpose**: View payroll  
**Thunder Client Folder**: 4. Payroll Management → Get Payroll

```
GET /api/payroll?page=1&limit=10&status=Pending

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": [{ payroll records }],
  "pagination": { ... }
}

✅ TEST PASSED if:
- Status code is 200
- Payroll records returned
```

---

### Test 5.3: Get Payslip
**Purpose**: View detailed payslip  
**Thunder Client Folder**: 4. Payroll Management → Get Payslip

```
GET /api/payroll/payslip?employeeId=emp_xxx&month=4&year=2026

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": {
    "_id": "xxx",
    "baseSalary": 50000,
    "allowances": 5000,
    "tax": calculated,
    "netSalary": calculated
  }
}

✅ TEST PASSED if:
- Status code is 200
- Payslip details included
```

---

### Test 5.4: Mark as Paid
**Purpose**: Change payroll status  
**Thunder Client Folder**: 4. Payroll Management → Mark as Paid

```
PUT /api/payroll/pay/:payrollId
Authorization: Bearer {{token}}

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": { payroll with "Paid" status }
}

✅ TEST PASSED if:
- Status code is 200
- Status changed to "Paid"
```

---

### Test 5.5: Approve All Payroll
**Purpose**: Bulk approve payroll  
**Thunder Client Folder**: 4. Payroll Management → Approve All Payroll

```
PUT /api/payroll/approve
Authorization: Bearer {{token}}

EXPECTED RESPONSE (200):
{
  "success": true,
  "message": "Payroll approved"
}

✅ TEST PASSED if:
- Status code is 200
```

---

## 🗓️ PHASE 6: LEAVE MANAGEMENT (20 Minutes) ⭐ NEW

### Test 6.1: Request Leave
**Purpose**: Submit leave request  
**Thunder Client Folder**: 5. Leave Management → Request Leave

```
POST /api/leave/create

REQUEST BODY:
{
  "employeeId": "emp_xxx",
  "leaveType": "Casual Leave",
  "startDate": "2026-04-20",
  "endDate": "2026-04-22",
  "reason": "Family event",
  "numberOfDays": 3
}

EXPECTED RESPONSE (201):
{
  "success": true,
  "message": "Leave request created successfully",
  "data": {
    "_id": "leave_xxx",
    "employeeId": "emp_xxx",
    "leaveType": "Casual Leave",
    "startDate": "2026-04-20T00:00:00Z",
    "status": "Pending",
    "numberOfDays": 3
  }
}

✅ TEST PASSED if:
- Status code is 201
- Leave ID provided
- Status is "Pending"
```

**📋 Action**: Copy `_id` → Save as `leaveId` in environment

---

### Test 6.2: Get All Leaves
**Purpose**: View all leave requests  
**Thunder Client Folder**: 5. Leave Management → Get All Leaves

```
GET /api/leave?page=1&limit=10&status=Pending

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": [{ leave records }],
  "pagination": { ... }
}

✅ TEST PASSED if:
- Status code is 200
- Leave records returned
```

---

### Test 6.3: Get Leave by ID
**Purpose**: View leave details  
**Thunder Client Folder**: 5. Leave Management → Get Leave by ID

```
GET /api/leave/:leaveId

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": {
    "_id": "leave_xxx",
    "leaveType": "Casual Leave",
    "status": "Pending"
  }
}

✅ TEST PASSED if:
- Status code is 200
- Leave details returned
```

---

### Test 6.4: Approve Leave
**Purpose**: Manager approves leave  
**Thunder Client Folder**: 5. Leave Management → Approve Leave

```
PUT /api/leave/approve/:leaveId
Authorization: Bearer {{token}}

REQUEST BODY:
{
  "status": "Approved",
  "remarks": "Approved - Enjoy your leave"
}

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": {
    "_id": "leave_xxx",
    "status": "Approved",
    "approvedBy": "user_xxx",
    "remarks": "Approved - Enjoy your leave"
  }
}

✅ TEST PASSED if:
- Status code is 200
- Status changed to "Approved"
- approvedBy set
```

---

### Test 6.5: Check Leave Balance
**Purpose**: View remaining leaves  
**Thunder Client Folder**: 5. Leave Management → Check Leave Balance

```
GET /api/leave/balance/:employeeId

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": {
    "Casual Leave": 8,
    "Sick Leave": 10,
    "Earned Leave": 12
  }
}

✅ TEST PASSED if:
- Status code is 200
- Leave balance by type shown
```

---

## 🎓 PHASE 7: RECRUITMENT (25 Minutes) ⭐ NEW

### Test 7.1: Post Job
**Purpose**: Create job opening  
**Thunder Client Folder**: 6. Recruitment - Jobs → Post Job

```
POST /api/recruitment/job/create
Authorization: Bearer {{token}}

REQUEST BODY:
{
  "title": "Senior Python Developer",
  "description": "Looking for experienced Python developer",
  "department": "Engineering",
  "position": "Senior Developer",
  "requiredExperience": 5,
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "salary": { "min": 80000, "max": 120000 },
  "location": "New York",
  "jobType": "Full-time",
  "numberOfPositions": 2,
  "closingDate": "2026-05-16"
}

EXPECTED RESPONSE (201):
{
  "success": true,
  "message": "Job posting created successfully",
  "data": {
    "_id": "job_xxx",
    "title": "Senior Python Developer",
    "status": "Open",
    "postedOn": "2026-04-16"
  }
}

✅ TEST PASSED if:
- Status code is 201
- Job ID provided
- Status is "Open"
```

**📋 Action**: Copy `_id` → Save as `jobId` in environment

---

### Test 7.2: Get All Jobs
**Purpose**: View job listings  
**Thunder Client Folder**: 6. Recruitment - Jobs → Get All Jobs

```
GET /api/recruitment/job?page=1&limit=10&status=Open

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": [{ job listings }],
  "pagination": { ... }
}

✅ TEST PASSED if:
- Status code is 200
- Job listings returned
```

---

### Test 7.3: Submit Application
**Purpose**: Apply for job  
**Thunder Client Folder**: 7. Recruitment - Applications → Submit Application

```
POST /api/recruitment/application/submit

REQUEST BODY:
{
  "jobPostingId": "job_xxx",
  "candidateName": "Jane Smith",
  "candidateEmail": "jane.smith@email.com",
  "candidatePhone": "+1-555-0123",
  "candidateResume": "https://example.com/resume.pdf",
  "coverLetter": "I am interested in this position",
  "experience": 6,
  "skills": ["Python", "FastAPI"],
  "currentCompany": "Tech Corp"
}

EXPECTED RESPONSE (201):
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "_id": "app_xxx",
    "candidateName": "Jane Smith",
    "status": "Applied"
  }
}

✅ TEST PASSED if:
- Status code is 201
- Application ID provided
- Status is "Applied"
```

**📋 Action**: Copy `_id` → Save as `applicationId` in environment

---

### Test 7.4: Get All Applications
**Purpose**: View all applications  
**Thunder Client Folder**: 7. Recruitment - Applications → Get All Applications

```
GET /api/recruitment/application?page=1&limit=10&status=Applied

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": [{ applications }],
  "pagination": { ... }
}

✅ TEST PASSED if:
- Status code is 200
- Applications returned
```

---

### Test 7.5: Update Application Status
**Purpose**: Change application status  
**Thunder Client Folder**: 7. Recruitment - Applications → Update Application Status

```
PUT /api/recruitment/application/:applicationId
Authorization: Bearer {{token}}

REQUEST BODY:
{
  "status": "Interview Scheduled",
  "rating": 4,
  "feedback": "Great technical background"
}

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": {
    "_id": "app_xxx",
    "status": "Interview Scheduled",
    "rating": 4,
    "feedback": "Great technical background"
  }
}

✅ TEST PASSED if:
- Status code is 200
- Status changed
```

---

### Test 7.6: Get Job Applications
**Purpose**: View applications for specific job  
**Thunder Client Folder**: 7. Recruitment - Applications → Get Job Applications

```
GET /api/recruitment/job/:jobId/applications?page=1&limit=10

EXPECTED RESPONSE (200):
{
  "success": true,
  "data": [{ applications for this job }],
  "pagination": { ... }
}

✅ TEST PASSED if:
- Status code is 200
- Job-specific applications returned
```

---

## 🔍 PHASE 8: ERROR HANDLING (15 Minutes)

### Test 8.1: Missing Required Field
```
POST /api/users/register
(Don't include password)

EXPECTED: 400 Bad Request
Response includes: Validation error message

✅ PASS if: Status is 400
```

---

### Test 8.2: Duplicate Email
```
POST /api/users/register
(Use same email as first registration)

EXPECTED: 409 Conflict
Message: Email already exists

✅ PASS if: Status is 409
```

---

### Test 8.3: Invalid Token
```
POST /api/employees/create
Authorization: Bearer invalidtoken

EXPECTED: 401 Unauthorized
Message: Authentication failed

✅ PASS if: Status is 401
```

---

### Test 8.4: Not Found
```
GET /api/employees/invalidid123

EXPECTED: 404 Not Found
Message: Employee not found

✅ PASS if: Status is 404
```

---

### Test 8.5: Leave Overlap
```
POST /api/leave/create
(Request leave same dates as approved leave)

EXPECTED: 409 Conflict
Message: Leave overlap detected

✅ PASS if: Status is 409
```

---

## ✅ FINAL VERIFICATION CHECKLIST

### Authentication ✅
- [ ] Register works (201)
- [ ] Login works and returns token (200)
- [ ] List users works (200)

### Employees ✅
- [ ] Create employee works (201)
- [ ] List employees works (200)
- [ ] Get employee works (200)
- [ ] Update employee works (200)
- [ ] Get stats works (200)

### Attendance ✅
- [ ] Mark attendance works (201)
- [ ] List attendance works (200)
- [ ] Update attendance works (200)
- [ ] Activity feed works (200)

### Payroll ✅
- [ ] Generate payroll works (201)
- [ ] List payroll works (200)
- [ ] Get payslip works (200)
- [ ] Mark paid works (200)
- [ ] Approve all works (200)

### Leave ✅
- [ ] Request leave works (201)
- [ ] List leaves works (200)
- [ ] Get leave works (200)
- [ ] Approve leave works (200)
- [ ] Check balance works (200)

### Recruitment ✅
- [ ] Post job works (201)
- [ ] List jobs works (200)
- [ ] Submit application works (201)
- [ ] List applications works (200)
- [ ] Update application works (200)
- [ ] Get job applications works (200)

### Error Handling ✅
- [ ] Validation error (400)
- [ ] Duplicate error (409)
- [ ] Auth error (401)
- [ ] Not found error (404)
- [ ] Overlap error (409)

---

## 📊 TESTING SUMMARY

### Tests by Phase
| Phase | Tests | Time | Status |
|-------|-------|------|--------|
| Setup | 3 | 5 min | ⏳ |
| Authentication | 3 | 15 min | ⏳ |
| Employees | 5 | 30 min | ⏳ |
| Attendance | 4 | 20 min | ⏳ |
| Payroll | 5 | 20 min | ⏳ |
| Leave | 5 | 20 min | ⏳ |
| Recruitment | 6 | 25 min | ⏳ |
| Error Handling | 5 | 15 min | ⏳ |
| **TOTAL** | **36** | **2 hours** | ⏳ |

---

## 📝 TESTING LOG

### Session Date: April 16, 2026

**Start Time**: ___________  
**End Time**: ___________

### Results:

**Phase 1 (Setup)**: ✅ / ❌  
Notes: _________________________________

**Phase 2 (Auth)**: ✅ / ❌  
Notes: _________________________________

**Phase 3 (Employees)**: ✅ / ❌  
Notes: _________________________________

**Phase 4 (Attendance)**: ✅ / ❌  
Notes: _________________________________

**Phase 5 (Payroll)**: ✅ / ❌  
Notes: _________________________________

**Phase 6 (Leave)**: ✅ / ❌  
Notes: _________________________________

**Phase 7 (Recruitment)**: ✅ / ❌  
Notes: _________________________________

**Phase 8 (Errors)**: ✅ / ❌  
Notes: _________________________________

---

## 🎯 FINAL RESULT

**Total Tests**: 36  
**Tests Passed**: _____  
**Tests Failed**: _____  
**Success Rate**: _____%

---

## 📞 ISSUES FOUND

```
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________
4. ________________________________________________
5. ________________________________________________
```

---

## 🎓 LEARNING NOTES

```
Today I learned:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________
```

---

## ✨ SIGN OFF

**Tested By**: ___________________  
**Date**: April 16, 2026  
**Time Taken**: ___________  
**Status**: [ ] PASSED ✅ | [ ] FAILED ❌  

---

## 🚀 NEXT STEPS

- [ ] All tests passed → Ready for production
- [ ] Some tests failed → Review issues
- [ ] Deploy to staging
- [ ] Final production approval

---

**Status**: ✅ **READY TO TEST**  
**Total APIs**: 36  
**Test Cases**: 36  
**Duration**: 2 hours  

🎯 **Start testing now!**
