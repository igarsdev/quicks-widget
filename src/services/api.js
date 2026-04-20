import axios from "axios";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const dummyApiAppId = import.meta.env.VITE_DUMMY_API_APP_ID || "";
const localBackendFallbackUrl = "http://localhost:8787";
const baseURL = configuredBaseUrl || localBackendFallbackUrl;
const isDummyApiBase = /dummyapi\.io/i.test(baseURL);

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers:
    isDummyApiBase && dummyApiAppId
      ? {
          "app-id": dummyApiAppId,
        }
      : undefined,
});

export default api;
