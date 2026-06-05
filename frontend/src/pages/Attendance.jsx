import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Eye,
  Filter,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Card from "../components/Card";
import { getAttendance } from "../api/attendanceService";
import {
  approveAllPayroll,
  generatePayroll,
  getPayroll,
  getPayslip,
  markPayrollAsPaid,
} from "../api/payrollService";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const fmt = (value) =>
  "$" +
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const CALENDAR_STATUS_STYLES = {
  Present: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Late: "border-amber-200 bg-amber-50 text-amber-700",
  Absent: "border-rose-200 bg-rose-50 text-rose-700",
  Leave: "border-slate-200 bg-slate-100 text-slate-600",
  Empty: "border-transparent bg-white text-gray-500",
};

const CALENDAR_LEGEND = [
  { label: "Present", tone: "bg-emerald-500" },
  { label: "Late", tone: "bg-amber-500" },
  { label: "Absent", tone: "bg-rose-500" },
  { label: "Leave", tone: "bg-slate-400" },
];

function StatusBadge({ status }) {
  const map = {
    PROCESSED: "bg-green-100 text-green-700",
    Paid: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Present: "bg-green-100 text-green-700",
    Late: "bg-yellow-100 text-yellow-700",
    Absent: "bg-red-100 text-red-700",
    Leave: "bg-gray-100 text-gray-600",
  };

  const label =
    status === "PROCESSED" ? "Paid" : status === "PENDING" ? "Pending" : status;

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}
    >
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg sm:gap-4 sm:p-4">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-white/20 via-white/80 to-white/20 opacity-0 transition duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl transition duration-500 group-hover:scale-125" />
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110 group-hover:rotate-3 sm:h-11 sm:w-11 ${color}`}
      >
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 truncate text-xs text-gray-400 transition duration-300 group-hover:text-gray-500">
          {label}
        </p>
        <p className="truncate text-sm font-bold leading-tight text-gray-800 transition duration-300 group-hover:tracking-tight sm:text-lg">
          {value}
        </p>
        {sub ? (
          <p className="truncate text-xs text-gray-400 transition duration-300 group-hover:text-gray-500">
            {sub}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 3, cols = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <td key={colIndex} className="px-2 py-3">
              <div
                className="h-4 animate-pulse rounded bg-gray-100"
                style={{ width: colIndex === 0 ? "80%" : "60%" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function PayslipModal({ employee, month, onClose }) {
  const net = Number(employee.netSalary ?? employee.salary - employee.deductions);
  const tax = Number(employee.tax ?? employee.deductions * 0.6).toFixed(2);
  const insurance = Number(
    employee.pf ?? employee.leaveDeduction ?? employee.deductions * 0.4,
  ).toFixed(2);

  const handleDownload = () => {
    const content = `
