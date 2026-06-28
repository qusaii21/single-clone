import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://single-clone.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach Bearer token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("signal_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On 401, clear session and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("signal_token");
      localStorage.removeItem("signal_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
