import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Mail, ShieldCheck, UserCircle2, Bell, Moon, Sun, Monitor, Laptop, Globe, Key, Smartphone } from "lucide-react";
import Card from "../components/Card";
import { logoutUser } from "../api/authService";
import { useTheme } from "../context/ThemeContext";

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export default function Settings() {
  const navigate = useNavigate();
  const user = readStoredUser();
  const { theme, toggleTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState("profile");
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weeklyReport: false,
    aiAlerts: true
  });

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const handleToggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account preferences, notifications, and application appearance.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1">
          <button 
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition ${activeTab === "profile" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"}`}
          >
            <UserCircle2 size={18} />
            Profile & Account
          </button>
          <button 
            onClick={() => setActiveTab("appearance")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition ${activeTab === "appearance" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"}`}
          >
            <Laptop size={18} />
            Appearance
          </button>
          <button 
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition ${activeTab === "notifications" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"}`}
          >
            <Bell size={18} />
            Notifications
          </button>
          <button 
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition ${activeTab === "security" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"}`}
          >
            <ShieldCheck size={18} />
            Security
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg">
                    {user.fullName ? user.fullName.charAt(0) : "U"}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {user.fullName || "HRMS User"}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Mail size={14} />
                      {user.email || "No email available"}
                    </div>
                    <div className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      {user.role || "employee"}
                    </div>
                  </div>
                  <button className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition">
                    Edit Profile
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Full Name</label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700">{user.fullName || "N/A"}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email Address</label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700">{user.email || "N/A"}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 capitalize">{user.role || "N/A"}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Timezone</label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                      <Globe size={14} className="text-gray-400" />
                      UTC (Auto-detected)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Theme Preferences</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose how HRMS looks to you.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => theme !== "light" && toggleTheme()}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition ${theme === "light" ? "border-indigo-600 bg-indigo-50/50" : "border-gray-200 hover:border-indigo-300 dark:border-gray-700 dark:hover:border-indigo-500"}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sun size={18} className={theme === "light" ? "text-indigo-600" : "text-gray-400"} />
                        <span className="font-semibold text-gray-900 dark:text-white">Light Mode</span>
                      </div>
                      <div className={`h-4 w-4 rounded-full border ${theme === "light" ? "border-indigo-600 bg-indigo-600 ring-2 ring-indigo-200 ring-offset-1" : "border-gray-300"}`} />
                    </div>
                    <div className="rounded-lg bg-gray-100 p-2 shadow-inner h-20 w-full overflow-hidden flex flex-col gap-1.5">
                      <div className="h-3 w-1/3 rounded-full bg-gray-300" />
                      <div className="h-10 w-full rounded-md bg-white shadow-sm" />
                    </div>
                  </div>

                  <div 
                    onClick={() => theme !== "dark" && toggleTheme()}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition ${theme === "dark" ? "border-indigo-600 bg-indigo-900/20" : "border-gray-200 hover:border-indigo-300 dark:border-gray-700 dark:hover:border-indigo-500"}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Moon size={18} className={theme === "dark" ? "text-indigo-400" : "text-gray-400"} />
                        <span className="font-semibold text-gray-900 dark:text-white">Dark Mode</span>
                      </div>
                      <div className={`h-4 w-4 rounded-full border ${theme === "dark" ? "border-indigo-500 bg-indigo-500 ring-2 ring-indigo-900 ring-offset-1 ring-offset-gray-900" : "border-gray-300 dark:border-gray-600"}`} />
                    </div>
                    <div className="rounded-lg bg-gray-900 p-2 shadow-inner h-20 w-full overflow-hidden flex flex-col gap-1.5 border border-gray-800">
                      <div className="h-3 w-1/3 rounded-full bg-gray-700" />
                      <div className="h-10 w-full rounded-md bg-gray-800 shadow-sm border border-gray-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Notification Settings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Control how and when you want to be notified.</p>
                
                <div className="space-y-4">
                  {[
                    { key: "email", title: "Email Notifications", desc: "Receive daily digests and urgent alerts via email.", icon: Mail },
                    { key: "push", title: "Push Notifications", desc: "Get real-time alerts in your browser while using HRMS.", icon: Monitor },
                    { key: "aiAlerts", title: "AI Smart Alerts", desc: "Receive predictive insights about employee performance and flight risks.", icon: Bell },
                    { key: "weeklyReport", title: "Weekly Analytics Report", desc: "Receive a comprehensive summary of HR metrics every Monday.", icon: ShieldCheck }
                  ].map(item => (
                    <div key={item.key} className="flex items-start justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <div className="flex gap-3">
                        <div className="mt-1 text-gray-400"><item.icon size={18} /></div>
                        <div>
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">{item.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleToggleNotification(item.key)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${notifications[item.key] ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifications[item.key] ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Security & Sessions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manage your security preferences and active sessions.</p>
                
                <div className="mb-8 space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex gap-3 items-center">
                      <Key size={18} className="text-gray-400" />
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">Change Password</div>
                        <div className="text-xs text-gray-500">Update your password to keep your account secure.</div>
                      </div>
                    </div>
                    <button className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition">Update</button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex gap-3 items-center">
                      <Smartphone size={18} className="text-gray-400" />
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">Two-Factor Authentication (2FA)</div>
                        <div className="text-xs text-gray-500">Add an extra layer of security to your account.</div>
                      </div>
                    </div>
                    <button className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">Enable</button>
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Active Session</h4>
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <Laptop size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-2">
                        Windows PC (Current Session)
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      </div>
                      <div className="text-xs text-gray-500">IP: 192.168.1.100 • Last active: Just now</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Sign Out</h4>
                      <p className="text-xs text-gray-500 mt-1">Sign out of your current session on this device.</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
