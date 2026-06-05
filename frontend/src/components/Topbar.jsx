import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  CircleHelp,
  Menu,
  X,
  LayoutDashboard,
  BarChart3,
  Users,
  CreditCard,
  Briefcase,
  Settings,
  Calendar,
  ChevronDown,
  UserCircle2,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { logoutUser } from "../api/authService";
import { useTheme } from "../context/ThemeContext";
import { connectSocket, disconnectSocket, getSocket } from "../utils/socket";
import axiosInstance from "../api/axiosInstance";

const placeholders = {
  "/dashboard": "Search employee data...",
  "/analytics": "Search reports and insights...",
  "/employees": "Search employees...",
  "/payroll": "Search employee records...",
  "/attendance": "Search attendance records...",
  "/recruitment": "Search candidates, roles...",
  "/leave": "Search leave records...",
  "/settings": "Search settings...",
};

const pageMeta = {
  "/dashboard": { title: "Dashboard", subtitle: "Monitor AI-driven workforce insights" },
  "/analytics": { title: "AI Analytics", subtitle: "Explore smart reports and HR decision insights" },
  "/employees": { title: "Employees", subtitle: "Manage employee directory and structure" },
  "/payroll": { title: "Payroll", subtitle: "Track salaries, attendance, and payouts" },
  "/recruitment": { title: "Recruitment", subtitle: "Review candidate fit and hiring flow" },
  "/leave": { title: "Leave Management", subtitle: "Review leave requests and balances" },
  "/settings": { title: "Settings", subtitle: "Update account and workspace preferences" },
};

const mobileNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/employees", icon: Users, label: "Employees" },
  { to: "/payroll", icon: CreditCard, label: "Payroll" },
  { to: "/recruitment", icon: Briefcase, label: "Recruitment" },
  { to: "/leave", icon: Calendar, label: "Leave" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const quickLinks = [
  { label: "Directory", to: "/employees" },
  { label: "Reports", to: "/analytics" },
  { label: "Policies", to: "/leave" },
];

const searchRouteMap = [
  { keywords: ["employee", "staff", "department", "team", "user"], to: "/employees" },
  { keywords: ["analytics", "report", "insight", "summary", "trend"], to: "/analytics" },
  { keywords: ["payroll", "salary", "payment", "attendance", "payslip"], to: "/payroll" },
  { keywords: ["candidate", "job", "recruitment", "hiring", "skill"], to: "/recruitment" },
  { keywords: ["leave", "vacation", "holiday"], to: "/leave" },
  { keywords: ["setting", "profile", "account", "preference"], to: "/settings" },
];

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const formatRole = (role) => {
  if (!role) return "Employee";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const createInitials = (fullName) =>
  String(fullName || "HR")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "HR";

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const profileRef = useRef(null);
  const helpRef = useRef(null);
  const notificationRef = useRef(null);
  const storedUser = useMemo(() => readStoredUser(), []);
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  const filteredMobileNav = useMemo(() => {
    const role = storedUser.role || "employee";
    return mobileNav.filter((item) => {
      if (role === "admin") return true;
      if (role === "manager") {
        return ["Dashboard", "Analytics", "Employees", "Leave", "Settings"].includes(item.label);
      }
      if (role === "recruiter") {
        return ["Dashboard", "Employees", "Recruitment", "Leave", "Settings"].includes(item.label);
      }
      if (role === "employee") {
        return ["Dashboard", "Leave", "Settings"].includes(item.label);
      }
      return ["Dashboard", "Leave", "Settings"].includes(item.label);
    });
  }, [storedUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setHelpOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load persisted notifications from the API
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setNotifications([]);
      return;
    }

    const loadNotifications = async () => {
      try {
        setNotificationError("");
        const res = await axiosInstance.get("/notifications/my", { params: { limit: 10 } });
        const items = res.data?.data || [];
        setNotifications(items);
        setUnreadCount(res.data?.unreadCount || 0);
      } catch (error) {
        setNotificationError("Could not load notifications.");
      }
    };

    loadNotifications();
  }, [pathname]);

  // Socket.IO: connect when user is present, listen for real-time notifications
  useEffect(() => {
    const userId = storedUser?._id || storedUser?.id;
    if (!userId) return;

    connectSocket(userId);
    const socket = getSocket();

    const handleIncomingNotification = (data) => {
      // Prepend the new notification to the list
      setNotifications((prev) => [{ ...data, read: false }, ...prev].slice(0, 15));
      setUnreadCount((c) => c + 1);
    };

    socket.on("notification", handleIncomingNotification);

    return () => {
      socket.off("notification", handleIncomingNotification);
    };
  }, [storedUser]);

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  useEffect(() => {
    const handleSessionExpired = () => {
      setNotifications([]);
      setNotificationError("");
      disconnectSocket();
    };

    window.addEventListener("hrms:session-expired", handleSessionExpired);
    return () => window.removeEventListener("hrms:session-expired", handleSessionExpired);
  }, []);

  const currentPage = pageMeta[pathname] || pageMeta["/dashboard"];
  const initials = createInitials(storedUser.fullName);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return;
    }

    const matchedRoute = searchRouteMap.find((entry) =>
      entry.keywords.some((keyword) => query.includes(keyword)),
    );

    navigate(matchedRoute?.to || "/dashboard");
    setSearchValue("");
  };

  const handleLogout = () => {
    logoutUser();
    disconnectSocket();
    navigate("/login");
  };

  return (
    <>
      <header className="border-b border-border/60 bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button className="text-gray-500 md:hidden" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">{currentPage.title}</div>
            <div className="hidden text-xs text-gray-400 sm:block">{currentPage.subtitle}</div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative ml-auto hidden max-w-md flex-1 md:block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={placeholders[pathname] || "Search..."}
              className="w-full rounded-xl border border-border bg-sidebar py-2 pl-9 pr-4 text-sm text-gray-600 placeholder-gray-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          <nav className="hidden items-center gap-5 text-sm font-medium text-gray-500 lg:flex">
            {quickLinks.map((item) => (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className="transition hover:text-gray-800"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-sidebar"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <div className="relative" ref={helpRef}>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-sidebar"
                onClick={() => {
                  setHelpOpen((current) => !current);
                  setNotificationsOpen(false);
                  setProfileOpen(false);
                }}
              >
                <CircleHelp size={17} />
              </button>

              {helpOpen ? (
                <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
                  <button
                    onClick={() => {
                      navigate("/analytics");
                      setHelpOpen(false);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50"
                  >
                    Open analytics guide
                  </button>
                  <button
                    onClick={() => {
                      navigate("/recruitment");
                      setHelpOpen(false);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50"
                  >
                    View recruitment assistant
                  </button>
                  <button
                    onClick={() => {
                      navigate("/leave");
                      setHelpOpen(false);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50"
                  >
                    Review leave workflow
                  </button>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={notificationRef}>
              <button
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-sidebar"
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setHelpOpen(false);
                  setProfileOpen(false);
                }}
              >
                <Bell size={17} />
                {notifications.length > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                    {unreadCount || notifications.length}
                  </span>
                ) : null}
              </button>

              {notificationsOpen ? (
                <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-gray-100 bg-white shadow-xl dark:bg-gray-900 dark:border-gray-800">
                  <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</div>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                    {notificationError ? (
                      <div className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700 m-1 dark:bg-orange-900/30 dark:text-orange-300">
                        {notificationError}
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.slice(0, 8).map((item, idx) => (
                        <button
                          key={item._id || idx}
                          onClick={() => {
                            if (item.link) navigate(item.link);
                            setNotificationsOpen(false);
                          }}
                          className={`w-full text-left rounded-xl p-3 transition hover:bg-gray-50 dark:hover:bg-gray-800 flex items-start gap-2.5 ${!item.read ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : ''}`}
                        >
                          <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${!item.read ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.title}</div>
                            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.message}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-3 text-xs text-emerald-700 dark:text-emerald-300 m-1 text-center">
                        You're all caught up! 🎉
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative ml-2" ref={profileRef}>
              <button
                onClick={() => {
                  setProfileOpen((current) => !current);
                  setHelpOpen(false);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 rounded-2xl border border-transparent px-1.5 py-1 transition hover:border-gray-200 hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 bg-gradient-to-br from-primary to-indigo-400 text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="hidden text-left lg:block">
                  <div className="text-xs font-semibold text-gray-800">
                    {storedUser.fullName || "HRMS User"}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {formatRole(storedUser.role)}
                  </div>
                </div>
                <ChevronDown size={14} className="hidden text-gray-400 lg:block" />
              </button>

              {profileOpen ? (
                <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {storedUser.fullName || "HRMS User"}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {storedUser.email || "No email available"}
                    </div>
                    <div className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {formatRole(storedUser.role)}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <button
                      onClick={() => {
                        navigate("/settings");
                        setProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50"
                    >
                      <Settings size={16} />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        navigate("/employees");
                        setProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50"
                    >
                      <UserCircle2 size={16} />
                      Employee Directory
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-3 md:hidden">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={placeholders[pathname] || "Search..."}
              className="w-full rounded-xl border border-border bg-sidebar py-2 pl-9 pr-4 text-sm text-gray-600 placeholder-gray-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </form>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="font-display text-lg font-semibold text-primary">HRMS Elite</div>
                <div className="text-xs text-gray-400">{storedUser.fullName || "Workspace menu"}</div>
              </div>
              <button onClick={() => setMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {filteredMobileNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                        isActive ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"
                      }`
                    }
                  >
                    <Icon size={17} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-semibold text-gray-900">{storedUser.fullName || "HRMS User"}</div>
              <div className="mt-1 text-xs text-gray-500">{storedUser.email || "No email available"}</div>
              <button
                onClick={handleLogout}
                className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
