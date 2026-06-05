import API, { getApiErrorMessage } from "./axiosInstance";

export const getSystemHealth = async () => {
  try {
    const response = await API.get("/devops/health");
    return response.data?.data || response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load system health status"));
  }
};

export const getSystemMetrics = async () => {
  try {
    const response = await API.get("/devops/metrics");
    return response.data?.data || response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load system metrics"));
  }
};

export const getSystemLogs = async (limit = 50) => {
  try {
    const response = await API.get(`/devops/logs?limit=${limit}`);
    return response.data?.data || response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load system logs"));
  }
};
