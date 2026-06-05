import { NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Briefcase,
  Calendar,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Rocket,
  Settings,
  Users,
  Award,
  BookOpen,
  Heart,
  UserPlus,
  UserMinus,
  Network,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/analytics", icon: BarChart3, label: "AI Analytics" },
  { to: "/employees", icon: Users, label: "Employees" },
  { to: "/payroll", icon: CreditCard, label: "Payroll" },
  { to: "/recruitment", icon: Briefcase, label: "Recruitment Pipeline" },
  { to: "/recruitment/jobs", icon: Briefcase, label: "Job Openings" },
  { to: "/recruitment/interviews", icon: Calendar, label: "Live Interviews" },
  { to: "/performance", icon: Award, label: "Performance OKRs" },
  { to: "/training", icon: BookOpen, label: "Training & Dev" },
  { to: "/benefits", icon: Heart, label: "Benefits Plan" },
  { to: "/onboarding", icon: UserPlus, label: "Onboarding Checklist" },
  { to: "/offboarding", icon: UserMinus, label: "Offboarding" },
  { to: "/org-chart", icon: Network, label: "Org Chart" },
  { to: "/leave", icon: Calendar, label: "Leave Management" },
  { to: "/devops", icon: Activity, label: "System Monitor" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export default function Sidebar() {
  const storedUser = readStoredUser();
  const role = storedUser.role || "employee";

  const filteredNavItems = navItems.filter((item) => {
    if (role === "admin") return true;
    if (role === "manager") {
      return ["Dashboard", "AI Analytics", "Employees", "Job Openings", "Live Interviews", "Performance OKRs", "Training & Dev", "Org Chart", "Leave Management", "Settings"].includes(item.label);
    }
    if (role === "recruiter") {
      return ["Dashboard", "Employees", "Recruitment Pipeline", "Job Openings", "Live Interviews", "Onboarding Checklist", "Offboarding", "Leave Management", "Settings"].includes(item.label);
    }
    if (role === "employee") {
      return ["Dashboard", "Performance OKRs", "Training & Dev", "Benefits Plan", "Onboarding Checklist", "Leave Management", "Settings"].includes(item.label);
    }
    return ["Dashboard", "Leave Management", "Settings"].includes(item.label);
  });

  const getRoleLabel = (role) => {
    if (role === "admin") return "Management Admin";
    if (role === "manager") return "Senior Manager";
    if (role === "recruiter") return "HR Recruiter";
    return "Employee";
  };

  return (
    <aside className="hidden md:flex flex-col w-56 bg-sidebar border-r border-border/60 py-5 px-3 flex-shrink-0">
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
          <Rocket size={18} className="text-white" />
        </div>
        <div>
          <div className="font-display font-700 text-sm text-gray-900 leading-none">
            HRMS Elite
          </div>
          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">
            {getRoleLabel(role)}
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-indigo-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-150"
                }`
              }
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <button className="flex items-center gap-2.5 px-4 py-2.5 mt-4 rounded-xl text-sm text-gray-500 hover:bg-white hover:text-gray-700 transition-all">
        <LifeBuoy size={17} />
        <span>Support Portal</span>
      </button>
    </aside>
  );
}