PAYSLIP - ${month}
===========================
Employee : ${employee.name}
Role     : ${employee.role}
----------------------------
Gross Salary   : ${fmt(employee.salary)}
Tax (60%)      : -${fmt(tax)}
Insurance (40%): -${fmt(insurance)}
----------------------------
Net Salary     : ${fmt(net)}
Status         : ${employee.status}
===========================
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `payslip_${employee.name.replaceAll(" ", "_")}_${month}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1 pr-3">
            <p className="mb-1 text-xs uppercase tracking-widest opacity-80">
              Payslip · {month}
            </p>
            <h3 className="truncate text-lg font-bold sm:text-xl">
              {employee.name}
            </h3>
            <p className="truncate text-sm opacity-80">{employee.role}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/70 transition hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex justify-between border-b border-gray-100 py-2 text-sm">
            <span className="text-gray-500">Gross Salary</span>
            <span className="font-semibold text-gray-800">{fmt(employee.salary)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-2 text-sm">
            <span className="text-xs text-gray-500 sm:text-sm">
              Tax (Income + TDS ~60%)
            </span>
            <span className="font-medium text-red-500">- {fmt(tax)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-2 text-sm">
            <span className="text-xs text-gray-500 sm:text-sm">
              Health & Insurance (~40%)
            </span>
            <span className="font-medium text-red-500">- {fmt(insurance)}</span>
          </div>
          <div className="flex justify-between py-3 text-sm">
            <span className="font-bold text-gray-800">Net Salary</span>
            <span className="text-lg font-bold text-blue-600">{fmt(net)}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">Payment Status</span>
            <StatusBadge status={employee.status} />
          </div>
        </div>

        <div className="flex gap-3 px-4 pb-4 sm:px-6 sm:pb-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Attendance() {
  const [payrollFilter, setPayrollFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [date, setDate] = useState("");
  const [employee, setEmployee] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [payslipEmployee, setPayslipEmployee] = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [payrollError, setPayrollError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [isGeneratingPayroll, setIsGeneratingPayroll] = useState(false);
  const [payslipLoading, setPayslipLoading] = useState(false);

  const monthDate = new Date(year, month, 1);
  const monthName = `${MONTHS[month]} ${year}`;
  const startDay = monthDate.getDay() === 0 ? 6 : monthDate.getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    const loadAttendance = async () => {
      setAttendanceLoading(true);
      setAttendanceError("");

      try {
        const response = await getAttendance({ month: month + 1, year, limit: 500 });
        const normalized = response.map((record) => ({
          id: record._id,
          date: new Date(record.date).toISOString().slice(0, 10),
          name:
            record.employeeId?.user?.fullName ||
            record.employeeId?.fullName ||
            "Unknown",
          status: record.status,
          checkIn: record.checkIn || "-",
          checkOut: record.checkOut || "-",
        }));

        setAttendanceRecords(normalized);
      } catch (error) {
        setAttendanceError(error.message);
      } finally {
        setAttendanceLoading(false);
      }
    };

    loadAttendance();
  }, [month, year]);

  const loadPayroll = useCallback(async () => {
    setPayrollLoading(true);
    setPayrollError("");

    try {
      const response = await getPayroll({ month: selectedMonth + 1, year });
      const formatted = response.map((payroll) => ({
        id: payroll._id,
        employeeId: payroll.employeeId?._id,
        name: payroll.employeeId?.user?.fullName || "Unknown",
        role: payroll.employeeId?.position || "N/A",
        salary:
          Number(payroll.baseSalary || 0) +
          Number(payroll.allowances || 0) +
          Number(payroll.bonus || 0),
        deductions:
          Number(payroll.tax || 0) +
          Number(payroll.pf || 0) +
          Number(payroll.leaveDeduction || 0),
        baseSalary: Number(payroll.baseSalary || 0),
        allowances: Number(payroll.allowances || 0),
        bonus: Number(payroll.bonus || 0),
        tax: Number(payroll.tax || 0),
        pf: Number(payroll.pf || 0),
        leaveDeduction: Number(payroll.leaveDeduction || 0),
        netSalary: Number(payroll.netSalary || 0),
        status: payroll.status === "Paid" ? "PROCESSED" : "PENDING",
        avatar: (payroll.employeeId?.user?.fullName || "NA")
          .split(" ")
          .map((part) => part[0])
          .join("")
          .toUpperCase(),
        color: "bg-blue-500",
      }));

      setPayrollData(formatted);
    } catch (error) {
      setPayrollError(error.message);
    } finally {
      setPayrollLoading(false);
    }
  }, [selectedMonth, year]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  const changeMonth = (direction) => {
    if (direction === "next") {
      if (month === 11) {
        setMonth(0);
        setYear((current) => current + 1);
        return;
      }

      setMonth((current) => current + 1);
      return;
    }

    if (month === 0) {
      setMonth(11);
      setYear((current) => current - 1);
      return;
    }

    setMonth((current) => current - 1);
  };

  const filteredAttendance = attendanceRecords.filter(
    (record) =>
      (date ? record.date === date : true) &&
      (employee
        ? record.name.toLowerCase().includes(employee.toLowerCase())
        : true),
  );

  const attendanceStats = {
    present: attendanceRecords.filter((record) => record.status === "Present")
      .length,
    late: attendanceRecords.filter((record) => record.status === "Late").length,
    absent: attendanceRecords.filter((record) => record.status === "Absent")
      .length,
    leave: attendanceRecords.filter((record) => record.status === "Leave")
      .length,
    total: attendanceRecords.length,
  };

  const attendanceByDate = attendanceRecords.reduce((accumulator, record) => {
    const current = accumulator[record.date] || {
      Present: 0,
      Late: 0,
      Absent: 0,
      Leave: 0,
      total: 0,
      dominantStatus: "Empty",
    };

    current[record.status] = (current[record.status] || 0) + 1;
    current.total += 1;

    const priority = ["Absent", "Late", "Leave", "Present"];
    current.dominantStatus =
      priority.find((status) => current[status] > 0) || "Empty";

    accumulator[record.date] = current;
    return accumulator;
  }, {});

  const processedEmployees = payrollData.filter(
    (record) => record.status === "PROCESSED",
  );
  const pendingEmployees = payrollData.filter(
    (record) => record.status === "PENDING",
  );

  const totalPaid = processedEmployees.reduce(
    (sum, record) => sum + (record.salary - record.deductions),
    0,
  );
  const totalPending = pendingEmployees.reduce(
    (sum, record) => sum + (record.salary - record.deductions),
    0,
  );

  const filteredPayroll =
    payrollFilter === "All"
      ? payrollData
      : payrollData.filter((record) =>
          payrollFilter === "Processed"
            ? record.status === "PROCESSED"
            : record.status === "PENDING",
        );

  const handleMarkAsPaid = async (payrollId, currentStatus) => {
    if (currentStatus === "PROCESSED") {
      return;
    }

    try {
      setActionError("");
      await markPayrollAsPaid(payrollId);
      await loadPayroll();
    } catch (error) {
      setActionError(error.message);
    }
  };

  const handleApproveAll = async () => {
    try {
      setIsApprovingAll(true);
      setActionError("");
      await approveAllPayroll({ month: selectedMonth + 1, year });
      await loadPayroll();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setIsGeneratingPayroll(true);
      setActionError("");
      await generatePayroll({ month: selectedMonth + 1, year });
      await loadPayroll();
    } catch (error) {
      const alreadyGenerated = error.message?.toLowerCase().includes("already exists");

      if (alreadyGenerated) {
        setActionError(
          `Payroll for ${MONTHS[selectedMonth]} ${year} has already been generated. Review or approve the existing records instead.`,
        );
        await loadPayroll();
      } else {
        setActionError(error.message);
      }
    } finally {
      setIsGeneratingPayroll(false);
    }
  };

  const handleOpenPayslip = async (record) => {
    try {
      setPayslipLoading(true);
      setActionError("");
      const payslip = await getPayslip({ id: record.id });

      setPayslipEmployee({
        ...record,
        employeeId: payslip.employeeId?._id || record.employeeId,
        name: payslip.employeeId?.user?.fullName || record.name,
        role: payslip.employeeId?.position || record.role,
        salary:
          Number(payslip.baseSalary || 0) +
          Number(payslip.allowances || 0) +
          Number(payslip.bonus || 0),
        deductions:
          Number(payslip.tax || 0) +
          Number(payslip.pf || 0) +
          Number(payslip.leaveDeduction || 0),
        baseSalary: Number(payslip.baseSalary || 0),
        allowances: Number(payslip.allowances || 0),
        bonus: Number(payslip.bonus || 0),
        tax: Number(payslip.tax || 0),
        pf: Number(payslip.pf || 0),
        leaveDeduction: Number(payslip.leaveDeduction || 0),
        netSalary: Number(payslip.netSalary || 0),
        status: payslip.status === "Paid" ? "PROCESSED" : "PENDING",
      });
    } catch (error) {
      setActionError(error.message);
    } finally {
      setPayslipLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {payslipEmployee ? (
        <PayslipModal
          employee={payslipEmployee}
          month={MONTHS[selectedMonth]}
          onClose={() => setPayslipEmployee(null)}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-blue-600">
            Finance & Operations
          </p>
          <h1 className="text-lg font-bold text-gray-800 sm:text-xl">
            Payroll & Attendance
          </h1>
          <p className="text-xs text-gray-500 sm:text-sm">
            Reviewing cycle: {monthName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
            className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 sm:text-sm"
          >
            {MONTHS.map((monthLabel, index) => (
              <option key={monthLabel} value={index}>
                {monthLabel}
              </option>
            ))}
          </select>
          <button
            onClick={handleGeneratePayroll}
            disabled={isGeneratingPayroll || payrollData.length > 0}
            className="flex items-center gap-1 rounded-md bg-gray-200 px-2 py-1.5 text-xs whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
            title={
              payrollData.length > 0
                ? `Payroll already exists for ${MONTHS[selectedMonth]} ${year}`
                : "Generate payroll"
            }
          >
            <SlidersHorizontal size={12} />
            <span>{isGeneratingPayroll ? "Generating..." : "Generate Payroll"}</span>
          </button>
          <button
            onClick={handleApproveAll}
            disabled={isApprovingAll}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1.5 text-xs whitespace-nowrap text-white disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
          >
            <CheckCircle size={12} />
            <span>{isApprovingAll ? "Approving..." : "Approve All Payroll"}</span>
          </button>
        </div>
      </div>

      {actionError ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
          {actionError}
        </div>
      ) : null}

      {payslipLoading ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Loading payslip...
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Total Salary Paid"
          value={fmt(totalPaid)}
          sub={`${processedEmployees.length} employees`}
          color="bg-blue-500"
        />
        <StatCard
          icon={Clock}
          label="Pending Payments"
          value={fmt(totalPending)}
          sub={`${pendingEmployees.length} pending`}
          color="bg-yellow-500"
        />
        <StatCard
          icon={Users}
          label="Employees Paid"
          value={`${processedEmployees.length} / ${payrollData.length}`}
          sub="this cycle"
          color="bg-green-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Payroll"
          value={fmt(
            payrollData.reduce(
              (sum, record) => sum + record.salary - record.deductions,
              0,
            ),
          )}
          sub={MONTHS[selectedMonth]}
          color="bg-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold sm:text-base">
                Attendance Overview
              </h2>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => changeMonth("prev")}
                  className="rounded p-1 transition hover:bg-gray-100"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="whitespace-nowrap text-xs font-semibold sm:text-sm">
                  {monthName}
                </span>
                <button
                  onClick={() => changeMonth("next")}
                  className="rounded p-1 transition hover:bg-gray-100"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 text-xs text-gray-400">
              {["M", "T", "W", "T", "F", "S", "S"].map((dayLabel, index) => (
                <div key={`${dayLabel}-${index}`} className="text-center font-medium">
                  {dayLabel}
                </div>
              ))}
            </div>

            <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-gray-500">
              {CALENDAR_LEGEND.map((item) => (
                <div
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1"
                >
                  <span className={`h-2 w-2 rounded-full ${item.tone}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-xs sm:gap-2 sm:text-sm">
              {Array.from({ length: startDay }).map((_, index) => (
                <div key={`empty-${index}`} />
              ))}

              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const fullDate = new Date(year, month, day).toLocaleDateString(
                  "en-CA",
                );
                const daySummary = attendanceByDate[fullDate];
                const dominantStatus = daySummary?.dominantStatus || "Empty";

                return (
                  <div
                    key={day}
                    title={
                      daySummary
                        ? `Present: ${daySummary.Present}, Late: ${daySummary.Late}, Absent: ${daySummary.Absent}, Leave: ${daySummary.Leave}`
                        : "No attendance records"
                    }
                    className={`min-h-[52px] rounded-xl border px-1 py-2 text-center text-xs transition ${CALENDAR_STATUS_STYLES[dominantStatus]}`}
                  >
                    <div className="font-semibold">{day}</div>
                    {daySummary ? (
                      <div className="mt-1 space-y-0.5 text-[10px] leading-none">
                        {daySummary.Present > 0 ? <div>P {daySummary.Present}</div> : null}
                        {daySummary.Late > 0 ? <div>L {daySummary.Late}</div> : null}
                        {daySummary.Absent > 0 ? <div>A {daySummary.Absent}</div> : null}
                        {daySummary.Leave > 0 ? <div>Lv {daySummary.Leave}</div> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-1.5 text-xs text-gray-500">
              <div>Present ({attendanceStats.present})</div>
              <div>Late ({attendanceStats.late})</div>
              <div>Absent ({attendanceStats.absent})</div>
              <div>Leave ({attendanceStats.leave})</div>
            </div>
          </Card>

          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white sm:p-5">
            <p className="text-xs uppercase">Attendance Rate</p>
            <h1 className="text-3xl font-bold sm:text-4xl">
              {attendanceStats.total > 0
                ? ((attendanceStats.present / attendanceStats.total) * 100).toFixed(1)
                : 0}
              %
            </h1>
            <p className="text-sm">Live Data</p>
          </div>
        </div>

        <Card className="p-4 sm:p-5 lg:col-span-3">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold sm:text-base">
              Payroll Table · {MONTHS[selectedMonth]}
            </h2>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {["All", "Pending", "Processed"].map((filterValue) => (
                <button
                  key={filterValue}
                  onClick={() => setPayrollFilter(filterValue)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition sm:px-3 ${
                    payrollFilter === filterValue
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {filterValue}
                </button>
              ))}
            </div>
          </div>

          {payrollError ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-600">
              <AlertTriangle size={13} className="flex-shrink-0" />
              {payrollError}
            </div>
          ) : null}

          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="min-w-[520px] w-full text-sm">
              <thead className="border-b text-xs text-gray-400">
                <tr>
                  <th className="py-2 text-left">Employee</th>
                  <th className="text-right">Salary</th>
                  <th className="text-right">Deductions</th>
                  <th className="text-right">Net</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              {payrollLoading ? (
                <TableSkeleton rows={3} cols={6} />
              ) : (
                <tbody>
                  {filteredPayroll.map((record) => {
                    const net = record.salary - record.deductions;

                    return (
                      <tr
                        key={record.id}
                        className="border-t transition hover:bg-gray-50"
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white sm:h-8 sm:w-8 ${record.color}`}
                            >
                              {record.avatar}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium leading-tight text-gray-800 sm:text-sm">
                                {record.name}
                              </p>
                              <p className="hidden truncate text-xs text-gray-400 sm:block">
                                {record.role}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-right text-xs font-medium text-gray-700 sm:text-sm">
                          {fmt(record.salary)}
                        </td>
                        <td className="whitespace-nowrap text-right text-xs text-red-500 sm:text-sm">
                          -{fmt(record.deductions)}
                        </td>
                        <td className="whitespace-nowrap text-right text-xs font-bold text-blue-700 sm:text-sm">
                          {fmt(net)}
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => handleMarkAsPaid(record.id, record.status)}
                            title={
                              record.status === "PROCESSED"
                                ? "Already marked as paid"
                                : "Mark as paid"
                            }
                          >
                            <StatusBadge status={record.status} />
                          </button>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenPayslip(record)}
                              className="rounded-lg bg-blue-50 p-1 text-blue-600 transition hover:bg-blue-100 sm:p-1.5"
                              title="View Payslip"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => handleOpenPayslip(record)}
                              className="rounded-lg bg-gray-100 p-1 text-gray-500 transition hover:bg-gray-200 sm:p-1.5"
                              title="Download Payslip"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!payrollLoading && filteredPayroll.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-sm text-gray-400">
                        No payroll records found
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              )}
            </table>
          </div>
        </Card>
      </div>

      <Card className="relative p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold sm:text-base">Attendance List</h2>
          <button
            onClick={() => setShowFilters((current) => !current)}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-xs transition hover:bg-gray-200"
          >
            <Filter size={14} />
            Filters
          </button>
        </div>

        {showFilters ? (
          <div className="absolute right-4 top-14 z-50 w-56 rounded-xl border bg-white p-4 shadow-lg sm:right-5 sm:w-64">
            <div className="mb-3">
              <label className="text-xs font-medium">Date</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              />
            </div>
            <div className="mb-3">
              <label className="text-xs font-medium">Employee</label>
              <input
                type="text"
                placeholder="Search employee..."
                value={employee}
                onChange={(event) => setEmployee(event.target.value)}
                className="mt-1 w-full rounded border px-2 py-1 text-xs"
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setDate("");
                  setEmployee("");
                }}
                className="text-xs text-gray-500"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
              >
                Apply
              </button>
            </div>
          </div>
        ) : null}

        {attendanceError ? (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-600">
            <AlertTriangle size={13} className="flex-shrink-0" />
            {attendanceError}
          </div>
        ) : null}

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="min-w-[420px] w-full text-sm">
            <thead className="border-b text-xs text-gray-400">
              <tr>
                <th className="py-2 text-left">Date</th>
                <th className="text-left">Employee</th>
                <th className="text-center">Status</th>
                <th className="text-center">Check-in</th>
                <th className="text-center">Check-out</th>
              </tr>
            </thead>

            {attendanceLoading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : (
              <tbody>
                {filteredAttendance.length > 0 ? (
                  filteredAttendance.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b transition hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap py-2.5 text-xs text-gray-600 sm:text-sm">
                        {record.date}
                      </td>
                      <td className="text-xs font-medium text-gray-800 sm:text-sm">
                        {record.name}
                      </td>
                      <td className="py-2.5 text-center">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="whitespace-nowrap text-center text-xs text-gray-600 sm:text-sm">
                        {record.checkIn}
                      </td>
                      <td className="whitespace-nowrap text-center text-xs text-gray-600 sm:text-sm">
                        {record.checkOut}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-sm text-gray-400">
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            )}
          </table>
        </div>
      </Card>

      <div className="flex gap-3 rounded-xl bg-orange-100 p-3 sm:p-4">
        <AlertTriangle
          className="mt-0.5 flex-shrink-0 text-orange-500"
          size={18}
        />
        <div>
          <p className="text-xs font-semibold sm:text-sm">
            Important Insight: Missing Documentation
          </p>
          <p className="mt-0.5 text-xs text-orange-700">
            {pendingEmployees.length} employee(s) have pending payroll. Review
            them before the end of this cycle.
          </p>
        </div>
      </div>
    </div>
  );
}
