import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Employees = lazy(() => import("./pages/Employees"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Performance = lazy(() => import("./pages/Performance"));
const Training = lazy(() => import("./pages/Training"));
const Benefits = lazy(() => import("./pages/Benefits"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Offboarding = lazy(() => import("./pages/Offboarding"));
const OrgChart = lazy(() => import("./pages/OrgChart"));
const RecruitmentAi = lazy(() => import("./pages/RecuirmentAi"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Leave = lazy(() => import("./pages/leave"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Settings = lazy(() => import("./pages/Settings"));
const DevOpsMonitor = lazy(() => import("./pages/DevOpsMonitor"));
const JobOpenings = lazy(() => import("./pages/recruitment/JobOpenings"));
const AddJob = lazy(() => import("./pages/recruitment/AddJob"));
const EditJob = lazy(() => import("./pages/recruitment/EditJob"));
const CandidateInterview = lazy(() => import("./pages/recruitment/CandidateInterview"));
const InterviewRoom = lazy(() => import("./features/interview/InterviewRoom"));
const ScreeningPage = lazy(() => import("./features/screening/ScreeningPage"));
const InterviewDashboard = lazy(() => import("./features/interview/InterviewDashboard"));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-xl border border-gray-250 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
        Loading page...
      </div>
    </div>
  );
}

function Layout({ children }) {
  const location = useLocation();
  const hideLayout = ["/login", "/register", "/forgot"].includes(location.pathname) || location.pathname.startsWith("/candidate/interview");

  if (hideLayout) {
    return children;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-sidebar">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50/50">{children}</main>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Layout>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public Authentication Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />

          {/* Protected General Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave"
            element={
              <ProtectedRoute>
                <Leave />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <ProtectedRoute>
                <Payroll />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute>
                <Performance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training"
            element={
              <ProtectedRoute>
                <Training />
              </ProtectedRoute>
            }
          />
          <Route
            path="/benefits"
            element={
              <ProtectedRoute>
                <Benefits />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/offboarding"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr", "manager"]}>
                <Offboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/org-chart"
            element={
              <ProtectedRoute>
                <OrgChart />
              </ProtectedRoute>
            }
          />

          {/* Protected Role-Restricted Routes */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager"]}>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={["admin", "manager", "recruiter"]}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitment"
            element={
              <ProtectedRoute allowedRoles={["admin", "recruiter"]}>
                <RecruitmentAi />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitment/jobs"
            element={
              <ProtectedRoute allowedRoles={["admin", "recruiter"]}>
                <JobOpenings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitment/jobs/create"
            element={
              <ProtectedRoute allowedRoles={["admin", "recruiter"]}>
                <AddJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitment/jobs/edit/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "recruiter"]}>
                <EditJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruitment/interviews"
            element={
              <ProtectedRoute allowedRoles={["admin", "hr", "recruiter", "manager"]}>
                <InterviewDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/interview/live"
            element={<InterviewRoom />}
          />
          <Route
            path="/screening/:token"
            element={<ScreeningPage />}
          />
          <Route
            path="/candidate/interview/:applicationId"
            element={<CandidateInterview />}
          />
          <Route
            path="/devops"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DevOpsMonitor />
              </ProtectedRoute>
            }
          />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
