const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const defaultApiBaseUrl = "http://localhost:5000/api";
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;

let baseUrl = trimTrailingSlash(rawApiBaseUrl);

if (!baseUrl.endsWith('/api')) {
  baseUrl += '/api';
}

export const env = {
  apiBaseUrl: baseUrl,
};
