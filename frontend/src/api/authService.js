import API, { getApiErrorMessage } from "./axiosInstance";

const normalizeAuthPayload = (payload) => {
  const nestedData = payload?.data;

  if (!nestedData) {
    return payload;
  }

  if (nestedData.user || nestedData.token) {
    return {
      ...payload,
      ...nestedData,
    };
  }

  return {
    ...payload,
    user: nestedData,
  };
};

const persistSession = (payload) => {
  if (payload?.token) {
    localStorage.setItem("token", payload.token);
  }

  if (payload?.user) {
    localStorage.setItem("user", JSON.stringify(payload.user));
  }
};

export const registerUser = async (data) => {
  try {
    const response = await API.post("/users/register", {
      ...data,
      fullName: data.fullName?.trim(),
      email: data.email?.trim(),
      password: data.password?.trim(),
    });

    return normalizeAuthPayload(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Registration failed"));
  }
};

export const loginUser = async (data) => {
  try {
    const response = await API.post("/users/login", {
      email: data.email?.trim(),
      password: data.password?.trim(),
    });

    const payload = normalizeAuthPayload(response.data);
    persistSession(payload);
    return payload;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Login failed"));
  }
};

export const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};
