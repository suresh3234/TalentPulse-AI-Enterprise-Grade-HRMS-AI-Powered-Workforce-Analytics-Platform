# 🚀 HRMS Platform - Thunder Client Complete API Reference

## 📱 Thunder Client Collection Overview

**File**: `backend/HRMS-API.json`

**Contains**:
- ✅ 36 Pre-configured API Requests
- ✅ 8 Organized Folders
- ✅ Environment Variables Setup
- ✅ Bearer Token Authentication
- ✅ Example Request/Response Bodies

---

## 🗂️ Collection Structure

```
HRMS Platform APIs (v2.0)
├── 1. Authentication (3 requests)
├── 2. Employee Management (6 requests)
├── 3. Attendance Management (4 requests)
├── 4. Payroll Management (5 requests)
├── 5. Leave Management (7 requests)
├── 6. Recruitment - Jobs (5 requests)
├── 7. Recruitment - Applications (6 requests)
└── 8. Utilities (1 request)
```

---

## 🔧 Quick Import & Setup

### Step 1: Import Collection
```
Thunder Client → Collections → Import → Select HRMS-API.json
```

### Step 2: Configure Environment
```
baseUrl = http://localhost:3000
token = (set after login)
```

### Step 3: Test Health
```
GET http://localhost:3000/api/health
```

---

## 📡 ALL 36 API ENDPOINTS

### 🔐 FOLDER 1: AUTHENTICATION (3 Endpoints)

#### 1.1 Register User
```
POST /api/users/register
Content-Type: application/json
```

**Request Body**:
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "607f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "employee"
  }
}
```

---

#### 1.2 Login User
```
POST /api/users/login
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "607f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

#### 1.3 Get All Users
```
GET /api/users?page=1&limit=10
```

**Response** (200):
```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": [
    { "_id": "...", "fullName": "...", "email": "..." }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50
  }
}
```

---

### 👥 FOLDER 2: EMPLOYEE MANAGEMENT (6 Endpoints)

#### 2.1 Create Employee
```
POST /api/employees/create
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Request Body**:
```json
{
  "user": "607f1f77bcf86cd799439011",
  "position": "Software Developer",
  "baseSalary": 50000,
  "allowances": 5000,
  "department": "Engineering",
  "role": "Developer"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "_id": "...",
    "user": "607f1f77bcf86cd799439011",
    "position": "Software Developer",
    "baseSalary": 50000,
    "allowances": 5000,
    "department": "Engineering",
    "status": "Active",
    "joiningDate": "2026-04-16"
  }
}
```

---

#### 2.2 Get All Employees
```
GET /api/employees?page=1&limit=10&department=Engineering&status=Active
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 10)
- `department`: Filter by department
- `status`: Filter by status (Active/Inactive)

**Response** (200):
```json
{
  "success": true,
  "data": [ { ... } ],
  "pagination": { "page": 1, "limit": 10, "total": 25 }
}
```

---

#### 2.3 Get Employee by ID
```
GET /api/employees/:employeeId
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "user": { "_id": "...", "fullName": "..." },
    "position": "Software Developer",
    "department": "Engineering"
  }
}
```

---

#### 2.4 Update Employee
```
PUT /api/employees/:employeeId
Authorization: Bearer {{token}}
```

**Request Body**:
```json
{
  "position": "Senior Developer",
  "baseSalary": 60000
}
```

**Response** (200): Updated employee object

---

#### 2.5 Delete Employee
```
DELETE /api/employees/:employeeId
Authorization: Bearer {{token}}
```

**Response** (200): Success message

---

#### 2.6 Get Employee Stats
```
GET /api/employees/stats
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "byDepartment": { "Engineering": 5, "HR": 3 },
    "byStatus": { "Active": 7, "Inactive": 1 }
  }
}
```

---

### 📋 FOLDER 3: ATTENDANCE MANAGEMENT (4 Endpoints)

#### 3.1 Mark Attendance
```
POST /api/attendance/create
```

