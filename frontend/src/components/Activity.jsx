import { useState, useEffect } from "react";
import { getAttendanceActivities } from "../api/attendanceService";

const activities = [
  {
    name: "Sarah Jenkins",
    action: "Approved the Q3 Engineering budget",
    tag: "BUDGET",
    tagColor: "bg-blue-100 text-blue-700",
    time: "2 mins ago",
    avatar: "SJ",
    avatarColor: "from-violet-500 to-purple-400",
    dot: "bg-emerald-400",
  },
  {
    name: "David Miller",
    action: "Applied for 5 days of Annual Leave",
    tag: "LEAVES",
    tagColor: "bg-amber-100 text-amber-700",
    time: "1 hour ago",
    avatar: "DM",
    avatarColor: "from-orange-400 to-amber-300",
    dot: "bg-amber-400",
  },
  {
    name: "Elena Rodriguez",
    action: "Updated the Recruitment policy",
    tag: "POLICY",
    tagColor: "bg-gray-100 text-gray-600",
    time: "4 hours ago",
    avatar: "ER",
    avatarColor: "from-pink-500 to-rose-400",
    dot: "bg-blue-400",
  },
  {
    name: "System Bot",
    action: "Automated payroll processing started",
    tag: "SYSTEM",
    tagColor: "bg-primary-light text-primary",
    time: "6 hours ago",
    avatar: "JS",
    avatarColor: "from-slate-400 to-gray-500",
    dot: "bg-gray-300",
  },
];

export default function Activity() {
  const [activitiesData, setActivitiesData] = useState(activities);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await getAttendanceActivities();
        if (response.length > 0) {
          setActivitiesData(response);
        }
      } catch (err) {
        console.error("Error fetching activities:", err);
        // Fallback to static data
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {activitiesData.map((a, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${a.avatarColor} flex items-center justify-center text-white text-xs font-bold`}
            >
              {a.avatar}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${a.dot}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800">{a.name}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {a.action}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`badge text-[10px] font-bold tracking-wide ${a.tagColor}`}
              >
                {a.tag}
              </span>
              <span className="text-[10px] text-gray-400">{a.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
