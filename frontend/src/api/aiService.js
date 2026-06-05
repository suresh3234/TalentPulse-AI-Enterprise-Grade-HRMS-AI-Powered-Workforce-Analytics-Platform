import API, { getApiErrorMessage } from "./axiosInstance";

const normalizeEntityResponse = (payload) => payload?.data || payload || {};

export const getAiAlerts = async (params) => {
  try {
    const response = await API.get("/ai/alerts", { params });
    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load AI alerts"));
  }
};

export const getAiRecommendations = async (params) => {
  try {
    const response = await API.get("/ai/recommendations", { params });
    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load AI recommendations"));
  }
};

export const getAiPerformanceSummary = async (params) => {
  try {
    const response = await API.get("/ai/performance-summary", { params });
    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load performance summary"));
  }
};

export const postRecruitmentChat = async (payload) => {
  try {
    const response = await API.post("/ai/recruitment-chat", payload);
    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load recruitment chat response"));
  }
};
