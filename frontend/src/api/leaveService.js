import API, { getApiErrorMessage } from "./axiosInstance";

const normalizeCollectionResponse = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const normalizeEntityResponse = (payload) => payload?.data || payload;

export const createLeave = async (payload) => {
  try {
    const response = await API.post("/leave/create", payload);
    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to create leave request"));
  }
};

export const getLeaves = async (params) => {
  try {
    const response = await API.get("/leave", { params });
    return normalizeCollectionResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load leave records"));
  }
};

export const getLeaveById = async (id) => {
  try {
    const response = await API.get(`/leave/${id}`);
    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load leave details"));
  }
};

export const updateLeave = async (id, payload) => {
  try {
    const response = await API.put(`/leave/${id}`, payload);
    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to update leave request"));
  }
};

export const approveLeave = async (id, payload) => {
  try {
    const response = await API.put(`/leave/approve/${id}`, payload);
    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to update leave status"));
  }
};

export const deleteLeave = async (id) => {
  try {
    const response = await API.delete(`/leave/${id}`);
    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to delete leave request"));
  }
};

export const getLeaveBalance = async (employeeId) => {
  try {
    const response = await API.get(`/leave/balance/${employeeId}`);
    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load leave balance"));
  }
};
