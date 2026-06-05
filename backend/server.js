const cookieParser = require("cookie-parser");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const connectDB = require("./config/database");
const { validateEnv } = require("./config/env");
const logger = require("./utils/logger");
const requestLogger = require("./middlewares/requestLogger");
const errorHandler = require("./middlewares/errorHandler");
const requestTracking = require("./middlewares/requestTracking");
const {
  globalLimiter,
  authLimiter,
  aiLimiter,
  queueLimiter,
  payrollLimiter,
} = require("./middlewares/rateLimiter");

const userRoutes = require("./routes/user.routes");
const employeeRoutes = require("./routes/employee.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const payrollRoutes = require("./routes/payroll.routes");
const leaveRoutes = require("./routes/leave.routes");
const recruitmentRoutes = require("./routes/recruitment.routes");
const aiRoutes = require("./routes/ai.routes");
const aiOptimizedRoutes = require("./routes/ai.optimized.routes");
const enhancedAiRoutes = require("./routes/enhanced-ai.routes");
const workflowRoutes = require("./routes/workflow.routes");
const devopsRoutes = require("./routes/devops.routes");
const workflowService = require("./services/ai/workflow.service");
const devopsService = require("./services/devops.service");

// Helmet security
const helmet = require("helmet");

// New module routes
const notificationRoutes = require("./routes/notification.routes");
const performanceRoutes = require("./routes/performance.routes");
const trainingRoutes = require("./routes/training.routes");
const benefitRoutes = require("./routes/benefit.routes");
const onboardingRoutes = require("./routes/onboarding.routes");
const offboardingRoutes = require("./routes/offboarding.routes");
const interviewRoutes = require("./routes/interview.routes");
const screeningRoutes = require("./routes/screening.routes");
const interviewAiRoutes = require("./routes/interviewAi.routes");

// Audit log middleware
const auditLogMiddleware = require("./middlewares/auditLog.middleware");

// Performance and optimization services
const cacheService = require("./services/cache.service");
const queueService = require("./services/queue.service");
const { syncDashboard } = require("./scripts/dashboard-sync");
const { ResilientOperation } = require("./services/errorRecovery.service");
const { performanceTrackingMiddleware } = require("./middlewares/performanceTracking");
const performanceMonitor = require("./services/performanceMonitor.service");
const queryOptimizer = require("./services/queryOptimizer.service");
const cacheOptimizer = require("./services/cacheOptimizer.service");
const aiOptimizer = require("./services/aiOptimizer.service");
const IntegrationTestSuite = require("./tests/integration.test");
const { setIo } = require("./utils/socketEmitter");

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1") || origin.endsWith(".onrender.com")) {
        cb(null, true);
      } else {
        cb(new Error("Socket CORS blocked"));
      }
    },
    credentials: true,
  },
});

// Store io on app so controllers can emit events via req.app.locals.io
app.locals.io = io;
setIo(io); // Initialize the singleton emitter for use in controllers

// Socket.IO connection handling
io.on("connection", (socket) => {
  // Each user joins their own room identified by userId
  socket.on("join", (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  // WebRTC Live Interview Signaling Room Events
  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", { userId, socketId: socket.id });
  });

  socket.on("signal", ({ roomId, signal, senderId }) => {
    socket.to(roomId).emit("signal", { signal, senderId, socketId: socket.id });
  });

  socket.on("chat-message", ({ roomId, message, sender }) => {
    io.to(roomId).emit("chat-message", { message, sender, timestamp: Date.now() });
  });

  socket.on("ai-cointerviewer-state", ({ roomId, active }) => {
    socket.to(roomId).emit("ai-cointerviewer-state", { active });
  });

  socket.on("ai-cointerviewer-turn", ({ roomId, transcript }) => {
    socket.to(roomId).emit("ai-cointerviewer-turn", { transcript });
  });

  socket.on("disconnect", () => {});
});

validateEnv();

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Swagger setup
const setupSwagger = require("./config/swagger");
setupSwagger(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

// Add production frontend URL from env if set
if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(",").forEach((origin) => {
    allowedOrigins.push(origin.trim());
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        allowedOrigins.includes(origin) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".onrender.com")
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy: This origin is not allowed."));
      }
    },
    credentials: true,
  }),
);

