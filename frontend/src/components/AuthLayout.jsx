import { motion } from "framer-motion";

export default function AuthLayout({ children, headline, description, heroContent }) {
  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-2 bg-[#f8f9ff] overflow-hidden">
      {/* Left side form */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col justify-center px-6 sm:px-10 lg:px-24"
      >
        {children}

        {/* Footer */}
        <footer className="flex flex-wrap gap-5 px-4 md:px-12 py-8 mt-auto">
          <span className="hidden md:inline text-slate-500 font-medium text-xs uppercase tracking-widest cursor-default">
            © 2026 YUMARIS TECHNOLOGIES. ALL RIGHTS RESERVED.
          </span>
          <div className="flex gap-6 ml-auto">
            <a className="text-slate-500 hover:text-indigo-600 text-xs uppercase" href="#">
              Privacy Policy
            </a>
            <a className="text-slate-500 hover:text-indigo-600 text-xs uppercase" href="#">
              Terms of Service
            </a>
            <a className="text-slate-500 hover:text-indigo-600 text-xs uppercase" href="#">
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
        className="relative flex flex-1 items-center justify-center bg-primary p-8 sm:p-12 lg:p-16"
      >
        <div className="primary-gradient absolute inset-0 opacity-90" />
        <div className="absolute -right-12 -top-12 h-48 w-48 sm:h-72 sm:w-72 lg:h-96 lg:w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 sm:h-64 sm:w-64 lg:h-80 lg:w-80 rounded-full bg-secondary-container/30 blur-3xl" />

        <div className="relative z-10 w-full max-w-2xl space-y-8 text-white text-center md:text-left">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold"
          >
            {headline}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="max-w-xl mx-auto md:mx-0 text-base sm:text-lg text-white/80"
          >
            {description}
          </motion.p>

          {heroContent}
        </div>
      </motion.section>
    </div>
  );
}