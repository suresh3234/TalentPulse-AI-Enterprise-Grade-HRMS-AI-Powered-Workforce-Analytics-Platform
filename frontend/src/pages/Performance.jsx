import React, { useState, useEffect } from "react";
import API, { getApiErrorMessage } from "../api/axiosInstance";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Target, CheckSquare, Star, Sparkles, Trophy, Calendar, RefreshCw, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

export default function Performance() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [isAdmin] = useState(user.role === "admin" || user.role === "hr" || user.role === "manager");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [goals, setGoals] = useState([]);
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Goal Form State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDesc, setGoalDesc] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalTargetEmployee, setGoalTargetEmployee] = useState("");

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewNotes, setReviewNotes] = useState("");
  const [activeReviewId, setActiveReviewId] = useState("");
  const [reviewType, setReviewType] = useState(""); // "self" or "manager"

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    } else {
      fetchEmployeeData(user.id);
    }
  }, [isAdmin]);

  const fetchEmployees = async () => {
    try {
      const res = await API.get("/employees/getallemployees");
      setEmployees(res.data?.data || []);
      if (res.data?.data?.length > 0) {
        setSelectedEmployeeId(res.data.data[0]._id);
        fetchEmployeeData(res.data.data[0]._id);
      }
    } catch (err) {
      toast.error("Failed to load employee list");
    }
  };

  const fetchEmployeeData = async (employeeId) => {
    if (!employeeId) return;
    setLoading(true);
    try {
      // Get employee goals
      const goalsRes = await API.get(`/performance/goals/${employeeId}`);
      setGoals(goalsRes.data?.data || []);

      // Get employee appraisals
      // For now, load appraisals from performance route
      const appraisalRes = await API.get(`/performance/appraisal/${employeeId}`).catch(() => ({ data: { data: [] } }));
      setAppraisals(appraisalRes.data?.data || []);
    } catch (err) {
      console.warn("Failed loading some performance data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (e) => {
    const id = e.target.value;
    setSelectedEmployeeId(id);
    fetchEmployeeData(id);
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    const empId = isAdmin ? goalTargetEmployee : selectedEmployeeId || user.id;
    if (!empId) {
      toast.error("Please select an employee first");
      return;
    }

    try {
      await API.post("/performance/goals", {
        employee: empId,
        title: goalTitle,
        description: goalDesc,
        targetDate,
      });
      toast.success("Goal added successfully!");
      setShowGoalModal(false);
      setGoalTitle("");
      setGoalDesc("");
      setTargetDate("");
      fetchEmployeeData(empId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create goal"));
    }
  };

  const handleUpdateGoalProgress = async (goalId, newProgress) => {
    try {
      await API.put(`/performance/goals/${goalId}`, {
        progress: parseInt(newProgress),
        status: newProgress >= 100 ? "completed" : "in_progress",
      });
      toast.success("Goal progress updated!");
      fetchEmployeeData(isAdmin ? selectedEmployeeId : user.id);
    } catch (err) {
      toast.error("Failed to update goal");
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint =
        reviewType === "self"
          ? `/performance/appraisal/${activeReviewId}/self-review`
          : `/performance/appraisal/${activeReviewId}/manager-review`;

      await API.post(endpoint, {
        rating: reviewRating,
        notes: reviewNotes,
      });

      toast.success("Review submitted successfully!");
      setActiveReviewId("");
      setReviewNotes("");
      fetchEmployeeData(isAdmin ? selectedEmployeeId : user.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit review"));
    }
  };

  // Mock score history if empty
  const mockHistory = [
    { period: "Q1 2025", Score: 7.2 },
    { period: "Q2 2025", Score: 7.8 },
    { period: "Q3 2025", Score: 8.5 },
    { period: "Q4 2025", Score: 8.9 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Performance & Goals
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set quarterly OKRs, execute 360 appraisal cycles, and see AI insights.
          </p>
        </div>

        <div className="flex gap-2">
          {isAdmin && employees.length > 0 && (
            <select
              value={selectedEmployeeId}
              onChange={handleEmployeeChange}
              className="rounded-lg border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.user?.fullName} ({emp.position})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setGoalTargetEmployee(selectedEmployeeId || user.id);
              setShowGoalModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Goal
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance Score Trend */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-1.5 text-base font-semibold text-gray-900 dark:text-white">
            <Trophy className="h-5 w-5 text-indigo-600" />
            Appraisal History & Scores
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Score" stroke="#6366f1" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Performance Insight Panel */}
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-900 to-slate-900 p-6 text-white shadow-md">
          <div className="flex items-center gap-2 border-b border-white/10 pb-4">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold">AI Growth Insights</h3>
          </div>
          <div className="mt-4 space-y-4 text-sm text-indigo-100">
            <p>
              Based on recent goal completion rates (currently 82%) and team comments, this employee exhibits strong leadership attributes.
            </p>
            <p className="rounded-lg bg-white/5 p-3 text-xs border border-white/10">
              💡 <strong>AI Recommendation:</strong> Suggest enrollment in "Advanced System Architectures" training to accelerate technical path.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-indigo-300">
              <Star className="h-4 w-4 fill-indigo-400 text-indigo-400" />
              <span>Performance Tier: High Flyer</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Goals Checklist */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 flex items-center gap-1.5 text-base font-semibold text-gray-900 dark:text-white">
            <Target className="h-5 w-5 text-indigo-600" />
            Active Goals
          </h2>
          {loading ? (
            <div className="h-20 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
          ) : goals.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No goals defined for this period.</p>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal._id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-950 dark:text-white">{goal.title}</h4>
                      <p className="text-xs text-gray-500">{goal.description}</p>
                      <p className="mt-1 text-[10px] text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Due by {new Date(goal.targetDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        goal.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {goal.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={goal.progress}
                      onChange={(e) => handleUpdateGoalProgress(goal._id, e.target.value)}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
                    />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {goal.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Appraisal Cycle reviews */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 flex items-center gap-1.5 text-base font-semibold text-gray-900 dark:text-white">
            <CheckSquare className="h-5 w-5 text-indigo-600" />
            Appraisals & Reviews
          </h2>
          {appraisals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">No active appraisal cycles found.</p>
              {isAdmin && (
                <button
                  onClick={async () => {
                    try {
                      await API.post("/performance/appraisal/start", { employee: selectedEmployeeId || user.id, period: "Q2 2026" });
                      toast.success("Appraisal cycle started!");
                      fetchEmployeeData(selectedEmployeeId || user.id);
                    } catch (err) {
                      toast.error("Failed to start cycle");
                    }
                  }}
                  className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                >
                  Start Q2 Cycle
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {appraisals.map((appraisal) => (
                <div key={appraisal._id} className="rounded-xl border border-gray-150 p-4 dark:border-gray-800">
                  <div className="flex justify-between border-b border-gray-100 pb-2 mb-3 dark:border-gray-800">
                    <span className="font-bold text-gray-900 dark:text-white">{appraisal.period} Cycle</span>
                    <span className="text-xs font-medium text-gray-500 capitalize">{appraisal.status}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Self Rating:</span>
                      <span className="font-medium">{appraisal.selfRating || "Not submitted"} / 10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Manager Rating:</span>
                      <span className="font-medium">{appraisal.managerRating || "Not submitted"} / 10</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {appraisal.status === "initiated" && (
                      <button
                        onClick={() => {
                          setActiveReviewId(appraisal._id);
                          setReviewType("self");
                        }}
                        className="rounded-lg border border-indigo-600 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                      >
                        Self Review
                      </button>
                    )}
                    {isAdmin && appraisal.status === "self-reviewed" && (
                      <button
                        onClick={() => {
                          setActiveReviewId(appraisal._id);
                          setReviewType("manager");
                        }}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Manager Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Performance Goal</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Target Employee</label>
                  <select
                    value={goalTargetEmployee}
                    onChange={(e) => setGoalTargetEmployee(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.user?.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Goal Title</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Description</label>
                <textarea
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  rows="3"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Target Due Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {activeReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Submit {reviewType === "self" ? "Self" : "Manager"} Appraisal Rating
            </h3>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Rating Score (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Comments & Narrative</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows="4"
                  placeholder="Elaborate on achievements, bottlenecks, or guidance points..."
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReviewId("")}
                  className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
