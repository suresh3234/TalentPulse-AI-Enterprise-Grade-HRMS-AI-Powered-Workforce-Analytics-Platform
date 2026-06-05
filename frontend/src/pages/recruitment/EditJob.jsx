import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Briefcase, Building, MapPin, DollarSign, Calendar, ArrowLeft, Sparkles, Loader2, Plus, X } from "lucide-react";
import { updateJobPosting, analyzeJD } from "../../api/recruitmentService";
import API from "../../api/axiosInstance";
import Card from "../../components/Card";
import toast from "react-hot-toast";

export default function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [requiredExperience, setRequiredExperience] = useState(2);
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("Full-time");
  const [status, setStatus] = useState("Open");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [description, setDescription] = useState("");
  
  // Tag-based fields
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  
  const [preferredSkills, setPreferredSkills] = useState([]);
  const [preferredInput, setPreferredInput] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setFetching(true);
        const res = await API.get(`/recruitment/job/${id}`);
        const job = res.data?.data;
        if (job) {
          setTitle(job.title || "");
          setDepartment(job.department || "");
          setPosition(job.position || "");
          setRequiredExperience(job.requiredExperience || 0);
          setLocation(job.location || "");
          setJobType(job.jobType || "Full-time");
          setStatus(job.status || "Open");
          setDescription(job.description || "");
          setSkills(job.skills || []);
          setPreferredSkills(job.preferredSkills || []);
          setSalaryMin(job.salary?.min || "");
          setSalaryMax(job.salary?.max || "");
        }
      } catch (error) {
        toast.error("Failed to load job details.");
        navigate("/recruitment/jobs");
      } finally {
        setFetching(false);
      }
    };
    fetchJob();
  }, [id, navigate]);

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (tag) => {
    setSkills(skills.filter((s) => s !== tag));
  };

  const handleAddPreferred = (e) => {
    e.preventDefault();
    if (preferredInput.trim() && !preferredSkills.includes(preferredInput.trim())) {
      setPreferredSkills([...preferredSkills, preferredInput.trim()]);
      setPreferredInput("");
    }
  };

  const handleRemovePreferred = (tag) => {
    setPreferredSkills(preferredSkills.filter((s) => s !== tag));
  };

  const handleAIAnalyze = async () => {
    if (!description.trim()) {
      toast.error("Please draft a job description first.");
      return;
    }

    setAnalyzing(true);
    toast.loading("Analyzing job description with RecruitAI...", { id: "analyze" });

    try {
      const data = await analyzeJD(description);
      if (data) {
        if (data.requiredSkills && data.requiredSkills.length > 0) {
          setSkills(data.requiredSkills);
        }
        if (data.preferredSkills && data.preferredSkills.length > 0) {
          setPreferredSkills(data.preferredSkills);
        }
        if (data.requiredExperience) {
          setRequiredExperience(data.requiredExperience);
        }
        toast.success("Job description parsed successfully!", { id: "analyze" });
      }
    } catch (error) {
      toast.error(error.message || "AI Analysis failed.", { id: "analyze" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !department || !position || !location || !description) {
      toast.error("Please populate all required fields.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        description,
        department,
        position,
        requiredExperience: parseInt(requiredExperience),
        skills,
        preferredSkills,
        salary: {
          min: salaryMin ? parseInt(salaryMin) : undefined,
          max: salaryMax ? parseInt(salaryMax) : undefined,
        },
        location,
        jobType,
        status,
      };

      await updateJobPosting(id, payload);
      toast.success("Job opening updated successfully!");
      navigate("/recruitment/jobs");
    } catch (error) {
      toast.error(error.message || "Failed to update job posting.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-xl border border-gray-250 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-indigo-600" />
          Loading job details...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Go Back */}
      <div className="flex items-center justify-between">
        <Link
          to="/recruitment/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft size={14} />
          Back to list
        </Link>
        <span className="text-xs text-slate-400 font-semibold">Modify job listing</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[linear-gradient(135deg,#e11d48_0%,#4f46e5_100%)] p-2.5 text-white">
          <Briefcase size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Edit Job Opening</h1>
          <p className="text-xs text-slate-400">Modify vacancy attributes, customize requirements, and audit status settings.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-5 space-y-4 border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2">1. Core Particulars</h2>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Department *</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Position/Role *</label>
                  <input
                    type="text"
                    required
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Required Experience (Years) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={requiredExperience}
                    onChange={(e) => setRequiredExperience(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-4 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <h2 className="text-sm font-bold text-slate-900">2. Job Description *</h2>
                <button
                  type="button"
                  onClick={handleAIAnalyze}
                  disabled={analyzing || !description.trim()}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50 transition"
                >
                  {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Analyze with RecruitAI
                </button>
              </div>

              <div>
                <textarea
                  required
                  rows="8"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition resize-none leading-relaxed"
                />
              </div>
            </Card>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-6">
            <Card className="p-5 space-y-4 border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2">3. Compensation & Status</h2>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Location *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Employment Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition font-semibold"
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Temporary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Publishing Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition font-semibold"
                >
                  <option>Open</option>
                  <option>Closed</option>
                  <option>On Hold</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Salary Min ($)</label>
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Salary Max ($)</label>
                  <input
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-4 border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2">4. Required Skills Tagging</h2>
              
              {/* Core Skills */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Required Skills</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition active:scale-95"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {s}
                      <button type="button" onClick={() => handleRemoveSkill(s)} className="text-blue-500 hover:text-blue-700 font-bold">
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferred Skills */}
              <div className="space-y-2 pt-2 border-t border-slate-50">
                <label className="block text-xs font-bold text-slate-500 uppercase">Preferred Skills</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={preferredInput}
                    onChange={(e) => setPreferredInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddPreferred}
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition active:scale-95"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {preferredSkills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                      {s}
                      <button type="button" onClick={() => handleRemovePreferred(s)} className="text-teal-500 hover:text-teal-700 font-bold">
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            to="/recruitment/jobs"
            className="rounded-2xl border border-slate-200 hover:bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-8 py-3 text-sm font-bold text-white shadow transition disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
