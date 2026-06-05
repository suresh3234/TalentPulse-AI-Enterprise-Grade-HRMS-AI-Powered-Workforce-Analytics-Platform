import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/authService";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await registerUser(form);
      if (!res?.user) throw new Error("Registration failed");

      toast.success("Account created successfully!");
      navigate("/login");
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-2 overflow-hidden bg-[#f8f9ff]">
      <Toaster position="top-right" />

      {/* LEFT SIDE */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col justify-center px-4 sm:px-8 lg:px-20 py-6"
      >
        {/* Logo */}
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-500 h-10 w-10 flex items-center justify-center rounded-xl">
            <span className="material-symbols-outlined text-white">
              architecture
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">Yumaris</h1>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold mb-1">
          Create your account
        </h2>
        <p className="text-gray-500 mb-4 text-sm sm:text-base">
          Start managing your workforce smarter.
        </p>

        {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-3 backdrop-blur-lg bg-white/60 p-4 rounded-xl border border-white/40 shadow-md"
        >
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={form.fullName}
            onChange={handleChange}
            className="w-full p-2 rounded bg-white/80 focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full p-2 rounded bg-white/80 focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-2 rounded bg-white/80 focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 text-white rounded bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 bg-[length:200%_200%] animate-gradient"
          >
            {isSubmitting ? "Creating..." : "Create Account"}
          </motion.button>
        </form>

        <p className="mt-3 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600">
            Login
          </Link>
        </p>
      </motion.div>

      {/* RIGHT SIDE HERO */}
      <motion.section
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative hidden md:flex items-center justify-center px-6 lg:px-10 py-6 overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 bg-[length:200%_200%] animate-gradient" />

        {/* Blur Effects */}
        <div className="absolute w-72 h-72 bg-white/10 rounded-full blur-3xl -top-20 -right-20" />
        <div className="absolute w-60 h-60 bg-pink-400/20 rounded-full blur-3xl -bottom-20 -left-20" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-lg text-white">

          <h2 className="text-2xl lg:text-3xl font-bold mb-2">
            Manage Employees Smarter
          </h2>
          <p className="text-white/80 text-sm mb-4">
            Onboard, track, and automate everything in one place.
          </p>

          {/* FEATURES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: "groups", title: "Team Onboarding" },
              { icon: "schedule", title: "Attendance" },
              { icon: "payments", title: "Payroll" },
              { icon: "insights", title: "Analytics" },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="p-4 h-[110px] rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-center"
              >
                <div>
                  <span className="material-symbols-outlined text-2xl">
                    {item.icon}
                  </span>
                  <p className="text-sm mt-1">{item.title}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* STATS */}
          <div className="flex justify-between mt-4 px-2">
            <motion.div className="text-center">
              <motion.p
                className="text-2xl font-bold"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                10K+
              </motion.p>
              <p className="text-xs text-white/70">Users</p>
            </motion.div>

            <motion.div className="text-center">
              <motion.p
                className="text-2xl font-bold"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
              >
                500+
              </motion.p>
              <p className="text-xs text-white/70">Companies</p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Gradient Animation */}
      <style>
        {`
        @keyframes gradientMove {
          0% { background-position: 0% 50%;}
          50% { background-position: 100% 50%;}
          100% { background-position: 0% 50%;}
        }
        .animate-gradient {
          animation: gradientMove 6s ease infinite;
        }
        `}
      </style>
    </div>
  );
}