**Request Body**:
```json
{
  "employeeId": "607f1f77bcf86cd799439011",
  "date": "2026-04-16",
  "status": "Present",
  "checkIn": "09:00",
  "checkOut": "18:00"
}
```

**Status Options**: Present, Absent, Late, Leave, WFH

**Response** (201): Attendance record created

---

#### 3.2 Get Attendance Records
```
GET /api/attendance?page=1&limit=20&status=Present
```

**Query Parameters**:
- `page`, `limit`: Pagination
- `status`: Filter by status
- `month`, `year`: Filter by date

**Response** (200): Array of attendance records with pagination

---

#### 3.3 Update Attendance
```
PUT /api/attendance
```

**Request Body**:
```json
{
  "employeeId": "607f1f77bcf86cd799439011",
  "date": "2026-04-16",
  "status": "Late",
  "checkIn": "10:00",
  "checkOut": "18:00"
}
```

**Response** (200): Updated attendance record

---

#### 3.4 Get Activity Feed
```
GET /api/attendance/activities?page=1&limit=10
```

**Response** (200): Recent attendance activities

---

### 💰 FOLDER 4: PAYROLL MANAGEMENT (5 Endpoints)

#### 4.1 Generate Payroll
```
POST /api/payroll/generate
Authorization: Bearer {{token}}
```

**Request Body**:
```json
{
  "month": 4,
  "year": 2026
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Payroll generated successfully",
  "data": {
    "generated": 10,
    "errors": []
  }
}
```

---

#### 4.2 Get Payroll Records
```
GET /api/payroll?page=1&limit=10&status=Pending&month=4&year=2026
```

**Query Parameters**:
- `page`, `limit`: Pagination
- `status`: Pending or Paid
- `month`, `year`: Filter by month/year

---

#### 4.3 Get Payslip
```
GET /api/payroll/payslip/:payrollId
```

**Or by employee & month**:
```
GET /api/payroll/payslip?employeeId=:id&month=4&year=2026
```

**Response**: Complete payslip with breakdown

---

#### 4.4 Mark as Paid
```
PUT /api/payroll/pay/:payrollId
Authorization: Bearer {{token}}
```

**Response** (200): Status changed to "Paid"

---

#### 4.5 Approve All Payroll
```
PUT /api/payroll/approve
Authorization: Bearer {{token}}
```

**Response** (200): All pending payroll approved

---

### 🗓️ FOLDER 5: LEAVE MANAGEMENT (7 Endpoints) ⭐ NEW

#### 5.1 Request Leave
```
POST /api/leave/create
```

**Request Body**:
```json
{
  "employeeId": "607f1f77bcf86cd799439011",
  "leaveType": "Casual Leave",
  "startDate": "2026-04-20",
  "endDate": "2026-04-22",
  "reason": "Family event",
  "numberOfDays": 3
}
```

**Leave Types**:
- Casual Leave
- Sick Leave
- Earned Leave
- Unpaid Leave
- Maternity Leave
- Paternity Leave

**Response** (201): Leave request created

---

#### 5.2 Get All Leaves
```
GET /api/leave?page=1&limit=10&status=Pending&employeeId=:employeeId
```

**Query Parameters**:
- `page`, `limit`: Pagination
- `status`: Pending, Approved, Rejected, Cancelled
- `employeeId`: Filter by employee

---

#### 5.3 Get Leave by ID
```
GET /api/leave/:leaveId
```

**Response**: Leave request details with approval status

---

#### 5.4 Update Leave
```
PUT /api/leave/:leaveId
```

**Request Body** (only for Pending leaves):
```json
{
  "startDate": "2026-04-21",
  "endDate": "2026-04-23",
  "numberOfDays": 3
}
```

---

#### 5.5 Approve/Reject Leave
```
PUT /api/leave/approve/:leaveId
Authorization: Bearer {{token}}
```

**Request Body**:
```json
{
  "status": "Approved",
  "remarks": "Approved"
}
```

**Status**: Approved or Rejected

---

#### 5.6 Delete Leave
```
DELETE /api/leave/:leaveId
```

