# ⚡ Thunder Client Setup Guide - HRMS Platform APIs

## 📱 Quick Import (2 Steps)

### Step 1: Import Collection
1. Open **Thunder Client** extension in VS Code
2. Click **Collections** (left sidebar)
3. Click **Import** button
4. Select: `backend/HRMS-API.json`
5. Click **Import**

### Step 2: Set Environment Variables
1. Go to **Environments** tab
2. Create new environment or use default
3. Set these variables:
   ```
   baseUrl = http://localhost:3000
   token = (leave empty for now)
   ```

✅ **Done! Ready to test**

---

## 🔐 Authentication Workflow

### 1️⃣ Register New User
**Folder**: 1. Authentication → **Register User**

**Request Details:**
```
Method: POST
URL: http://localhost:3000/api/users/register
```

**Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "user_id_here",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "employee"
  },
  "timestamp": "2026-04-16T10:30:00Z"
}
```

---

### 2️⃣ Login User
**Folder**: 1. Authentication → **Login User**

**Request Details:**
```
Method: POST
URL: http://localhost:3000/api/users/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "user_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "employee"
    }
  },
  "timestamp": "2026-04-16T10:30:00Z"
}
```

**⚠️ Important**: Copy the `token` value and set it in Environment Variables:
- Go to **Environments**
- Set `token = <your_token_here>`

---

## 👥 Employee Management

### 3️⃣ Create Employee
**Folder**: 2. Employee Management → **Create Employee**

**Requirements:**
- ✅ Bearer token required (add to header)
- ✅ First create a user, then use that user ID

**Request Details:**
```
Method: POST
URL: http://localhost:3000/api/employees/create
Authorization: Bearer {{token}}
```

**Body:**
```json
{
  "user": "PASTE_USER_ID_HERE",
  "position": "Software Developer",
  "baseSalary": 50000,
  "allowances": 5000,
  "department": "Engineering",
  "role": "Developer"
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "_id": "employee_id",
    "user": "user_id",
    "position": "Software Developer",
    "baseSalary": 50000,
    "allowances": 5000,
    "department": "Engineering",
    "role": "Developer",
    "status": "Active",
    "joiningDate": "2026-04-16"
  }
}
```

### 4️⃣ Get All Employees
**Folder**: 2. Employee Management → **Get All Employees**

```
Method: GET
URL: http://localhost:3000/api/employees?page=1&limit=10&department=Engineering&status=Active
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 10)
- `department` - Filter by department
- `status` - Filter by status (Active/Inactive)

### 5️⃣ Get Employee by ID
**Folder**: 2. Employee Management → **Get Employee by ID**

```
Method: GET
URL: http://localhost:3000/api/employees/:employeeId
```

Replace `:employeeId` with actual employee ID

### 6️⃣ Update Employee
**Folder**: 2. Employee Management → **Update Employee**

```
Method: PUT
URL: http://localhost:3000/api/employees/:employeeId
Authorization: Bearer {{token}}
```

**Body:**
```json
{
  "position": "Senior Developer",
  "baseSalary": 60000
}
```

### 7️⃣ Delete Employee
**Folder**: 2. Employee Management → **Delete Employee**

```
Method: DELETE
URL: http://localhost:3000/api/employees/:employeeId
Authorization: Bearer {{token}}
```

### 8️⃣ Get Employee Stats
**Folder**: 2. Employee Management → **Get Employee Stats**

```
Method: GET
URL: http://localhost:3000/api/employees/stats
```

---

## 📋 Attendance Management

### 9️⃣ Mark Attendance
**Folder**: 3. Attendance Management → **Mark Attendance**

```
Method: POST
URL: http://localhost:3000/api/attendance/create
```

**Body:**
```json
{
  "employeeId": "PASTE_EMPLOYEE_ID",
  "date": "2026-04-16",
  "status": "Present",
  "checkIn": "09:00",
  "checkOut": "18:00"
}
```

**Status Options:** Present, Absent, Late, Leave, WFH

### 🔟 Get Attendance Records
**Folder**: 3. Attendance Management → **Get Attendance**

```
Method: GET
URL: http://localhost:3000/api/attendance?page=1&limit=20&status=Present
```

**Query Parameters:**
- `page` - Page number
- `limit` - Records per page
- `status` - Filter by status
- `month` - Filter by month
- `year` - Filter by year

### 1️⃣1️⃣ Update Attendance
**Folder**: 3. Attendance Management → **Update Attendance**

```
Method: PUT
URL: http://localhost:3000/api/attendance
```

**Body:**
```json
{
  "employeeId": "employee_id",
  "date": "2026-04-16",
  "status": "Late",
  "checkIn": "10:00",
  "checkOut": "18:00"
}
```

### 1️⃣2️⃣ Get Activity Feed
**Folder**: 3. Attendance Management → **Get Activity Feed**

```
Method: GET
URL: http://localhost:3000/api/attendance/activities?page=1&limit=10
```

---

## 💰 Payroll Management

### 1️⃣3️⃣ Generate Payroll
**Folder**: 4. Payroll Management → **Generate Payroll**

**Requirements:**
- ✅ Bearer token required
- ✅ Generates payroll for all employees

