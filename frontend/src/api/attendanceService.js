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

export const getAttendance = async (params) => {
  try {
    const response = await API.get("/attendance", { params });
    return normalizeCollectionResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load attendance"));
  }
};

export const createAttendance = async (data) => {
  try {
    const response = await API.post("/attendance", data);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to create attendance"));
  }
};

export const updateAttendance = async (data) => {
  try {
    const response = await API.put("/attendance", data);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to update attendance"));
  }
};

export const getAttendanceActivities = async (limit) => {
  try {
    const response = await API.get("/attendance/activities", {
      params: limit ? { limit } : undefined,
    });
    return normalizeCollectionResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load activity feed"));
  }
};
