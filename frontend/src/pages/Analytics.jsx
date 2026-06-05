import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BellRing,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Filter,
  LineChart,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Card from "../components/Card";
import { getAiRecommendations } from "../api/aiService";
import { getAttendance } from "../api/attendanceService";
import { getEmployees } from "../api/employeeService";
import { getJobPostings } from "../api/recruitmentService";

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

const reportTabs = ["Executive", "Attendance", "Performance", "Recruitment"];
const timeframeOptions = ["This month", "Last 30 days", "Quarter"];
const pieColors = ["#2563eb", "#14b8a6", "#f59e0b", "#ef4444"];

const priorityTone = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function LoadingPulse({ className }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;
}

function MetricCard({ icon, label, value, helper, tone }) {
  return (
    <Card className="border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
          {icon}
        </div>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          AI tracked
        </span>
      </div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 text-xs leading-relaxed text-slate-500">{helper}</div>
    </Card>
  );
}

function ReportCard({ title, category, confidence, summary, action, priority }) {
  return (
    <Card className="border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {category}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${
            priorityTone[priority] || "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {priority}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-600">{summary}</p>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Suggested action
          </div>
          <div className="mt-1 text-xs font-medium text-slate-700">{action}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Confidence
          </div>
          <div className="mt-1 text-sm font-bold text-slate-900">{confidence}%</div>
        </div>
      </div>
    </Card>
  );
}

function InsightRow({ icon, title, detail, meta, priority }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
              priorityTone[priority] || "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {priority}
          </span>
        </div>
        <div className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</div>
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {meta}
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 text-xs shadow-lg">
      <div className="mb-2 font-semibold text-slate-700">{label}</div>
      {payload.map((point) => (
        <div key={point.dataKey} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: point.color }}
          />
          <span className="capitalize text-slate-500">{point.dataKey}</span>
          <span className="ml-auto font-semibold text-slate-900">{point.value}</span>
        </div>
      ))}
    </div>
  );
}

function buildPerformanceTrend(aiData) {
  const needsAttention = aiData.performance?.needsAttention || [];
  const topPerformers = aiData.performance?.topPerformers || [];
  const scoreRows = [...needsAttention, ...topPerformers].slice(0, 8);

  if (scoreRows.length === 0) {
    return [
      { name: "Week 1", score: 74, target: 80 },
      { name: "Week 2", score: 77, target: 80 },
      { name: "Week 3", score: 81, target: 80 },
      { name: "Week 4", score: 84, target: 80 },
    ];
  }

  return scoreRows.map((employee, index) => ({
    name: employee.employeeName?.split(" ")[0] || `E${index + 1}`,
    score: employee.performanceScore || employee.attendanceRate || 0,
    target: 80,
  }));
}

