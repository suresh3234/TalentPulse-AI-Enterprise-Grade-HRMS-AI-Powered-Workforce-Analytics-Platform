# Frontend API Integration

This frontend is built with React + Vite and consumes the backend through a shared Axios client.

## Environment

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## API Layer

- `src/api/axiosInstance.js`
  Shared base URL, credentials, auth header, and error parsing
- `src/api/authService.js`
  Authentication requests
- `src/api/employeeService.js`
  Employee and user requests
- `src/api/attendanceService.js`
  Attendance and activity requests
- `src/api/payrollService.js`
  Payroll requests

## Pages Connected To APIs

- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Employees.jsx`
- `src/pages/Attendance.jsx`
- `src/components/Activity.jsx`

## Run

```bash
npm install
npm run dev
```
