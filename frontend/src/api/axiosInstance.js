import axios from "axios";
import toast from "react-hot-toast";
import { env } from "../config/env";

const API = axios.create({
  baseURL: env.apiBaseUrl || "http://localhost:5000/api",
  timeout: 15000, // 15 seconds default timeout for slow AI processing
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request Interceptor: Attach JWT Bearer Token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Request Deduplication Map for in-flight GET requests
const inFlightRequests = new Map();

const originalRequest = API.request;
API.request = function (config) {
  const method = (config.method || "get").toLowerCase();
  
  if (method === "get") {
    // Construct a unique key based on URL and query params
    const key = `${config.url}:${JSON.stringify(config.params || {})}`;
    
    if (inFlightRequests.has(key)) {
      console.log(`Deduplicating GET request to: ${config.url}`);
      return inFlightRequests.get(key);
    }
    
    const promise = originalRequest.call(this, config).finally(() => {
      inFlightRequests.delete(key);
    });
    
    inFlightRequests.set(key, promise);
    return promise;
  }
  
  return originalRequest.call(this, config);
};

// ✅ Response Interceptor: Handle Auth Errors, Rate Limits, and Server Failures
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequestConfig = error.config;
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.response?.data?.error;
    const requestUrl = String(originalRequestConfig?.url || "");

    // 1. Handle Rate Limiting (429)
    if (status === 429) {
      toast.error("Please slow down — too many requests", { id: "rate-limit-toast" });
      return Promise.reject(error);
    }

    // 2. Handle Server Errors (500+)
    if (status >= 500) {
      toast.error("Server error — our team has been notified", { id: "server-error-toast" });
      return Promise.reject(error);
    }

    // 3. Handle Token Refresh and 401 Unauthorized
    if (
      status === 401 &&
      !requestUrl.includes("/users/login") &&
      !requestUrl.includes("/users/refresh-token") &&
      !originalRequestConfig._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequestConfig.headers.Authorization = `Bearer ${token}`;
            return API(originalRequestConfig);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequestConfig._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = localStorage.getItem("refreshToken");
        if (!storedRefreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await axios.post(`${env.apiBaseUrl || "http://localhost:5000/api"}/users/refresh-token`, {
          refreshToken: storedRefreshToken,
        });

        const { token, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem("token", token);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }

        API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        originalRequestConfig.headers["Authorization"] = `Bearer ${token}`;

        processQueue(null, token);
        isRefreshing = false;

        return API(originalRequestConfig);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        console.warn("⚠️ Refresh token expired or failed. Clearing authentication...");
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        // Broadcast session expiration
        window.dispatchEvent(
          new CustomEvent("hrms:session-expired", {
            detail: { message: "Session expired. Please log in again." },
          })
        );
        
        // Redirect to login safely
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Helper for clean error messages
export const getApiErrorMessage = (error, fallback = "Something went wrong") => {
  if (!error?.response) {
    if (error?.code === "ERR_NETWORK") {
      return "Cannot reach backend. Start server at http://localhost:5000";
    }
    return error?.message || fallback;
  }

  const data = error.response.data;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((item) => item.message || item.msg).join(", ");
  }

  return data?.message || data?.error || fallback;
};

export default API;