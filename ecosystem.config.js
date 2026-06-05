module.exports = {
  apps: [
    {
      name: "hrms-backend",
      cwd: "./backend",
      script: "server.js",
      instances: "max",        // use ALL CPU cores
      exec_mode: "cluster",    // Node.js cluster mode
      max_memory_restart: "512M",
      env: { NODE_ENV: "production" },
      env_development: { NODE_ENV: "development" },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 1000,
      max_restarts: 10,
      watch: false,
      kill_timeout: 5000,
    }
  ]
};
