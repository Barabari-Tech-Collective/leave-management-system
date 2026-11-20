import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL;
const baseURL = rawApiUrl ? rawApiUrl.replace(/\/+$/, "") : "";

if (!baseURL && typeof window !== "undefined") {
  console.warn(
    "[axiosConfig] WARNING: VITE_API_URL is undefined or empty! API calls are being routed to the frontend host, which returns index.html instead of backend responses. Please set VITE_API_URL in your deployment environment variables and rebuild."
  );
}

const API = axios.create({
  baseURL: baseURL || undefined,
  withCredentials: true
});

export default API;