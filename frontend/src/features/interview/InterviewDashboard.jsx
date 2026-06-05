import React, { useEffect, useState } from "react";
import Card from "../../components/Card";
import SkillRadarChart from "./SkillRadarChart";
import CandidateComparison from "./CandidateComparison";
import API from "../../api/axiosInstance";
import toast from "react-hot-toast";
import { Calendar, Video, Award, Clock, FileText, CheckCircle2, UserCheck, AlertTriangle, Play, Download, Search, RefreshCw, BarChart2 } from "lucide-react";

export default function InterviewDashboard() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  
  // Selected interview full report details
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [recruiterNotes, setRecruiterNotes] = useState("");

  // Scheduling Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    candidateId: "",
    jobId: "",
    scheduledAt: "",
  });

  // Active view tab (listings vs comparison)
  const [activeDashboardTab, setActiveDashboardTab] = useState("interviews"); // "interviews" | "comparison"

  // Fetch interviews list
  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await API.get("/interview");
      setInterviews(res.data?.data || []);
    } catch (err) {
      toast.error("Failed to load interview list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
    
    // Load dropdown info for scheduling
    API.get("/recruitment/application").then((res) => setApplications(res.data?.data || [])).catch(console.error);
    API.get("/recruitment/job").then((res) => setJobs(res.data?.data || [])).catch(console.error);
  }, []);

  // Load detailed report when selected
  useEffect(() => {
    if (!selectedInterviewId) {
      setReportData(null);
      return;
    }

    const fetchReport = async () => {
      try {
        setLoadingReport(true);
        const res = await API.get(`/interview/${selectedInterviewId}`);
        setReportData(res.data?.data);
        setRecruiterNotes(res.data?.data?.session?.candidateId?.feedback || "");
      } catch (err) {
        toast.error("Failed to load completed interview scorecard.");
      } finally {
        setLoadingReport(false);
      }
    };
    fetchReport();
  }, [selectedInterviewId]);

  // Handle autosave of HR notes
  const saveRecruiterNotes = async (notesVal) => {
    try {
      await API.put(`/interview/${selectedInterviewId}/notes`, { notes: notesVal });
    } catch (err) {
      logger.error("Autosave of notes failed.");
    }
  };

  // Trigger pipeline decision (Advance / Reject)
  const submitHiringDecision = async (decision) => {
    try {
      toast.loading(`Updating pipeline status to ${decision}...`, { id: "decision" });
      await API.post(`/interview/${selectedInterviewId}/decision`, { decision });
      toast.success(`Candidate status updated successfully!`, { id: "decision" });
      
      // Refresh report
      const res = await API.get(`/interview/${selectedInterviewId}`);
      setReportData(res.data?.data);
      fetchInterviews();
    } catch (err) {
      toast.error("Failed to submit status update.", { id: "decision" });
    }
  };

  // Submit interview schedule
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleForm.candidateId || !scheduleForm.jobId || !scheduleForm.scheduledAt) {
      toast.error("Please fill out all scheduling fields.");
      return;
    }

    try {
      toast.loading("Scheduling live call and emailing candidate invitation...", { id: "scheduling" });
      await API.post("/interview/schedule", scheduleForm);
      toast.success("Interview invitation sent successfully!", { id: "scheduling" });
      
      setShowScheduleModal(false);
      setScheduleForm({ candidateId: "", jobId: "", scheduledAt: "" });
      fetchInterviews();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to schedule live interview.", { id: "scheduling" });
    }
  };

  // Download PDF/CSV evaluations
  const downloadReport = async (format) => {
    if (!reportData?.session?.candidateId?._id) return;
    try {
      const dbId = reportData.session.candidateId._id;
      const downloadUrl = `${API.defaults.baseURL || "http://localhost:5000/api"}/recruitment/application/${dbId}/report/${format}`;
      
      // Open in tab to trigger browser download dialog
      window.open(downloadUrl, "_blank");
      toast.success(`Downloading candidate evaluation ${format.toUpperCase()}...`);
    } catch (e) {
      toast.error("Failed to generate report export.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header bar */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
            <Video className="text-indigo-600" size={22} />
            Live Interview Management Suite
          </h2>
          <p className="text-xs text-gray-500">Schedule real-time calls, coordinate WebRTC rooms, and review AI transcription scorecard models.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveDashboardTab(activeDashboardTab === "interviews" ? "comparison" : "interviews")}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <BarChart2 size={14} />
            {activeDashboardTab === "interviews" ? "Candidate Comparison" : "Interview List"}
          </button>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/10 transition active:scale-95 flex items-center gap-1"
          >
            <Calendar size={14} />
            Schedule Live Interview
          </button>
        </div>
      </div>

      {activeDashboardTab === "comparison" ? (
        <CandidateComparison 
          candidates={interviews.filter(i => i.status === "completed").map((i, idx) => ({
            applicationId: i.candidateId?._id,
            candidateName: i.candidateId?.candidateName,
            experience: i.candidateId?.experience || 0,
            currentCompany: i.candidateId?.currentCompany,
            matchPercentage: i.candidateId?.aiScore || 70,
            aiGrade: i.candidateId?.aiGrade,
            hiringSuggestion: i.candidateId?.aiEvaluation?.feedback || "Completed live interview.",
            overlappingSkills: i.candidateId?.parsedResume?.skills || [],
            missingSkills: i.jobId?.skills?.filter(s => !(i.candidateId?.parsedResume?.skills || []).includes(s)) || [],
          }))} 
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: INTERVIEWS LIST */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="bg-white border-slate-100 p-4 rounded-3xl shadow-sm space-y-3">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Interview Log</h3>
              
              <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto pr-1">
                {interviews.map((item) => {
                  const isSelected = selectedInterviewId === item._id;
                  const dateStr = new Date(item.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                  
                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedInterviewId(item._id)}
                      className={`py-3.5 px-2 cursor-pointer transition rounded-2xl flex flex-col gap-2 ${
                        isSelected ? "bg-indigo-50/40" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 leading-tight">
                            {item.candidateId?.candidateName || "Deleted Candidate"}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.jobId?.title || "Target Job"}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "in-progress"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {dateStr}
                        </span>
                        {item.status === "scheduled" && (
                          <a
                            href={`/candidate/interview/live?token=${item._id}`}
                            className="text-indigo-600 hover:underline flex items-center gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Play size={10} /> Room Link
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}

                {interviews.length === 0 && (
                  <p className="text-xs text-slate-500 italic py-6 text-center">No scheduled interviews found.</p>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: SCORING & REPORT DETAIL */}
          <div className="lg:col-span-8">
            {reportData ? (
              <Card className="bg-white border-slate-100 p-6 rounded-[32px] shadow-sm space-y-6">
                
                {/* Scorecard Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4 flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{reportData.session?.candidateId?.candidateName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Live Assessment for <strong>{reportData.session?.jobId?.title}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadReport("pdf")}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-1"
                    >
                      <Download size={12} /> PDF Report
                    </button>
                    <button
                      onClick={() => downloadReport("csv")}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-1"
                    >
                      <Download size={12} /> CSV data
                    </button>
                  </div>
                </div>

                {reportData.session?.status !== "completed" ? (
                  <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-3xl space-y-3">
                    <Video className="mx-auto text-slate-300" size={36} />
                    <p>This interview has not occurred yet or is scheduled to begin.</p>
                    <p className="text-[10px] text-slate-400">Scheduled time: {new Date(reportData.session?.scheduledAt).toLocaleString()}</p>
                    <a
                      href={`/candidate/interview/live?token=${reportData.session?._id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow mt-2"
                    >
                      <Play size={12} /> Join Live Call
                    </a>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Media Video Playback + Synced Transcript */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                      
                      {/* Recorded video player container */}
                      <div className="md:col-span-7 rounded-2xl bg-slate-950 border border-slate-900 aspect-video flex flex-col justify-center items-center relative overflow-hidden group shadow-md">
                        <video 
                          src={reportData.session?.recordingUrl || "/uploads/mock_recording.webm"} 
                          controls 
                          className="w-full h-full object-cover" 
                        />
                      </div>

                      {/* Synced dialogue log */}
                      <div className="md:col-span-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 max-h-[220px] overflow-y-auto flex flex-col gap-2">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Conversation Log</span>
                        <div className="space-y-2">
                          <div className="text-[11px] leading-relaxed text-slate-600 italic">
                            {reportData.session?.transcriptRaw || "No dialogue captured."}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Skill Radar Chart & Scores */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-6">
                        <SkillRadarChart skillScores={reportData.skillScores?.reduce((acc, doc) => {
                          acc[doc.skillName] = { score: doc.score };
                          return acc;
                        }, {})} />
                      </div>

                      <div className="md:col-span-6 space-y-4">
                        <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Skill Matching Evidence</h4>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {reportData.skillScores?.map((scoreObj) => (
                            <div key={scoreObj._id} className="text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100/50 space-y-1">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-slate-800">{scoreObj.skillName}</span>
                                <span className="text-indigo-600">{scoreObj.score}/10</span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-relaxed"><strong>Evidence:</strong> {scoreObj.evidence}</p>
                              {scoreObj.gaps && <p className="text-[10px] text-amber-600 leading-relaxed"><strong>Gap:</strong> {scoreObj.gaps}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* AI evaluation text (3-paragraph summary) */}
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                        <Sparkles size={13} className="text-indigo-500" />
                        AI Summary & Cognitive Assessment
                      </h4>
                      <div className="text-xs text-slate-700 leading-relaxed space-y-3.5 justify-between">
                        {reportData.session?.aiSummary ? (
                          reportData.session.aiSummary.split("\n\n").map((para, i) => (
                            <p key={i}>{para}</p>
                          ))
                        ) : (
                          <p>Consolidation analysis report is being computed.</p>
                        )}
                      </div>
                    </div>

                    {/* Recruiter Notes Input & Action triggers */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4 border-t border-slate-100 items-start">
                      <div className="md:col-span-7 flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">HR Recruiter Feedback Notes</span>
                        <textarea
                          value={recruiterNotes}
                          onChange={(e) => {
                            setRecruiterNotes(e.target.value);
                            saveRecruiterNotes(e.target.value);
                          }}
                          placeholder="Type candidate comments. Changes autosave automatically."
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700 outline-none w-full min-h-[90px] focus:border-indigo-300 transition"
                        />
                      </div>

                      <div className="md:col-span-5 flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Hiring Pipeline Action</span>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            onClick={() => submitHiringDecision("Shortlisted")}
                            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition active:scale-95"
                          >
                            Advance
                          </button>
                          <button
                            onClick={() => submitHiringDecision("Rejected")}
                            className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow transition active:scale-95"
                          >
                            Reject
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 italic text-center">Selecting a decision updates candidate status and dispatches automated email updates.</p>
                      </div>
                    </div>

                  </div>
                )}
              </Card>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-[32px] p-12 text-center text-slate-400 text-sm italic">
                Select a candidate's scheduled interview session from the list on the left to render the visual scoring details.
              </div>
            )}
          </div>

        </div>
      )}

      {/* SCHEDULING DIALOG MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-white border-slate-100 p-6 max-w-md w-full rounded-[32px] shadow-2xl space-y-5 animate-scale-up">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">Schedule WebRTC Interview</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-600">Select Candidate</label>
                <select
                  value={scheduleForm.candidateId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, candidateId: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 outline-none text-slate-700"
                  required
                >
                  <option value="">-- Choose Candidate --</option>
                  {applications.map((app) => (
                    <option key={app._id} value={app._id}>
                      {app.candidateName} ({app.candidateEmail})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-600">Select Position</label>
                <select
                  value={scheduleForm.jobId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, jobId: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 outline-none text-slate-700"
                  required
                >
                  <option value="">-- Choose Job Posting --</option>
                  {jobs.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.title} ({job.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-600">Interview Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 outline-none text-slate-700"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
                >
                  Schedule Call & Send Invitation
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