```
Method: POST
URL: http://localhost:3000/api/payroll/generate
Authorization: Bearer {{token}}
```

**Body:**
```json
{
  "month": 4,
  "year": 2026
}
```

### 1️⃣4️⃣ Get Payroll Records
**Folder**: 4. Payroll Management → **Get Payroll**

```
Method: GET
URL: http://localhost:3000/api/payroll?page=1&limit=10&status=Pending&month=4&year=2026
```

### 1️⃣5️⃣ Get Payslip
**Folder**: 4. Payroll Management → **Get Payslip**

```
Method: GET
URL: http://localhost:3000/api/payroll/payslip/:payrollId
```

Or by employee ID and month:
```
Method: GET
URL: http://localhost:3000/api/payroll/payslip?employeeId=:employeeId&month=4&year=2026
```

### 1️⃣6️⃣ Mark as Paid
**Folder**: 4. Payroll Management → **Mark as Paid**

```
Method: PUT
URL: http://localhost:3000/api/payroll/pay/:payrollId
Authorization: Bearer {{token}}
```

### 1️⃣7️⃣ Approve All Payroll
**Folder**: 4. Payroll Management → **Approve All Payroll**

```
Method: PUT
URL: http://localhost:3000/api/payroll/approve
Authorization: Bearer {{token}}
```

---

## 🗓️ Leave Management

### 1️⃣8️⃣ Request Leave
**Folder**: 5. Leave Management → **Request Leave**

```
Method: POST
URL: http://localhost:3000/api/leave/create
```

**Body:**
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

**Leave Types:**
- Casual Leave
- Sick Leave
- Earned Leave
- Unpaid Leave
- Maternity Leave
- Paternity Leave

### 1️⃣9️⃣ Get All Leaves
**Folder**: 5. Leave Management → **Get All Leaves**

```
Method: GET
URL: http://localhost:3000/api/leave?page=1&limit=10&status=Pending&employeeId=:employeeId
```

**Status Options:** Pending, Approved, Rejected, Cancelled

### 2️⃣0️⃣ Get Leave by ID
**Folder**: 5. Leave Management → **Get Leave by ID**

```
Method: GET
URL: http://localhost:3000/api/leave/:leaveId
```

### 2️⃣1️⃣ Update Leave
**Folder**: 5. Leave Management → **Update Leave**

```
Method: PUT
URL: http://localhost:3000/api/leave/:leaveId
```

**Body:** (Only Pending leaves can be updated)
```json
{
  "startDate": "2026-04-21",
  "endDate": "2026-04-23",
  "numberOfDays": 3
}
```

### 2️⃣2️⃣ Approve/Reject Leave
**Folder**: 5. Leave Management → **Approve Leave**

**Requirements:**
- ✅ Bearer token required (Admin/Manager)

```
Method: PUT
URL: http://localhost:3000/api/leave/approve/:leaveId
Authorization: Bearer {{token}}
```

**Body:**
```json
{
  "status": "Approved",
  "remarks": "Approved - Enjoy your leave"
}
```

Status: `Approved` or `Rejected`

### 2️⃣3️⃣ Delete Leave
**Folder**: 5. Leave Management → **Delete Leave**

```
Method: DELETE
URL: http://localhost:3000/api/leave/:leaveId
```

### 2️⃣4️⃣ Check Leave Balance
**Folder**: 5. Leave Management → **Check Leave Balance**

```
Method: GET
URL: http://localhost:3000/api/leave/balance/:employeeId
```

---

## 🎓 Recruitment System

### 2️⃣5️⃣ Post Job
**Folder**: 6. Recruitment - Jobs → **Post Job**

**Requirements:**
- ✅ Bearer token required

```
Method: POST
URL: http://localhost:3000/api/recruitment/job/create
Authorization: Bearer {{token}}
```

