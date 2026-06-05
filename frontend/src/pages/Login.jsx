import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/authService";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

const previewCard = "glass-panel border border-white/10 rounded-2xl bg-white/5";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await loginUser(form);

      if (!response?.token) {
        throw new Error("Login failed");
      }

      toast.success("Login successful! Redirecting...");
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError.message);
      toast.error(submitError.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-2 bg-[#f8f9ff] overflow-hidden">
      <Toaster position="top-right" />

      {/* Left side form */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      className="flex flex-col justify-start md:justify-center px-4 sm:px-8 lg:px-20 pt-8 sm:pt-10 h-full overflow-hidden max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl w-full"
      >
        <div className="mb-0 flex items-center gap-3">
         <div className="primary-gradient flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-xl shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-2xl text-white">
              architecture
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">
            Yumaris
          </h1>
        </div>

        <h2 className="mb-2 text-3xl font-bold text-[#0b1c30]">
          Secure workforce management
        </h2>
        <p className="mb-4 text-gray-500">
          Log in to your enterprise account to continue.
        </p>

        {error ? <p className="mb-4 text-red-500">{error}</p> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="ml-1 text-[0.6875rem] font-bold uppercase tracking-widest">
            Work Email
          </label>
          <input
            type="email"
            name="email"
            placeholder="name@company.com"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-md bg-white p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-transform duration-200 focus:scale-105"
            required
          />

          <label className="ml-1 text-[0.6875rem] font-bold uppercase tracking-widest">
            Password
          </label>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-md bg-white p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-transform duration-200 focus:scale-105"
            required
          />

          <div className="flex justify-between text-sm text-gray-500">
            <label>
              <input type="checkbox" className="mr-2" />
              Remember me
            </label>
            <Link to="/forgot" className="text-indigo-600">
              Forgot Password?
            </Link>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 py-3 font-medium text-white shadow-lg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Access Dashboard"}
          </motion.button>
        </form>

        <p className="mt-5 text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-indigo-600">
            Register
          </Link>
        </p>

        {/* Footer */}
        <footer className="flex flex-wrap gap-5 px-4 md:px-12 py-7 mt-auto">
          <span className="hidden md:inline text-slate-500 font-medium text-xs uppercase tracking-widest transition-all duration-200 cursor-default">
            © 2026 YUMARIS TECHNOLOGIES. ALL RIGHTS RESERVED.
          </span>
          <div className="flex gap-6 ml-auto">
            <a
              className="text-slate-500 hover:text-indigo-600 font-medium text-xs uppercase tracking-widest transition-all duration-200"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="text-slate-500 hover:text-indigo-600 font-medium text-xs uppercase tracking-widest transition-all duration-200"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="text-slate-500 hover:text-indigo-600 font-medium text-xs uppercase tracking-widest transition-all duration-200"
              href="#"
            >
              Security
            </a>
          </div>
        </footer>
      </motion.div>

      {/* Right side hero */}
      <motion.section
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
       className="relative hidden md:flex flex-1 items-start justify-center overflow-hidden bg-primary pt-6 md:pt-10 pb-4 md:pb-6 px-4 md:px-6 lg:px-12 h-full"
      >
        <div className="primary-gradient absolute inset-0 opacity-90" />
        <div className="absolute md:-right-24 md:-top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute md:-bottom-24 md:-left-24 h-80 w-80 rounded-full bg-secondary-container/30 blur-3xl" />

        <div className="relative z-10 w-full max-w-2xl flex flex-col justify-start h-full space-y-6">
          {/* Headline */}
          <div className="space-y-6 text-white">
            <span className="inline-block rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-[0.6875rem] font-bold uppercase tracking-widest backdrop-blur-sm">
              Enterprise Suite
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight">
              Manage Employees Smarter
            </h2>
            <p className="max-w-xl text-md font-medium leading-relaxed text-on-primary-container">
              Track attendance, payroll, and performance in one unified
              platform. Built for modern enterprise teams.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 lg:gap-6 text-white">
            <motion.div whileHover={{ scale: 1.05 }} className="p-4 rounded-xl bg-white/10">
              <span className="material-symbols-outlined">schedule</span>
              <p className="mt-2 text-sm font-medium">Smart Attendance</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} className="p-4 rounded-xl bg-white/10">
              <span className="material-symbols-outlined">payments</span>
              <p className="mt-2 text-sm font-medium">Payroll Automation</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} className="p-4 rounded-xl bg-white/10">
              <span className="material-symbols-outlined">insights</span>
              <p className="mt-2 text-sm font-medium">Analytics Dashboard</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} className="p-4 rounded-xl bg-white/10">
              <span className="material-symbols-outlined">security</span>
              <p className="mt-2 text-sm font-medium">Enterprise Security</p>
            </motion.div>
          </div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center gap-3 bg-white/10 rounded-xl p-3"
          >
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="Testimonial"
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium text-white">Emily R.</p>
              <p className="text-xs text-white/80">
                HR Manager at TechCorp: &quot;Yumaris transformed how we manage
                our workforce. The attendance tracking and payroll features
                saved us countless hours each month!&quot;
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
} 