import React, { useState, useEffect } from "react";
import API, { getApiErrorMessage } from "../api/axiosInstance";
import { BookOpen, Award, CheckCircle, Clock, Sparkles, Play, Plus, Trash } from "lucide-react";
import toast from "react-hot-toast";

export default function Training() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [isAdmin] = useState(user.role === "admin" || user.role === "hr");
  const [trainings, setTrainings] = useState([]);
  const [myTrainings, setMyTrainings] = useState([]);
  const [activeTab, setActiveTab] = useState("catalog");
  const [loading, setLoading] = useState(true);

  // New Training Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("technical");
  const [duration, setDuration] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await API.get("/training");
      setTrainings(res.data?.data || []);

      const myRes = await API.get("/training/my");
      setMyTrainings(myRes.data?.data || []);
    } catch (err) {
      console.warn("Failed to fetch training data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraining = async (e) => {
    e.preventDefault();
    try {
      await API.post("/training", {
        title,
        description,
        category,
        duration: parseInt(duration),
        dueDate,
      });
      toast.success("Course added to catalog!");
      setShowAddModal(false);
      setTitle("");
      setDescription("");
      setDuration("");
      setDueDate("");
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create course"));
    }
  };

  const handleEnroll = async (id) => {
    try {
      await API.post(`/training/${id}/enroll`);
      toast.success("Enrolled in course successfully!");
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Enrollment failed"));
    }
  };

  const handleMarkCompleted = async (id) => {
    try {
      await API.post(`/training/${id}/complete`);
      toast.success("Congratulations on completing the course!");
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update progress"));
    }
  };

  // Mock AI course suggestions
  const aiRecommendations = [
    {
      id: "rec1",
      title: "Advanced React Patterns & Performance",
      category: "technical",
      reason: "To address front-end scalability focus area identified in your Q4 review.",
    },
    {
      id: "rec2",
      title: "Node.js Security Best Practices",
      category: "technical",
      reason: "Recommended based on security audit comments in repository commits.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Training & Development
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upskill your technical expertise and view personalized AI-generated learning paths.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Course
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-gray-250 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`pb-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "catalog"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Course Catalog
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`pb-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "my"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          My Enrollments ({myTrainings.length})
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : activeTab === "catalog" ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* AI course suggestions */}
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-900 to-slate-900 p-6 text-white shadow-md md:col-span-1 h-fit">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold">AI Skill Gap Suggestions</h3>
            </div>
            <div className="mt-4 space-y-4">
              {aiRecommendations.map((rec) => (
                <div key={rec.id} className="rounded-lg bg-white/5 p-3 border border-white/10 text-xs">
                  <p className="font-semibold text-white">{rec.title}</p>
                  <p className="mt-1 text-indigo-200">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Catalog grid */}
          <div className="md:col-span-2 grid gap-6 sm:grid-cols-2">
            {trainings.length === 0 ? (
              <p className="col-span-2 text-sm text-gray-500 text-center py-10">
                No courses available in the catalog.
              </p>
            ) : (
              trainings.map((course) => {
                const isEnrolled = myTrainings.some((item) => item._id === course._id);
                return (
                  <div
                    key={course._id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                          {course.category}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {course.duration} hrs
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-950 dark:text-white mb-2">{course.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{course.description}</p>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-auto dark:border-gray-800">
                      {isEnrolled ? (
                        <button
                          disabled
                          className="w-full rounded-lg bg-gray-100 py-2 text-center text-sm font-semibold text-gray-400 dark:bg-gray-850"
                        >
                          Enrolled
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnroll(course._id)}
                          className="w-full rounded-lg bg-indigo-600 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                          Enroll Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* My Courses View */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {myTrainings.length === 0 ? (
            <p className="col-span-3 text-sm text-gray-500 text-center py-10">
              You haven't enrolled in any courses yet.
            </p>
          ) : (
            myTrainings.map((course) => {
              // Check if completed. In backend course.completedBy contains employeeId
              const isCompleted = false; // We can stub this or check course status
              return (
                <div
                  key={course._id}
                  className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                      {course.category}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {course.duration} hrs
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-950 dark:text-white mb-2">{course.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{course.description}</p>

                  <div className="border-t border-gray-100 pt-4 dark:border-gray-800 flex justify-between items-center">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <BookOpen className="h-4 w-4" /> In Progress
                    </span>
                    <button
                      onClick={() => handleMarkCompleted(course._id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Mark Completed
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Course to Catalog</h3>
            <form onSubmit={handleCreateTraining} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Course Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="technical">Technical</option>
                    <option value="soft_skills">Soft Skills</option>
                    <option value="compliance">Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Duration (hours)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