**Body:**
```json
{
  "title": "Senior Python Developer",
  "description": "We are looking for an experienced Python developer...",
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

### 2️⃣6️⃣ Get All Jobs
**Folder**: 6. Recruitment - Jobs → **Get All Jobs**

```
Method: GET
URL: http://localhost:3000/api/recruitment/job?page=1&limit=10&status=Open&department=Engineering
```

### 2️⃣7️⃣ Get Job by ID
**Folder**: 6. Recruitment - Jobs → **Get Job by ID**

```
Method: GET
URL: http://localhost:3000/api/recruitment/job/:jobId
```

### 2️⃣8️⃣ Update Job
**Folder**: 6. Recruitment - Jobs → **Update Job**

```
Method: PUT
URL: http://localhost:3000/api/recruitment/job/:jobId
Authorization: Bearer {{token}}
```

**Body:**
```json
{
  "title": "Senior Python Developer (Updated)",
  "status": "Closed"
}
```

### 2️⃣9️⃣ Delete Job
**Folder**: 6. Recruitment - Jobs → **Delete Job**

```
Method: DELETE
URL: http://localhost:3000/api/recruitment/job/:jobId
Authorization: Bearer {{token}}
```

### 3️⃣0️⃣ Submit Application
**Folder**: 7. Recruitment - Applications → **Submit Application**

```
Method: POST
URL: http://localhost:3000/api/recruitment/application/submit
```

**Body:**
```json
{
  "jobPostingId": "PASTE_JOB_ID",
  "candidateName": "Jane Smith",
  "candidateEmail": "jane@example.com",
  "candidatePhone": "+1-555-0123",
  "candidateResume": "https://example.com/resume.pdf",
  "coverLetter": "I am very interested in this position...",
  "experience": 6,
  "skills": ["Python", "FastAPI"],
  "currentCompany": "Tech Corp"
}
```

### 3️⃣1️⃣ Get All Applications
**Folder**: 7. Recruitment - Applications → **Get All Applications**

```
Method: GET
URL: http://localhost:3000/api/recruitment/application?page=1&limit=10&status=Applied
```

**Status Options:**
- Applied
- Screening
- Interview Scheduled
- Interview Completed
- Offer Extended
- Accepted
- Rejected

### 3️⃣2️⃣ Get Application by ID
**Folder**: 7. Recruitment - Applications → **Get Application by ID**

```
Method: GET
URL: http://localhost:3000/api/recruitment/application/:applicationId
```

### 3️⃣3️⃣ Update Application Status
**Folder**: 7. Recruitment - Applications → **Update Application Status**

**Requirements:**
- ✅ Bearer token required (Recruiter/Admin)

```
Method: PUT
URL: http://localhost:3000/api/recruitment/application/:applicationId
Authorization: Bearer {{token}}
```

**Body:**
```json
{
  "status": "Interview Scheduled",
  "rating": 4,
  "feedback": "Great technical background, schedule interview"
}
```

### 3️⃣4️⃣ Delete Application
**Folder**: 7. Recruitment - Applications → **Delete Application**

```
Method: DELETE
URL: http://localhost:3000/api/recruitment/application/:applicationId
Authorization: Bearer {{token}}
```

### 3️⃣5️⃣ Get Job Applications
**Folder**: 7. Recruitment - Applications → **Get Job Applications**

```
Method: GET
URL: http://localhost:3000/api/recruitment/job/:jobId/applications?page=1&limit=10
```

---

## ✅ Complete Testing Workflow

### Workflow 1: Employee Onboarding
```
1. Register User (Authentication)
2. Create Employee (Employee Management)
3. Mark Attendance (Attendance)
4. Generate Payroll (Payroll)
```

### Workflow 2: Leave Request
```
1. Request Leave (Leave Management)
2. List Leaves (Leave Management)
3. Approve Leave (Leave Management - requires token)
4. Check Balance (Leave Management)
```

### Workflow 3: Recruitment
```
1. Post Job (Recruitment - Jobs, requires token)
2. Get All Jobs (Recruitment - Jobs)
3. Submit Application (Recruitment - Applications)
4. List Applications (Recruitment - Applications)
5. Update Application Status (Recruitment - Applications, requires token)
```

---

## 🔗 Response Format

### Success Response (200-201)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* object or array */ },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50
  },
  "timestamp": "2026-04-16T10:30:00Z"
}
```

### Error Response (400-500)
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2026-04-16T10:30:00Z"
}
```

### Common Status Codes
- ✅ **201** - Created
- ✅ **200** - OK
- ❌ **400** - Bad Request (validation error)
- ❌ **401** - Unauthorized (missing/invalid token)
- ❌ **404** - Not Found
- ❌ **409** - Conflict (duplicate)
- ❌ **500** - Server Error

---

## 🎯 Tips & Tricks

### 1. Save Token for Next Requests
After login, copy token from response and set it in:
- **Environments** → `token` variable

### 2. Use Variables in URLs
```
{{baseUrl}}/api/employees/:employeeId
{{token}} in Authorization header
```

### 3. Common Issues & Solutions

**Issue**: `401 Unauthorized`
- **Solution**: Make sure you logged in and copied the token

**Issue**: `400 Bad Request`
- **Solution**: Check request body format matches examples

**Issue**: `404 Not Found`
- **Solution**: Verify the ID is correct (copy from previous response)

**Issue**: `409 Conflict`
- **Solution**: Email already exists, use different email

### 4. Debug Mode
Enable request/response inspection:
- Click **Inspector** icon in Thunder Client
- View full request/response headers

### 5. Save Custom Variables
Add to environment for quick reference:
```
employeeId = (fill after creating employee)
userId = (fill after registering user)
jobId = (fill after posting job)
token = (fill after login)
```

---

## 📱 Environment Setup

### Create Environment in Thunder Client

1. Click **Environments** tab
2. Click **Create**
3. Name: `HRMS Development`
4. Add variables:

```
baseUrl: http://localhost:3000
token: (leave empty initially)
userId: (leave empty)
employeeId: (leave empty)
jobId: (leave empty)
leaveId: (leave empty)
applicationId: (leave empty)
```

Then update them as you create resources.

---

## 🚀 Ready to Test!

You now have:
- ✅ 36 pre-configured API requests
- ✅ All authentication workflows
- ✅ Complete CRUD operations
- ✅ Example request/response bodies
- ✅ Error handling scenarios

**Start testing now!** 🎉
