import { useEffect, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building, MapPin, DollarSign, Calendar, Edit3, Trash2, Plus, Sparkles, Filter, Search, ArrowRight } from "lucide-react";
import { getJobPostings, deleteJobPosting } from "../../api/recruitmentService";
import Card from "../../components/Card";
import toast from "react-hot-toast";

export default function JobOpenings() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [isPending, startTransition] = useTransition();

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await getJobPostings({ limit: 100 });
      setJobs(data);
    } catch (error) {
      toast.error(error.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the job opening: ${title}?`)) return;
    try {
      await deleteJobPosting(id);
      toast.success("Job posting deleted successfully!");
      setJobs((prev) => prev.filter((j) => j._id !== id));
    } catch (error) {
      toast.error(error.message || "Failed to delete job posting");
    }
  };

  const departments = ["All", ...new Set(jobs.map((j) => j.department).filter(Boolean))];

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === "All" || job.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#1e3a8a_50%,#0f766e_100%)] p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90">
              <Sparkles size={13} className="text-amber-300" />
              Enterprise recruitment
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Job Openings Management</h1>
            <p className="mt-2 text-sm text-white/70 max-w-xl">
              Create, customize, and audit job postings, map technical skill gaps, and audit candidate pipeline stages.
            </p>
          </div>
          <Link
            to="/recruitment/jobs/create"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-slate-50 px-5 py-3 text-sm font-bold text-slate-900 shadow-md transition hover:scale-[1.02] active:scale-95 self-start sm:self-center"
          >
            <Plus size={16} />
            Create Job Opening
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="p-4 sm:p-5 border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 flex-1 max-w-md">
            <Search size={16} className="text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, location, or department..."
              className="w-full text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 mr-1">Department:</span>
            <div className="flex flex-wrap gap-1.5">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => startTransition(() => setDepartmentFilter(dept))}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    departmentFilter === dept
                      ? "bg-slate-950 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Jobs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-[24px] bg-slate-100 h-56" />
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <Card
              key={job._id}
              className="group border border-slate-100 p-5 hover:shadow-md transition-all duration-200 hover:border-blue-100 flex flex-col justify-between"
            >
              <div>
                {/* Upper row: department & status */}
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {job.department}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                      job.status === "Open"
                        ? "bg-emerald-100 text-emerald-700"
                        : job.status === "On Hold"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                  {job.title}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">{job.position}</p>

                {/* Info row */}
                <div className="mt-4 space-y-2.5 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-slate-400" />
                    <span>{job.location} · {job.jobType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={13} className="text-slate-400" />
                    <span>
                      {job.salary?.min ? `$${(job.salary.min / 1000).toFixed(0)}k` : "$0"} -{" "}
                      {job.salary?.max ? `$${(job.salary.max / 1000).toFixed(0)}k` : "No limit"} / year
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase size={13} className="text-slate-400" />
                    <span>{job.requiredExperience}+ years experience required</span>
                  </div>
                </div>

                {/* Skills tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {job.skills?.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                      {skill}
                    </span>
                  ))}
                  {job.skills?.length > 3 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                      +{job.skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between gap-2">
                <Link
                  to={`/recruitment`}
                  onClick={() => localStorage.setItem("selectedJobId", job._id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition"
                >
                  Applicants
                  <ArrowRight size={13} />
                </Link>

                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/recruitment/jobs/edit/${job._id}`}
                    className="rounded-xl border border-slate-150 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                    title="Edit Job"
                  >
                    <Edit3 size={13} />
                  </Link>
                  <button
                    onClick={() => handleDelete(job._id, job.title)}
                    className="rounded-xl border border-rose-100 p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                    title="Delete Job"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center border border-dashed border-slate-200">
          <Briefcase size={40} className="mx-auto text-slate-400" />
          <h3 className="mt-4 text-base font-bold text-slate-800">No Job Openings Found</h3>
          <p className="mt-1 text-xs text-slate-400">Try creating a job opening or adjusting your search filters.</p>
        </Card>
      )}
    </div>
  );
}
