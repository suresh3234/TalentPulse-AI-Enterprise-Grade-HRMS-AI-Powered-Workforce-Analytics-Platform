import { env } from "./config/env";

const BASE_URL = `${env.apiBaseUrl}/users`;

// REGISTER
export const registerUser = async (data) => {
  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // ✅ IMPORTANT
      body: JSON.stringify(data),
    });

    const result = await res.json();

    console.log("REGISTER RESPONSE:", result); // ✅ debug

    return result;
  } catch (err) {
    console.log(err);
    return { message: "Server error" };
  }
};

// LOGIN
export const loginUser = async (data) => {
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // ✅ IMPORTANT
      body: JSON.stringify(data),
    });

    const result = await res.json();

    console.log("LOGIN RESPONSE:", result); // ✅ debug

    return result;
  } catch (err) {
    console.log(err);
    return { message: "Server error" };
  }
};