**Response**: Leave request deleted

---

#### 5.7 Check Leave Balance
```
GET /api/leave/balance/:employeeId
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "Casual Leave": 8,
    "Sick Leave": 10,
    "Earned Leave": 12,
    "Unpaid Leave": -1,
    "Maternity Leave": 180,
    "Paternity Leave": 15
  }
}
```

---

### 🎓 FOLDER 6: RECRUITMENT - JOBS (5 Endpoints) ⭐ NEW

#### 6.1 Post Job
```
POST /api/recruitment/job/create
Authorization: Bearer {{token}}
```

**Request Body**:
```json
{
  "title": "Senior Python Developer",
  "description": "We are looking for an experienced Python developer",
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

**Response** (201): Job posting created with status "Open"

---

#### 6.2 Get All Jobs
```
GET /api/recruitment/job?page=1&limit=10&status=Open&department=Engineering
```

**Query Parameters**:
- `status`: Open, Closed, OnHold
- `department`: Filter by department
- `page`, `limit`: Pagination

---

#### 6.3 Get Job by ID
```
GET /api/recruitment/job/:jobId
```

**Response**: Job details with all information

---

#### 6.4 Update Job
```
PUT /api/recruitment/job/:jobId
Authorization: Bearer {{token}}
```

**Request Body**:
```json
{
  "title": "Updated Title",
  "status": "Closed"
}
```

---

#### 6.5 Delete Job
```
DELETE /api/recruitment/job/:jobId
Authorization: Bearer {{token}}
```

---

### 👨‍💼 FOLDER 7: RECRUITMENT - APPLICATIONS (6 Endpoints) ⭐ NEW

#### 7.1 Submit Application
```
POST /api/recruitment/application/submit
```

**Request Body**:
```json
{
  "jobPostingId": "607f1f77bcf86cd799439011",
  "candidateName": "Jane Smith",
  "candidateEmail": "jane@example.com",
  "candidatePhone": "+1-555-0123",
  "candidateResume": "https://example.com/resume.pdf",
  "coverLetter": "I am interested in this position",
  "experience": 6,
  "skills": ["Python", "FastAPI"],
  "currentCompany": "Tech Corp"
}
```

**Response** (201): Application created with status "Applied"

---

#### 7.2 Get All Applications
```
GET /api/recruitment/application?page=1&limit=10&status=Applied
```

**Status Pipeline**:
- Applied
- Screening
- Interview Scheduled
- Interview Completed
- Offer Extended
- Accepted
- Rejected

---

#### 7.3 Get Application by ID
```
GET /api/recruitment/application/:applicationId
```

---

#### 7.4 Update Application Status
```
PUT /api/recruitment/application/:applicationId
Authorization: Bearer {{token}}
```

**Request Body**:
```json
{
  "status": "Interview Scheduled",
  "rating": 4,
  "feedback": "Excellent technical skills"
}
```

**Rating**: 0-5 stars

---

#### 7.5 Delete Application
```
DELETE /api/recruitment/application/:applicationId
Authorization: Bearer {{token}}
```

---

#### 7.6 Get Applications for Job
```
GET /api/recruitment/job/:jobId/applications?page=1&limit=10
```

---

### 🔧 FOLDER 8: UTILITIES (1 Endpoint)

#### 8.1 Health Check
```
GET /api/health
```

**Response** (200):
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-04-16T10:30:00Z"
}
```

---

## 🔑 Environment Variables

### Required Setup
```
baseUrl = http://localhost:3000
token = (obtained after login)
```

### Optional (for reference)
```
userId = (set after register)
employeeId = (set after creating employee)
jobId = (set after posting job)
leaveId = (set after requesting leave)
applicationId = (set after submitting application)
payrollId = (set after generating payroll)
```

---

