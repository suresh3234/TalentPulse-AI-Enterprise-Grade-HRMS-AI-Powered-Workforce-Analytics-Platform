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

export const generatePayroll = async (payload) => {
  try {
    const response = await API.post("/payroll/generate", payload);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to generate payroll"));
  }
};

export const getPayroll = async (params) => {
  try {
    const response = await API.get("/payroll", { params });
    return normalizeCollectionResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load payroll"));
  }
};

export const getPayslip = async ({ id, employeeId, month, year }) => {
  try {
    const response = id
      ? await API.get(`/payroll/payslip/${id}`)
      : await API.get("/payroll/payslip", {
          params: { employeeId, month, year },
        });

    return normalizeEntityResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load payslip"));
  }
};

export const markPayrollAsPaid = async (id) => {
  try {
    const response = await API.put(`/payroll/pay/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to update payroll status"));
  }
};

export const approveAllPayroll = async (payload) => {
  try {
    const response = await API.put("/payroll/approve", payload);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to approve payroll"));
  }
};
