import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Timer,
  X,
  XCircle,
} from "lucide-react";
import Card from "../components/Card";
import { getEmployees } from "../api/employeeService";
import {
  approveLeave,
  createLeave,
  getLeaveBalance,
  getLeaves,
} from "../api/leaveService";

const leaveStatusConfig = {
  Approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
  Rejected: "bg-red-50 text-red-600 border-red-100",
  Pending: "bg-amber-50 text-amber-600 border-amber-100",
  Cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const leaveTypes = [
  "Annual Leave",
  "Sick Leave",
  "Casual Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Unpaid Leave",
];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";

const countInclusiveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diff = end.getTime() - start.getTime();

  if (Number.isNaN(diff) || diff < 0) {
    return 0;
  }

  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
};

const isCurrentlyOnLeave = (leave) => {
  if (leave.status !== "Approved") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(leave.start);
  const end = new Date(leave.end);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return start <= today && end >= today;
};

export default function Leave() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = (storedUser.role || "employee").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "hr";

  const [leaveHistory, setLeaveHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState("");
  const [leaveData, setLeaveData] = useState({
    leaveType: "Annual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const employeeNameById = useMemo(
    () =>
      employees.reduce((lookup, employee) => {
        lookup[employee._id] = employee.user?.fullName || employee.user?.email || "Unknown";
        return lookup;
      }, {}),
    [employees],
  );

  const normalizeLeave = (leave) => ({
    id: leave._id,
    employeeId: leave.employeeId?._id || leave.employeeId,
    empName:
      employeeNameById[leave.employeeId?._id || leave.employeeId] ||
      leave.employeeId?.user?.fullName ||
      "Unknown",
    type: leave.leaveType,
    start: formatDate(leave.startDate),
    end: formatDate(leave.endDate),
    status: leave.status,
    reason: leave.reason,
    numberOfDays: Number(leave.numberOfDays || 0),
    remarks: leave.remarks || "",
    approvalDate: formatDate(leave.approvalDate),
  });

  const loadLeaveDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const employeeList = await getEmployees({ limit: 200 });
      setEmployees(employeeList);

      const matchedEmployee = employeeList.find(
        (employee) => employee.user?._id === storedUser._id,
      );
      setCurrentEmployee(matchedEmployee || null);

      const leaveParams = isAdmin
        ? { limit: 200 }
        : matchedEmployee
          ? { employeeId: matchedEmployee._id, limit: 200 }
          : null;

      const [leavesResponse, balanceResponse] = await Promise.all([
        leaveParams ? getLeaves(leaveParams) : Promise.resolve([]),
        !isAdmin && matchedEmployee
          ? getLeaveBalance(matchedEmployee._id)
          : Promise.resolve(null),
      ]);

      setLeaveHistory(leavesResponse.map(normalizeLeave));
      setLeaveBalance(balanceResponse?.balance || null);

      if (!isAdmin && !matchedEmployee) {
        setError("No employee profile is linked to this user yet. Create the employee record first.");
      }
    } catch (loadError) {
      setError(loadError.message || "Failed to load leave records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveDashboard();
  }, []);

  const pendingCount = leaveHistory.filter((leave) => leave.status === "Pending").length;
  const approvedTodayCount = leaveHistory.filter((leave) => {
    if (leave.status !== "Approved") {
      return false;
    }

    return leave.approvalDate === formatDate(new Date());
  }).length;
  const onLeaveNowCount = leaveHistory.filter(isCurrentlyOnLeave).length;
  const leaveTakenDays = leaveHistory
    .filter((leave) => leave.status === "Approved")
    .reduce((sum, leave) => sum + leave.numberOfDays, 0);
  const annualBalance = leaveBalance?.["Annual Leave"]?.remaining ?? "N/A";

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setIsUpdatingStatus(id);
      setError("");
      await approveLeave(id, {
        status: newStatus,
        approvedBy: storedUser._id,
      });
      await loadLeaveDashboard();
    } catch (updateError) {
      setError(updateError.message || "Status update failed");
    } finally {
      setIsUpdatingStatus("");
    }
  };

  const handleApplyLeave = async () => {
    const numberOfDays = countInclusiveDays(leaveData.startDate, leaveData.endDate);

    if (!leaveData.startDate || !leaveData.endDate || !leaveData.reason.trim()) {
      setError("Please fill all leave form fields.");
      return;
    }

    if (!currentEmployee?._id) {
      setError("No employee profile is linked to this user yet.");
      return;
    }

    if (numberOfDays <= 0) {
      setError("End date must be on or after the start date.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await createLeave({
        employeeId: currentEmployee._id,
        leaveType: leaveData.leaveType,
        startDate: leaveData.startDate,
        endDate: leaveData.endDate,
        reason: leaveData.reason.trim(),
        numberOfDays,
      });
      setShowLeaveForm(false);
      setLeaveData({
        leaveType: "Annual Leave",
        startDate: "",
        endDate: "",
        reason: "",
      });
      await loadLeaveDashboard();
    } catch (submitError) {
      setError(submitError.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            {isAdmin ? "Admin Leave Management" : "My Leave Dashboard"}
          </h1>
          <p className="text-sm text-gray-500">
            {isAdmin
              ? "Approve or reject employee leave requests with live HRMS data."
              : "Track your leave balance and apply for time off with live HRMS data."}
          </p>
        </div>

        {!isAdmin && (
          <button
            onClick={() => setShowLeaveForm(true)}
            disabled={!currentEmployee}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <CalendarDays size={18} /> Apply for Leave
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-indigo-500 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {isAdmin ? "Total Pending" : "Annual Balance"}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {isAdmin ? pendingCount : annualBalance}
          </p>
        </Card>
        <Card className="border-l-4 border-emerald-500 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {isAdmin ? "Approved Today" : "Leave Taken"}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {isAdmin ? approvedTodayCount : `${leaveTakenDays} Days`}
          </p>
        </Card>
        <Card className="border-l-4 border-amber-500 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            On Leave Now
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {isAdmin ? `${onLeaveNowCount} Staff` : onLeaveNowCount > 0 ? "Yes" : "No"}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden border-none bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-indigo-500" />
            <h2 className="font-bold text-gray-800">
              {isAdmin ? "Leave Requests" : "Recent Requests"}
            </h2>
          </div>
          {loading ? <LoaderCircle size={18} className="animate-spin text-gray-400" /> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
              <tr>
                {isAdmin && <th className="px-6 py-4">Employee</th>}
                <th className="px-6 py-4">Leave Type</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Days</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && leaveHistory.length > 0 ? (
                leaveHistory.map((leave) => (
                  <tr key={leave.id} className="transition hover:bg-gray-50">
                    {isAdmin ? (
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{leave.empName}</div>
                      </td>
                    ) : null}
                    <td className="px-6 py-4 font-medium text-gray-700">{leave.type}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="text-xs">
                        {leave.start} to {leave.end}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{leave.numberOfDays}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${leaveStatusConfig[leave.status]}`}
                      >
                        {leave.status === "Pending" ? (
                          <Timer size={12} />
                        ) : leave.status === "Approved" ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && leave.status === "Pending" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(leave.id, "Approved")}
                            disabled={isUpdatingStatus === leave.id}
                            className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(leave.id, "Rejected")}
                            disabled={isUpdatingStatus === leave.id}
                            className="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-gray-400">
                          {leave.reason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : null}

              {!loading && leaveHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
                    <p>No leave requests found.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {showLeaveForm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowLeaveForm(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-indigo-600 px-6 py-5 text-white">
              <h2 className="text-lg font-bold">New Leave Request</h2>
              <button
                onClick={() => setShowLeaveForm(false)}
                className="transition-transform hover:rotate-90"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Leave Type
                </label>
                <select
                  value={leaveData.leaveType}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={(event) =>
                    setLeaveData((current) => ({
                      ...current,
                      leaveType: event.target.value,
                    }))
                  }
                >
                  {leaveTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={leaveData.startDate}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
                    onChange={(event) =>
                      setLeaveData((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={leaveData.endDate}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
                    onChange={(event) =>
                      setLeaveData((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">
                  Reason
                </label>
                <textarea
                  rows="3"
                  value={leaveData.reason}
                  placeholder="Explain your reason..."
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={(event) =>
                    setLeaveData((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleApplyLeave}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
                <button
                  onClick={() => setShowLeaveForm(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