// Helmet security
app.use(helmet());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

// Request tracking and logging
app.use(requestTracking);
app.use(requestLogger);

// Performance monitoring
app.use(performanceTrackingMiddleware);

// Global rate limiting
app.use(globalLimiter);

// Global audit logging middleware
app.use(auditLogMiddleware);

// Route-specific rate limiters
app.use("/api/users/register", authLimiter);
app.use("/api/users/login", authLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api/ai/optimized", aiLimiter);
app.use("/api/ai/workflows", queueLimiter);
app.use("/api/payroll", payrollLimiter);

app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/recruitment", recruitmentRoutes);

// New module routes
app.use("/api/notifications", notificationRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/benefits", benefitRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/offboarding", offboardingRoutes);

// Video interview and Screening routes
app.use("/api/interview", interviewRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/interview/ai", interviewAiRoutes);

app.use("/api/ai/optimized", aiOptimizedRoutes);
app.use("/api/ai/workflows", workflowRoutes);
app.use("/api/ai", enhancedAiRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/devops", devopsRoutes);

app.get("/api/health", async (req, res) => {
  const databaseState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  
  // Probe AI Service status
  let aiServiceStatus = "unknown";
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";
  
  const startTime = Date.now();
  try {
    const aiHealth = await axios.get(`${aiServiceUrl}/health`, { timeout: 2000 });
    const latency = Date.now() - startTime;
    if (aiHealth.data && aiHealth.data.status === "ok") {
      aiServiceStatus = "connected";
      devopsService.recordAiMetrics(latency, true);
    }
  } catch (error) {
    aiServiceStatus = "unavailable";
    devopsService.recordAiMetrics(0, false, error);
  }

  res.status(200).json({
    success: true,
    status: "ok",
    service: "hrms-backend",
    uptimeSeconds: Math.round(process.uptime()),
    database: databaseState,
    aiService: aiServiceStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/ready", (req, res) => {
  const isDatabaseReady = mongoose.connection.readyState === 1;

  res.status(isDatabaseReady ? 200 : 503).json({
    success: isDatabaseReady,
    status: isDatabaseReady ? "ready" : "not_ready",
    database: isDatabaseReady ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.send("HRMS Backend is running 🚀");
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = (databaseStatus) => {
  httpServer.listen(PORT, "0.0.0.0", async () => {
    logger.info("Server started", {
      port: PORT,
      host: "0.0.0.0",
      databaseStatus,
      docsUrl: `http://localhost:${PORT}/api-docs`,
      healthUrl: `http://localhost:${PORT}/api/health`,
    });

    // Initialize optimization services
    try {
      // Initialize Redis cache
      const cacheReady = await cacheService.connect();
      if (cacheReady) {
        logger.info("Cache service initialized");
      } else {
        logger.warn("Cache service unavailable - operating in degraded mode");
      }

      queueService.setEnabled(cacheReady, cacheReady ? null : "Redis connection failed during startup");

      // Initialize Bull queue
      const analyticsQueue = queueService.createQueue("analytics");
      if (analyticsQueue) {
        // Process analytics jobs
        await queueService.processQueue("analytics", async (jobData) => {
          logger.info("Processing analytics job", { jobData });
          // Job processing logic here
          return { processed: true, jobData };
        });
        logger.info("Analytics queue initialized");
      } else {
        logger.warn("Analytics queue skipped - Redis queues disabled");
      }

      // Initialize AI Workflows
      await workflowService.initProcessors();

      // Start Dashboard Sync (every 5 minutes)
      setInterval(async () => {
        await syncDashboard();
      }, 5 * 60 * 1000);
      
      // Initial sync
      setTimeout(syncDashboard, 10000);
    } catch (error) {
      logger.warn("Failed to initialize optimization services", { error: error.message });
    }
  });
};

connectDB()
  .then(() => {
    startServer("connected");
  })
  .catch((err) => {
    logger.error("Database unavailable during startup", {
      error: err.message,
      mode: "degraded",
    });
    startServer("disconnected");
  });
