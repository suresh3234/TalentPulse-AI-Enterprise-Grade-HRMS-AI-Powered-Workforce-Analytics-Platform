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

export const createEmployee = async (data) => {
  try {
    const response = await API.post("/employees/createemployee", data);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to create employee"));
  }
};

export const getEmployees = async (params) => {
  try {
    const response = await API.get("/employees/getallemployees", { params });
    return normalizeCollectionResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load employees"));
  }
};

export const updateEmployee = async (id, data) => {
  try {
    const response = await API.put(`/employees/updateemployee/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to update employee"));
  }
};

export const deleteEmployee = async (id) => {
  try {
    const response = await API.delete(`/employees/deleteemployee/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to delete employee"));
  }
};

export const getEmployeeStats = async () => {
  try {
    const response = await API.get("/employees/stats");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load employee stats"));
  }
};

export const getUsers = async () => {
  try {
    const response = await API.get("/users");
    return normalizeCollectionResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load users"));
  }
};

export const getEmployeeDocuments = async (employeeId) => {
  try {
    const response = await API.get(`/employees/${employeeId}/documents`);
    return response.data.data || [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load documents"));
  }
};

export const uploadEmployeeDocument = async (employeeId, formData) => {
  try {
    const response = await API.post(`/employees/${employeeId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to upload document"));
  }
};