function buildDepartmentMix(employees) {
  const counts = employees.reduce((accumulator, employee) => {
    const department = employee.department || "Unassigned";
    accumulator[department] = (accumulator[department] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .slice(0, 4);
}

function buildReportCards(aiData, employeeCount, jobCount) {
  const highAlerts = aiData.attendance?.summary?.highSeverity || 0;
  const strongMatches = aiData.recruitment?.summary?.strongMatches || 0;
  const coachingCount = aiData.performance?.needsAttention?.length || 0;

  return [
    {
      title: "Workforce risk summary",
      category: "Attendance analytics",
      confidence: highAlerts > 0 ? 91 : 84,
      priority: highAlerts > 0 ? "high" : "low",
      summary:
        highAlerts > 0
          ? `${highAlerts} high-severity attendance signals need follow-up before payroll closure.`
          : "Attendance signals are stable, with no high-severity exceptions in the current window.",
      action: highAlerts > 0 ? "Prioritize manager outreach" : "Continue daily monitoring",
    },
    {
      title: "Performance trend summary",
      category: "Employee performance",
      confidence: coachingCount > 0 ? 88 : 81,
      priority: coachingCount > 0 ? "medium" : "low",
      summary:
        coachingCount > 0
          ? `${coachingCount} employees are showing coaching signals while top performers remain visible for recognition.`
          : `${employeeCount} employees are available for trend analysis as new performance data arrives.`,
      action: coachingCount > 0 ? "Schedule coaching check-ins" : "Review next cycle scores",
    },
    {
      title: "Recruitment funnel summary",
      category: "Recruitment insights",
      confidence: strongMatches > 0 ? 93 : 78,
      priority: strongMatches > 0 ? "medium" : "low",
      summary:
        strongMatches > 0
          ? `${strongMatches} candidates are strong AI matches across ${jobCount} open hiring pipelines.`
          : `${jobCount} open roles are ready for candidate ranking once applications are available.`,
      action: strongMatches > 0 ? "Move top matches to review" : "Refresh candidate sourcing",
    },
  ];
}

export default function Analytics() {
  const [aiData, setAiData] = useState(emptyAiState);
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState("Executive");
  const [timeframe, setTimeframe] = useState("This month");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startFilterTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const loadAnalytics = async () => {
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
        setError("");

        const [employeeRows, attendanceRows, jobRows, aiRecommendations] = await Promise.all([
          getEmployees({ limit: 500 }),
          getAttendance({ month, year, limit: 500 }),
          getJobPostings({ status: "Open", limit: 50 }),
          getAiRecommendations({ scope: "dashboard", month, year, limit: 12 }),
        ]);

        setEmployees(employeeRows);
        setAttendance(attendanceRows);
        setJobs(jobRows);
        setAiData({
          ...emptyAiState,
          ...aiRecommendations,
        });
      } catch (loadError) {
        setError(loadError.message || "Failed to load AI analytics.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const query = deferredSearch.trim().toLowerCase();

  const reportCards = useMemo(
    () => buildReportCards(aiData, employees.length, jobs.length),
    [aiData, employees.length, jobs.length],
  );

  const filteredReports = useMemo(() => {
    return reportCards.filter((report) => {
      const matchesTab =
        activeTab === "Executive" ||
        report.category.toLowerCase().includes(activeTab.toLowerCase());
      const matchesQuery =
        !query ||
        report.title.toLowerCase().includes(query) ||
        report.category.toLowerCase().includes(query) ||
        report.summary.toLowerCase().includes(query);
      return matchesTab && matchesQuery;
    });
  }, [activeTab, query, reportCards]);

  const attendanceTrend = aiData.attendance?.trend?.length
    ? aiData.attendance.trend
    : attendance.slice(-8).map((entry, index) => ({
        date: entry.date || `Day ${index + 1}`,
        present: entry.status === "Present" ? 1 : 0,
        late: entry.status === "Late" ? 1 : 0,
        absent: entry.status === "Absent" ? 1 : 0,
      }));

  const performanceTrend = useMemo(() => buildPerformanceTrend(aiData), [aiData]);
  const departmentMix = useMemo(() => buildDepartmentMix(employees), [employees]);

  const smartNotifications = useMemo(() => {
    const alerts = (aiData.attendance?.alerts || []).slice(0, 3).map((alert) => ({
      id: alert.id,
      title: alert.title,
      detail: alert.recommendation || alert.insight,
      meta: `${alert.department || "HR"} | ${alert.position || "Employee"}`,
      priority: alert.severity || "medium",
      icon: <BellRing size={15} />,
    }));

    const recommendations = [
      ...(aiData.attendance?.recommendations || []),
      ...(aiData.recruitment?.recommendations || []),
      ...(aiData.performance?.recommendations || []),
    ]
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.recommendation,
        meta: item.category,
        priority: item.priority || "low",
        icon: <Sparkles size={15} />,
      }));

    return [...alerts, ...recommendations].slice(0, 5);
  }, [aiData]);

  const recruitmentChartData = useMemo(() => {
    const candidates = aiData.recruitment?.rankedCandidates || [];
    if (candidates.length === 0) {
      return [
        { name: "Jane", matchScore: 88, voiceScore: 82, videoScore: 78 },
        { name: "Sarah", matchScore: 92, voiceScore: 85, videoScore: 90 },
        { name: "Mike", matchScore: 79, voiceScore: 72, videoScore: 70 },
        { name: "Emma", matchScore: 84, voiceScore: 80, videoScore: 82 }
      ];
    }
    return candidates.slice(0, 6).map(cand => ({
      name: cand.candidateName.split(" ")[0],
      matchScore: cand.matchPercentage || 70,
      voiceScore: cand.voiceInterview?.compositeScore ? Math.round(cand.voiceInterview.compositeScore * 10) : 75,
      videoScore: cand.videoScore || 80
    }));
  }, [aiData]);

  const metrics = [
    {
      label: "Attendance alerts",
      value: aiData.attendance?.alerts?.length || 0,
      helper: "AI-detected workforce exceptions",
      icon: <BellRing size={18} />,
      tone: "bg-red-50 text-red-600",
    },
    {
      label: "Performance signals",
      value:
        (aiData.performance?.needsAttention?.length || 0) +
        (aiData.performance?.topPerformers?.length || 0),
      helper: "Coaching and recognition insights",
      icon: <TrendingUp size={18} />,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Hiring matches",
      value: aiData.recruitment?.summary?.strongMatches || 0,
      helper: "Candidates ready for review",
      icon: <BriefcaseBusiness size={18} />,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Smart reports",
      value: reportCards.length,
      helper: "Generated from live HR signals",
      icon: <ClipboardList size={18} />,
      tone: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <BrainCircuit size={15} />
              AI analytics
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              HR decision insights, reports, and trends in one workspace.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Review attendance analytics, performance movement, recruitment strength, and AI-generated summaries without leaving the reporting flow.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search size={14} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reports or insights"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:w-56"
              />
            </div>

            <select
              value={timeframe}
              onChange={(event) => setTimeframe(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-primary"
            >
              {timeframeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {reportTabs.map((tab) => (
            <button
              key={tab}
              onClick={() =>
                startFilterTransition(() => {
                  setActiveTab(tab);
                })
              }
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      {activeTab === "Recruitment" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 animate-fade-in">
          {/* Card 1: Match & Interview scores */}
          <Card className="border border-slate-100 p-4 xl:col-span-7">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">ATS Match & Interview Fit Analytics</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Calculated ATS match %, voice screening averages, and video scores
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Cognitive telemetry active
              </span>
            </div>

            {loading ? (
              <LoadingPulse className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={recruitmentChartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="matchFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="voiceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="videoFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="matchScore" stroke="#2563eb" strokeWidth={2.2} fill="url(#matchFill)" name="ATS Score" />
                  <Area type="monotone" dataKey="voiceScore" stroke="#10b981" strokeWidth={2.2} fill="url(#voiceFill)" name="Voice Score" />
                  <Area type="monotone" dataKey="videoScore" stroke="#8b5cf6" strokeWidth={2.2} fill="url(#videoFill)" name="Video Score" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Card 2: Technical vs Communication */}
          <Card className="border border-slate-100 p-4 xl:col-span-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">Speech & Facial Telemetry Comparison</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Acoustic voice score vs video facial analytics
              </p>
            </div>

            {loading ? (
              <LoadingPulse className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={recruitmentChartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="voiceScore" radius={[8, 8, 0, 0]} fill="#10b981" name="Voice Dynamics" />
                  <Bar dataKey="videoScore" radius={[8, 8, 0, 0]} fill="#8b5cf6" name="Video Expressions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="border border-slate-100 p-4 xl:col-span-7">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Attendance analytics</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Presence, late arrivals, and absence movement for {timeframe.toLowerCase()}
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {aiData.attendance?.summary?.employeesTracked || employees.length} employees tracked
              </span>
            </div>

            {loading ? (
              <LoadingPulse className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={attendanceTrend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lateFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="present" stroke="#2563eb" strokeWidth={2.2} fill="url(#presentFill)" />
                  <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2.2} fill="url(#lateFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="border border-slate-100 p-4 xl:col-span-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">Employee performance trends</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Coaching and recognition signals visualized by AI confidence
              </p>
            </div>

            {loading ? (
              <LoadingPulse className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={performanceTrend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]} fill="#14b8a6" />
                  <Bar dataKey="target" radius={[8, 8, 0, 0]} fill="#dbeafe" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="border border-slate-100 p-4 xl:col-span-4">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Recruitment insights</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Strong candidates, open roles, and hiring readiness
            </p>
          </div>

          <div className="space-y-3">
            {(aiData.recruitment?.rankedCandidates || []).slice(0, 4).map((candidate) => (
              <div key={candidate.applicationId} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {candidate.candidateName}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">{candidate.jobTitle}</div>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {candidate.matchPercentage}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Math.max(candidate.matchPercentage, 8)}%` }}
                  />
                </div>
              </div>
            ))}

            {!loading && (aiData.recruitment?.rankedCandidates?.length || 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Recruitment insight rows will appear once candidates are ranked.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="border border-slate-100 p-4 xl:col-span-3">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Department mix</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Workforce distribution for report context
            </p>
          </div>

          {loading ? (
            <LoadingPulse className="h-[230px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={departmentMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} paddingAngle={4}>
                  {departmentMix.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="border border-slate-100 p-4 xl:col-span-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Smart notification panel</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Report-ready alerts and next-best actions
              </p>
            </div>
            <Filter size={16} className="text-slate-400" />
          </div>

          <div className="space-y-3">
            {loading ? (
              <>
                <LoadingPulse className="h-20 w-full" />
                <LoadingPulse className="h-20 w-full" />
                <LoadingPulse className="h-20 w-full" />
              </>
            ) : smartNotifications.length > 0 ? (
              smartNotifications.map((item) => (
                <InsightRow key={item.id} {...item} />
              ))
            ) : (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                No urgent AI notifications are waiting right now.
              </div>
            )}
          </div>
        </Card>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">AI-generated report cards</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Automated summaries tuned for HR decision review
              </p>
            </div>
            {isPending ? (
              <span className="text-xs font-semibold text-primary">Updating report view...</span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <LoadingPulse key={index} className="h-48 w-full" />
              ))
            ) : filteredReports.length > 0 ? (
              filteredReports.map((report) => <ReportCard key={report.title} {...report} />)
            ) : (
              <Card className="border border-dashed border-slate-200 p-6 text-sm text-slate-500 lg:col-span-2">
                No reports match the current filters.
              </Card>
            )}
          </div>
        </div>

        <Card className="border border-slate-100 p-4 xl:col-span-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Automated summary</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Snapshot prepared from current analytics
              </p>
            </div>
            <LineChart size={17} className="text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {(aiData.smartSummary || []).slice(0, 4).map((summary) => (
              <div key={summary} className="flex gap-3 rounded-xl bg-slate-50 px-3 py-3">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                <p className="text-sm leading-relaxed text-slate-600">{summary}</p>
              </div>
            ))}

            {!loading && (aiData.smartSummary?.length || 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Automated summaries will appear when the AI recommendation service returns report notes.
              </div>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
