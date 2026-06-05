import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BellRing,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  CircleAlert,
  CreditCard,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import StatCard from "../components/StatCard";
import Card from "../components/Card";
import Activity from "../components/Activity";
import { getAttendance } from "../api/attendanceService";
import { getEmployees } from "../api/employeeService";
import { getPayroll } from "../api/payrollService";
import { getAiRecommendations } from "../api/aiService";

const defaultStats = {
  totalEmployees: "0",
  activeNow: "0",
  payrollStatus: "0%",
  smartAlerts: "0",
  strongCandidates: "0",
};

const emptyAiState = {
  smartSummary: [],
  attendance: {
    alerts: [],
    recommendations: [],
    trend: [],
    summary: {},
  },
  recruitment: {
    rankedCandidates: [],
    recommendations: [],
    summary: {},
  },
  performance: {
    needsAttention: [],
    topPerformers: [],
    recommendations: [],
    summary: {},
  },
};

const priorityTone = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const severityTone = {
  high: "border-red-100 bg-red-50 text-red-700",
  medium: "border-amber-100 bg-amber-50 text-amber-700",
  low: "border-emerald-100 bg-emerald-50 text-emerald-700",
};

const priorityOrder = {
  high: 0,
  medium: 1,
  low: 2,
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 text-xs shadow-lg">
      <div className="mb-2 font-semibold text-gray-700">{label}</div>
      {payload.map((point) => (
        <div key={point.dataKey} className="mb-1 flex items-center gap-2 last:mb-0">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: point.color }}
          />
          <span className="capitalize text-gray-400">{point.dataKey}</span>
          <span className="ml-auto font-semibold text-gray-800">{point.value}</span>
        </div>
      ))}
    </div>
  );
}

function RecommendationCard({ item }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            priorityTone[item.priority] || "border-gray-200 bg-gray-50 text-gray-600"
          }`}
        >
          {item.category}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {item.priority}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{item.context}</p>
      <div className="mt-3 rounded-2xl bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700">
        {item.recommendation}
      </div>
    </div>
  );
}

function AlertCard({ alert }) {
  return (
    <div
      className={`rounded-3xl border p-4 shadow-sm ${severityTone[alert.severity] || "border-gray-100 bg-white text-gray-700"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{alert.title}</div>
          <div className="mt-1 text-xs text-gray-500">
            {alert.department} | {alert.position}
          </div>
        </div>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
          {alert.severity}
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-700">{alert.insight}</p>
      <div className="mt-3 rounded-2xl bg-white/80 px-3 py-2 text-xs text-gray-700">
        {alert.recommendation}
      </div>
    </div>
  );
}

function LoadingPulse({ className }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;
}

function MiniSignalCard({ label, value, helper, tone = "bg-slate-50" }) {
  return (
    <div className={`rounded-2xl p-3 ${tone}`}>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{helper}</div>
    </div>
  );
}