## 📊 Response Format Standards

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  },
  "timestamp": "2026-04-16T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2026-04-16T10:30:00Z"
}
```

---

## 🎯 HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 201 | Created | Successfully created resource |
| 200 | OK | Successful GET/PUT/DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid token |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 500 | Server Error | Server error |

---

## 🔐 Authentication Pattern

### 1. Get Token
```
1. Register or Login
2. Copy token from response
3. Set in environment: token = <your_token>
```

### 2. Use Token in Requests
```
Authorization: Bearer {{token}}
```

### 3. Authenticated Endpoints
These require Authorization header:
- Create Employee
- Update Employee
- Delete Employee
- Generate Payroll
- Mark as Paid
- Approve All Payroll
- Create Job
- Update Job
- Delete Job
- Update Application Status
- Approve/Reject Leave

---

## 🚀 Workflow Examples

### Complete Onboarding Flow
```
1. Register User
   → Copy User ID
   
2. Create Employee
   → Use User ID from step 1
   → Copy Employee ID
   
3. Mark Attendance
   → Use Employee ID from step 2
   
4. Generate Payroll
   → Uses all employees (requires token)
```

### Recruitment Flow
```
1. Post Job (requires token)
   → Copy Job ID
   
2. Submit Application
   → Use Job ID from step 1
   → Copy Application ID
   
3. Update Application Status (requires token)
   → Use Application ID from step 2
   → Change status to "Interview Scheduled"
```

### Leave Request Flow
```
1. Request Leave
   → Use Employee ID
   → Copy Leave ID
   
2. Approve Leave (requires token)
   → Use Leave ID from step 1
   → Change status to "Approved"
   
3. Check Leave Balance
   → Use Employee ID
```

---

## 🧪 Testing Tips

### 1. Use Variables
```
Replace :employeeId with {{employeeId}}
Replace {{token}} in Authorization header
```

### 2. Copy IDs from Responses
After creating resource, copy `_id` to environment for next requests

### 3. Debug Mode
- Click Inspector icon in Thunder Client
- View full request/response headers
- Check response status and body

### 4. Common Issues

**"401 Unauthorized"**
- Missing token in Authorization header
- Token expired (login again)

**"400 Bad Request"**
- Check request body format
- Verify all required fields present
- Check data types match examples

**"404 Not Found"**
- Verify ID is correct
- Check resource exists
- Copy ID from previous response

**"409 Conflict"**
- Resource already exists
- Use different email/unique identifier
- Check for duplicate application

---

## 📝 Collection Metadata

| Field | Value |
|-------|-------|
| Name | HRMS Platform APIs |
| Version | 2.0 |
| Last Updated | April 16, 2026 |
| Total Endpoints | 36 |
| Total Folders | 8 |
| Base URL | http://localhost:3000 |
| Auth Type | Bearer Token |

---

## ✅ Validation Rules

### User Registration
- ✅ Email format required
- ✅ Password minimum 8 characters
- ✅ Email must be unique

### Employee Creation
- ✅ User ID required
- ✅ Position required
- ✅ Department required
- ✅ Base Salary > 0

### Leave Request
- ✅ Start Date before End Date
- ✅ Employee must exist
- ✅ No overlapping approved leaves
- ✅ Reason minimum 5 characters

### Job Posting
- ✅ Title minimum 3 characters
- ✅ Description minimum 10 characters
- ✅ Salary min < Salary max

### Application
- ✅ Email format required
- ✅ Phone format required (mobile)
- ✅ No duplicate (same candidate + job)

---

## 🎓 Reference Links

- **API Docs**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/health
- **Setup Guide**: THUNDER-CLIENT-SETUP.md
- **Test Checklist**: TEST-CHECKLIST.md
- **Main README**: README.md

---

## 🆘 Support

**Issue**: Don't know which endpoint to use?
- Check THUNDER-CLIENT-SETUP.md for detailed workflows

**Issue**: Want to see all API details?
- Open http://localhost:3000/api-docs in browser

**Issue**: Want to test step-by-step?
- Follow TEST-CHECKLIST.md for guided testing

**Issue**: Server not running?
- Run: `npm run dev` in backend folder
- Check: http://localhost:3000/api/health

---

**Status**: ✅ Ready to Test
**Date**: April 16, 2026
**Version**: 2.0
