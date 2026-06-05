import React, { useState, useEffect } from "react";
import API, { getApiErrorMessage } from "../api/axiosInstance";
import { CheckCircle, Clock, UserCheck, Plus, Play, Calendar, UserPlus, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";

export default function Onboarding() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [isAdmin] = useState(user.role === "admin" || user.role === "hr");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);

  // New onboarding form
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    } else {
      fetchMyOnboarding();
    }
  }, [isAdmin]);

  const fetchEmployees = async () => {
    try {
      const res = await API.get("/employees/getallemployees");
      setEmployees(res.data?.data || []);
      if (res.data?.data?.length > 0) {
        const firstId = res.data.data[0]._id;
        setSelectedEmployeeId(firstId);
        fetchOnboardingDetails(firstId);
      }
    } catch (err) {
      toast.error("Failed to load employee list");
    }
  };

  const fetchMyOnboarding = async () => {
    setLoading(true);
    try {
      const empRes = await API.get("/employees/getallemployees");
      const myEmp = empRes.data?.data?.find(emp => emp.user?._id === user.id || emp.user?.id === user.id);
      if (myEmp) {
        fetchOnboardingDetails(myEmp._id);
      }
    } catch (err) {
      console.warn("Failed fetching onboarding details:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnboardingDetails = async (employeeId) => {
    setLoading(true);
    try {
      const res = await API.get(`/onboarding/${employeeId}`);
      setOnboarding(res.data?.data);
    } catch (err) {
      setOnboarding(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (e) => {
    const id = e.target.value;
    setSelectedEmployeeId(id);
    fetchOnboardingDetails(id);
  };

  const handleStartOnboarding = async (e) => {
    e.preventDefault();
    const empId = isAdmin ? selectedEmployeeId : user.id;
    if (!empId) return;

    try {
      await API.post("/onboarding/start", {
        employee: empId,
        startDate,
        targetCompletionDate: targetDate
      });
      toast.success("Onboarding checklist initialized!");
      fetchOnboardingDetails(empId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to start onboarding"));
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const empId = isAdmin ? selectedEmployeeId : onboarding?.employee?._id || onboarding?.employee;
    if (!empId) return;

    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await API.put(`/onboarding/${empId}/task/${taskId}`, {
        status: newStatus
      });
      toast.success("Task status updated!");
      fetchOnboardingDetails(empId);
    } catch (err) {
      toast.error("Failed to update task");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Employee Onboarding
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track first-week milestones, mandatory IT paperwork, and training targets.
          </p>
        </div>

        {isAdmin && employees.length > 0 && (
          <select
            value={selectedEmployeeId}
            onChange={handleEmployeeChange}
            className="rounded-lg border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-white shadow-sm"
          >
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.user?.fullName} ({emp.position})
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : !onboarding ? (
        /* Uninitialized State */
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center max-w-md mx-auto">
          <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Initialize Onboarding</h3>
          <p className="text-sm text-gray-500 mb-6">
            Generate standard paperwork, IT logistics, and supervisor review checklists for this employee.
          </p>
          <form onSubmit={handleStartOnboarding} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">Target Completion Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Play className="h-4 w-4" />
              Start Checklist
            </button>
          </form>
        </div>
      ) : (
        /* Onboarding Checklist & Progress */
        <div className="grid gap-6 md:grid-cols-3">
          {/* Progress & Meta Info */}
          <div className="md:col-span-1 space-y-6">
            <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Milestone Progress</h3>

              <div className="flex items-center justify-center mb-6">
                <div className="relative flex items-center justify-center h-28 w-28 rounded-full border-8 border-indigo-50 dark:border-indigo-950/40">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {onboarding.completionPercent || 0}%
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Initiated:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {new Date(onboarding.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Date:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {new Date(onboarding.targetCompletionDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist Tasks */}
          <div className="md:col-span-2 rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 flex items-center gap-1.5 text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 pb-3 dark:border-gray-800">
              <CheckSquare className="h-5 w-5 text-indigo-600" />
              Onboarding Checklist Tasks
            </h2>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {onboarding.tasks?.map((task) => (
                <div key={task._id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <input
                    type="checkbox"
                    checked={task.status === "completed"}
                    onChange={() => handleToggleTask(task._id, task.status)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <h4
                      className={`font-semibold text-gray-900 dark:text-white ${
                        task.status === "completed" ? "line-through text-gray-400 dark:text-gray-600" : ""
                      }`}
                    >
                      {task.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{task.description}</p>
                    {task.dueDate && (
                      <p className="mt-1 text-[10px] text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> Due by {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      task.status === "completed"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {task.status === "completed" ? "Done" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