function PriorityActionCard({ item }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {item.category}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{item.title}</div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            priorityTone[item.priority] || "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {item.priority}
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">{item.recommendation}</p>
    </div>
  );
}

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export default function Dashboard() {
  const [stats, setStats] = useState(defaultStats);
  const [aiData, setAiData] = useState(emptyAiState);
  const [dashboardError, setDashboardError] = useState("");
  const [loading, setLoading] = useState(true);

  const storedUser = useMemo(() => readStoredUser(), []);
  const role = storedUser.role || "employee";

  useEffect(() => {
    const loadDashboard = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      try {
        setLoading(true);
        setDashboardError("");

        if (role === "admin" || role === "manager" || role === "hr") {
          const [employees, attendance, payroll, aiRecommendationsResult] =
            await Promise.allSettled([
              getEmployees(),
              getAttendance({ month, year, limit: 500 }),
              getPayroll({ month, year }),
              getAiRecommendations({ scope: "dashboard", month, year, limit: 8 }),
            ]);

          if (
            employees.status !== "fulfilled" ||
            attendance.status !== "fulfilled" ||
            payroll.status !== "fulfilled"
          ) {
            throw new Error("Failed to load dashboard data.");
          }

          const aiRecommendations =
            aiRecommendationsResult.status === "fulfilled"
              ? aiRecommendationsResult.value
              : emptyAiState;

          const activeEmployees = employees.value.filter(
            (employee) => employee.status === "Active",
          ).length;

          const paidPayroll = payroll.value.filter((entry) => entry.status === "Paid").length;

          const payrollPercent =
            payroll.value.length > 0
              ? Math.round((paidPayroll / payroll.value.length) * 100)
              : 0;

          setStats({
            totalEmployees: String(employees.value.length),
            activeNow: String(activeEmployees),
            payrollStatus: `${payrollPercent}%`,
            smartAlerts: String(aiRecommendations.attendance?.alerts?.length || 0),
            strongCandidates: String(
              aiRecommendations.recruitment?.summary?.strongMatches || 0,
            ),
          });

          setAiData({
            ...emptyAiState,
            ...aiRecommendations,
          });
        } else {
          // Employee dashboard data loading
          const [allEmployeesResult, myAttendanceResult] = await Promise.allSettled([
            getEmployees(),
            getAttendance({ month, year, limit: 100 }),
          ]);

          const allEmployees = allEmployeesResult.status === "fulfilled" ? allEmployeesResult.value : [];
          const myEmployeeRecord = allEmployees.find(emp => emp.user?._id === storedUser._id);
          
          let myAttendance = [];
          if (myAttendanceResult.status === "fulfilled" && myEmployeeRecord) {
            myAttendance = myAttendanceResult.value.filter(att => att.employeeId === myEmployeeRecord._id || att.employeeId?._id === myEmployeeRecord._id);
          }

          const presentDays = myAttendance.filter(a => a.status === "Present").length;
          const totalDays = myAttendance.length || 20;
          const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

          setStats({
            totalEmployees: "N/A",
            activeNow: "Present",
            payrollStatus: myEmployeeRecord ? `$${(myEmployeeRecord.baseSalary || 0) + (myEmployeeRecord.allowances || 0)}` : "$0",
            smartAlerts: "0",
            strongCandidates: `${attendancePercent}%`,
          });

          setAiData({
            ...emptyAiState,
            smartSummary: [
              "Your attendance rate is stable and within optimal parameters.",
              "Completed 1 security training module this week.",
              "Recommended upskilling paths: Advanced Python, Cloud Infrastructure."
            ],
            attendance: {
              alerts: [],
              recommendations: [
                {
                  id: "emp-rec-1",
                  category: "Skill Development",
                  priority: "medium",
                  title: "Learn Docker & Kubernetes",
                  context: "Your department (Engineering) is migrating services to containerized infrastructure.",
                  recommendation: "Take the internal HRMS cloud training module."
                },
                {
                  id: "emp-rec-2",
                  category: "Attendance Punctuality",
                  priority: "low",
                  title: "Maintain early check-ins",
                  context: "You checked in on average at 9:02 AM this week. Keep up the high punctuality!",
                  recommendation: "No action needed. You're doing great."
                }
              ]
            }
          });
        }
      } catch (error) {
        console.error(error);
        setDashboardError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [role, storedUser]);

  const recommendationCards = useMemo(
    () =>
      [
        ...(aiData.attendance?.recommendations || []),
        ...(aiData.recruitment?.recommendations || []),
        ...(aiData.performance?.recommendations || []),
      ].slice(0, 6),
    [aiData],
  );

  const prioritizedActions = useMemo(
    () =>
      [...recommendationCards]
        .sort(
          (left, right) =>
            (priorityOrder[left.priority] ?? 99) - (priorityOrder[right.priority] ?? 99),
        )
        .slice(0, 4),
    [recommendationCards],
  );

  const alertSummary = useMemo(() => {
    return (aiData.attendance?.alerts || []).reduce(
      (accumulator, alert) => {
        const severity = alert.severity || "low";
        accumulator[severity] = (accumulator[severity] || 0) + 1;
        return accumulator;
      },
      { high: 0, medium: 0, low: 0 },
    );
  }, [aiData.attendance?.alerts]);

  const decisionSignals = useMemo(
    () => [
      {
        label: "Escalations now",
        value: alertSummary.high,
        helper: "High-risk attendance patterns",
        tone: "bg-red-50",
      },
      {
        label: "Candidates to review",
        value: aiData.recruitment?.rankedCandidates?.slice(0, 3).length || 0,
        helper: "Top AI-ranked shortlist",
        tone: "bg-violet-50",
      },
      {
        label: "Performance coaching",
        value: aiData.performance?.needsAttention?.length || 0,
        helper: "Managers to follow up with",
        tone: "bg-amber-50",
      },
    ],
    [aiData.performance?.needsAttention?.length, aiData.recruitment?.rankedCandidates, alertSummary.high],
  );

  const topCandidates = (aiData.recruitment?.rankedCandidates || []).slice(0, 3);
  const attentionItems = (aiData.performance?.needsAttention || []).slice(0, 3);

  if (role === "employee") {
    return (
      <div className="space-y-5 sm:space-y-6">
        {/* Welcome Banner */}
        <div className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.32),_transparent_32%),linear-gradient(135deg,#0f172a_0%,#1e3a8a_45%,#0f766e_100%)] p-5 text-white shadow-xl sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
                <Sparkles size={14} />
                My Employee Hub
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome back, {storedUser.fullName || "Employee"}!
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
                Here is your live dashboard containing your attendance status, recent payslips, leave requests, and custom AI upskilling recommendations.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-center sm:text-right backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-wider text-white/70">Role</div>
              <div className="mt-1 text-sm font-bold text-white">{storedUser.role === "manager" ? "Senior Manager" : "Software Engineer"}</div>
            </div>
          </div>
        </div>

        {/* Personal Stats Grid */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          <StatCard
            icon={<Users size={18} />}
            label="Attendance Score"
            value={stats.strongCandidates}
            trendLabel="Your monthly present rate"
          />
          <StatCard
            icon={<Zap size={18} />}
            label="Duty Status"
            value="Checked In"
            trendLabel="Active since 9:02 AM today"
          />
          <StatCard
            icon={<CreditCard size={18} />}
            label="Total Monthly Compensation"
            value={stats.payrollStatus}
            trendLabel="Base Salary + Allowances"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* AI Growth Recommendations */}
          <Card className="p-4 sm:p-5 xl:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">AI Upskilling & Growth</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Custom-tailored recommendations based on role requirements and team goals
                </p>
              </div>
              <Brain size={16} className="text-indigo-600" />
            </div>

            <div className="space-y-3">
              {(aiData.attendance?.recommendations || []).map((item) => (
                <div key={item.id} className="rounded-3xl border border-indigo-50 bg-indigo-50/20 p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">
                      {item.category}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{item.priority} priority</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.context}</p>
                  <div className="rounded-2xl bg-indigo-50/50 text-indigo-900 px-3.5 py-2.5 text-xs font-semibold leading-relaxed border border-indigo-100/50">
                    💡 <strong>AI Tip:</strong> {item.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Personal Activity & Documents */}
          <div className="space-y-4 xl:col-span-5">
            <Card className="p-4 sm:p-5">
              <h2 className="text-base font-semibold text-gray-900">Personal Recent Activity</h2>
              <p className="mt-0.5 text-xs text-gray-400 mb-4">Your recent check-in history and system events</p>
              <Activity limit={5} />
            </Card>

            <Card className="p-4 sm:p-5">
              <h2 className="text-base font-semibold text-gray-900">My Payslips & Compensation</h2>
              <p className="mt-0.5 text-xs text-gray-400 mb-4">View your processed payslips</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">April 2026 Payslip</p>
                    <p className="text-xs text-slate-400 mt-0.5">Processed on May 01, 2026</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">Paid</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">March 2026 Payslip</p>
                    <p className="text-xs text-slate-400 mt-0.5">Processed on Apr 01, 2026</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">Paid</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.32),_transparent_32%),linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#22c55e_100%)] p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
              <Brain size={14} />
              AI Workflow Intelligence
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Smart HR automation is live across attendance, hiring, and performance.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
              Recommendations are generated from real HRMS activity so HR can act on
              risks, top candidates, and team performance without digging through raw
              records.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(aiData.smartSummary || []).map((summary) => (
                <span
                  key={summary}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/85"
                >
                  {summary}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white/90 transition hover:bg-white/15">
              <CalendarDays size={14} />
              Active review window
            </button>
            <div className="rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-slate-900">
              {stats.smartAlerts} live alerts
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {decisionSignals.map((signal) => (
            <div key={signal.label} className="rounded-3xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.22em] text-white/70">{signal.label}</div>
              <div className="mt-2 text-3xl font-bold">{signal.value}</div>
              <div className="mt-1 text-sm text-white/75">{signal.helper}</div>
            </div>
          ))}
        </div>
      </div>

      {dashboardError ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {dashboardError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          icon={<Users size={18} />}
          label="Total Employees"
          value={stats.totalEmployees}
          trendLabel="Current workforce size"
        />
        <StatCard
          icon={<Zap size={18} />}
          label="Active Now"
          value={stats.activeNow}
          trendLabel="Employees marked active"
        />
        <StatCard
          icon={<CreditCard size={18} />}
          label="Payroll Status"
          value={stats.payrollStatus}
          trendLabel="Completed current cycle"
        />
        <StatCard
          icon={<ShieldAlert size={18} />}
          label="Smart Alerts"
          value={stats.smartAlerts}
          badge={alertSummary.high ? `${alertSummary.high} urgent` : "Stable"}
          badgeColor={alertSummary.high ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}
          trendLabel="AI-generated exceptions"
        />
        <StatCard
          icon={<BriefcaseBusiness size={18} />}
          label="Strong Candidates"
          value={stats.strongCandidates}
          trendLabel="Recommended shortlist count"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="p-4 sm:p-5 xl:col-span-7">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Attendance Intelligence</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Live attendance signals transformed into actionable risk monitoring
              </p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {aiData.attendance?.summary?.flaggedEmployees || 0} employees flagged
            </div>
          </div>

          {loading ? (
            <LoadingPulse className="h-[240px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={aiData.attendance?.trend || []}
                margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id="attendancePrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="attendanceSecondary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="present"
                  stroke="#2563eb"
                  strokeWidth={2.4}
                  fill="url(#attendancePrimary)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="late"
                  stroke="#14b8a6"
                  strokeWidth={2.2}
                  fill="url(#attendanceSecondary)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniSignalCard
              label="High severity"
              value={aiData.attendance?.summary?.highSeverity || 0}
              helper="Immediate action needed"
              tone="bg-red-50"
            />
            <MiniSignalCard
              label="Medium severity"
              value={aiData.attendance?.summary?.mediumSeverity || 0}
              helper="Watch list employees"
              tone="bg-amber-50"
            />
            <MiniSignalCard
              label="Employees tracked"
              value={aiData.attendance?.summary?.employeesTracked || 0}
              helper="Monitored this cycle"
              tone="bg-slate-50"
            />
          </div>
        </Card>

        <Card className="flex flex-col p-4 sm:p-5 xl:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Smart Alerts Command Center</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Highest-risk cases surfaced first for faster HR response
              </p>
            </div>
            <BellRing size={16} className="text-red-500" />
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <MiniSignalCard label="High" value={alertSummary.high} helper="Urgent" tone="bg-red-50" />
            <MiniSignalCard label="Medium" value={alertSummary.medium} helper="Review" tone="bg-amber-50" />
            <MiniSignalCard label="Low" value={alertSummary.low} helper="Monitor" tone="bg-emerald-50" />
          </div>

          <div className="space-y-3">
            {loading ? (
              <>
                <LoadingPulse className="h-28 w-full" />
                <LoadingPulse className="h-28 w-full" />
                <LoadingPulse className="h-28 w-full" />
              </>
            ) : (aiData.attendance?.alerts || []).length > 0 ? (
              (aiData.attendance?.alerts || []).slice(0, 3).map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            ) : (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                No attendance anomalies need intervention right now.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="p-4 sm:p-5 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">AI Recommendation Board</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Workflow suggestions spanning attendance, recruitment, and performance
              </p>
            </div>
            <Sparkles size={16} className="text-blue-600" />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <LoadingPulse key={index} className="h-40 w-full" />
              ))}
            </div>
          ) : recommendationCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {recommendationCards.map((item) => (
                <RecommendationCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              AI recommendations will appear here once HR activity is analyzed.
            </div>
          )}
        </Card>

        <div className="space-y-4 xl:col-span-5">
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Decision Support</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Priority actions ranked by urgency and operational impact
                </p>
              </div>
              <CircleAlert size={16} className="text-slate-500" />
            </div>

            <div className="space-y-3">
              {loading ? (
                <>
                  <LoadingPulse className="h-28 w-full" />
                  <LoadingPulse className="h-28 w-full" />
                  <LoadingPulse className="h-28 w-full" />
                </>
              ) : prioritizedActions.length > 0 ? (
                prioritizedActions.map((item) => (
                  <PriorityActionCard key={item.id} item={item} />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  No priority actions are waiting right now.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Performance Insights</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Employees who need support and top contributors right now
                </p>
              </div>
              <TrendingUp size={16} className="text-emerald-600" />
            </div>

            <div className="space-y-3">
              {loading ? (
                <>
                  <LoadingPulse className="h-24 w-full" />
                  <LoadingPulse className="h-24 w-full" />
                </>
              ) : (
                <>
                  {attentionItems.map((item) => (
                    <div key={item.employeeId} className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{item.employeeName}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {item.department} | {item.position}
                          </div>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                          Score {item.performanceScore}
                        </div>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-gray-700">{item.recommendation}</p>
                    </div>
                  ))}

                  {(aiData.performance?.topPerformers || []).slice(0, 2).map((item) => (
                    <div key={item.employeeId} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{item.employeeName}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {item.department} | {item.performanceBand}
                          </div>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                          {item.attendanceRate}% attendance
                        </div>
                      </div>
                    </div>
                  ))}

                  {(aiData.performance?.needsAttention?.length || 0) === 0 &&
                  (aiData.performance?.topPerformers?.length || 0) === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                      Performance insights will appear once review data is available.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="p-4 sm:p-5 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
            <span className="text-xs font-medium text-gray-400">Live operational feed</span>
          </div>
          <Activity />
        </Card>

        <Card className="p-4 sm:p-5 xl:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Hiring Momentum</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Candidates most likely to convert into high-quality hires
              </p>
            </div>
            <BriefcaseBusiness size={16} className="text-violet-600" />
          </div>

          <div className="space-y-3">
            {loading ? (
              <>
                <LoadingPulse className="h-24 w-full" />
                <LoadingPulse className="h-24 w-full" />
                <LoadingPulse className="h-24 w-full" />
              </>
            ) : topCandidates.length > 0 ? (
              topCandidates.map((candidate) => (
                <div key={candidate.applicationId} className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{candidate.candidateName}</div>
                      <div className="mt-1 text-xs text-gray-500">{candidate.jobTitle}</div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700">
                      {candidate.matchPercentage}% match
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-gray-700">
                    {candidate.reasons.join(" | ")}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                Candidate ranking will appear after AI recruitment analysis runs.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
